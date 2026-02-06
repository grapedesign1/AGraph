# リサイズ制限の徹底調査レポート

**問題**: グラフの最小サイズを50pxに設定したが、実際には小さくならない

**調査日**: 2025年12月8日

---

## アプローチ1: JavaScript側の最小サイズ制限確認

### リサイズハンドラーの最小値
**ファイル**: `ext/main.js` 行9292-9316

```javascript
// Vertical mode
const minSize = 50;  // ✅ 変更済み

// Horizontal mode  
const minSize = 50;  // ✅ 変更済み
const maxSize = 600;
```

**状態**: ✅ JavaScript側は50pxに設定済み

---

## アプローチ2: 初期化時の最小値チェック

### restoreLayoutMode() での制限
**ファイル**: `ext/main.js` 行9148-9157

```javascript
if (data.success && data.value) {
    const parsedWidth = parseFloat(data.value);
    if (!isNaN(parsedWidth) && parsedWidth >= 200) {  // ★ 200px制限！
        graphWidth = parsedWidth;
    }
}
```

**問題発見**: 保存された値が200px未満の場合、無視されてデフォルト300pxが使われる

**影響**: 
- 50pxにリサイズしても保存される
- しかし次回起動時に200px未満なので読み込まれない
- デフォルトの300pxになる

**解決**: この`>= 200`を`>= 50`に変更する必要がある

---

## アプローチ3: setupResizeBar() 初期化時の制限

### Vertical mode初期化
**ファイル**: `ext/main.js` 行9238-9253

```javascript
csInterface.evalScript('loadPreference("resizeBarGraphHeight")', function(result) {
    try {
        const data = JSON.parse(result);
        if (data.success && data.value && getLayoutMode() === 'vertical') {
            const graphHeight = parseFloat(data.value);
            if (!isNaN(graphHeight) && graphHeight >= 150) {  // ★ 150px制限
                // ...
            }
        }
    }
});
```

**問題発見**: Vertical modeも150px未満は無視される

**解決**: この`>= 150`も`>= 50`に変更する必要がある

---

## アプローチ4: CSS側のmin-width制限（ボタン）

### ボタンの最小幅
**ファイル**: `ext/styles.css`

```css
.e-button {
  min-width: 60px;  /* Analyze, Save */
}

.apply-button {
  min-width: 60px;  /* Apply */
}
```

**影響**: ボタン自体は60px以下にならない

しかし、これは**ボタンの幅**であり、**グラフの幅**とは別。
ボタンは`flex: 1`で伸縮するため、コンテナ（section-button）の幅には影響しない。

**結論**: これは問題ではない

---

## アプローチ5: section-button の幅制限

### section-button のCSS
**ファイル**: `ext/styles.css` 行727-737

```css
.screen[data-layout="horizontal"] .section-button {
  width: 100%;  /* 親要素の幅に従う */
  grid-column: 1;
  grid-row: 2;
}
```

**分析**: `width: 100%`なので親（grid column 1）の幅に従う。
grid column 1の幅は`auto`（内容に応じる）。

つまり、column 1の幅は以下のどちらか大きい方：
- `.section-graph` の幅
- `.section-button` の幅

**可能性**: section-buttonの子要素（.div）が最小幅を持っている？

---

## アプローチ6: section-button .div の幅

### .div 要素のCSS
**ファイル**: `ext/styles.css` 行740-748

```css
.screen[data-layout="horizontal"] .section-button .div {
  width: 100%;
  display: flex;
  gap: 4px;
}
```

**分析**: この.divは3つのボタンを横並びに配置。

```
[Analyze] [Apply] [Save]
  60px     60px    60px
```

最小幅 = 60px × 3 + gap 4px × 2 = **188px**

**これが制限の原因！**

---

## アプローチ7: Grid auto列の幅決定メカニズム

### grid-template-columns: auto 4px 1fr

```
Column 1 (auto) の幅 = max(
  section-graph の幅,
  section-button の幅
)
```

**section-button の幅** = 子要素.divの幅 = 188px（ボタン3つ分）

**section-graph の幅** = `.div-graph`の幅（JavaScript で設定）

```
Column 1の実際の幅 = max(
  graphWidth (50px),
  188px (ボタン)
) = 188px
```

**結論**: グラフを50pxに設定しても、column 1の幅は188pxになる！

---

## アプローチ8: リサイズバーの動作確認

### リサイズ時の処理
**ファイル**: `ext/main.js` 行9310-9326

