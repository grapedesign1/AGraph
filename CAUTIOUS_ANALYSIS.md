# 慎重な現状分析と修正計画

**作成日**: 2025年12月5日  
**目的**: 既存機能への影響を完全に理解した上で安全な修正を行う

---

## 1. 現状の完全な理解

### Vertical モードの動作（既存・正常動作）

**CSS構造:**
```css
.screen[data-layout="vertical"] .section-graph {
  flex: 0 0 400px;    /* 固定高さ400px */
  min-height: 150px;
}

.div-graph {
  flex: 1;            /* 親の残りスペースを占有 */
  aspect-ratio: 1;    /* 正方形を維持 */
}
```

**動作:**
1. `section-graph` は `flex: 0 0 400px` で400px固定
2. `div-graph` は `flex: 1` で親内で最大化
3. `aspect-ratio: 1` で正方形を維持
4. 結果: 約400×400pxの正方形グラフ

**Resizeバーの動作:**
```javascript
// Y軸で section-graph の flexBasis を変更
graphSection.style.flexBasis = `${newGraphHeight}px`;
presetSection.style.flexBasis = `${newPresetHeight}px`;

// 保存
csInterface.evalScript(`savePreference("resizeBarGraphHeight", "${currentGraphHeight}")`);
```

**復元:**
```javascript
// 起動時に読み込み
graphSection.style.flexBasis = `${graphHeight}px`;
presetSection.style.flexBasis = `${presetHeight}px`;
```

**✅ Verticalモードは完璧に動作している**

---

### Horizontal モードの動作（新規・問題あり）

**CSS構造:**
```css
.screen[data-layout="horizontal"] .mian-div {
  display: grid;
  grid-template-columns: auto 4px 1fr;
  grid-template-rows: auto auto;
}

.screen[data-layout="horizontal"] .section-graph {
  grid-column: 1;
  grid-row: 1;
  flex: 1;            /* ← これが問題の原因 */
}

.screen[data-layout="horizontal"] .div-graph {
  width: 300px;       /* CSS固定値 */
  height: 300px;      /* CSS固定値 */
  flex: 0 0 auto;
  aspect-ratio: 1;
}
```

**Grid Row 1 の高さ計算:**
```
Row 1 Height = max(
  section-graph の高さ,  // div-graph(300px) + padding + UI overlay
  section-group の高さ   // 約60px
)
= 約320px (div-graph 300px + その他)
```

**プリセット配置問題:**
```
┌─────────────┬───────────────┐
│ Graph       │ Group         │ ← Row 1 (320px)
│ 300x300     │ 60px height   │
│             ├───────────────┤ ← Row 2 starts here (320px下)
│             │ Presets       │
└─────────────┴───────────────┘
              ↑ 260px gap!
```

**現在のJS対策:**
```javascript
// margin-top で引き上げる
const marginTop = -(graphSectionHeight) + gap * 2;
presetSection.style.marginTop = `${marginTop}px`;
```

**Resizeバーの動作:**
```javascript
// X軸で div-graph のサイズを変更
graphContainer.style.width = `${newGraphWidth}px`;
graphContainer.style.height = `${newGraphWidth}px`;

// マージンも再計算
updatePresetMarginForResize(newGraphWidth);

// 保存
csInterface.evalScript(`savePreference("resizeBarGraphWidth", "${currentGraphWidth}")`);
```

---

## 2. 問題の詳細分析

### 問題1: 初期状態でプリセットが上詰めにならない

**発生タイミング:**
- Horizontalモードで起動
- `setupResizeBar()` が実行される

**コードフロー:**
```javascript
// setupResizeBar() 内
csInterface.evalScript('loadPreference("resizeBarGraphWidth")', function(result) {
    // ↑ 非同期で実行
    const graphWidth = parseFloat(data.value);
    graphContainer.style.width = `${graphWidth}px`;
    graphContainer.style.height = `${graphWidth}px`;
    updatePresetMarginForResize(graphWidth);  // ← ここで計算
});
```

**問題点:**
1. `loadPreference` は**非同期**
2. DOMレンダリングのタイミングと競合
3. `updatePresetMarginForResize()` 実行時、`graphSection.offsetHeight` がまだ確定していない可能性

**検証方法:**
```javascript
console.log('[setupResizeBar] graphSection.offsetHeight:', graphSection.offsetHeight);
```
→ おそらく `0` または不正確な値

**なぜResizeバーを触ると直る？**
- Resize時は `updatePresetMarginForResize()` が再度実行される
- その時点ではDOMが完全にレンダリング済み
- `graphSection.offsetHeight` が正しい値

