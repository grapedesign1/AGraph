# Speed値の流れ - 徹底分析レポート

## 問題の状況
グラフ表示が実態（After Effects）と違っている。ハンドルのspeed値が正しく表示されていない。

## Speed値の完全な流れ

### 1. After Effectsからの取得 (extendscript.jsx)
**場所**: `ext/extendscript.jsx` 行228-240

```javascript
var inTemporal = property.keyInTemporalEase(keyIndex);
var outTemporal = property.keyOutTemporalEase(keyIndex);

if (outTemporal && outTemporal.length > 0) {
    easingInfo.outTemporal = {
        speed: outTemporal[0].speed,      // ← After Effects APIの生の値
        influence: outTemporal[0].influence
    };
}
```

**重要**: `outTemporal[0].speed`はAfter Effects APIが返す値。
- この値は**単位時間あたりの値の変化率**
- 単位: 値/秒 (value per second)
- 例: Position(0,0)→(100,100)で1秒のとき、speed=141.42 (ピタゴラスの定理)

---

### 2. 正規化 (main.js normalizeKeyframes)
**場所**: `ext/main.js` 行1530-1541

```javascript
// outTemporal: 現在のKFから次のKFへのセグメント
if (kf.easing?.outTemporal && index < sorted.length - 1) {
    const segmentRate = calculateSegmentRate(sorted[index], sorted[index + 1]);
    let normalizedSpeed = segmentRate !== 0 
        ? (kf.easing.outTemporal.speed / segmentRate) * 100  // ← 正規化
        : kf.easing.outTemporal.speed;
    
    normalizedEasing.outTemporal = {
        speed: normalizedSpeed,  // ← 0-100の範囲に正規化
        influence: kf.easing.outTemporal.influence
    };
}
```

**計算式**: 
```
normalizedSpeed = (AE_speed / segmentRate) * 100
```

**segmentRateとは**:
```javascript
// 行1477-1501
const calculateSegmentRate = (kf1, kf2) => {
    const timeDiff = Math.abs(time2 - time1);
    const deltaY = Math.abs(value2 - value1); // 値の変化量
    return timeDiff > 0 ? deltaY / timeDiff : 0;  // 値の変化率
};
```

**例**:
- キーフレーム1: time=0, value=0
- キーフレーム2: time=1, value=100
- segmentRate = 100/1 = 100
- AE_speed = 100の場合
- normalizedSpeed = (100/100)*100 = 100

---

### 3. 描画時の制御点計算 (calculateSegmentControlPoints)
**場所**: `ext/main.js` 行5053-5080

```javascript
function calculateSegmentControlPoints(x1, y1, x2, y2, outEasing, inEasing, normalization, kf1, kf2) {
    const segmentWidth = x2 - x1;
    
    // outTemporal (開始点から出る)
    if (outEasing) {
        const influence = Math.min(1, outEasing.influence / 100);
        
        // ★重要: speedは直接のピクセル値として扱う
        cp1x = x1 + segmentWidth * influence;
        cp1y = y1 + outEasing.speed;  // ← ここで直接加算！
    }
}
```

**問題点**: `cp1y = y1 + outEasing.speed`
- `outEasing.speed`は正規化された値（0-100範囲）のはず
- しかし、ピクセル値として直接加算されている
- 正しくは、canvasの高さに対してスケールする必要がある

---

### 4. ハンドルドラッグ時の計算 (updateNPointEasingFromHandles)
**場所**: `ext/main.js` 行5910-5933（修正後）

```javascript
function updateNPointEasingFromHandles() {
    // セグメント幅（時間軸、X方向）
    const segmentWidth = endX - startX;
    const segmentHeight = endY - startY;  // ← 追加
    
    // Out handleの処理
    const outDx = outHandle.x - startX;
    const outDy = outHandle.y - startY;
    const outInfluence = (outDx / segmentWidth) * 100;
    
    // ★修正後: speedをsegmentHeightで正規化
    const outSpeed = segmentHeight !== 0 
        ? (outDy / segmentHeight) * 100  // ← 0-100に正規化
        : 0;
    
    kf1.easing.outTemporal = { speed: outSpeed, influence: outInfluence };
}
```

---

### 5. rebuildHandles - ハンドル座標の復元
**場所**: `ext/main.js` 行5743-5760（修正後）

```javascript
function rebuildHandles() {
    const segmentWidth = kf2.canvasX - kf1.canvasX;
    const segmentHeight = kf2.canvasY - kf1.canvasY;  // ← 追加
    
    const outInfluence = (kf1.easing?.outTemporal?.influence || 33.33) / 100;
    const outSpeed = kf1.easing?.outTemporal?.speed || 0;
    const outHandleX = kf1.canvasX + segmentWidth * outInfluence;
    
    // ★修正後: speedをsegmentHeightでスケール
    const outHandleY = kf1.canvasY + (segmentHeight * outSpeed / 100);  // ← 修正
}
```

---

## 問題の本質

### 不整合その1: calculateSegmentControlPoints vs rebuildHandles

**calculateSegmentControlPoints** (描画用):
```javascript
cp1y = y1 + outEasing.speed;  // 直接ピクセル値として加算
```

**rebuildHandles** (修正後):
```javascript
outHandleY = canvasY + (segmentHeight * speed / 100);  // 0-100として扱う
```

→ **一方はピクセル値、もう一方は0-100値として扱っている**

### 不整合その2: 正規化の意味

