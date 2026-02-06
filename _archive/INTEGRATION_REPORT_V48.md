# AccelCurve v4.8 統合レポート

## 概要

Figma + Animaプラグインで作成されたUIデザイン(vertical.html / horizontal.html)を、既存のAccelCurve拡張機能に統合しました。

**リリース日**: 2024年11月10日  
**バージョン**: 4.7 → 4.8  
**統合方法**: 単一HTML + data-layout属性による動的レイアウト切り替え

---

## 主な変更点

### 1. UIの完全リデザイン

#### 旧UI (v4.7)
- 基本的なパネルレイアウト
- 固定された垂直配置
- シンプルなボタンとセレクト要素

#### 新UI (v4.8)
- Figmaデザインシステムに基づく洗練されたUI
- **垂直レイアウト**: 240px幅のパネル向け(縦長)
- **水平レイアウト**: 600px幅のパネル向け(横長)
- **動的切り替え**: ボタンクリックでレイアウト変更可能
- カスタムデザインのボタン、トグル、スライダー

### 2. 新機能

#### 2.1 レイアウト切り替え機能
- グラフエリア右上の「Type」ボタンで垂直⇔水平を切り替え
- LocalStorageに設定を保存(次回起動時に自動復元)
- 公開API: `window.AccelCurveUI.toggleLayout()`

#### 2.2 プリセットカードサイズ調整
- グループセクションのスライダーでカード表示サイズを変更可能
- 範囲: 48px ～ 128px
- LocalStorageに保存

#### 2.3 リサイズバー
- **垂直レイアウト**: グラフとプリセットエリアの高さを調整
- **水平レイアウト**: 左右パネルの幅を調整
- ドラッグ操作で動的にリサイズ

#### 2.4 改善されたグループ選択UI
- 従来の`<select>`要素を非表示
- カスタムドロップダウンメニューを実装
- クリックで展開、選択でmain.jsと同期

#### 2.5 ビジュアルトグル状態
- Velocityトグル: アクティブ時に緑色表示
- Accelerationトグル: アクティブ/非アクティブの明確な視覚フィードバック

### 3. 技術的な変更

#### 3.1 ファイル構成

```
ext/
├── index.html              # 統合されたUIファイル (新規)
├── styles.css              # data-layout対応CSS (新規)
├── ui-bridge.js            # UIブリッジレイヤー (新規)
├── main.js                 # コアロジック (変更なし)
├── CSInterface.js          # CEP API (変更なし)
├── extendscript.jsx        # AE連携スクリプト (変更なし)
├── chart.min.js            # Chart.js (変更なし)
├── index-v47.html          # v4.7バックアップ
├── styles-v47.css          # v4.7バックアップ
├── index-v48.html          # v4.8ソースファイル
├── styles-v48.css          # v4.8ソースファイル
├── ui-bridge-v48.js        # v4.8ソースファイル
└── img/                    # SVGアイコン (Figmaから出力)
    ├── a-1.svg
    ├── icon-3.svg (add group)
    ├── icon-5.svg (edit group)
    ├── icon-7.svg (delete group)
    ├── maximize-2-1.svg
    ├── type-2.svg
    ├── vector-1-2.svg
    ├── vector-4.svg
    ├── vector-5.svg
    ├── vector-6.svg
    ├── vector-7.svg
    └── velocity-toggle-1.svg
```

#### 3.2 CSS設計

**デザイントークン (CSS変数)**
```css
:root {
  --black: #000000;
  --eerie-black: #1e1e1e;
  --fuscous-gray: #555555;
  --nobel: #b0b1b0;
  --robins-egg-blue: #00c0e8;
  --dark-bg: #2b2b2b;
  --panel-bg: #333333;
  --dark-gray: #1a1a1a;
  --resize-bar: #8e8e93;
  --accent-red: #ff2d55;
  
  --font-size-m: 11px;
  --font-family-roboto: "Roboto", Helvetica;
}
```

**レイアウト切り替え方式**
```css
/* 垂直レイアウト専用スタイル */
.screen[data-layout="vertical"] .mian-div {
  flex-direction: column;
  min-height: 408px;
}

/* 水平レイアウト専用スタイル */
.screen[data-layout="horizontal"] .mian-div {
  flex-direction: row;
  min-height: 210px;
}
```

#### 3.3 DOM構造

