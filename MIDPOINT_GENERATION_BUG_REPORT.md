# 中点生成機能の問題分析レポート

**作成日**: 2025年12月13日  
**対象ファイル**: `ext/main.js` - `addMiddlePointAtPosition()` 関数  
**問題の重要度**: 高（仕様通りに動作していない）

---

## 🔴 問題概要

グラフ上でShift+クリックによる中点生成機能において、以下の2つの重大な問題が発生している：

1. **生成される中点のXY値が元のグラフ上にない**
2. **生成された中点のハンドルが元のカーブ形状を維持しない**

## 📋 求める仕様

### 正しい動作
- グラフ「上」に中点を生成する → **XY値が既存カーブ上にある**
- 生成された中点のハンドルは、**元のカーブ形状を完全に維持する**

### 現在の問題
- 中点のY座標（value）が元のカーブから外れている
- ハンドルの角度や長さが元のカーブの接線と一致していない

---

## 🔍 原因分析

### 問題箇所: `addMiddlePointAtPosition()` 関数（Line 5820~）

#### 問題1: Y座標の計算ミス

**現在のコード** (Line 5903-5908):
```javascript
// ratio位置での既存ベジェ曲線上のY座標を計算
const oneMinusT = 1 - t;
const newCanvasY = 
    oneMinusT * oneMinusT * oneMinusT * p0.y +
    3 * oneMinusT * oneMinusT * t * p1.y +
    3 * oneMinusT * t * t * p2.y +
    t * t * t * p3.y;
```

**問題点**:
- ベジェ曲線上のY座標は正しく計算されている
- **しかし、この後の座標変換処理が誤っている可能性がある**

#### 問題2: 新しい中点の時間・値の計算ミス

**現在のコード** (Line 5925-5927):
```javascript
// 新しい中点の時間と値を計算
const newTime = kf1.time + (kf2.time - kf1.time) * ratio;
const newValue = kf1.value + (kf2.value - kf1.value) * ratio;
```

**重大な問題**:
- `ratio`（ベジェ曲線のパラメータt）を使って**線形補間**している
- ベジェ曲線は非線形なので、`t=0.5`の位置が必ずしも値の中間点ではない
- **正しくは、Canvas Y座標から逆算して値を求める必要がある**

#### 問題3: ハンドルの計算ミス

**現在のコード** (Line 5945-5965):
```javascript
// 各セグメントでのinfluence 15%でのハンドル長（X方向）
const influenceRatio = 0.15;
const leftHandleLength = leftSegmentWidth * influenceRatio;
const rightHandleLength = rightSegmentWidth * influenceRatio;

// 接線の傾きを使って、Y方向の変化量を計算
const outSpeed = tangentSlope * rightHandleLength;  // 右セグメント用
const inSpeed = tangentSlope * leftHandleLength;    // 左セグメント用
```

**問題点**:
1. **ハンドルの長さが固定15%** → 元のカーブのハンドル長を無視している
2. `outSpeed`と`inSpeed`の計算が逆転している可能性:
   - `outSpeed`は左方向（左セグメント用）のはず
   - `inSpeed`は右方向（右セグメント用）のはず
   - コメントと実装が逆になっている

---

## 🔧 修正方針

### 修正1: 値（value）の正しい計算

```javascript
// ❌ 間違い: 線形補間を使用
const newValue = kf1.value + (kf2.value - kf1.value) * ratio;

// ✅ 正しい: Canvas Y座標から逆算
const canvasInfo = window.currentEasingData.canvasInfo;
const minValue = graphData.displayScale?.minValue || 0;
const maxValue = graphData.displayScale?.maxValue || 1;
const valueRange = maxValue - minValue;

// Canvas Y座標から正規化値を計算
const normalizedValue = (canvasInfo.gridY + canvasInfo.curveHeight - newCanvasY) / canvasInfo.curveHeight;

// 実際の値に変換
const newValue = minValue + normalizedValue * valueRange;
```

### 修正2: ハンドルの正しい計算（元のカーブを維持）

現在の実装では、De Casteljauアルゴリズムを使用して、元のベジェ曲線を2つに分割する必要がある：

