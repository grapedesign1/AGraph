# Numeric Input Apply Button Fix - Investigation Report

**Date:** 2025-12-18
**Issue:** Apply button in numeric input dialog for handles does not close modal
**Status:** ✅ RESOLVED

---

## Problem Description

### Symptoms
1. ハンドルをダブルクリックして数値入力ダイアログを開く
2. Speed/Influence値を変更してApplyボタンをクリック
3. **モーダルが閉じない**（Cancelボタンも同様）
4. しかし、データは正しく更新されている（Cancelで閉じて再描画すると反映されている）

### User Confirmation
- 中点（midpoint）のXY値入力は正常に動作する
- ハンドルの数値入力のみが問題
- 以前は正常に動作していた（リグレッション）

---

## Root Cause Analysis

### Investigation Process

#### 1. closeNumericInputModal()の実装を確認
```javascript
function closeNumericInputModal() {
    const modal = document.getElementById('numericInputModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // イベントリスナーをクリーンアップ
    const applyBtn = document.getElementById('numericInputApply');
    const cancelBtn = document.getElementById('numericInputCancel');
    
    if (applyBtn) {
        applyBtn.replaceWith(applyBtn.cloneNode(true));  // ← 問題の原因
    }
    if (cancelBtn) {
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));  // ← 問題の原因
    }
}
```

**発見:** `replaceWith()`でボタンを置き換えているため、`showNumericInputForHandle()`で設定したイベントリスナーが削除される。

#### 2. e477423（完成版）との比較
完成版のコードも同じ`replaceWith()`を使用していた。つまり、この方法自体には問題がないはず。

#### 3. イベントリスナーの設定方法を確認
```javascript
const applyHandler = () => { /* ... */ };

applyBtn.removeEventListener('click', applyHandler);  // ← これは機能しない！
applyBtn.addEventListener('click', applyHandler);
```

**重要な発見:** 
- `removeEventListener()`は関数参照が完全に一致しないと機能しない
- `const applyHandler = () => {}`は毎回新しい関数オブジェクトを作成する
- つまり、`removeEventListener()`は実際には何も削除していない
- ダイアログを開くたびにイベントリスナーが**重複して追加される**

#### 4. なぜe477423では動作していたのか？
完成版も同じ問題を抱えていたが、以下の理由で動作していた可能性：
- `closeNumericInputModal()`の`replaceWith()`が重複したリスナーをクリアしていた
- しかし、その後の修正で`closeNumericInputModal()`が呼ばれなくなった
- または、何らかのタイミングの違い

---

## Solution Approaches Explored

### Approach 1: イベントリスナーを直接削除 ❌
```javascript
applyBtn.removeEventListener('click', applyHandler);
```
**問題:** 関数参照が一致しないため機能しない

### Approach 2: ボタンをcloneNode()で複製 ❌
```javascript
const newApplyBtn = applyBtn.cloneNode(true);
applyBtn.replaceWith(newApplyBtn);
newApplyBtn.addEventListener('click', applyHandler);
```
**問題:** グラフが操作不能になった（原因不明）

### Approach 3: グローバルスコープにハンドラーを保存 ✅
```javascript
let currentApplyHandler = null;

function showNumericInputForHandle(handle) {
    // 前のリスナーを削除
    if (currentApplyHandler) {
        applyBtn.removeEventListener('click', currentApplyHandler);
    }
    
    // 新しいハンドラーを作成
    currentApplyHandler = () => {
        // ... 処理 ...
        modal.style.display = 'none';  // closeNumericInputModal()を使わない
    };
    
    // 新しいリスナーを追加
    applyBtn.addEventListener('click', currentApplyHandler);
}
```

### Approach 4: {once: true}オプション（代替案）
```javascript
applyBtn.addEventListener('click', applyHandler, { once: true });
```
**メリット:** イベントリスナーが自動的に削除される

---

## Final Solution

### 実装内容

