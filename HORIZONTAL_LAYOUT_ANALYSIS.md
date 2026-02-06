# Horizontal Layout実装 - 現状分析レポート

**作成日**: 2025年12月5日  
**コミット**: 6bfde8f

---

## 📋 目次

1. [実装概要](#実装概要)
2. [既知の問題](#既知の問題)
3. [技術的背景](#技術的背景)
4. [問題の根本原因分析](#問題の根本原因分析)
5. [試行錯誤の履歴](#試行錯誤の履歴)
6. [現在のコード状態](#現在のコード状態)
7. [次のアプローチ案](#次のアプローチ案)

---

## 実装概要

### 目的
After Effects CEP拡張機能AccelCurveに、Vertical/Horizontalの2つのレイアウトモードを実装。

### 実装済み機能

✅ **レイアウト切り替え**
- ボタンクリックでVertical ⟷ Horizontal切り替え
- `data-layout="vertical|horizontal"` 属性でCSSを切り替え
- アイコン表示（次に切り替わるモードを表示）
- 選択状態を `layoutMode.txt` に永続化

✅ **Resizeバー**
- Verticalモード: Y軸ドラッグで高さ調整
- Horizontalモード: X軸ドラッグで幅調整
- 各モード独立のサイズ保存
  - `resizeBarGraphHeight.txt` (Vertical)
  - `resizeBarGraphWidth.txt` (Horizontal)

✅ **プリセット上詰め配置**
- 動的 `margin-top` 計算で実現
- 計算式: `margin-top = -(graphSection.offsetHeight) + gap * 2`

---

## 既知の問題

### 🔴 問題1: 初期状態でプリセットが上詰めにならない

**現象:**
- Horizontalモードで起動した直後、プリセットが下に配置される
- Resizeバーを触ると正しく上詰めになる

**症状詳細:**
```
起動直後:
┌─────────────┬───────────────┐
│   Graph     │   Group       │ ← 正常
│             │               │
│             ├───────────────┤
│             │               │ ← ここに余白
│   300x300   │   Presets     │ ← 下に配置される
└─────────────┴───────────────┘

Resize後:
┌─────────────┬───────────────┐
│   Graph     │   Group       │
│             ├───────────────┤
│             │   Presets     │ ← 正しく上詰め
│   300x300   │               │
└─────────────┴───────────────┘
```

### 🔴 問題2: レイアウト切り替え時にグラフが正方形でなくなる

**現象:**
- Vertical → Horizontal または Horizontal → Vertical に切り替え
- グラフの `width` と `height` が不一致になる
- Resizeバーを触ると正方形に戻る

**症状詳細:**
```css
/* 切り替え直後 */
.div-graph {
  width: ???px;   /* 不明な値 */
  height: ???px;  /* width と異なる */
}

/* Resize後 */
.div-graph {
  width: 300px;
  height: 300px;  /* 正方形に戻る */
}
```

---

## 技術的背景

### CSS Grid構造 (Horizontal モード)

```
grid-template-columns: auto 4px 1fr;
grid-template-rows: auto auto;

┌─────────────┬────┬─────────────┐
│ Graph Area  │ R  │ Group Area  │  Row 1 (auto)
│ (col 1)     │ e  │ (col 3)     │
│             │ s  │             │
│             │ i  ├─────────────┤
│             │ z  │ Preset Area │  Row 2 (auto)
│             │ e  │ (col 3)     │
└─────────────┴────┴─────────────┘
```

### 問題の構造的原因

**Grid Row 1 の高さ決定メカニズム:**
```
Row 1 Height = max(Graph Area height, Group Area height)
             = max(300px+, 60px)
             = 300px+
```

**結果:**
- Row 2 は Row 1 の下端から始まる
- Preset Area は Row 2 に配置される
- → Group の直下ではなく、Graph の下端に配置される

**解決策:**
- `margin-top: -(Row 1 Height) + gap` で上に引き上げる
- この計算が正しく動作するには `graphSection.offsetHeight` が必要
- → **DOMの完全なレンダリング後でないと正しい値が取れない**

---

## 問題の根本原因分析

### 問題1: 初期化タイミング

**現在の実装:**
```javascript
// restoreLayoutMode() 内
if (layout === 'horizontal') {
    setTimeout(() => {
        const graphContainer = document.querySelector('.div-graph');
        if (graphContainer) {
            const graphSize = graphContainer.offsetWidth || 300;
            updatePresetMarginForResize(graphSize);
        }
    }, 200);
}
```

**問題点:**
1. `graphContainer.offsetWidth` を使用している
   - しかし必要なのは `graphSection.offsetHeight`
2. `setTimeout(200ms)` は不確実
   - DOMレンダリングタイミングに依存
   - 環境によっては足りない/長すぎる可能性

**正しい値の比較:**
```javascript
graphContainer.offsetWidth  // グラフcanvasの幅 (300px)
graphSection.offsetHeight   // グラフセクション全体の高さ (300px + padding + UI)
```

### 問題2: レイアウト切り替え時のグラフサイズ

**現在の実装:**
```javascript
// toggleLayout() 内 - Horizontalに切り替え時
csInterface.evalScript('loadPreference("resizeBarGraphWidth")', function(result) {
    // 非同期で読み込み
    graphContainer.style.width = `${graphSize}px`;
    graphContainer.style.height = `${graphSize}px`;
});
```

**問題点:**
1. 非同期処理で値を設定
   - CSSの切り替えとタイミングがずれる
2. Verticalに戻す時の処理
   ```javascript
   graphContainer.style.width = '';
   graphContainer.style.height = '';
   ```
   - これが正しく機能しているか不明

**CSS側の定義:**
```css
/* Vertical モード */
.screen[data-layout="vertical"] .div-graph {
  /* width/height の明示的指定なし */
  flex: 1;
  aspect-ratio: 1;
}

/* Horizontal モード */
.screen[data-layout="horizontal"] .div-graph {
  width: 300px;    /* 固定値 */
  height: 300px;   /* 固定値 */
  flex: 0 0 auto;
  aspect-ratio: 1;
}
```

**矛盾:**
- CSS では Horizontal で `width: 300px` を指定
- JS で動的にサイズを設定しようとしている
- → 両方が競合している可能性

---

## 試行錯誤の履歴

### 試行1: タイミング調整
```javascript
setTimeout(100ms) → 200ms
```
**結果:** ❌ 変わらない  
**学び:** タイミングでは解決しない

### 試行2: グラフサイズ読み込み
```javascript
// toggleLayout で resizeBarGraphWidth.txt を読み込み
csInterface.evalScript('loadPreference("resizeBarGraphWidth")')
```
**結果:** ❌ 変わらない  
**学び:** 非同期処理のタイミング問題

### 試行3: Verticalモードのリセット処理追加
```javascript
graphContainer.style.width = '';
graphContainer.style.height = '';
```
**結果:** ✅ Vertical復帰は改善  
**問題:** Horizontal初期化は未解決

---

## 現在のコード状態

### setupResizeBar() - 起動時の読み込み

```javascript
// Horizontalモード用: グラフ幅を読み込み
csInterface.evalScript('loadPreference("resizeBarGraphWidth")', function(result) {
    try {
        const data = JSON.parse(result);
        if (data.success && data.value && getLayoutMode() === 'horizontal') {
            const graphWidth = parseFloat(data.value);
            if (!isNaN(graphWidth) && graphWidth >= 200) {
                const graphContainer = document.querySelector('.div-graph');
                if (graphContainer) {
                    graphContainer.style.width = `${graphWidth}px`;
                    graphContainer.style.height = `${graphWidth}px`;
                    updatePresetMarginForResize(graphWidth);  // ← ここ
                }
            }
        }
    } catch (e) {
        // エラー時無視
    }
});
```

**問題:**
- `updatePresetMarginForResize(graphWidth)` を呼んでいる
- しかし関数内では `graphSection.offsetHeight` を使用
- `graphWidth` 引数は使われていない

### updatePresetMarginForResize() - マージン計算

```javascript
function updatePresetMarginForResize(graphSize) {
    const presetSection = document.querySelector('.section-1');
    const graphSection = document.querySelector('.section-graph');
    const screen = document.querySelector('.screen');
    const layoutMode = screen ? screen.getAttribute('data-layout') : 'vertical';
    
    if (presetSection && graphSection && layoutMode === 'horizontal') {
        // グラフセクションの実際の高さを取得
        const graphSectionHeight = graphSection.offsetHeight;
        const gap = 8;
        // graphSize 引数は使われていない ←
        const marginTop = -(graphSectionHeight) + gap * 2;
        presetSection.style.marginTop = `${marginTop}px`;
    }
}
```

**問題:**
- 引数 `graphSize` を受け取るが使用していない
- 関数名が「ForResize」だが、初期化でも使用している
- `graphSection.offsetHeight` が正しい値かどうかタイミング依存

### restoreLayoutMode() - 起動時の復元

```javascript
if (layout === 'horizontal') {
    setTimeout(() => {
        const graphContainer = document.querySelector('.div-graph');
        if (graphContainer) {
            const graphSize = graphContainer.offsetWidth || 300;  // ← 不適切
            updatePresetMarginForResize(graphSize);
        }
    }, 200);  // ← マジックナンバー
}
```

**問題:**
- `offsetWidth` を取得しているが使われない
- `setTimeout(200ms)` が環境依存

---

## 次のアプローチ案

### 案1: DOMContentLoaded後の確実な初期化

**アプローチ:**
```javascript
function ensureLayoutInitialized() {
    const layoutMode = getLayoutMode();
    
    if (layoutMode === 'horizontal') {
        // 1. グラフサイズの復元
        const graphContainer = document.querySelector('.div-graph');
        const savedWidth = loadSavedGraphWidth(); // 同期的に取得
        
        if (graphContainer && savedWidth) {
            graphContainer.style.width = `${savedWidth}px`;
            graphContainer.style.height = `${savedWidth}px`;
        }
        
        // 2. 次フレームでマージン計算（レンダリング完了後）
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updatePresetMargin();
            });
        });
    }
}
```

**メリット:**
- `requestAnimationFrame` でレンダリング完了を保証
- タイミングの問題を解消

**デメリット:**
- ExtendScript通信が非同期なので同期取得は不可能

### 案2: CSS変数で値を共有

**アプローチ:**
```javascript
// JSでグラフサイズを設定時
graphContainer.style.width = `${size}px`;
graphContainer.style.height = `${size}px`;
document.documentElement.style.setProperty('--graph-size', `${size}px`);

// CSS側
.section-1 {
    margin-top: calc(-1 * var(--graph-size) + 16px);
}
```

**メリット:**
- CSS変数を使えばJSの計算が不要
- レンダリングエンジンが自動計算

**デメリット:**
- `graphSection.offsetHeight` は `graphSize` とは異なる
- padding/margin を含むため単純な変換不可

### 案3: MutationObserverで変更を監視

**アプローチ:**
```javascript
const observer = new MutationObserver(() => {
    if (getLayoutMode() === 'horizontal') {
        updatePresetMargin();
    }
});

observer.observe(screen, {
    attributes: true,
    attributeFilter: ['data-layout']
});
```

**メリット:**
- レイアウト変更を確実に検知
- タイミング問題を回避

**デメリット:**
- 初期化時には発火しない
- 追加の複雑性

### 案4: グラフサイズをCSSから完全に除去

**アプローチ:**
```css
/* CSS側では一切サイズ指定しない */
.screen[data-layout="horizontal"] .div-graph {
    /* width/height削除 */
    aspect-ratio: 1;
}
```

```javascript
// JS側で常に管理
function applyGraphSize(size) {
    const graphContainer = document.querySelector('.div-graph');
    if (graphContainer) {
        graphContainer.style.width = `${size}px`;
        graphContainer.style.height = `${size}px`;
    }
}
```

**メリット:**
- 単一の真実の情報源（JS）
- CSS/JSの競合がない

**デメリット:**
- CSS側のデフォルト値がない
- 初期表示時に一瞬サイズ0になる可能性

### 案5: 初期化フラグで二重実行を防ぐ

**アプローチ:**
```javascript
let horizontalLayoutInitialized = false;

function initializeHorizontalLayout() {
    if (horizontalLayoutInitialized) return;
    
    // 初期化処理
    const graphSection = document.querySelector('.section-graph');
    if (!graphSection || graphSection.offsetHeight === 0) {
        // DOMが準備できていない
        requestAnimationFrame(() => initializeHorizontalLayout());
        return;
    }
    
    // 実際の初期化
    updatePresetMargin();
    horizontalLayoutInitialized = true;
}
```

**メリット:**
- 確実に一度だけ実行
- DOM準備完了を確認

**デメリット:**
- 複雑性が増す
- フラグ管理が必要

---

## 推奨アプローチ

### 🎯 案4 + 案1の組み合わせ

**理由:**
1. CSS側のサイズ指定を削除 → 競合を排除
2. JS側で完全に管理 → 単一の真実の情報源
3. `requestAnimationFrame` で確実なタイミング制御

**実装手順:**

#### Step 1: CSS修正
```css
.screen[data-layout="horizontal"] .div-graph {
    /* width: 300px; 削除 */
    /* height: 300px; 削除 */
    aspect-ratio: 1;
    min-width: 200px;
    min-height: 200px;
}
```

#### Step 2: 起動時初期化の整理
```javascript
function initializeGraphSize() {
    const layoutMode = getLayoutMode();
    const graphContainer = document.querySelector('.div-graph');
    
    if (!graphContainer) return;
    
    if (layoutMode === 'horizontal') {
        // 保存された値を読み込み（非同期）
        csInterface.evalScript('loadPreference("resizeBarGraphWidth")', function(result) {
            let size = 300; // デフォルト
            try {
                const data = JSON.parse(result);
                if (data.success && data.value) {
                    size = parseFloat(data.value);
                    if (isNaN(size) || size < 200) size = 300;
                }
            } catch (e) {}
            
            // サイズ適用
            graphContainer.style.width = `${size}px`;
            graphContainer.style.height = `${size}px`;
            
            // 次フレームでマージン計算
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    updatePresetMargin();
                });
            });
        });
    } else {
        // Verticalモードはリセット
        graphContainer.style.width = '';
        graphContainer.style.height = '';
    }
}
```

#### Step 3: マージン計算関数の簡素化
```javascript
function updatePresetMargin() {
    const layoutMode = getLayoutMode();
    
    if (layoutMode !== 'horizontal') {
        // Verticalモードではリセット
        const presetSection = document.querySelector('.section-1');
        if (presetSection) {
            presetSection.style.marginTop = '';
        }
        return;
    }
    
    const presetSection = document.querySelector('.section-1');
    const graphSection = document.querySelector('.section-graph');
    
    if (!presetSection || !graphSection) return;
    
    const graphSectionHeight = graphSection.offsetHeight;
    const gap = 8;
    const marginTop = -graphSectionHeight + gap * 2;
    
    presetSection.style.marginTop = `${marginTop}px`;
    
    console.log('[updatePresetMargin]', {
        graphSectionHeight,
        marginTop,
        layoutMode
    });
}
```

#### Step 4: toggleLayout の簡素化
```javascript
function toggleLayout() {
    const screen = document.querySelector('.screen');
    if (!screen) return;
    
    const currentLayout = screen.getAttribute('data-layout');
    const newLayout = currentLayout === 'vertical' ? 'horizontal' : 'vertical';
    
    // data-layout 更新
    screen.setAttribute('data-layout', newLayout);
    
    // アイコン更新
    updateLayoutIcon(newLayout);
    
    // 保存
    csInterface.evalScript(`savePreference("layoutMode", "${newLayout}")`);
    
    // グラフサイズとマージンを初期化
    initializeGraphSize();
}
```

---

## まとめ

### 問題の本質
1. **CSSとJSでサイズ管理が競合**
2. **非同期処理のタイミング制御が不適切**
3. **DOM レンダリング完了前に計算を実行**

### 解決の方向性
- **単一の真実の情報源**: JSでサイズを完全管理
- **確実なタイミング制御**: `requestAnimationFrame` 使用
- **コードの簡素化**: 関数の責務を明確化

### 次のステップ
1. CSS から `width/height` 固定値を削除
2. 初期化ロジックを `initializeGraphSize()` に集約
3. `updatePresetMargin()` を引数なしに簡素化
4. `requestAnimationFrame` でタイミング保証
5. デバッグログで動作確認

---

**レポート終了**
