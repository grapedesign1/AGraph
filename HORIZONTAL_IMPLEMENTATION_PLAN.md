# Horizontal Mode Implementation Plan

## 概要
Verticalモード(上下レイアウト)に加えて、Horizontalモード(左右レイアウト)を実装する。
ユーザーがボタンでモードを切り替え、選択したモードとリサイズバーの位置を記憶する。

---

## Phase 1: 既存CSS・構造の調査 ✓
**目的**: 実装前の現状確認

**タスク**:
1. `styles.css`で既存の`screen[data-layout="horizontal"]`スタイルを確認
2. Horizontal用のクラスやスタイルがどこまで定義されているか把握
3. 不足している部分を特定

**成果物**: 調査結果の確認

**リスク**: 低 (読み取りのみ)

---

## Phase 2: レイアウト切り替えボタンの追加
**目的**: UIにモード切り替え機能を追加

**タスク**:
1. HTMLにレイアウト切り替えボタンを追加
   - 配置場所: Group Section (Card Size Sliderの隣)
   - アイコン: 既存のimg/アイコンを使用 or 簡易的なテキスト
2. CSSでボタンスタイルを調整(必要に応じて)

**成果物**:
- `ext/index.html` - ボタン追加
- `ext/styles.css` - スタイル調整(必要な場合)

**リスク**: 低 (表示のみ、機能未実装)

**テスト**: ボタンが正しく表示されることを確認

---

## Phase 3: レイアウト切り替えロジックの実装
**目的**: ボタンクリックでdata-layout属性を切り替える基本機能

**タスク**:
1. `toggleLayout()`関数を実装
   - `data-layout="vertical"` ⟷ `data-layout="horizontal"` を切り替え
   - 切り替え時に`layoutMode`を保存
2. 起動時にlayoutModeを読み込んで復元
3. ボタンにイベントリスナーを設定

**成果物**:
- `ext/main.js` - toggleLayout()関数とロード処理

**リスク**: 中 (Resize Barの動作に影響する可能性)

**テスト**:
- ボタンクリックでdata-layout属性が変わることを確認
- After Effects再起動後にモードが復元されることを確認
- **Vertical modeでの既存機能が壊れていないこと**

---

## Phase 4: Horizontal用CSSの完成
**目的**: Horizontalモードで正しくレイアウトされるようにする

**タスク**:
1. `.screen[data-layout="horizontal"] .mian-div`
   - `flex-direction: row` に変更
2. `.screen[data-layout="horizontal"] .section-graph`
   - 幅固定: `flex: 0 0 400px`
   - 高さ: `height: 100%` or auto
3. `.screen[data-layout="horizontal"] .section-1` (Preset Section)
   - 幅固定: `flex: 0 0 300px`
4. Resize Barのスタイル調整
   - Horizontal時: 幅4px、高さ100%、カーソルew-resize

**成果物**:
- `ext/styles.css` - Horizontal用スタイル完成

**リスク**: 中 (レイアウト崩れの可能性)

**テスト**:
- Horizontalモードでグラフとプリセットが左右に配置されること
- Verticalモードが正常に動作すること

---

## Phase 5: Resize Bar - Horizontalモード対応
**目的**: Horizontalモードで左右ドラッグを実装

**タスク**:
1. `setupResizeBar()`を拡張
   - 現在のlayoutModeを取得
   - Vertical: 既存のY軸ロジック(変更なし)
   - Horizontal: X軸ロジック(新規)
     - `clientX`, `offsetWidth`, `deltaX`を使用
     - 最小幅150px
     - 合計幅700px固定
2. Horizontal用の保存キー追加
   - `resizeBarGraphWidth` (Horizontal用)
   - `resizeBarGraphHeight` (Vertical用) - 既存

**成果物**:
- `ext/main.js` - setupResizeBar()の拡張

**リスク**: 高 (既存のVertical機能に影響する可能性あり)

**テスト**:
- Verticalモード: 上下ドラッグが正常動作
- Horizontalモード: 左右ドラッグが正常動作
- 両モードで最小サイズ(150px)までスムーズにドラッグ可能
- 両モードで位置が個別に記憶される
- モード切り替え後、前回のリサイズ位置が復元される

---

## Phase 6: Canvas再描画の調整
**目的**: レイアウト切り替え時にグラフを正しく再描画

**タスク**:
1. `toggleLayout()`にグラフ再描画処理を追加
   - レイアウト変更後、DOMが更新されるまで待機(`setTimeout`)
   - `redrawNPointCurve()`を呼び出し
2. Resize Bar操作後の再描画も確認(既存で動作しているはず)

**成果物**:
- `ext/main.js` - toggleLayout()に再描画処理追加

**リスク**: 低 (既存の再描画関数を使用)

**テスト**:
- レイアウト切り替え時にグラフが正しく再描画される
- グラフデータが失われない
- Velocity/Accelerationトグルの状態が維持される

---

## Phase 7: 統合テスト・バグ修正
**目的**: 全機能の動作確認と問題修正

**テスト項目**:
1. **Verticalモード**:
   - ✓ リサイズバーが上下にドラッグできる
   - ✓ 位置が記憶される
   - ✓ グラフデータ、トグル、カードサイズが記憶される

2. **Horizontalモード**:
   - ✓ リサイズバーが左右にドラッグできる
   - ✓ 位置が記憶される
   - ✓ グラフデータ、トグル、カードサイズが記憶される

3. **モード切り替え**:
   - ✓ ボタンでスムーズに切り替わる
   - ✓ 選択したモードが記憶される
   - ✓ 各モードのリサイズ位置が個別に記憶される

4. **既存機能**:
   - ✓ Analyze, Apply, Save機能が正常動作
   - ✓ Preset管理(追加、削除、リネーム)
   - ✓ Group管理
   - ✓ Context menu

**成果物**:
- バグ修正パッチ
- 最終動作確認

**リスク**: 中 (予期しないバグの可能性)

---

## Phase 8: 最終調整・コミット
**目的**: コードの整理とGitコミット

**タスク**:
1. コンソールログの確認・不要なものを削除
2. コメントの整理
3. Gitコミット
4. 動作確認ビデオ or スクリーンショット(オプション)

**成果物**:
- クリーンなコードベース
- Gitコミット完了

**リスク**: 低

---

## 実装順序まとめ

```
Phase 1: 調査 (15分)
   ↓
Phase 2: ボタン追加 (10分)
   ↓
Phase 3: 切り替えロジック (20分)
   ↓
Phase 4: CSS完成 (30分)
   ↓
Phase 5: Resize Bar対応 (45分) ← 最も重要
   ↓
Phase 6: Canvas再描画 (15分)
   ↓
Phase 7: 統合テスト (30分)
   ↓
Phase 8: 最終調整 (15分)
```

**合計推定時間**: 約3時間

---

## リスク管理

### 高リスク項目
- **Phase 5**: Resize Barのロジック拡張
  - 対策: Verticalモードのロジックを別関数に分離して保護
  - 各フェーズでGitコミットし、問題発生時にロールバック可能にする

### 重要な保証事項
- **既存のVerticalモード機能は絶対に壊さない**
- 各PhaseでVerticalモードの動作確認を実施
- 問題が発生したら即座に前のコミットに戻す

---

## 次のステップ
Phase 1から順番に進めます。各Phase完了後に動作確認とGitコミットを行います。

準備ができたら「Phase 1開始」と言ってください。