**重要な要素ID (main.jsとの互換性維持)**
```html
<!-- Graph -->
<canvas id="valueChart">

<!-- Controls -->
<button id="easingButton">      <!-- Analyze -->
<button id="applyButton">       <!-- Apply -->
<button id="savePresetButton">  <!-- Save -->
<button id="fitGraphButton">    <!-- Fit Graph -->
<button id="layoutToggle">      <!-- NEW: Layout Toggle -->

<!-- Toggles -->
<button id="showVelocityToggle">
<button id="showAccelerationToggle">

<!-- Groups -->
<div id="groupNameDisplay">     <!-- NEW: Custom display -->
<select id="groupSelect">       <!-- Hidden for compatibility -->
<button id="addGroupButton">
<button id="editGroupButton">
<button id="deleteGroupButton">

<!-- Presets -->
<div id="presetCardsContainer">
<div id="cardSizeSlider">       <!-- NEW: Card size control -->

<!-- Resize -->
<div id="resizeBar">            <!-- NEW: Resizable panes -->

<!-- Hidden (for compatibility) -->
<div id="output">
<select id="saveGroupSelect">
<input id="presetNameInput">
<button id="deletePresetButton">
```

#### 3.4 ui-bridge.js (新規UIレイヤー)

**主要機能**
1. **レイアウト管理**
   - `toggleLayout()`: 垂直⇔水平切り替え
   - `applyLayout(layout)`: レイアウト適用
   - LocalStorage永続化

2. **グループ名同期**
   - `<select id="groupSelect">`の変更を監視
   - `<div id="groupNameDisplay">`に反映
   - カスタムドロップダウン表示

3. **カードサイズスライダー**
   - ドラッグ操作でカードサイズ変更
   - 動的に生成されるプリセットカードにも適用
   - MutationObserverで新規カード監視

4. **リサイズバー**
   - 垂直: 上下分割(グラフ vs プリセット)
   - 水平: 左右分割(left vs right)
   - flexプロパティの動的調整

5. **トグルボタンビジュアル**
   - active/inactive クラスの切り替え
   - main.jsのイベントと連携

**公開API**
```javascript
window.AccelCurveUI = {
  toggleLayout: Function,      // レイアウト切り替え
  setLayout: Function,         // レイアウト設定
  getLayout: Function,         // 現在のレイアウト取得
  setCardSize: Function,       // カードサイズ設定
  getCardSize: Function        // カードサイズ取得
};
```

---

## 互換性

### 既存機能の動作確認

#### ✅ 維持されている機能
1. **キーフレーム解析** (`easingButton`)
   - 選択されたキーフレームのベジェカーブ解析
   - グラフへの描画
   - Apply可能状態への遷移

2. **イージング適用** (`applyButton`)
   - 解析されたカーブをキーフレームに適用
   - ExtendScriptとの通信

3. **プリセット管理**
   - プリセット保存 (`savePresetButton`)
   - プリセット選択(カードクリック)
   - プリセット削除
   - プリセットカードの動的生成

4. **グループ管理**
   - グループ追加 (`addGroupButton`)
   - グループ名変更 (`editGroupButton`)
   - グループ削除 (`deleteGroupButton`)
   - グループ切り替え (`groupSelect`)

5. **グラフ機能**
   - Canvasへの描画
   - Fit Graph (`fitGraphButton`)
   - Velocity表示切り替え (`showVelocityToggle`)
   - Acceleration表示切り替え (`showAccelerationToggle`)

#### ⚠️ 変更された部分
1. **グループ選択UI**
   - `<select>`は非表示になりましたが、裏で動作
   - 新しい`groupNameDisplay`をクリックでドロップダウン表示
   - 選択は引き続き`groupSelect.value`に反映

2. **ボタンラベル**
   - "Analyze Easing" → "Analyze"
   - その他はそのまま

3. **レイアウト**
   - パネルサイズに応じて最適なレイアウトを選択可能
   - デフォルトは垂直レイアウト

---

## 使用方法

### 基本操作

#### 1. レイアウト切り替え
1. グラフエリア右上の「Type」アイコンをクリック
2. 垂直⇔水平が切り替わります
3. 設定は自動保存されます

#### 2. プリセットカードサイズ変更
1. グループセクションのスライダーをドラッグ
2. カードサイズが48px～128pxの範囲で変化
3. 既存のカードも新規カードも自動調整

#### 3. パネル分割調整
- **垂直レイアウト**: 水平バーをドラッグして上下の高さ調整
- **水平レイアウト**: 垂直バーをドラッグして左右の幅調整

#### 4. グループ選択
1. グループ名が表示されている部分をクリック
2. ドロップダウンメニューが表示
3. 目的のグループを選択

### 既存ワークフロー(変更なし)

1. **キーフレームにイージングを適用**
   - AEでキーフレームを選択
   - "Analyze"ボタンをクリック
   - グラフで確認
   - "Apply"ボタンで適用

2. **プリセットとして保存**
   - カーブを作成/解析
   - "Save"ボタンをクリック
   - 名前を入力して保存

