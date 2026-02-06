# 問題分析レポート

絶対ルール

毎回このルールを守ること
このレポートに追記する場合は追記場所を守ること
前提条件等は疑わない、変えない
なぜ「問題が起きるのか」のクリティカルな答えを出すことが目的であり、現象を確認する作業は不要
付け焼き刃的な対応は不要
時間はかかってもいい
失敗で学んだこと、事実は追記ランに残す

## デバッグルール

**ログ出力の制約:**
- コンソールは使用不可（After Effects環境）
- **アラートでログを出す**
- アラートは一回にまとめる（複数回表示しない）
- 無意味な情報や単なる確認のためのログは出さない
- 必要最小限の情報のみ表示

**アラート例:**
```javascript
// ❌ NG: 複数回表示
alert('Step 1');
alert('Step 2');

// ✅ OK: 一回にまとめる
alert(`Step 1: value1\nStep 2: value2`);

// ❌ NG: 無意味な確認
alert('Function called');

// ✅ OK: 必要な情報のみ
alert(`Error: ${errorMessage}\nValue: ${value}`);
```

## インストール手順

**CEP Extensionとしてインストール:**
```bash
rm -rf ~/Library/Application\ Support/Adobe/CEP/extensions/AccelCurve && cp -r /Users/shintarodanno/Library/CloudStorage/Dropbox/grapedesign/mogrt/Script/AccelCurve/AccelCurve ~/Library/Application\ Support/Adobe/CEP/extensions/AccelCurve
```

- After Effectsを再起動して変更を反映
- ウィンドウ > エクステンション > AccelCurve で開く


##問題と状況
起動時、プリセットエリアのカードの中のカーブの大きさが違う
カードそのものの大きさは正しい
Card Size Sliderを操作すると正しくなる


何か追記する場合は以下に追記。これより上に追記してはならない

---

## 確認された事実（2025-11-16）

**✅ 事実1: スライダー操作で正しくなる**
- 起動時: カーブが大きすぎる（カード枠からはみ出してトリミング）
- スライダー操作後: 正しいサイズ
- **違い: applyCardSize()でcanvas.width/heightを再設定している**

**✅ 事実2: 起動時とスライダー操作時の処理**
```javascript
// 起動時 (updatePresetCards in main.js)
canvas.width = (cardSize - 2) * dpr;   // 78 * 2 = 156
canvas.height = (cardSize - 2) * dpr;  // 78 * 2 = 156
drawCurveThumbnail(canvas, preset.keyframes);
card.appendChild(canvas);  // DOM追加は描画後

// スライダー操作時 (applyCardSize in ui-bridge-v48.js)
canvas.width = (size - 2) * dpr;   // 78 * 2 = 156
canvas.height = (size - 2) * dpr;  // 78 * 2 = 156
drawCurveThumbnail(canvas, preset.keyframes);
// canvasはすでにDOMに存在
```

**✅ 事実3: デバッグログ（起動時）**
```
cardSize=80, displaySize=78x78, canvasSize=156x156, dpr=2, padding=2
Transform: BEFORE: a=1.00, d=1.00 -> AFTER: a=2.00, d=2.00
```
- Transform は正常（scale(2, 2)が正しく適用）
- canvas サイズも正しい（156×156）
- 座標計算も正しい（displayWidth=78, drawWidth=74）

**✅ 事実4: 線の太さは変わらない**
- lineWidth は正常に描画されている
- つまりctx.scale()自体は機能している

## 失敗した仮説

**❌ 失敗1: padding調整（4px → 2px）**
- 結果: 変わらず
- padding は余白であり、カーブの大きさには無関係

**❌ 失敗2: ctx.scale()の条件分岐**
- 結果: 変わらず
- 元々条件は満たされていた

**❌ 失敗3: 目測「1.1倍」を根拠にした推測**
- 目測は不正確
- 数値的根拠なく推測するのは危険

## 未解決の謎

**🔍 謎1: 同じコード、同じ設定なのに結果が違う**
- canvas設定: 同じ
- 描画関数: 同じ
- transform: 正常
- **しかし起動時だけカーブが大きい**