```javascript
const deltaX = e.clientX - startX;
let newGraphWidth = startGraphWidth + deltaX;

const minSize = 50;
const maxSize = 600;
if (newGraphWidth < minSize) newGraphWidth = 50;

graphContainer.style.width = `${newGraphWidth}px`;
graphContainer.style.height = `${newGraphWidth}px`;
```

**動作**:
1. グラフの`width`と`height`は50pxに設定される ✅
2. しかしグラフの親である`section-graph`はgrid column 1に配置
3. column 1の幅は188px（ボタンの幅）に制限される
4. グラフは50px × 50pxだが、column 1は188px幅

**視覚的には**:
```
┌────────────────────┐
│  column 1 (188px)  │
│  ┌──┐              │
│  │50│  ← グラフ    │
│  │px│              │
│  └──┘              │
│  [Ana][App][Sav]   │ ← ボタン（188px幅）
└────────────────────┘
```

リサイズバーは**column 1の幅**を調整するが、column 1の最小幅は188px。

---

## アプローチ9: Grid column幅とリサイズバーの関係

### リサイズバーが調整するもの

**Horizontal mode**: グラフの`width`と`height`を直接変更

```javascript
graphContainer.style.width = `${newGraphWidth}px`;
graphContainer.style.height = `${newGraphWidth}px`;
```

これは`.div-graph`要素のサイズを変更するだけ。
Grid column 1の幅は変更していない！

**Grid column 1の幅**は`auto`なので、内容（グラフとボタン）の最大幅に自動調整される。

---

## アプローチ10: リサイズバーのドラッグとcolumn幅

### 期待される動作 vs 実際の動作

**期待**: リサイズバーを左にドラッグ → column 1が縮小 → グラフとボタンエリアが縮小

**実際**:
1. リサイズバーを左にドラッグ
2. グラフの`width`/`height`が50pxに設定される
3. しかしcolumn 1の幅は`auto`
4. column 1の幅 = max(グラフ50px, ボタン188px) = 188px
5. column 1は縮小しない
6. リサイズバーも動かない

**問題**: Grid column の`auto`がボトルネック

---

## アプローチ11: section-graph の幅制御

### 現在のCSS
```css
.screen[data-layout="horizontal"] .section-graph {
  grid-column: 1;
  grid-row: 1;
  flex: 1;  /* ★ grid item に flex は無効 */
}
```

**問題**: `flex: 1`はgrid itemには適用されない。

**Grid item のサイズ決定**:
- `width`プロパティ（未設定）
- 内容のサイズ（`.div-graph`のサイズ）

---

## アプローチ12: div-graph の幅

### 現在のCSS
```css
.screen[data-layout="horizontal"] .div-graph {
  flex: 0 0 auto;
  aspect-ratio: 1;
}
```

**動作**:
- `width`はJavaScriptで設定（50px）
- `height`もJavaScriptで設定（50px）
- `aspect-ratio: 1`は正方形を維持

**問題なし**: グラフ自体は正しく50pxになる

---

## アプローチ13: Column 1 の最小幅の真の原因

### ボタンの構造
```html
<section class="section-button">  <!-- grid item, column 1, row 2 -->
  <div class="div">  <!-- flex container -->
    <button class="e-button">Analyze</button>  <!-- min-width: 60px -->
    <button class="apply-button">Apply</button>  <!-- min-width: 60px -->
    <button class="e-button">Save</button>  <!-- min-width: 60px -->
  </div>
</section>
```

**幅の計算**:
```
.div の幅 = 60px + 60px + 60px + gap(4px × 2) = 188px
section-button の幅 = 100% (親に従う) = column 1の幅
column 1の幅 = auto = max(section-graph, section-button)
```

**ボトルネック**: ボタン3つ（60px × 3 + gap 8px）= **188px**

---

## アプローチ14: リサイズバーとGrid columnの不一致

### 問題の本質

**リサイズバーが調整するもの**:
- Horizontal: `.div-graph`の`width`と`height` ← 要素レベル

**Grid layoutが見るもの**:
- Column 1の幅 = `auto` = 全ての行の最大幅
  - Row 1: `section-graph` → 内部に50pxのグラフ
  - Row 2: `section-button` → 188px（ボタン3つ）
  - **Column 1の幅 = max(50px, 188px) = 188px**

**結論**: リサイズバーは要素を変更するが、Grid columnは別の論理で幅を決定

---

## アプローチ15: なぜVertical modeは問題ないのか