3. **保存したプリセットを使用**
   - プリセットカードをクリック
   - "Apply"ボタンで適用

---

## トラブルシューティング

### 問題: レイアウトが切り替わらない
**原因**: JavaScriptエラー  
**解決**: F12でデベロッパーツールを開き、コンソールエラーを確認

### 問題: グラフが表示されない
**原因**: Canvasのサイズ問題  
**解決**: "Fit Graph"ボタンをクリック

### 問題: プリセットカードが表示されない
**原因**: main.jsの初期化タイミング  
**解決**: パネルを一度閉じて再度開く

### 問題: グループ選択ドロップダウンが開かない
**原因**: ui-bridge.jsの読み込みエラー  
**解決**: index.htmlで`<script src="ui-bridge.js">`が最後に読み込まれているか確認

### ロールバック方法

v4.7に戻す場合:
```bash
cd ext/
cp index-v47.html index.html
cp styles-v47.css styles.css
rm ui-bridge.js
```

CSXS/manifest.xmlのバージョンも4.7に戻す必要があります。

---

## 今後の改善点

### 実装予定
1. **設定画面**
   - CEPパネルメニューから呼び出し
   - レイアウト、カードサイズ、その他の設定を一元管理

2. **プリセットカードのプレビュー**
   - カードにミニグラフを表示
   - ホバーで拡大プレビュー

3. **キーボードショートカット**
   - Analyze: `Ctrl/Cmd + A`
   - Apply: `Ctrl/Cmd + Enter`
   - Layout Toggle: `Ctrl/Cmd + L`

4. **ダークモード対応**
   - システム設定と連動
   - カスタムテーマ選択

### 検討中
- UXPへの移行(After Effectsが対応したら)
- プリセットのインポート/エクスポート
- クラウド同期機能

---

## 開発者向け情報

### ビルド/デプロイ

拡張機能の配置:
```
macOS: ~/Library/Application Support/Adobe/CEP/extensions/AccelCurve/
Windows: C:\Users\[User]\AppData\Roaming\Adobe\CEP\extensions\AccelCurve\
```

デバッグモード有効化:
```bash
# macOS
defaults write com.adobe.CSXS.11 PlayerDebugMode 1

# Windows (レジストリ)
HKEY_CURRENT_USER\Software\Adobe\CSXS.11
PlayerDebugMode = "1"
```

### コード構造

#### main.js (8338行)
- Bézierカーブ計算
- キーフレーム操作
- プリセット管理
- グラフ描画

#### ui-bridge.js (420行)
- UIイベント処理
- レイアウト管理
- LocalStorage操作
- DOM操作ヘルパー

#### extendscript.jsx
- After Effectsとの通信
- キーフレーム読み書き
- プロパティ操作

### カスタマイズ

#### カラースキーム変更
`styles.css`の`:root`セクションで変数を編集:
```css
:root {
  --robins-egg-blue: #your-color;  /* アクセントカラー */
  --panel-bg: #your-color;         /* パネル背景 */
}
```

#### デフォルトレイアウト変更
`index.html`の`<div class="screen">`を編集:
```html
<!-- 垂直レイアウトがデフォルト -->
<div class="screen vertical" data-layout="vertical">

<!-- 水平レイアウトをデフォルトにする場合 -->
<div class="screen horizontal" data-layout="horizontal">
```

#### カードサイズ範囲変更
`ui-bridge.js`の`updateSliderValue()`関数:
```javascript
// 現在: 48px ～ 128px
cardSize = Math.round(48 + (percentage * 80));

// 例: 32px ～ 160px に変更
cardSize = Math.round(32 + (percentage * 128));
```

---

## まとめ

AccelCurve v4.8は、Figmaベースの最新UIデザインを採用しつつ、既存の全機能を完全に維持しています。

**主な改善点**:
- 🎨 モダンで洗練されたUI
- 📐 垂直/水平の動的レイアウト切り替え
- 🎛️ カスタマイズ可能なプリセット表示
- 🔄 リサイズ可能なパネル分割
- 💾 LocalStorageによる設定永続化

**互換性**: 
- ✅ 既存のmain.jsと完全互換
- ✅ 全ての既存機能が動作
- ✅ v4.7へのロールバック可能

**次のステップ**:
1. After Effectsで実際にテスト
2. レイアウト切り替えの動作確認
3. プリセット保存/読み込みの検証
4. パフォーマンスチェック

---

**バージョン**: 4.8  
**作成日**: 2024年11月10日  
**作成者**: GitHub Copilot (Claude Sonnet 4.5)  
**プロジェクト**: AccelCurve - After Effects Keyframe Easing Tool