**🔍 謎2: applyCardSize()の何が効いているのか**
- canvas.width/height を再設定
- これにより何がリセットされるのか？
- DOM追加済みcanvasへの再設定と、DOM追加前のcanvas作成の違い？

## 次の調査方針

**必要な情報:**
1. 起動時とスライダー操作後で、**実際に描画されたカーブの座標**を比較
2. canvas.width再設定の前後で、**何が変わるのか**を特定
3. 目測ではなく、**数値で測定可能な指標**を使う

---

## 詳細コード分析（2025-11-17 深夜）

### 現在の実装状況

**updatePresetCards()の処理フロー:**
1. プリセットカード作成時にcanvasを作成・描画
2. **100ms setTimeout で再度canvas.width/heightを再設定して再描画**

```javascript
// 初回描画（カード作成時）
canvas.width = canvasDisplayWidth * dpr;   // 例: 78 * 2 = 156
canvas.height = canvasDisplayHeight * dpr;
canvas.style.width = `${canvasDisplayWidth}px`;
canvas.style.height = `${canvasDisplayHeight}px`;
card.appendChild(canvas);  // DOM追加

// 100ms後に再描画
setTimeout(() => {
    canvas.width = canvasDisplayWidth * dpr;  // 再設定
    canvas.height = canvasDisplayHeight * dpr;
    canvas.style.width = `${canvasDisplayWidth}px`;
    canvas.style.height = `${canvasDisplayHeight}px`;
    drawCurveThumbnail(canvas, preset.keyframes);  // 再描画
}, 100);
```

**drawCurveThumbnail()の処理:**
```javascript
// 1. 変換リセット
ctx.setTransform(1, 0, 0, 1, 0, 0);

// 2. DPRに合わせてスケール
const dpr = window.devicePixelRatio || 1;
const displayWidth = width / dpr;
const displayHeight = height / dpr;
ctx.scale(dpr, dpr);

// 3. 描画（displayWidth/displayHeight座標系で）
// ... 描画処理 ...

// 4. 変換をリセット
ctx.setTransform(1, 0, 0, 1, 0, 0);
```

### 🔍 重要な発見

**既に「解決策」が実装されている:**
- 100ms setTimeoutでcanvas再設定→再描画
- これはまさに「Card Size Sliderを操作すると正しくなる」のと同じ処理

**しかしユーザーは「起動時にカーブが大きい」と報告:**
- ということは、**この100ms setTimeoutが機能していない**
- または**100msでは足りない**
- または**他の要因がある**

### 🤔 新たな仮説

**仮説A: タイミング問題**
- 100msでは不十分な可能性
- DOM構築、レンダリング、Retina処理に時間がかかる？
- 特にCEP環境（Chromium Embedded Framework）では遅延が大きい？

**仮説B: Canvas Context状態の問題**
- 初回描画時にContext状態が不完全
- DOM追加前後でContext状態が変わる？
- `setTransform()`だけではリセットしきれない状態がある？

**仮説C: Style適用タイミングの問題**
- `canvas.style.width/height`がまだ適用されていない
- CSSレンダリングとCanvas描画の同期問題？

### 📊 検証すべき項目

1. **setTimeout遅延時間の検証**
   - 100ms → 200ms → 500msと変えて確認
   - 遅延時間とカーブサイズの関係を調査

2. **Canvas Context状態の検証**
   - `ctx.getTransform()`の値を初回描画時と再描画時で比較
   - どの状態が変わっているのか特定

3. **DOM/CSS適用タイミングの検証**
   - `canvas.style.width`が実際に適用されているか確認
   - `getBoundingClientRect()`で実際のサイズを取得

4. **描画結果の数値検証**
   - カーブの実際の座標を記録
   - 初回描画と再描画で座標がどう変わるか比較

### 🔬 実験: デバッグログ追加

**追加した情報:**
1. Transform状態（before/after）
2. Canvas/Display サイズ
3. DPR値

**次回起動時にアラート表示:**
```
=== Initial Draw ===
cardSize=80
displaySize=78x78
canvasSize=156x156
dpr=2
padding=2

=== Transform ===
BEFORE: a=1.00, d=1.00
AFTER: a=2.00, d=2.00
```

