# 符号混在バグ分析レポート

## 問題の詳細

### 現象
- **2点カーブ（1区間）**: 常に正しく動作
- **3点以上カーブ（2区間以上）**:
  - 1組のペアに適用: 正しい（値が+でも-でも）
  - 2組以上のペア（全て同じ符号）: 正しい
  - **2組以上のペア（符号混在）: 誤り** ← 修正対象

### 根本原因

#### 問題箇所1: `applyGraphToSegment` (行1379)
```javascript
// 実際の値範囲（区間全体）
var actualValueRange = Math.abs(endKf.value - startKf.value);

// speed倍率計算
speedMultiplier = (actualValueRange / timeRange) / (graphValueRange / graphTimeRange);
```
- **問題**: `Math.abs()`で絶対値化しているため、符号情報が失われる
- **影響**: ペア全体が負変化でも、正の倍率として計算される

#### 問題箇所2: `applySegmentHandles` (行1210-1260)
```javascript
// 区間の実際の変化方向を計算（符号判定用）
var segmentActualChange = 0;
if (Array.isArray(startValue)) {
    segmentActualChange = endValue[0] - startValue[0];
} else {
    segmentActualChange = endValue - startValue;
}

// 位置以外で、実際の変化が負の場合は符号を反転
if (!isSpatialProperty && segmentActualChange < 0) {
    correctedSpeedOut = -correctedSpeedOut;
}
```
- **問題**: 各区間の符号のみを見ている
- **影響**: ペア全体の符号と区間の符号が不整合

### 不具合のメカニズム

#### ケースA: ペア全体が正変化（0→100）、3点グラフ
1. `actualValueRange = Math.abs(100 - 0) = 100`
2. `speedMultiplier = (100 / time) / (1.0 / graphTime)` = 正の値
3. 各区間も正変化なので、`segmentActualChange > 0`
4. 符号反転なし → **正しく動作**

#### ケースB: ペア全体が負変化（100→0）、3点グラフ
1. `actualValueRange = Math.abs(0 - 100) = 100` ← 絶対値化で符号喪失
2. `speedMultiplier = (100 / time) / (1.0 / graphTime)` = 正の値（本来は負であるべき）
3. 各区間は負変化なので、`segmentActualChange < 0`
4. 符号反転で`correctedSpeed = -speed`
5. **しかし**: `speedMultiplier`が正のままなので、計算が不整合
6. → **誤った結果**

#### ケースC: 複数ペア（符号混在）
- ペア1: 正変化 → 正しく処理
- ペア2: 負変化 → ケースBと同じ問題発生
- → **一部のペアで誤り**

## 修正方針

### 方針1: ペア全体の符号を保持する（推奨）

```javascript
// applyGraphToSegment内で
var pairValueChange = endKf.value - startKf.value; // 符号付き
var isPairDescending = false;

if (Array.isArray(pairValueChange)) {
    isPairDescending = (pairValueChange[0] < 0);
} else {
    isPairDescending = (pairValueChange < 0);
}

var actualValueRange = Math.abs(pairValueChange);

// applySegmentHandlesに isPairDescending を渡す
this.applySegmentHandles(prop, segStartIdx, segEndIdx, segmentEasing, speedMultiplier, debugInfo, isPairDescending);
```

```javascript
// applySegmentHandles内で
AccelCurveUtils.applySegmentHandles = function(prop, startIdx, endIdx, segmentEasing, speedMultiplier, debugInfo, isPairDescending) {
    // ...
    
    var isSpatialProperty = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || 
                            prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
    
    // OUT handle
    if (segmentEasing.outTemporal) {
        var correctedSpeedOut = (segmentEasing.outTemporal.speed / 100) * speedMultiplier;
        
        // ペア全体が負変化の場合は符号を反転
        if (!isSpatialProperty && isPairDescending) {
            correctedSpeedOut = -correctedSpeedOut;
        }
        
        // ... 適用
    }
    
    // IN handle
    if (segmentEasing.inTemporal) {
        var correctedSpeedIn = (segmentEasing.inTemporal.speed / 100) * speedMultiplier;
        
        // ペア全体が負変化の場合は符号を反転
        if (!isSpatialProperty && isPairDescending) {
            correctedSpeedIn = -correctedSpeedIn;
        }
        
        // ... 適用
    }
};
```

### テストケース（30パターン以上）

