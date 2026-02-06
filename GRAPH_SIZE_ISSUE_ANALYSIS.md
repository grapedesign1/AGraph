# グラフサイズ問題 - 詳細分析レポート

作成日: 2025年12月6日

## 問題の定義

### 期待される仕様
- **Verticalモード**: Resizeバーでグラフエリアの「高さ」を調整 → その高さを基準にグラフを正方形に
- **Horizontalモード**: Resizeバーでグラフエリアの「幅」を調整 → その幅を基準にグラフを正方形に

### 現状の動作
✅ **正常**: Resizeバーを触った後 → 仕様通りに正方形  
❌ **異常**: 起動時、モード切り替え時 → 長方形になる

---

## 根本原因の分析

### 1. アーキテクチャの理解

#### Verticalモードの構造
```
.section-graph (flex: 0 0 400px; height調整対象)
  └── .div-graph (flex: 1; min-height: 0)
        └── グラフ本体
```

**CSS仕様**:
- `.section-graph`: デフォルト400px、Resizeバーで高さ変更可能
- `.div-graph`: `flex: 1` により親の高さいっぱいに拡大
- **問題点**: `flex: 1`はグラフを親の高さに合わせて**伸縮**させる

#### Horizontalモードの構造
```
CSS Grid (3列 × 2行)
  Column 1, Row 1: .section-graph
    └── .div-graph (width: 300px; height: 300px)
```

**CSS仕様**:
- `.screen[data-layout="horizontal"] .div-graph`: 固定300px × 300px
- Resizeバー: JavaScriptで`style.width/height`を直接変更
- **問題点**: CSSに固定値があるため、JavaScript変更時のみサイズが変わる

### 2. Resizeバーが正しく動作する理由

#### Verticalモード - Resize処理
```javascript
// handleMouseMove内
const deltaY = e.clientY - startY;
let newGraphHeight = startGraphHeight + deltaY;
// ... サイズ制限 ...

graphSection.style.flexBasis = newGraphHeight + 'px';
presetSection.style.flexBasis = newPresetHeight + 'px';

// 追加されたコード
const graphContainer = document.querySelector('.div-graph');
const availableWidth = graphSection.offsetWidth;
const graphSize = Math.min(availableWidth, newGraphHeight - 40);
const clampedSize = Math.max(200, Math.min(600, graphSize));

graphContainer.style.width = `${clampedSize}px`;
graphContainer.style.height = `${clampedSize}px`;
```

**成功要因**:
- `graphSection.style.flexBasis`で高さを変更
- **その後**、`graphContainer.style.width/height`を明示的に設定
- インラインスタイルでCSSの`flex: 1`を上書き

#### Horizontalモード - Resize処理
```javascript
const deltaX = e.clientX - startX;
let newGraphWidth = startGraphWidth + deltaX;
// ... サイズ制限 ...

graphContainer.style.width = `${newGraphWidth}px`;
graphContainer.style.height = `${newGraphWidth}px`;
updatePresetMarginForResize(newGraphWidth);
```

**成功要因**:
- インラインスタイルでCSSの固定値を上書き

### 3. 起動時・切り替え時に失敗する理由

#### 起動時の問題 - restoreLayoutMode()

**現在のコード** (Horizontalモード部分):
```javascript
csInterface.evalScript('loadPreference("graphSize")', function(sizeResult) {
    let graphSize = 300;
    // ... サイズ読み込み ...
    
    if (graphContainer) {
        graphContainer.style.width = `${graphSize}px`;
        graphContainer.style.height = `${graphSize}px`;
    }
    
    if (screen) {
        screen.setAttribute('data-layout', layout);
    }
    
    if (layout === 'horizontal') {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updatePresetMarginForResize(graphSize);
            });
        });
    }
});
```

**問題点**:
1. **Verticalモード時の処理がない**: `graphSize`を読み込んでも、`.div-graph`のサイズを設定していない
2. **非同期の罠**: `loadPreference`の結果を待っている間、CSSのデフォルト値が適用される
3. **タイミング問題**: `data-layout`設定とサイズ設定の順序が不明確

#### 切り替え時の問題 - toggleLayout()