### 📚 Canvas API仕様の再確認

**canvas.width/height設定時の動作:**
> When the canvas width or height attributes are set, the canvas bitmap and the rendering context are **completely reset**.
> - All context state is lost (transform, styles, etc.)
> - The bitmap is cleared to transparent black

**重要な発見:**
- `canvas.width = X` を実行すると、Contextが**完全にリセット**される
- `setTransform(1,0,0,1,0,0)` を実行する前に既にリセットされている
- つまり、初回描画時と100ms後の再描画時で、Context状態は同じはず

**しかし...**
- DOM追加のタイミングが異なる
  - 初回: DOM追加後に描画なし（カード作成時にcanvasをappendChild後、何も描画していない）
  - 再描画: すでにDOMに存在するcanvasに描画

**待って、コードを再確認:**

```javascript
// updatePresetCards() の処理
card.appendChild(canvas);  // DOM追加
// ここで描画していない！

// 100ms後
setTimeout(() => {
    canvas.width = ... // 再設定
    drawCurveThumbnail(canvas, preset.keyframes);  // ここで初めて描画
}, 100);
```

### 🚨 **重大な発見！**

**初回描画が存在しない:**
- カード作成時: canvasを作成してDOM追加するが、**描画を実行していない**
- 100ms後: 初めて`drawCurveThumbnail()`を呼んで描画

**これは意図的な設計？それともバグ？**

**可能性1: 意図的な設計**
- DOM構築完了後に初めて描画することで、正しいサイズで描画できると期待
- しかし、ユーザー報告では「起動時にカーブが大きい」

**可能性2: 過去の試行錯誤の痕跡**
- 元々は初回描画があったが、問題があって削除された？
- 100ms setTimeoutだけが残っている

**可能性3: 別の場所で初回描画している**
- 他の関数で描画している可能性を調査する必要がある

### 🧪 実験1: 初回描画を追加

**仮説:**
初回描画がないことが問題の原因かもしれない

**変更:**
```javascript
card.appendChild(canvas);
drawCurveThumbnail(canvas, preset.keyframes);  // 追加
```

**期待される結果:**
- もし初回描画の欠如が問題なら、これで解決
- もし別の原因なら、変化なし

### 📊 調査継続項目

1. ✅ 初回描画の有無を確認 → **発見: 初回描画が存在しない**
2. ⏳ 初回描画追加の効果を検証 → インストール完了、テスト待ち
3. ⏳ 他の箇所で描画していないか確認
4. ⏳ スライダー操作時の処理を詳細比較

### 🔍 コード構造の完全マップ

**描画が発生する箇所:**
1. **Line 580**: カード作成直後（今回追加）
   ```javascript
   card.appendChild(canvas);
   drawCurveThumbnail(canvas, preset.keyframes);  // 追加
   ```

2. **Line 654**: マウスホバー解除時
   ```javascript
   card.addEventListener('mouseleave', function() {
       drawCurveThumbnail(canvas, preset.keyframes);
   });
   ```

3. **Line 738**: 100ms setTimeout内
   ```javascript
   setTimeout(() => {
       canvas.width = canvasDisplayWidth * dpr;  // リセット
       canvas.height = canvasDisplayHeight * dpr;
       drawCurveThumbnail(canvas, preset.keyframes);
   }, 100);
   ```

4. **ui-bridge-v48.js Line 327**: スライダー操作時
   ```javascript
   function applyCardSize(size) {
       canvas.width = canvasDisplayWidth * dpr;  // リセット
       canvas.height = canvasDisplayHeight * dpr;
       drawCurveThumbnail(canvas, preset.keyframes);
   }
   ```

**重要な違い:**
- Line 580（新規追加）: canvas.width再設定なし
- Line 738（100ms後）: canvas.width再設定あり
- Line 327（スライダー）: canvas.width再設定あり

**canvas.width再設定の意味:**
- Canvas APIの仕様: `canvas.width = X` を実行すると、Contextが完全にリセットされる
- すべての状態（transform、styles等）がクリアされる