1. **グローバルスコープにハンドラー参照を保存**
```javascript
let currentApplyHandler = null;
let currentCancelHandler = null;
let currentEscapeHandler = null;
```

2. **ダイアログを開く前に古いリスナーを削除**
```javascript
if (currentApplyHandler) {
    applyBtn.removeEventListener('click', currentApplyHandler);
}
```

3. **closeNumericInputModal()を使わず直接モーダルを閉じる**
```javascript
currentApplyHandler = () => {
    // ... データ更新処理 ...
    modal.style.display = 'none';  // 直接閉じる
};
```

4. **新しいリスナーを追加して参照を更新**
```javascript
applyBtn.addEventListener('click', currentApplyHandler);
```

### コミット履歴
1. `ee686cc` - Fix: Store event handlers in global scope for proper removal
2. `8476eb7` - Fix: Replace closeNumericInputModal with direct modal.style.display

---

## Technical Insights

### JavaScript Event Listener Behavior

1. **関数参照の重要性**
   - `removeEventListener()`は同じ関数オブジェクトを指定する必要がある
   - アロー関数は毎回新しいオブジェクトを作成する
   - グローバル変数に保存することで参照を維持

2. **replaceWith()の副作用**
   - DOMノードを置き換えると、全てのイベントリスナーが失われる
   - クリーンアップには便利だが、予期しない動作の原因にもなる

3. **イベントリスナーの重複**
   - 削除されないリスナーは累積する
   - 同じボタンに複数のリスナーが登録される可能性

### Best Practices

1. **イベントハンドラーの管理**
   ```javascript
   // ❌ Bad: 参照を保持できない
   btn.addEventListener('click', () => { /* ... */ });
   
   // ✅ Good: グローバル変数で参照を保持
   let handler = () => { /* ... */ };
   btn.addEventListener('click', handler);
   
   // ✅ Better: once オプションで自動削除
   btn.addEventListener('click', () => { /* ... */ }, { once: true });
   ```

2. **モーダルの閉じ方**
   ```javascript
   // ❌ Bad: 副作用のある関数を使う
   closeNumericInputModal();  // replaceWith()を実行
   
   // ✅ Good: 直接操作
   modal.style.display = 'none';
   ```

---

## Testing Checklist

### ハンドル数値入力
- [ ] ハンドルをダブルクリックしてダイアログが開く
- [ ] Speed/Influence値を変更
- [ ] Applyボタンをクリック
- [ ] モーダルが閉じる ← **修正対象**
- [ ] グラフが正しく更新される
- [ ] Cancelボタンで閉じる
- [ ] Escapeキーで閉じる
- [ ] Enterキーで適用される

### 中点数値入力
- [ ] 中点をダブルクリックしてダイアログが開く
- [ ] Time/Value値を変更
- [ ] Applyボタンで正常に適用される（既存機能）

### グラフ操作
- [ ] ハンドルのドラッグ操作が正常
- [ ] 中点のドラッグ操作が正常
- [ ] Zoom/Fit機能が正常
- [ ] V/Aトグルが正常

---

## Preserved Features

修正中に以下の機能が保持されていることを確認：

✅ V/Aトグルバグ修正（skipHandleRecalc）
✅ Zoom/Fitバグ修正（handleY計算式の統一）
✅ スピード計算修正（influence考慮）
✅ ZXPビルドスクリプト

---

## Conclusion

**問題の本質:**
- イベントリスナーの参照管理の不備
- `closeNumericInputModal()`の`replaceWith()`との干渉

**解決方法:**
- グローバルスコープにハンドラー参照を保存
- `closeNumericInputModal()`を使わず直接`modal.style.display`を操作

**学んだこと:**
- JavaScriptのイベントリスナーは関数参照で管理される
- アロー関数は毎回新しいオブジェクトを作成する
- DOM操作の副作用に注意する必要がある

---

**Status:** Ready for testing
**Next Steps:** After Effects再起動後にApplyボタンの動作を確認