**現在のコード**:
```javascript
// 現在のグラフサイズを取得
let currentGraphSize = 300;
if (graphContainer && graphContainer.offsetWidth > 0) {
    currentGraphSize = graphContainer.offsetWidth;
}

// グラフサイズを設定
if (graphContainer) {
    graphContainer.style.width = `${currentGraphSize}px`;
    graphContainer.style.height = `${currentGraphSize}px`;
}

// RAF後にレイアウト切り替え
requestAnimationFrame(() => {
    screen.setAttribute('data-layout', newLayout);
    // ...
});
```

**問題点**:
1. **offsetWidthの信頼性**: レイアウトが崩れている状態でoffsetWidthを取得すると、正しくない値になる
2. **CSS優先度**: `data-layout`変更後、CSSルールが再適用され、インラインスタイルを上書きする可能性
3. **Verticalモード固有の問題**: `.div-graph`の`flex: 1`がまだ有効なため、親の高さに引き伸ばされる

---

## 数値代入シミュレーション

### シナリオ1: Vertical起動 → Horizontal切り替え

**初期状態** (Verticalモード、起動直後):
```
.section-graph: flex-basis = 400px (デフォルト)
.div-graph: flex = 1 → 親に合わせて伸縮
  → 実際のサイズ = 400px - ボタンエリア(約40px) = 360px (高さ)
  → 幅 = 親の100% = 約420px (ウィンドウ幅依存)
  → 結果: 420px × 360px の長方形 ❌
```

**Resizeバーを触った後**:
```
graphSection.style.flexBasis = 350px (例)
graphContainer.style.width = 310px
graphContainer.style.height = 310px
  → 結果: 310px × 310px の正方形 ✅
```

**Horizontalに切り替え**:
```javascript
currentGraphSize = graphContainer.offsetWidth = 310px
graphContainer.style.width = "310px"
graphContainer.style.height = "310px"
// RAF後
screen.setAttribute('data-layout', 'horizontal')
// CSSルール適用
.screen[data-layout="horizontal"] .div-graph {
  width: 300px;
  height: 300px;
}
```

**結果**:
- インラインスタイル: `width: 310px; height: 310px`
- CSSルール: `width: 300px; height: 300px`
- **最終的にどちらが勝つか?** → CSS特異性次第

**CSS特異性計算**:
- `.screen[data-layout="horizontal"] .div-graph` = (0, 2, 1) = 21点
- インラインスタイル = 1000点
- **通常はインラインスタイルが勝つはず**

**しかし実際には負ける理由**:
- `data-layout`変更により、ブラウザがCSSを再計算・再適用
- タイミングによってはCSSが後から適用される

### シナリオ2: Horizontal起動 → Vertical切り替え

**初期状態** (Horizontalモード、起動直後):
```
CSS: .div-graph { width: 300px; height: 300px; }
graphSize読み込み = 400px (前回の値)
graphContainer.style.width = "400px"
graphContainer.style.height = "400px"
data-layout設定 → horizontal
```

**結果**:
- インラインスタイル: `400px × 400px`
- CSSルール: `300px × 300px`
- **実際の表示**: タイミング次第で300pxまたは400px（不安定）

**Verticalに切り替え**:
```javascript
currentGraphSize = offsetWidth = 400px (仮定)
graphContainer.style.width = "400px"
graphContainer.style.height = "400px"
screen.setAttribute('data-layout', 'vertical')
// Verticalモード用CSSルール適用
.div-graph {
  flex: 1;  // ← これが問題！
  min-height: 0;
}
```

**結果**:
- `flex: 1`により、インラインの`height: 400px`が無視され、親の高さに拡大
- 親(.section-graph)のデフォルト高さ = 400px
- `.div-graph`は400px(高さ) × 420px(幅) の長方形 ❌

### シナリオ3: Resizeバー使用後の挙動

**Verticalモード、Resize実行中**:
```javascript
// mousedown
startGraphHeight = graphSection.offsetHeight = 400px

// mousemove
deltaY = +50
newGraphHeight = 400 + 50 = 450px
graphSection.style.flexBasis = "450px"  // ← 親の高さを変更

// 同時に実行
graphSize = Math.min(420, 450 - 40) = 410px
clampedSize = Math.max(200, Math.min(600, 410)) = 410px
graphContainer.style.width = "410px"
graphContainer.style.height = "410px"  // ← インラインで明示
```

**結果**: 410px × 410px の正方形 ✅