---

### 問題2: レイアウト切り替え時にグラフが正方形でなくなる

**発生タイミング:**
- Vertical → Horizontal または Horizontal → Vertical

**Vertical → Horizontal の場合:**

```javascript
// toggleLayout() 内
setTimeout(() => {
    csInterface.evalScript('loadPreference("resizeBarGraphWidth")', function(result) {
        // ↑ 非同期
        graphContainer.style.width = `${graphSize}px`;
        graphContainer.style.height = `${graphSize}px`;
    });
}, 50);
```

**問題:**
1. `data-layout` 属性が変わる → CSSが切り替わる
2. CSS: `width: 300px; height: 300px;` が適用される
3. しかし `setTimeout(50ms)` 後に非同期で読み込み
4. その間、一時的に不正なサイズになる可能性

**タイムライン:**
```
0ms:    data-layout="horizontal" 設定
        CSS: width: 300px, height: 300px 適用

50ms:   setTimeout 発火
        loadPreference 開始（非同期）

50+?ms: loadPreference 完了
        style.width/height 設定
```

**競合状態:**
- CSS と JS が異なるタイミングでサイズを設定
- レンダリングエンジンがどちらを優先するか不定

---

### 問題3: `updatePresetMarginForResize()` の設計問題

**現在の関数:**
```javascript
function updatePresetMarginForResize(graphSize) {
    // graphSize 引数を受け取るが使用していない ← 混乱の元
    const graphSectionHeight = graphSection.offsetHeight;
    const marginTop = -(graphSectionHeight) + gap * 2;
    presetSection.style.marginTop = `${marginTop}px`;
}
```

**呼び出し箇所:**
1. `setupResizeBar()` 起動時: `updatePresetMarginForResize(graphWidth)` 
2. `toggleLayout()`: `updatePresetMarginForResize(graphSize)`
3. `Resize中`: `updatePresetMarginForResize(newGraphWidth)`

**問題:**
- 引数名が `graphSize` だが、実際には `graphSection.offsetHeight` を使用
- `graphSize` = グラフの幅（200-600px）
- `graphSection.offsetHeight` = セクション全体の高さ（300px + padding + UI）
- 引数が無視されているため、呼び出し側が混乱

---

## 3. 影響範囲の特定

### Verticalモードへの影響チェック

**CSS:**
```css
/* Verticalモードでは .div-graph にサイズ指定なし */
.div-graph {
  flex: 1;           /* 共通CSS */
  aspect-ratio: 1;   /* 共通CSS */
}
```

**JS:**
```javascript
// Vertical → Horizontal 切り替え時
graphContainer.style.width = `${graphSize}px`;   // 設定
graphContainer.style.height = `${graphSize}px`;  // 設定

// Horizontal → Vertical 切り替え時
graphContainer.style.width = '';   // リセット
graphContainer.style.height = '';  // リセット
```

**検証結果:**
- `style.width = ''` でインラインスタイルが削除される
- CSS の `flex: 1` が再度有効になる
- **✅ Verticalモードには影響なし**

---

### Resizeバー機能への影響チェック

**Vertical Resize:**
```javascript
if (layoutMode === 'vertical') {
    graphSection.style.flexBasis = newGraphHeight + 'px';
    presetSection.style.flexBasis = newPresetHeight + 'px';
}
```
- **✅ 影響なし（独立した処理）**

**Horizontal Resize:**
```javascript
else {
    graphContainer.style.width = `${newGraphWidth}px`;
    graphContainer.style.height = `${newGraphWidth}px`;
    updatePresetMarginForResize(newGraphWidth);
}
```
- **⚠️ `updatePresetMarginForResize()` を修正すると影響あり**

---

### グラフ描画への影響チェック

**グラフ描画は Canvas要素:**
```html
<div class="div-graph">
  <div class="graph">
    <canvas id="easingCanvas"></canvas>
  </div>
</div>
```

**Canvas サイズ:**
```javascript
// main.js 内
const canvas = document.getElementById('easingCanvas');
canvas.width = canvas.offsetWidth * dpr;
canvas.height = canvas.offsetHeight * dpr;
```

**検証:**
- Canvas は親 `.div-graph` のサイズに依存
- `.div-graph` のサイズが変われば Canvas も変わる
- **⚠️ グラフサイズ変更時は Canvas 再描画が必要**