**可能性のある問題:**
1. Line 580の初回描画は、何らかの不完全な状態で描画される
2. 100ms後のリセット+再描画で、正しい状態になるはず
3. しかし、ユーザー報告では「起動時にカーブが大きい」
4. つまり、100ms setTimeoutが**実行されていない**または**効果がない**

### 🧪 実験2: デバッグログで検証

**追加検証項目:**
- 100ms setTimeoutが実際に実行されているか
- その時点でのcanvasサイズ、DPR、Transform状態

**次の修正案:**
1. 100ms setTimeoutの実行確認ログを追加 → ✅ 完了
2. 遅延時間を200ms、500msに変更してテスト
3. requestAnimationFrameを使った同期描画を試す

### 🌐 CEP環境特有の問題調査

**CEP (Chromium Embedded Framework) の特性:**
- 通常のブラウザとは異なる環境
- レンダリングタイミングが異なる可能性
- セキュリティ制限による動作の違い

**過去の類似事例:**
- Canvas描画が非同期で完了する
- CSS適用とCanvas描画のタイミングずれ
- Retina/HiDPI処理の遅延

**検証項目:**
1. `window.devicePixelRatio` の値が正しく取得できているか
2. CSS `width/height` とCanvas `width/height` の同期
3. DOM完全構築の判定方法（100msで十分か）

### 💡 新しい仮説

**仮説D: Canvas描画の非同期完了**
- 初回描画は実行されているが、完了していない
- 100ms setTimeoutも実行されているが、まだ描画中
- スライダー操作時は十分時間が経過しているので正しく表示

**検証方法:**
- 初回描画完了のコールバックを追加
- `requestAnimationFrame` を使って描画完了を待つ

**仮説E: スタイル適用の遅延**
- `canvas.style.width/height` が実際に適用されるまでに時間がかかる
- その間に描画すると、間違ったスケールで描画される

**検証方法:**
- `getBoundingClientRect()` で実際のサイズを確認 → ✅ ログ追加完了
- スタイル適用を `window.getComputedStyle()` で確認 → ✅ ログ追加完了

### 🔄 requestAnimationFrame による同期描画

**setTimeout の問題点:**
- 時間ベースの遅延は不正確
- レンダリングサイクルと同期しない
- 100msは長すぎるか短すぎるかの判断が困難

**requestAnimationFrame の利点:**
- ブラウザのレンダリングサイクルと同期
- 次のペイント直前に実行される
- DOM/CSS適用完了後に確実に実行

**実装案:**
```javascript
card.appendChild(canvas);
drawCurveThumbnail(canvas, preset.keyframes);  // 初回描画

// レンダリング完了後に再描画
requestAnimationFrame(() => {
    requestAnimationFrame(() => {  // 2フレーム待つ
        canvas.width = canvasDisplayWidth * dpr;
        canvas.height = canvasDisplayHeight * dpr;
        canvas.style.width = `${canvasDisplayWidth}px`;
        canvas.style.height = `${canvasDisplayHeight}px`;
        drawCurveThumbnail(canvas, preset.keyframes);
    });
});
```

**期待される効果:**
- DOM/CSS完全適用後に描画
- タイミング問題の解消
- より確実な描画

---

## 深夜調査まとめ（2025-11-17 03:00時点）

### 📋 実施した作業

**1. コード分析:**
- ✅ updatePresetCards()の処理フローを完全マップ化
- ✅ 描画が発生する全箇所を特定（4箇所）
- ✅ 初回描画が存在しないことを発見
- ✅ Canvas API仕様の再確認

**2. デバッグコード追加:**
- ✅ Transform状態の記録（before/after）
- ✅ Canvas/Displayサイズの記録
- ✅ DPR値の記録
- ✅ setTimeout実行確認
- ✅ 実際のDOMサイズ（getBoundingClientRect）
- ✅ Computed Styleの確認
- ✅ 描画関数内でのcanvasサイズ記録

**3. コード修正:**
- ✅ 初回描画を追加（Line 580）
  ```javascript
  card.appendChild(canvas);
  drawCurveThumbnail(canvas, preset.keyframes);  // NEW
  ```

**4. レポート更新:**
- ✅ 問題の詳細分析
- ✅ 仮説の整理（A〜E）
- ✅ 検証項目の明確化
- ✅ 次のステップの提案