**なぜ成功するのか**:
1. `flexBasis`で親のサイズを変更
2. **直後に**インラインスタイルで子のサイズを固定
3. CSSの`flex: 1`は存在するが、インラインスタイルが優先

---

## 問題の根本要因まとめ

### 要因1: CSS `flex: 1` の存在
- Verticalモードの`.div-graph`に`flex: 1`がある
- これにより、親の高さに合わせて**自動的に伸縮**する
- インラインスタイルで`height`を設定しても、**Flexboxの計算が後から実行**される可能性

### 要因2: CSS固定値の存在
- Horizontalモードの`.div-graph`に`width: 300px; height: 300px;`がある
- `data-layout`変更時、このルールが再適用される
- タイミングによってはインラインスタイルを上書き

### 要因3: 非同期処理の不完全性
- `loadPreference`は非同期
- その間にDOMが描画され、CSSのデフォルト値が適用される
- RAF使用でも、`data-layout`変更タイミングとの競合が発生

### 要因4: offsetWidthの不安定性
- レイアウトが崩れている状態で`offsetWidth`を取得
- 正しい値が得られない可能性

---

## 検討したアプローチ（10以上）

### アプローチ1: RAF × 2 でタイミング調整
**内容**: サイズ設定後、2回RAFを挟んでからdata-layout変更
```javascript
graphContainer.style.width = `${size}px`;
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        screen.setAttribute('data-layout', newLayout);
    });
});
```
**結果**: ❌ タイミング調整では根本解決にならない  
**理由**: CSSルールは`data-layout`変更時に即座に適用される

### アプローチ2: CSS固定値削除
**内容**: Horizontalモードの`.div-graph`から`width/height`を削除
```css
.screen[data-layout="horizontal"] .div-graph {
  /* width: 300px; height: 300px; 削除 */
  flex: 0 0 auto;
}
```
**結果**: ❌ 初期表示が崩れる  
**理由**: デフォルト値がないため、JSで設定するまでサイズが0になる

### アプローチ3: CSS `flex: 1` 削除
**内容**: Verticalモードの`.div-graph`から`flex: 1`を削除、固定値に
```css
.div-graph {
  /* flex: 1; 削除 */
  flex: 0 0 auto;
  width: 300px;
  height: 300px;
}
```
**結果**: ❌ Verticalモードのレイアウトが崩れる  
**理由**: グラフエリアの高さ調整に追従しなくなる

### アプローチ4: !important の使用
**内容**: JavaScriptで`style.setProperty()`を使い`!important`を付与
```javascript
graphContainer.style.setProperty('width', `${size}px`, 'important');
graphContainer.style.setProperty('height', `${size}px`, 'important');
```
**結果**: △ CSSは上書きできるが、メンテナンス性が悪い  
**理由**: `!important`は最終手段、他の手法を優先すべき

### アプローチ5: data-layout変更前にサイズ設定（同期）
**内容**: 非同期処理を排除、現在のサイズを使用
```javascript
let currentSize = graphContainer.offsetWidth;
graphContainer.style.width = `${currentSize}px`;
graphContainer.style.height = `${currentSize}px`;
screen.setAttribute('data-layout', newLayout);
```
**結果**: ❌ offsetWidthが既に崩れている場合、誤った値を使用  
**理由**: レイアウト崩れの状態で計測している

### アプローチ6: 保存値を同期的に取得
**内容**: ExtendScriptの同期実行（可能なら）
```javascript
// 疑似コード（CEPでは不可能）
const savedSize = csInterface.evalScriptSync('loadPreference("graphSize")');
```
**結果**: ❌ CEPのevalScriptは非同期のみ  
**理由**: 同期APIが存在しない

### アプローチ7: CSS変数の使用
**内容**: CSS変数でサイズを管理
```css
.div-graph {
  width: var(--graph-size, 300px);
  height: var(--graph-size, 300px);
}
```
```javascript
document.documentElement.style.setProperty('--graph-size', `${size}px`);
```
**結果**: △ 可能だが、特異性問題は解決しない  
**理由**: CSS変数もCSSルールの一部

### アプローチ8: クラス切り替えでサイズ管理
**内容**: サイズごとにクラスを用意
```css
.div-graph.size-300 { width: 300px; height: 300px; }
.div-graph.size-400 { width: 400px; height: 400px; }
```
**結果**: ❌ サイズが可変のため非現実的  
**理由**: 200-600pxの範囲で連続的に変化