#### カテゴリA: 1次元プロパティ（Opacity等）
1. 正変化1組、2点グラフ: 0→100
2. 負変化1組、2点グラフ: 100→0
3. 正変化1組、3点グラフ: 0→100
4. 負変化1組、3点グラフ: 100→0
5. 正変化1組、5点グラフ: 0→100
6. 負変化1組、5点グラフ: 100→0
7. 正変化2組、2点グラフ: [0→50, 0→100]
8. 負変化2組、2点グラフ: [50→0, 100→0]
9. 符号混在2組、2点グラフ: [0→50, 100→0] ← **修正対象**
10. 正変化2組、3点グラフ: [0→50, 0→100]
11. 負変化2組、3点グラフ: [50→0, 100→0]
12. **符号混在2組、3点グラフ: [0→50, 100→0]** ← **主要修正対象**
13. 正変化3組、3点グラフ: [0→30, 0→60, 0→100]
14. 負変化3組、3点グラフ: [30→0, 60→0, 100→0]
15. **符号混在3組、3点グラフ: [0→50, 100→0, 0→70]** ← **修正対象**

#### カテゴリB: 多次元プロパティ（Scale等、非Spatial）
16. 正変化1組、2点グラフ: [0,0]→[100,100]
17. 負変化1組、2点グラフ: [100,100]→[0,0]
18. 正変化1組、3点グラフ: [0,0]→[100,100]
19. 負変化1組、3点グラフ: [100,100]→[0,0]
20. **符号混在2組、3点グラフ: [[0,0]→[50,50], [100,100]→[0,0]]** ← **修正対象**

#### カテゴリC: Spatialプロパティ（Position）
21. 正変化1組、2点グラフ: [0,0]→[100,100]
22. 負変化1組、2点グラフ: [100,100]→[0,0]
23. 正変化1組、3点グラフ: [0,0]→[100,100]
24. 負変化1組、3点グラフ: [100,100]→[0,0]
25. 符号混在2組、3点グラフ: [[0,0]→[50,50], [100,100]→[0,0]] ← 位置なので符号補正なし（期待値: 正常動作）

#### カテゴリD: エッジケース
26. 値変化0（同じ値）: 50→50、3点グラフ
27. 極小変化: 50→50.1、3点グラフ
28. 極大変化: 0→10000、3点グラフ
29. 負の大きな変化: 10000→0、3点グラフ
30. 複雑な符号混在: [0→100, 100→0, 0→50, 50→0]、5点グラフ ← **最も複雑な修正対象**
31. 中点が元の範囲外: 0→100、3点グラフで中点value=1.5（150相当）
32. 時間逆転防止: 複数ペアが時間的に重複しないことを確認

### 期待される修正結果

#### 修正前（現在のバグ）
- ケース12（符号混在2組、3点）: ペア2の速度/ハンドルが不正
- ケース15（符号混在3組、3点）: ペア2の速度/ハンドルが不正
- ケース20（多次元、符号混在2組、3点）: ペア2の速度/ハンドルが不正
- ケース30（複雑な符号混在）: ペア2,4の速度/ハンドルが不正

#### 修正後（期待値）
- 全32ケースで正しい中点座標とハンドル符号が生成される
- 位置プロパティは引き続き符号補正なし
- 既存の2点カーブ、符号統一ケースに影響なし

## 影響範囲評価

### 変更対象ファイル
- `ext/extendscript.jsx` のみ

### 変更対象関数
1. `AccelCurveUtils.applySegmentHandles` - 引数追加、符号判定変更
2. `AccelCurveUtils.applyGraphToSegment` - 符号判定追加、関数呼び出し修正

### 他機能への影響
- **2点カーブ適用**: 影響なし（isPairDescendingが正しく機能）
- **3点以上カーブ（符号統一）**: 影響なし（符号判定結果は同じ）
- **手動ハンドル調整**: 影響なし（この機能は未使用）
- **プリセット読み込み**: 影響なし（グラフ適用と独立）
- **UI操作全般**: 影響なし（ExtendScript内の変更のみ）

## 実装手順

1. テスト環境準備
   - After Effectsで32パターンのテストコンポジション作成
   - 各パターンで期待値を記録

2. コード修正
   - `applySegmentHandles`の引数に`isPairDescending`を追加
   - `applyGraphToSegment`でペア符号を判定し渡す
   - 符号補正ロジックを`isPairDescending`基準に変更

3. テスト実行
   - 全32ケースを実行
   - 中点座標、ハンドル速度、影響値を確認
   - 既存機能（2点、符号統一）が影響を受けていないか確認

4. デバッグ出力確認
   - `debugInfo`で符号判定結果を出力
   - 各ペアの`isPairDescending`値を確認
   - 速度補正の前後値を確認

## リスク評価

### 低リスク（この修正）
- 変更範囲が限定的（2関数のみ）
- 既存ロジックの拡張（条件分岐の基準変更のみ）
- 後方互換性あり（引数追加、デフォルト動作は保持可能）

### 中リスク
- テストケース不足による見落とし
  → 対策: 32パターンの網羅的テスト

### 高リスク
- なし

## 結論

この修正は**安全かつ効果的**です。修正範囲が明確で、テストケースも網羅的です。
実装の許可をいただければ、上記手順で進めます。
