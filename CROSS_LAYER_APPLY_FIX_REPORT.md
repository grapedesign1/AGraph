# 異なるレイヤー間のApply失敗問題の修正レポート

**日付**: 2026年1月5日  
**問題**: 異なるレイヤーのキーフレームを同時選択してApplyすると、時間が重複している場合に正しく適用されない

---

## 問題の詳細

### 症状
- レイヤーAのX位置（0秒→2秒）とレイヤーBのX位置（1秒→3秒）を同時選択してApply
- 時間が重複している区間があると、Applyが失敗するか、間違った設定が適用される
- 同じレイヤー内のプロパティ間では問題なし

### 根本原因

**JavaScript側とExtendScript側でプロパティの処理順序が不一致**

1. **JavaScript側** (main.js 2400-2540行目)
   ```javascript
   const propertyGroups = {};
   selectedData.keyframes.forEach(kf => {
       const propKey = `${kf.layerName}_${kf.propertyName}`;
       propertyGroups[propKey] = [];
   });
   
   Object.keys(propertyGroups).forEach(propKey => {
       // segmentSettingsに追加
   });
   ```
   - `Object.keys()`でプロパティグループを処理
   - 順序: キーフレームが選択された順序（挿入順）

2. **ExtendScript側** (extendscript.jsx 1555-1615行目) - 修正前
   ```javascript
   var globalSegmentCounter = 0;
   for (var i = 0; i < selectedProperties.length; i++) {
       var segmentSettings = segmentsData.segments[globalSegmentCounter];
       globalSegmentCounter++;
   }
   ```
   - `selectedProperties`の順序: After Effectsが返す順序（タイムライン順など）
   - JavaScript側と順序が一致しない保証なし

### 具体例

**シナリオ**:
- レイヤーA（上）: X Position 0秒→2秒
- レイヤーB（下）: X Position 1秒→3秒

**JavaScript側での処理順**:
1. `segmentSettings[0]` = レイヤーAの設定
2. `segmentSettings[1]` = レイヤーBの設定

**ExtendScript側での処理順（タイムライン上から下）**:
1. `selectedProperties[0]` = レイヤーA
2. `selectedProperties[1]` = レイヤーB

→ 運が良ければ一致するが、保証されない

**別のケース（選択順序が異なる場合）**:
- ユーザーがレイヤーBを先に選択、次にレイヤーAを選択

**JavaScript側**: 
1. `segmentSettings[0]` = レイヤーB
2. `segmentSettings[1]` = レイヤーA

**ExtendScript側**:
1. `selectedProperties[0]` = レイヤーA（タイムライン順）
2. `selectedProperties[1]` = レイヤーB

→ **完全に逆！レイヤーAにレイヤーBの設定が適用される**

---

## 修正内容

### 修正ファイル
- `ext/extendscript.jsx` の `accelCurveApplyMultipleSegments` 関数

### 修正方針
**globalSegmentCounter方式を廃止し、プロパティ名・レイヤー名・キーフレームインデックスでマッチング**

### 修正後のコード

```javascript
// 各選択されたプロパティを処理
for (var i = 0; i < selectedProperties.length; i++) {
    var prop = selectedProperties[i];
    
    // プロパティの所属レイヤーとプロパティ名を取得
    var propName = prop.name;
    var layerName = "";
    try {
        var currentGroup = prop.propertyGroup(prop.propertyDepth);
        while (currentGroup) {
            if (currentGroup instanceof AVLayer) {
                layerName = currentGroup.name;
                break;
            }
            currentGroup = currentGroup.propertyGroup(currentGroup.propertyDepth);
        }
    } catch (e) {
        $.writeln("Warning: Could not get layer name for property: " + propName);
    }
    
    // 連続するキーフレームペアに対してイージングを適用
    for (var j = 0; j < selectedKeys.length - 1; j++) {
        var keyIndex1 = selectedKeys[j];
        var keyIndex2 = selectedKeys[j + 1];
        
        if (isConsecutive) {
            // このプロパティと区間にマッチする設定を探す
            var segmentSettings = null;
            for (var k = 0; k < segmentsData.segments.length; k++) {
                var seg = segmentsData.segments[k];
                if (seg.propertyName === propName && 
                    seg.layerName === layerName &&
                    seg.keyIndex1 === keyIndex1 &&
                    seg.keyIndex2 === keyIndex2) {
                    segmentSettings = seg;
                    break;
                }
            }
            
            if (segmentSettings) {
                // 正しい設定を適用
            } else {
                $.writeln("WARNING: No matching segment settings found");
            }
        }
    }
}
```

### 変更点
1. ❌ `globalSegmentCounter` を削除
2. ✅ レイヤー名の取得処理を追加
3. ✅ 各区間で設定を検索してマッチング
4. ✅ マッチング条件: `layerName`, `propertyName`, `keyIndex1`, `keyIndex2`
5. ✅ マッチしない場合は警告を出力

---

## 修正の効果

### Before
- 異なるレイヤー間での同時Apply: ❌ 順序依存で失敗
- 時間重複がある場合: ❌ 明らかに間違った結果

### After
- 異なるレイヤー間での同時Apply: ✅ 正確にマッチング
- 時間重複がある場合: ✅ 各レイヤーに正しい設定を適用
- パフォーマンス: 設定数が少ない限り問題なし（O(n×m)だが実用上小さい）

---

## テスト推奨ケース

1. **基本ケース**: 2つの異なるレイヤー、時間が重複
   - レイヤーA X Position: 0秒→2秒
   - レイヤーB X Position: 1秒→3秒
   
2. **3レイヤー**: 
   - レイヤーA: 0秒→2秒
   - レイヤーB: 1秒→3秒
   - レイヤーC: 2秒→4秒

3. **選択順序テスト**: 
   - 下から上に選択
   - 上から下に選択
   - ランダムに選択

4. **異なるプロパティ**:
   - レイヤーA Position: 0秒→2秒
   - レイヤーB Scale: 1秒→3秒

---

## 今後の改善案

### 最適化（必要に応じて）
現在の実装はO(n×m)の検索（n=プロパティ数, m=設定数）。設定数が多い場合は以下を検討：

```javascript
// 設定をハッシュマップ化（初回のみ）
var settingsMap = {};
for (var k = 0; k < segmentsData.segments.length; k++) {
    var seg = segmentsData.segments[k];
    var key = seg.layerName + "|" + seg.propertyName + "|" + seg.keyIndex1 + "|" + seg.keyIndex2;
    settingsMap[key] = seg;
}

// O(1)で検索
var key = layerName + "|" + propName + "|" + keyIndex1 + "|" + keyIndex2;
var segmentSettings = settingsMap[key];
```

ただし、現実的には設定数は少ないため、現在の実装で十分。

---

## 備考

- JavaScript側（main.js）は変更不要。既に`layerName`と`propertyName`を含めている
- ExtendScript側のマッチングロジックを改善しただけで問題解決
- ログ出力を強化したため、問題発生時のデバッグが容易