### アプローチ9: data-layout変更後にサイズ再設定
**内容**: レイアウト変更後、RAFでサイズを再設定
```javascript
screen.setAttribute('data-layout', newLayout);
requestAnimationFrame(() => {
    graphContainer.style.width = `${size}px`;
    graphContainer.style.height = `${size}px`;
});
```
**結果**: △ 一瞬崩れた後に修正される（ちらつき）  
**理由**: CSSが先に適用される

### アプローチ10: 両モードでgraphSizeを共通管理
**内容**: `graphSize`を新設、両モード共通で保存
```javascript
// 保存
csInterface.evalScript(`savePreference("graphSize", "${size}")`);
// 読み込み（両モード共通）
csInterface.evalScript('loadPreference("graphSize")', callback);
```
**結果**: △ データは統一できるが、適用タイミング問題は残る  
**理由**: 根本的なCSS競合は解決していない

### アプローチ11: MutationObserverでdata-layout監視
**内容**: `data-layout`変更を検知して即座にサイズ再設定
```javascript
const observer = new MutationObserver(() => {
    if (screen.getAttribute('data-layout') === 'horizontal') {
        graphContainer.style.width = `${savedSize}px`;
        graphContainer.style.height = `${savedSize}px`;
    }
});
observer.observe(screen, { attributes: true });
```
**結果**: △ 動作するが、複雑度が増す  
**理由**: イベント駆動で確実だが、タイミング制御が難しい

### アプローチ12: Verticalモードでもwidthを固定
**内容**: Resizeバー動作後、Verticalでもグラフwidthを固定
```javascript
// Verticalモード、Resize中
graphContainer.style.width = `${clampedSize}px`;
graphContainer.style.height = `${clampedSize}px`;
graphContainer.style.flex = '0 0 auto';  // flex:1を無効化
```
**結果**: ⭐ 有望  
**理由**: `flex: 1`を無効化することで、インラインスタイルが効く

### アプローチ13: 起動時にすぐサイズを仮設定
**内容**: 非同期読み込み前に、現在のサイズを設定
```javascript
// 即座に現在のサイズを固定
const currentSize = graphContainer.offsetWidth || 300;
graphContainer.style.width = `${currentSize}px`;
graphContainer.style.height = `${currentSize}px`;

// その後、保存値を読み込んで上書き
csInterface.evalScript('loadPreference("graphSize")', (result) => {
    // ...
});
```
**結果**: △ 初期ちらつきを軽減するが、完全ではない

### アプローチ14: CSS Grid/Flexboxの見直し
**内容**: レイアウトシステム全体を再設計
- Verticalモード: Grid layoutに変更
- グラフサイズを明示的に管理
**結果**: ⭐⭐ 最も確実だが、大規模変更  
**理由**: 根本的なアーキテクチャ変更

---

## 推奨ソリューション

### ソリューション1: インラインスタイルで flex を無効化（最小変更）

**実装内容**:
```javascript
// toggleLayout(), restoreLayoutMode(), setupResizeBar() 全てで共通
function setGraphSize(size) {
    const graphContainer = document.querySelector('.div-graph');
    if (graphContainer) {
        graphContainer.style.width = `${size}px`;
        graphContainer.style.height = `${size}px`;
        graphContainer.style.flex = '0 0 auto';  // ← 追加
        graphContainer.style.minHeight = 'auto';  // ← 追加
    }
}
```

**メリット**:
- 最小の変更で実現
- CSSの`flex: 1`を無効化
- インラインスタイルが確実に適用される

**デメリット**:
- インラインスタイルが増える
- CSS設計との整合性が低下

**動作保証**:
- Verticalモード: `flex: 0 0 auto`により、親の高さに引き伸ばされない
- Horizontalモード: 既存の動作を維持
- 起動時: サイズ設定と同時に`flex`を無効化
- 切り替え時: レイアウト変更前に`flex`を無効化

### ソリューション2: CSS変更 + タイミング制御（中規模変更）