### Vertical modeの構造
```css
.mian-div {
  display: flex;
  flex-direction: column;
}

.section-graph {
  flex: 0 0 400px;  /* 固定高さ */
}
```

**動作**:
- Flexbox縦並び
- 全要素が同じ幅（親の幅に従う）
- リサイズバーは`section-graph`の`flexBasis`（高さ）を変更
- 高さは独立しているため、他の要素に影響されない

**Horizontal modeの問題**:
- Grid 2次元レイアウト
- Column 1に複数の要素（グラフとボタン）が**異なる行**に配置
- Column幅は全行の最大幅になる
- ボタンが188pxなので、グラフを50pxにしてもcolumn幅は188px

---

## 解決策の提案

### 解決策1: ボタンを縦並びにする（最も簡単）

```css
.screen[data-layout="horizontal"] .section-button .div {
  flex-direction: column;  /* 横→縦 */
  align-items: stretch;
}
```

**効果**: ボタンが縦に並ぶので、幅は60px（1つ分）のみ

**デメリット**: UIデザインが変わる

---

### 解決策2: ボタンのmin-widthを削除

```css
.e-button,
.apply-button {
  min-width: 0;  /* 60px → 0 */
}
```

**効果**: ボタンが縮小可能になり、グラフ幅に合わせて小さくなる

**デメリット**: ボタンが読めなくなる可能性

---

### 解決策3: Grid columnを固定幅にする

```javascript
// リサイズ時にcolumn 1の幅を明示的に設定
const mianDiv = document.querySelector('.mian-div');
mianDiv.style.gridTemplateColumns = `${newGraphWidth}px 4px 1fr`;
```

**効果**: Column 1の幅を強制的に制御

**デメリット**: CSSとJavaScriptの責任が混在

---

### 解決策4: ボタンをcolumn 1から外す（根本解決）

**Row 2を削除し、全てをRow 1に配置**

```css
.screen[data-layout="horizontal"] .mian-div {
  grid-template-rows: 1fr;  /* 1行のみ */
}

/* ラッパー要素でグラフとボタンをグルーピング */
.screen[data-layout="horizontal"] .section-graph {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

**しかし**: HTMLにラッパーがないため、CSSのみでは実現困難

---

### 解決策5: JavaScript初期化の最小値を修正（必須）

**最低限必要な修正**:

```javascript
// 行9155付近
if (!isNaN(parsedWidth) && parsedWidth >= 50) {  // 200 → 50
    graphWidth = parsedWidth;
}

// 行9245付近  
if (!isNaN(graphHeight) && graphHeight >= 50) {  // 150 → 50
    const totalSize = 700;
```

**これだけでは不十分**: Grid column幅の問題は残る

---

## 最終結論

### 問題の根本原因

1. **JavaScript側**: 初期化時の最小値チェックが200px（修正必要）
2. **CSS/Grid側**: Column 1にグラフとボタンが別行で配置され、column幅は両方の最大値（188px）になる

### 最小限の修正（部分的解決）

```javascript
// ext/main.js 行9155
if (!isNaN(parsedWidth) && parsedWidth >= 50) {

// ext/main.js 行9245
if (!isNaN(graphHeight) && graphHeight >= 50) {
```

**効果**: 保存/復元は50pxで動作するが、実際のUI幅は188pxに制限される

### 完全な解決（UI制限の解除）

**オプションA**: ボタンのmin-widthを削除（簡単だがUIが崩れる）
**オプションB**: Grid構造を再設計（根本解決だが大きな変更）
**オプションC**: リサイズバーでgridTemplateColumnsを直接制御（ハック的）

---

## 推奨アクション

### ステップ1: JavaScript修正（必須）
- 初期化時の最小値チェックを50pxに変更
- これで保存/復元が機能する

### ステップ2: UI設計の確認（要確認）
- グラフを50pxまで小さくする必要性を確認
- ボタンの最小サイズ要件を確認
- 188px未満にする必要があるか？

### ステップ3: 解決策の選択
- 要件に応じて解決策1〜5から選択
- 最も影響が少ないのは「解決策2: ボタンのmin-width削除」

---

## テスト済み項目

- ✅ JavaScript minSize: 50pxに変更済み
- ✅ CSS min-width: 全ての240px, 190pxを削除済み
- ❌ JavaScript初期化: 200px, 150pxチェックが残っている ← **修正必要**
- ❌ Grid column幅: ボタンの188pxが制限になっている ← **設計判断必要**

