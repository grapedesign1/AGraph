# ダブルクリックしたハンドル以外も変わってしまう問題の徹底考察

## 問題の現象
- ハンドルAをダブルクリックしてX,Y値を変更
- Applyを押すと、ハンドルA以外のハンドルも変わってしまう

## 調査項目

### 1. showNumericInputForHandle関数の呼び出し
- どのハンドルが渡されているか？
- handle.keyframeIndex, handle.isOutは正しいか？

### 2. applyHandler内のハンドル参照
```javascript
const applyHandler = () => {
    // ...
    // kf.easingを更新
    kf.easing[easingKey] = {
        speed: newSpeed,
        influence: newInfluence
    };
    
    // handleの位置を再計算
    if (handle.isOut && nextKF) {
        handle.x = kf.canvasX + segmentWidth * (newInfluence / 100);
        handle.y = kf.canvasY + newSpeed;
    } else if (!handle.isOut && prevKF) {
        handle.x = kf.canvasX - segmentWidth * (newInfluence / 100);
        handle.y = kf.canvasY - newSpeed;
    }
    
    // グラフを再描画
    redrawNPointCurve();
};
```

**問題の可能性：**
- `handle`はクロージャで正しく保持されているか？
- 再描画時に他のハンドルが影響を受けていないか？

### 3. redrawNPointCurve関数の挙動
再描画関数は全てのハンドル位置を再計算している可能性がある

### 4. ハンドル位置計算の問題
```javascript
handle.x = kf.canvasX + segmentWidth * (newInfluence / 100);
handle.y = kf.canvasY + newSpeed;
```

この計算は正しいか？特に：
- `kf.canvasX`は正しいキーフレームか？
- `segmentWidth`は正しいセグメントか？
- `newSpeed`の符号は正しいか？

## 詳細調査

### 実際のコードパス確認が必要な箇所

1. **showNumericInputForHandleの呼び出し元**
   - canvas上のダブルクリックイベントハンドラ
   - 正しいhandleオブジェクトが渡されているか

2. **applyHandler内のクロージャ変数**
   - `handle`: 外側のスコープから参照
   - `kf`: 外側のスコープから参照
   - `easingKey`: 外側のスコープから参照
   - これらが正しく保持されているか

3. **redrawNPointCurveでの再計算**
   - この関数がeasing設定から全ハンドル位置を再計算している可能性
   - もしそうなら、applyHandler内でのhandle位置更新は不要かもしれない

## 仮説

### 仮説1: redrawNPointCurveが全ハンドルを再計算している
- applyHandlerでeasing設定を更新
- その後redrawNPointCurveを呼ぶ
- redrawNPointCurveが全キーフレームのeasing設定を読んで全ハンドルを再計算
- もし他のキーフレームのeasing設定が意図せず変更されていたら、他のハンドルも動く

### 仮説2: 間違ったキーフレームのeasingを更新している
- `kf`変数が間違ったキーフレームを指している
- または`easingKey`が間違っている

### 仮説3: handleオブジェクトの参照が間違っている
- クロージャで保持している`handle`が、実際には別のハンドルを指している
- または複数のハンドルが同じオブジェクトを参照している

## 検証方法

### ステップ1: ログ出力を追加
```javascript
function showNumericInputForHandle(handle) {
    console.log('[DEBUG] showNumericInputForHandle called');
    console.log('[DEBUG] handle:', handle);
    console.log('[DEBUG] keyframeIndex:', handle.keyframeIndex);
    console.log('[DEBUG] isOut:', handle.isOut);
    
    // ...
    
    const applyHandler = () => {
        console.log('[DEBUG] applyHandler called');
        console.log('[DEBUG] Updating keyframe:', handle.keyframeIndex);
        console.log('[DEBUG] easingKey:', easingKey);
        console.log('[DEBUG] Old easing:', kf.easing?.[easingKey]);
        
        // ...更新処理...
        
        console.log('[DEBUG] New easing:', kf.easing[easingKey]);
        console.log('[DEBUG] Updated handle position:', handle.x, handle.y);
        
        // 全キーフレームのeasing状態を出力
        graphData.keyframes.forEach((k, i) => {
            console.log(`[DEBUG] KF${i} easing:`, k.easing);
        });
    };
}
```

### ステップ2: redrawNPointCurveの挙動を確認
- この関数がhandle位置をどのように計算しているか確認
- easing設定から位置を再計算しているか、既存のhandle.x/yを使っているか

### ステップ3: handle参照の検証
- handleオブジェクトのIDを追加してトレースする
- どのhandleが更新されているか明確にする