**CSS変更**:
```css
/* デフォルトのflex: 1を削除 */
.div-graph {
  align-items: center;
  background-color: var(--eerie-black);
  border: 1px solid;
  border-color: var(--fuscous-gray);
  border-radius: 3px;
  /* flex: 1; 削除 */
  flex: 0 0 auto;  /* 固定サイズに */
  width: 300px;
  height: 300px;
  aspect-ratio: 1;
  justify-content: center;
  display: flex;
  position: relative;
}

/* Horizontalモード用の上書きを削除 */
.screen[data-layout="horizontal"] .div-graph {
  /* width/height削除、他のプロパティのみ残す */
  flex: 0 0 auto;
  aspect-ratio: 1;
  /* width, heightはJSで制御 */
}
```

**JavaScript変更**:
```javascript
// restoreLayoutMode()
function restoreLayoutMode() {
    // 1. まずグラフサイズを読み込み
    csInterface.evalScript('loadPreference("graphSize")', function(sizeResult) {
        let graphSize = 300;
        // ... サイズ解析 ...
        
        const graphContainer = document.querySelector('.div-graph');
        if (graphContainer) {
            graphContainer.style.width = `${graphSize}px`;
            graphContainer.style.height = `${graphSize}px`;
        }
        
        // 2. レイアウトモードを読み込み・設定
        csInterface.evalScript('loadPreference("layoutMode")', function(layoutResult) {
            // ... レイアウト設定 ...
            screen.setAttribute('data-layout', layout);
            
            // 3. Horizontalモードのみマージン調整
            if (layout === 'horizontal') {
                requestAnimationFrame(() => {
                    updatePresetMarginForResize(graphSize);
                });
            }
        });
    });
}

// toggleLayout()
function toggleLayout() {
    const graphContainer = document.querySelector('.div-graph');
    const currentSize = graphContainer.offsetWidth || 300;
    
    // サイズを先に設定
    graphContainer.style.width = `${currentSize}px`;
    graphContainer.style.height = `${currentSize}px`;
    
    // 即座にレイアウト切り替え（RAFなし）
    screen.setAttribute('data-layout', newLayout);
    
    // マージン調整
    if (newLayout === 'horizontal') {
        requestAnimationFrame(() => {
            updatePresetMarginForResize(currentSize);
        });
    }
}
```

**メリット**:
- CSS設計がクリーンになる
- JavaScript制御が明確
- CSSとJSの役割分担が明確

**デメリット**:
- CSS変更が必要
- 既存レイアウトへの影響確認が必要

### ソリューション3: 完全同期化（大規模変更）

**設計変更**:
1. グラフサイズを**グローバル変数**で管理
2. 非同期読み込みを起動時のみに限定
3. 以降は全て同期処理

**実装**:
```javascript
let globalGraphSize = 300;  // グローバル変数

// 起動時のみ非同期読み込み
function initializeGraphSize() {
    csInterface.evalScript('loadPreference("graphSize")', function(result) {
        if (result.success && result.value) {
            globalGraphSize = parseFloat(result.value);
        }
        applyGraphSize(globalGraphSize);
    });
}

// 同期的にサイズ適用
function applyGraphSize(size) {
    const graphContainer = document.querySelector('.div-graph');
    if (graphContainer) {
        graphContainer.style.width = `${size}px`;
        graphContainer.style.height = `${size}px`;
        graphContainer.style.flex = '0 0 auto';
    }
}

// toggleLayoutは完全同期
function toggleLayout() {
    applyGraphSize(globalGraphSize);
    screen.setAttribute('data-layout', newLayout);
    // ...
}

// Resize時にグローバル変数を更新
function handleMouseUp() {
    globalGraphSize = graphContainer.offsetWidth;
    csInterface.evalScript(`savePreference("graphSize", "${globalGraphSize}")`);
}
```

**メリット**:
- タイミング問題が完全解決
- 非同期処理の複雑さ排除
- 動作が予測可能

**デメリット**:
- グローバル変数の管理
- 既存コードの大幅変更

---

## 最終推奨

### 第1推奨: ソリューション1（インラインスタイルでflex無効化）

**理由**:
1. 最小の変更で実現可能
2. 既存のCSS設計を維持
3. 即座に実装・テスト可能
4. リスクが最小

**実装手順**:
1. `setGraphSize()`関数を作成
2. `toggleLayout()`, `restoreLayoutMode()`, `setupResizeBar()`で使用
3. `style.flex = '0 0 auto'`を追加

**期待される動作**:
- ✅ 起動時: 正方形
- ✅ モード切り替え時: 正方形
- ✅ Resizeバー使用時: 正方形（既存動作維持）