**既存の対策:**
```javascript
// handleMouseUp 内
setTimeout(() => {
    if (graphData && graphData.keyframes && graphData.keyframes.length > 0) {
        redrawNPointCurve();  // ← 再描画している
    }
}, 0);
```
- **✅ 既に対策済み**

---

## 4. 安全な修正計画

### 原則
1. **Verticalモードには一切触らない**
2. **既存の動作を壊さない**
3. **段階的にテスト可能**
4. **ロールバック可能**

### Phase 1: タイミング問題の解決（最優先）

**目標:** DOMレンダリング完了後に確実に実行

**修正箇所:** `setupResizeBar()` と `restoreLayoutMode()`

**方針:**
- `requestAnimationFrame` を使用
- 2重 `requestAnimationFrame` でレンダリング完了を保証
- `setTimeout` は削除

**実装:**
```javascript
// setupResizeBar() 内
csInterface.evalScript('loadPreference("resizeBarGraphWidth")', function(result) {
    try {
        const data = JSON.parse(result);
        if (data.success && data.value && getLayoutMode() === 'horizontal') {
            const graphWidth = parseFloat(data.value);
            if (!isNaN(graphWidth) && graphWidth >= 200) {
                const graphContainer = document.querySelector('.div-graph');
                if (graphContainer) {
                    // サイズ設定
                    graphContainer.style.width = `${graphWidth}px`;
                    graphContainer.style.height = `${graphWidth}px`;
                    
                    // レンダリング完了後にマージン計算
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            updatePresetMarginForResize(graphWidth);
                        });
                    });
                }
            }
        }
    } catch (e) {}
});
```

**リスク:** 低  
**影響範囲:** Horizontal初期化のみ  
**ロールバック:** 簡単（`requestAnimationFrame` を `setTimeout` に戻す）

---

### Phase 2: 関数の明確化（副作用最小）

**目標:** `updatePresetMarginForResize()` の混乱を解消

**修正:**
```javascript
// 引数を削除（使ってないので）
function updatePresetMargin() {  // 関数名も変更
    const presetSection = document.querySelector('.section-1');
    const graphSection = document.querySelector('.section-graph');
    const screen = document.querySelector('.screen');
    const layoutMode = screen ? screen.getAttribute('data-layout') : 'vertical';
    
    if (layoutMode !== 'horizontal') {
        // Verticalモードではリセット
        if (presetSection) {
            presetSection.style.marginTop = '';
        }
        return;
    }
    
    if (presetSection && graphSection) {
        const graphSectionHeight = graphSection.offsetHeight;
        const gap = 8;
        const marginTop = -(graphSectionHeight) + gap * 2;
        presetSection.style.marginTop = `${marginTop}px`;
        
        // デバッグログ
        console.log('[updatePresetMargin]', {
            layoutMode,
            graphSectionHeight,
            marginTop
        });
    }
}
```

**呼び出し側を全て変更:**
```javascript
// 引数なしで呼び出す
updatePresetMargin();
```

**リスク:** 低  
**影響範囲:** Horizontalモードのみ  
**ロールバック:** 簡単（関数名を戻す）

---

### Phase 3: レイアウト切り替えの改善

**目標:** Vertical ⟷ Horizontal 切り替え時のグラフサイズ問題を解決

**修正:** `toggleLayout()` 内の非同期処理を整理

**実装:**
```javascript
function toggleLayout() {
    const screen = document.querySelector('.screen');
    const layoutIcon = document.getElementById('layoutToggleIcon');
    
    if (!screen) return;
    
    const currentLayout = screen.getAttribute('data-layout');
    const newLayout = currentLayout === 'vertical' ? 'horizontal' : 'vertical';
    
    // data-layout 更新
    screen.setAttribute('data-layout', newLayout);
    
    // アイコン更新
    if (layoutIcon) {
        const iconSrc = newLayout === 'vertical' ? 'img/horizontal.svg' : 'img/vertical.svg';
        layoutIcon.src = iconSrc;
    }
    
    // 保存
    csInterface.evalScript(`savePreference("layoutMode", "${newLayout}")`);
    
    // グラフサイズとマージンの設定
    const graphContainer = document.querySelector('.div-graph');
    
    if (newLayout === 'horizontal') {
        // Horizontalに切り替え
        csInterface.evalScript('loadPreference("resizeBarGraphWidth")', function(result) {
            let graphSize = 300; // デフォルト
            try {
                const data = JSON.parse(result);
                if (data.success && data.value) {
                    graphSize = parseFloat(data.value);
                    if (isNaN(graphSize) || graphSize < 200) graphSize = 300;
                }
            } catch (e) {}
            
            if (graphContainer) {
                graphContainer.style.width = `${graphSize}px`;
                graphContainer.style.height = `${graphSize}px`;
            }
            
            // レンダリング完了後にマージン計算
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    updatePresetMargin();
                });
            });
        });
    } else {
        // Verticalに戻す
        if (graphContainer) {
            graphContainer.style.width = '';
            graphContainer.style.height = '';
        }
        
        const presetSection = document.querySelector('.section-1');
        if (presetSection) {
            presetSection.style.marginTop = '';
        }
    }
}
```