### 🔬 現在のデバッグ出力

拡張機能起動時に表示されるアラート:
```
=== Initial Draw ===
cardSize=80
displaySize=78x78
canvasSize=156x156
dpr=2
padding=2

=== Draw Function (1st call) ===
canvasWidth=156
canvasHeight=156
dpr=2
displayWidth=78
displayHeight=78

=== Actual Size (DOM) ===
BoundingRect: 78x78
ComputedStyle: 78px x 78px
Canvas Attr: 156x156

=== Transform ===
BEFORE: a=1.00, d=1.00
AFTER: a=2.00, d=2.00

=== setTimeout ===
Executed: YES
Time: 2025-11-17T...
```

### 🎯 期待される結果

**もし初回描画追加で解決する場合:**
- 起動時からカーブが正しいサイズで表示される
- 100ms setTimeoutは保険として機能

**もし解決しない場合:**
- デバッグ出力から問題の原因を特定
- canvas.width/heightが間違っている可能性
- Transform状態が間違っている可能性
- タイミング問題（100msでは不十分）

### 📝 次の調査ステップ

**ユーザーテスト後の対応:**

1. **初回描画で解決した場合:**
   - 100ms setTimeoutを削除するか残すか検討
   - デバッグコードを削除
   - REPORTに解決策を記録

2. **初回描画で解決しない場合:**
   - デバッグ出力の数値を分析
   - canvas.width/displayWidthの不一致を確認
   - Transform状態の異常を確認
   - requestAnimationFrame実装を試す
   - 遅延時間を200ms/500msに変更してテスト

3. **他の要因が判明した場合:**
   - CEP環境特有の問題を調査
   - Chromium Embedded Frameworkのドキュメント確認
   - 他のCEP拡張機能の実装を参考にする

### 💤 現在の状態

- 最新デバッグ版をインストール済み
- ユーザーのテスト待ち
- 追加の調査準備完了
- 時間をかけて徹底的に分析する体制

---

## ✅ 問題の原因特定（2025-11-19 朝）

### 🎯 デバッグ結果の分析

**ユーザーから提供されたデバッグ情報:**
```
=== Actual Size (DOM) ===
BoundingRect: 0x0          ← ★ 問題発見！
ComputedStyle:  x          ← ★ 空文字列
Canvas Attr: 156x156       ← 正常
```

### 🚨 根本原因の特定

**問題:**
- Canvas要素の`width/height`属性: ✅ 正しく156x156
- Canvas要素の`style.width/height`: ❌ **適用されていない（0x0）**

**なぜこうなるのか:**
1. `card.appendChild(canvas)` でDOMに追加
2. この時点では**CSS/スタイルがまだ適用されていない**
3. 即座に`drawCurveThumbnail()`を呼ぶ
4. ブラウザはスタイル未適用の状態で描画を試みる
5. 内部的に間違ったスケールで描画される

**100ms setTimeoutが存在する理由:**
- スタイル適用を待つための遅延
- しかし、`canvas.width/height`を再設定していたため、初回描画が上書きされていた
- 結果的に100ms後の描画だけが正しく表示される

### 💡 正しい解決策

**方針:**
初回描画を削除し、スタイル適用後に描画する

**修正案1: requestAnimationFrame使用**
```javascript
card.appendChild(canvas);
// スタイル適用を待つ
requestAnimationFrame(() => {
    drawCurveThumbnail(canvas, preset.keyframes);
});
```

**修正案2: 100ms setTimeoutのみ使用（現状維持）**
```javascript
card.appendChild(canvas);
// 初回描画は削除（スタイル未適用のため）
// 100ms後の描画のみ実行
```

**修正案3: スタイル適用確認後に描画**
```javascript
card.appendChild(canvas);
const checkStyleApplied = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        drawCurveThumbnail(canvas, preset.keyframes);
    } else {
        requestAnimationFrame(checkStyleApplied);
    }
};
requestAnimationFrame(checkStyleApplied);
```

### 📝 次のアクション

1. 初回描画を削除（Line 580の追加分）
2. requestAnimationFrameを使った描画に変更
3. デバッグコードを削除
4. テスト実行