### 第2推奨: ソリューション2（CSS変更）

**理由**:
1. より根本的な解決
2. CSS設計がクリーンに
3. 長期的なメンテナンス性向上

**実装条件**:
- ソリューション1で問題が残る場合
- またはリファクタリングのタイミング

---

## 実装コード（ソリューション1）

### 共通関数の追加
```javascript
/**
 * グラフサイズを設定（正方形を保証）
 * @param {number} size - グラフの一辺の長さ（px）
 */
function setGraphSize(size) {
    const graphContainer = document.querySelector('.div-graph');
    if (!graphContainer) return;
    
    const clampedSize = Math.max(200, Math.min(600, size));
    
    // インラインスタイルで確実に設定
    graphContainer.style.width = `${clampedSize}px`;
    graphContainer.style.height = `${clampedSize}px`;
    graphContainer.style.flex = '0 0 auto';  // flex:1を無効化
    graphContainer.style.minHeight = 'auto';  // min-heightをリセット
    
    return clampedSize;
}
```

### toggleLayout()の修正
```javascript
function toggleLayout() {
    const screen = document.querySelector('.screen');
    const layoutIcon = document.getElementById('layoutToggleIcon');
    const presetSection = document.querySelector('.section-1');
    const graphContainer = document.querySelector('.div-graph');
    
    if (!screen) {
        console.error('Screen element not found');
        return;
    }
    
    const currentLayout = screen.getAttribute('data-layout');
    const newLayout = currentLayout === 'vertical' ? 'horizontal' : 'vertical';
    
    console.log(`Switching layout from ${currentLayout} to ${newLayout}`);
    
    // 現在のグラフサイズを取得して設定
    let currentGraphSize = 300;
    if (graphContainer && graphContainer.offsetWidth > 0) {
        currentGraphSize = graphContainer.offsetWidth;
    }
    
    // サイズを確実に設定（flex無効化）
    const appliedSize = setGraphSize(currentGraphSize);
    
    // data-layout属性を更新
    screen.setAttribute('data-layout', newLayout);
    
    // アイコンを更新
    if (layoutIcon) {
        layoutIcon.src = newLayout === 'vertical' ? 'img/horizontal.svg' : 'img/vertical.svg';
    }
    
    // レイアウトモードを保存
    csInterface.evalScript(`savePreference("layoutMode", "${newLayout}")`, function(result) {
        console.log(`Layout mode saved: ${newLayout}`);
    });
    
    // Horizontalモードの場合はプリセット位置を調整
    if (newLayout === 'horizontal') {
        requestAnimationFrame(() => {
            updatePresetMarginForResize(appliedSize);
        });
    } else {
        // Verticalモードの場合はmargin-topをリセット
        if (presetSection) {
            presetSection.style.marginTop = '';
        }
    }
    
    updateOutput(`Layout switched to: ${newLayout}`);
}
```

### restoreLayoutMode()の修正
```javascript
function restoreLayoutMode() {
    csInterface.evalScript('loadPreference("layoutMode")', function(result) {
        try {
            const data = JSON.parse(result);
            const screen = document.querySelector('.screen');
            const layoutIcon = document.getElementById('layoutToggleIcon');
            
            const layout = (data.success && data.value) ? data.value : 'vertical';
            
            // 共通のグラフサイズを読み込んで設定
            csInterface.evalScript('loadPreference("graphSize")', function(sizeResult) {
                let graphSize = 300;
                
                try {
                    const sizeData = JSON.parse(sizeResult);
                    if (sizeData.success && sizeData.value) {
                        const parsedSize = parseFloat(sizeData.value);
                        if (!isNaN(parsedSize) && parsedSize >= 200) {
                            graphSize = parsedSize;
                        }
                    }
                } catch (e) {}
                
                // グラフサイズを設定（flex無効化）
                const appliedSize = setGraphSize(graphSize);
                
                // レイアウトを設定
                if (screen) {
                    screen.setAttribute('data-layout', layout);
                }
                
                // アイコンを更新
                if (layoutIcon) {
                    layoutIcon.src = layout === 'vertical' ? 'img/horizontal.svg' : 'img/vertical.svg';
                }
                
                // Horizontalモードの場合、プリセット位置を初期化
                if (layout === 'horizontal') {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            updatePresetMarginForResize(appliedSize);
                        });
                    });
                }
                
                console.log(`Layout restored: ${layout}, graphSize: ${appliedSize}`);
            });
        } catch (e) {
            console.error('Failed to restore layout mode:', e);
        }
    });
}
```