```javascript
// De Casteljauアルゴリズムでベジェ曲線を分割
function splitBezierCurve(p0, p1, p2, p3, t) {
    // 1段階目の線形補間
    const q0 = lerp(p0, p1, t);
    const q1 = lerp(p1, p2, t);
    const q2 = lerp(p2, p3, t);
    
    // 2段階目
    const r0 = lerp(q0, q1, t);
    const r1 = lerp(q1, q2, t);
    
    // 3段階目（分割点）
    const s = lerp(r0, r1, t);
    
    // 左側のベジェ曲線: p0, q0, r0, s
    // 右側のベジェ曲線: s, r1, q2, p3
    return {
        left: { p0, p1: q0, p2: r0, p3: s },
        right: { p0: s, p1: r1, p2: q2, p3 }
    };
}

function lerp(p1, p2, t) {
    return {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t
    };
}
```

この方法で計算したハンドル座標を使用すれば、元のカーブ形状を**完全に維持**できる。

### 修正3: ハンドルのspeedとinfluenceの正しい計算

分割後のハンドル座標から、speedとinfluenceを逆算する：

```javascript
// 左セグメント（kf1 → 新中点）
const leftSegmentWidth = newCanvasX - kf1.canvasX;
const leftOutHandle = { x: q0.x, y: q0.y }; // De Casteljauから取得
const leftOutInfluence = (leftOutHandle.x - kf1.canvasX) / leftSegmentWidth;
const leftOutSpeed = leftOutHandle.y - kf1.canvasY;

// 新中点の出力ハンドル（左セグメント終点）
const newPointOutHandle = { x: r0.x, y: r0.y };
const newPointOutInfluence = (newCanvasX - newPointOutHandle.x) / leftSegmentWidth;
const newPointOutSpeed = newCanvasY - newPointOutHandle.y;

// 右セグメント（新中点 → kf2）も同様に計算
```

---

## 🧪 テスト方法

### 修正前の問題確認
1. 3点以上のカーブを作成
2. 任意のセグメント上でShift+クリック
3. 結果を確認：
   - ❌ 中点がカーブから外れている
   - ❌ ハンドルが元の形状を維持していない

### 修正後の期待結果
1. 同じ操作を実行
2. 結果を確認：
   - ✅ 中点が正確にカーブ上にある
   - ✅ 分割前後でカーブ形状が完全に一致する
   - ✅ ハンドルの角度が元のカーブの接線方向と一致する

---

## 📝 修正の優先順位

### 最優先（Critical）
1. **値（value）の計算修正** - Canvas座標からの逆算に変更
2. **ハンドル座標の計算修正** - De Casteljauアルゴリズムの実装

### 高優先（High）
3. **speedとinfluenceの逆算** - ハンドル座標からパラメータを計算
4. **エッジケースの処理** - 始点・終点付近での分割

### 中優先（Medium）
5. **デバッグログの改善** - 分割前後の比較情報を出力
6. **ユーザーフィードバック** - 分割成功時のメッセージ表示

---

## 💡 参考情報

### ベジェ曲線の分割について
- [De Casteljau's Algorithm](https://en.wikipedia.org/wiki/De_Casteljau%27s_algorithm)
- キーポイント: パラメータtでの分割後も、元の曲線を完全に再現できる

### 現在のコードの問題点まとめ
1. 線形補間を使用 → ベジェ曲線の特性を無視
2. ハンドル長を固定値で設定 → 元のカーブ情報を破棄
3. speedとinfluenceの計算が不正確 → カーブ形状が変わる

---

## 🎯 次のアクション

1. ✅ **この問題レポートを作成** ← 完了
2. ⏳ **修正実装の検討** - De Casteljauアルゴリズムの実装
3. ⏳ **コード修正** - `addMiddlePointAtPosition()`の書き換え
4. ⏳ **テスト** - 複数パターンでの動作確認
5. ⏳ **ドキュメント更新** - 修正内容の記録

---

## 📊 影響範囲

### 影響を受ける機能
- ✅ 中点の追加（Shift+クリック）
- ⚠️ 中点の削除（Alt+クリック） - 関連機能として確認が必要
- ⚠️ ハンドルの自動調整機能 - 連動して確認が必要

### 影響を受けないコア機能
- ✅ 既存キーフレームの編集
- ✅ ハンドルのドラッグ操作
- ✅ カーブの描画自体
- ✅ Applyボタンでの適用

---

## 結論

中点生成機能は、数学的に正しい実装（De Casteljauアルゴリズム）に置き換える必要がある。現在の線形補間ベースの実装では、ベジェ曲線の特性を無視しているため、元のカーブ形状を維持できない。

修正により、ユーザーは任意の位置でカーブを正確に分割でき、編集の自由度が大幅に向上する。