**normalizeKeyframes**では:
```javascript
normalizedSpeed = (AE_speed / segmentRate) * 100
```
- segmentRate = 値の変化率（value/秒）
- AE_speedも値の変化率（value/秒）
- 結果: 無次元化された比率 × 100

**意味**: ハンドルの傾きが、直線（リニア）の傾きに対して何%かを表す

### 不整合その3: canvas座標系

**問題**: canvas上での1ピクセルは、値の変化量とどう関係するか？

例:
- 値の範囲: 0-100
- canvas高さ: 300px
- 1px = 100/300 = 0.333... の値の変化

しかし、speed=100は「100%」を意味するのか「100ピクセル」を意味するのか不明確。

---

## 正しい実装の要件

### 要件1: 一貫性
speed値の保存形式を統一する必要がある。選択肢：
1. **ピクセル値として保存** → canvas依存
2. **0-100の正規化値として保存** → canvas非依存（推奨）

### 要件2: 変換の明確化

**0-100正規化方式（推奨）**:
- 保存: `speed = (ピクセル変化量 / segmentHeight) * 100`
- 表示: `ピクセル変化量 = (speed / 100) * segmentHeight`

### 要件3: calculateSegmentControlPointsの修正

**現在**:
```javascript
cp1y = y1 + outEasing.speed;  // ピクセル値として扱う
```

**修正案A**: speedを0-100として扱う
```javascript
const segmentHeight = y2 - y1;
cp1y = y1 + (outEasing.speed / 100) * segmentHeight;
```

**修正案B**: speedをピクセル値として扱う（非推奨）
```javascript
cp1y = y1 + outEasing.speed;  // このまま
// ただし、保存時もピクセル値で保存する必要がある
```

---

## 実際の値を追跡する必要がある箇所

### チェックポイント1: After Effectsから取得した直後
```javascript
console.log('AE raw speed:', outTemporal[0].speed);
```

### チェックポイント2: 正規化後
```javascript
console.log('Normalized speed:', normalizedSpeed);
console.log('segmentRate:', segmentRate);
```

### チェックポイント3: calculateSegmentControlPoints
```javascript
console.log('cp1y calculation:', {
    y1: y1,
    speed: outEasing.speed,
    cp1y: cp1y,
    segmentHeight: y2 - y1
});
```

### チェックポイント4: rebuildHandles
```javascript
console.log('Rebuild handle:', {
    canvasY: kf1.canvasY,
    speed: outSpeed,
    segmentHeight: segmentHeight,
    resultY: outHandleY
});
```

### チェックポイント5: ドラッグ時の計算
```javascript
console.log('Drag calculation:', {
    outDy: outDy,
    segmentHeight: segmentHeight,
    calculatedSpeed: outSpeed
});
```

---

## 推定される根本原因

### 仮説1: calculateSegmentControlPointsがピクセル値を期待している
- `cp1y = y1 + outEasing.speed`
- これはspeedがピクセル値であることを前提
- しかし、normalizeKeyframesで0-100に変換している
- **矛盾**

### 仮説2: 過去の実装が混在している
- 古い実装: speedをピクセル値として扱う
- 新しい実装: speedを0-100として扱う
- 両方が混在している可能性

### 仮説3: canvas座標の変化
- 横縦モード実装時にcanvas座標系が変わった
- curveWidth/curveHeightの計算が変わった
- しかし、speed計算は更新されなかった

---

## 次のステップ: デバッグ計画

### ステップ1: 実際の値を確認
プリセット読み込み時にalert()で表示:
```javascript
alert(`KF1 outSpeed: ${kf1.easing.outTemporal.speed}\n` +
      `segmentHeight: ${segmentHeight}\n` +
      `calculated Y: ${outHandleY}`);
```

### ステップ2: calculateSegmentControlPointsに追加
```javascript
alert(`calculateSCP:\nspeed: ${outEasing.speed}\n` +
      `segmentHeight: ${y2-y1}\ncp1y: ${cp1y}`);
```

### ステップ3: 既知の値でテスト
- Linear (speed=0): ハンドルが直線上にあるか？
- Ease Out (speed=75): ハンドルが正しい位置にあるか？

### ステップ4: 修正実装
両方の関数で同じ変換式を使う：
- 保存: `(pixel / segmentHeight) * 100`
- 表示: `(speed / 100) * segmentHeight`

---

## 修正の優先順位

### 最優先: calculateSegmentControlPointsの修正
この関数がカーブ描画に使われる。ここを直さないと表示が正しくならない。

```javascript
// 修正前
cp1y = y1 + outEasing.speed;

// 修正後
const segmentHeight = y2 - y1;
cp1y = y1 + (outEasing.speed / 100) * segmentHeight;
```

### 次: 整合性の確認
- updateNPointEasingFromHandles
- rebuildHandles
- 両方が同じ変換式を使っているか確認

### 最後: テスト
- すべてのプリセットで正しく表示されるか
- ハンドルをドラッグして、再度Analyzeした時に同じ形状になるか

---

## 結論

**問題の核心**:
- `calculateSegmentControlPoints`がspeedをピクセル値として扱っている
- しかし、`normalizeKeyframes`でspeedは0-100に変換されている
- この不一致が表示のずれを引き起こしている

**解決策**:
1. `calculateSegmentControlPoints`を修正してspeedを0-100として扱う
2. すべての関数で同じ変換式を使う
3. デバッグ出力で値を確認する