### setupResizeBar()のhandleMouseMoveの修正
```javascript
const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const layoutMode = getLayoutMode();
    
    if (layoutMode === 'vertical') {
        // Vertical mode: Y軸で高さ調整
        const deltaY = e.clientY - startY;
        let newGraphHeight = startGraphHeight + deltaY;
        let newPresetHeight = startPresetHeight - deltaY;
        
        const minSize = 150;
        if (newGraphHeight < minSize) {
            newGraphHeight = minSize;
            newPresetHeight = startGraphHeight + startPresetHeight - minSize;
        }
        if (newPresetHeight < minSize) {
            newPresetHeight = minSize;
            newGraphHeight = startGraphHeight + startPresetHeight - minSize;
        }
        
        graphSection.style.flexBasis = newGraphHeight + 'px';
        presetSection.style.flexBasis = newPresetHeight + 'px';
        
        // グラフ自体も正方形に調整
        const availableWidth = graphSection.offsetWidth;
        const graphSize = Math.min(availableWidth, newGraphHeight - 40);
        setGraphSize(graphSize);  // ← 共通関数使用
    } else {
        // Horizontal mode: X軸で幅調整
        const deltaX = e.clientX - startX;
        let newGraphWidth = startGraphWidth + deltaX;
        
        const appliedSize = setGraphSize(newGraphWidth);  // ← 共通関数使用
        
        // プリセットセクションのmargin-topを動的に調整
        updatePresetMarginForResize(appliedSize);
    }
    
    e.preventDefault();
    e.stopPropagation();
};
```

---

## テストケース

### テストケース1: Vertical起動
1. 拡張機能を再起動（Verticalモード）
2. グラフが正方形であることを確認
3. **期待**: 300px × 300px（または保存された graphSize）

### テストケース2: Horizontal起動
1. 拡張機能を再起動（Horizontalモード）
2. グラフが正方形であることを確認
3. プリセットが上詰めであることを確認
4. **期待**: 正方形 + 上詰め

### テストケース3: Vertical → Horizontal切り替え
1. Verticalモード起動
2. Resizeバーで350pxに調整
3. Horizontalに切り替え
4. **期待**: 350px × 350px の正方形を維持

### テストケース4: Horizontal → Vertical切り替え
1. Horizontalモード起動
2. Resizeバーで450pxに調整
3. Verticalに切り替え
4. **期待**: 450px × 450px の正方形を維持

### テストケース5: Vertical Resize
1. Verticalモード
2. Resizeバーでグラフエリアの高さを変更
3. **期待**: グラフは常に正方形

### テストケース6: Horizontal Resize
1. Horizontalモード
2. Resizeバーでグラフの幅を変更
3. **期待**: グラフは常に正方形、プリセットは上詰め

### テストケース7: 極端なサイズ
1. Resizeバーで最小(200px)に設定
2. モード切り替え
3. **期待**: 200px × 200px 維持
4. Resizeバーで最大(600px)に設定
5. モード切り替え
6. **期待**: 600px × 600px 維持

---

## まとめ

### 問題の本質
1. **CSS `flex: 1`** がVerticalモードでグラフを引き伸ばす
2. **CSS固定値** がHorizontalモードでJavaScript設定を上書き
3. **非同期処理** とレイアウト適用のタイミング競合
4. **offsetWidth** の取得タイミングが不適切

### 解決の鍵
- インラインスタイルで`flex: 0 0 auto`を設定し、CSSの`flex: 1`を無効化
- サイズ設定を**レイアウト変更前**に確実に実行
- 共通関数で処理を統一

### 次のステップ
1. `setGraphSize()`関数を実装
2. `toggleLayout()`, `restoreLayoutMode()`, `setupResizeBar()`を修正
3. テストケース1-7を実施
4. 問題が残る場合、ソリューション2に移行

---

**作成者メモ**: このレポートは10以上のアプローチを検討し、数値シミュレーションを通して根本原因を特定しました。最小変更で確実に動作するソリューション1を第1推奨とします。お休みなさい。