**リスク:** 中  
**影響範囲:** レイアウト切り替え時  
**ロールバック:** 可能（元のコードに戻す）

---

### Phase 4: デバッグログの追加（検証用）

**目標:** 実際の値を確認できるようにする

**追加箇所:**
1. `updatePresetMargin()` 内
2. `setupResizeBar()` 内
3. `toggleLayout()` 内

**実装例:**
```javascript
console.log('[Function Name] 詳細情報', {
    layoutMode,
    graphSectionHeight,
    graphContainerWidth,
    offsetHeight,
    calculatedMargin,
    timestamp: Date.now()
});
```

**リスク:** なし  
**影響範囲:** なし（ログのみ）  
**削除:** 簡単（本番前に削除）

---

## 5. テスト計画

### テストケース

#### TC1: Verticalモードの動作確認
1. Verticalモードで起動
2. グラフが正方形であることを確認
3. Resizeバーで高さ調整
4. 再起動後、サイズが保持されていることを確認

**期待結果:** 既存動作と完全に同じ  
**リスク:** 低

---

#### TC2: Horizontalモード初期化
1. Horizontalモードで起動
2. プリセットが上詰めであることを確認
3. グラフが正方形であることを確認

**期待結果:** プリセットがGroupの直下に配置される  
**リスク:** 中（新機能）

---

#### TC3: Horizontal Resize
1. Horizontalモードで起動
2. Resizeバーで幅を調整（200px → 400px）
3. プリセットが常に上詰めを維持することを確認
4. 再起動後、サイズが保持されていることを確認

**期待結果:** Resize中もプリセット位置が追従  
**リスク:** 中

---

#### TC4: レイアウト切り替え（Vertical → Horizontal）
1. Verticalモードで起動
2. Horizontalに切り替え
3. グラフが正方形であることを確認
4. プリセットが上詰めであることを確認

**期待結果:** 正しく切り替わる  
**リスク:** 高（非同期処理）

---

#### TC5: レイアウト切り替え（Horizontal → Vertical）
1. Horizontalモードで起動
2. Verticalに切り替え
3. グラフが正方形であることを確認
4. プリセット位置が正常であることを確認

**期待結果:** 正しく切り替わる  
**リスク:** 中

---

#### TC6: 繰り返し切り替え
1. Vertical → Horizontal → Vertical → Horizontal
2. 各切り替え後、グラフとプリセットが正常であることを確認

**期待結果:** 何度切り替えても正常動作  
**リスク:** 高（状態管理）

---

## 6. 実装順序

### Step 1: Phase 1 のみ実装
- `requestAnimationFrame` 導入
- デバッグログ追加
- TC2, TC3 でテスト

### Step 2: Phase 2 実装
- 関数の明確化
- 全TCでテスト

### Step 3: Phase 3 実装
- レイアウト切り替え改善
- TC4, TC5, TC6 でテスト

### Step 4: デバッグログ削除
- 本番用にクリーンアップ

---

## 7. ロールバック計画

### Phase 1 失敗時
```javascript
// requestAnimationFrame を setTimeout に戻す
setTimeout(() => {
    updatePresetMarginForResize(graphWidth);
}, 200);
```

### Phase 2 失敗時
```javascript
// 関数名を戻す
function updatePresetMarginForResize(graphSize) {
    // 元のコード
}
```

### Phase 3 失敗時
```javascript
// toggleLayout() を元に戻す
// git revert を使用
```

---

## 8. 結論

### 推奨アプローチ

**Phase 1 から段階的に実装**
- リスクが低い
- テストしやすい
- ロールバック可能

### 実装しない選択肢

**CSSの変更は不要**
- 既存動作が壊れるリスク
- 追加のメリットが小さい

### 次のアクション

1. Phase 1 を実装
2. デバッグログで動作確認
3. 問題なければ Phase 2 へ
4. 問題あれば原因究明

---

**レポート終了**
