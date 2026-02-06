// AGraph Extension - Main JavaScript
// After Effectsエクステンション用のメインスクリプト

(function() {
    'use strict';

    // PropertyValueType定義（グローバル）
    const PropertyValueType = {
        OneD: 6144,
        TwoD: 6145,
        ThreeD: 6146,
        TwoD_SPATIAL: 6147,
        ThreeD_SPATIAL: 6148
    };

    // グローバル変数
    let csInterface;
    let currentChart = null;
    let keyframeData = null;
    let isDragging = false;
    let dragHandle = null;
    let isShiftPressed = false;
    let isAltPressed = false;
    let shiftConstraintDirection = null; // 'horizontal' or 'vertical'
    let graphScale = 0.9; // グラフスケール (0.3-1.0の範囲)
    
    // ダブルクリック検出用（独自実装）
    let lastClickTime = 0;
    let lastClickX = 0;
    let lastClickY = 0;
    const DOUBLE_CLICK_THRESHOLD = 400; // ミリ秒
    const DOUBLE_CLICK_DISTANCE = 10; // ピクセル
    
    // 【統一されたグラフデータ構造】
    // N点対応: 点数に依存しない汎用的なデータ形式
    let graphData = {
        keyframes: [],        // 正規化済みキーフレーム配列 (0-1空間)
        normalization: {      // 正規化情報
            startTime: 0,
            endTime: 1,
            startValue: 0,
            endValue: 100,
            timeRange: 1,
            valueRange: 100
        },
        handles: [],          // ハンドル情報 (UI用)
        metadata: {           // メタ情報
            propertyType: null,
            isPosition: false,
            originalKeyframes: [] // 元のキーフレームデータへの参照
        }
    };
    
    // 互換性のため残す（段階的に削除予定）
    let currentEasingSettings = null;
    let currentMode = 2; // 2点モード(2)または3点モード(3)
    let nPointHandleEditingInitialized = false; // N点ハンドル編集の初期化フラグ
    let showAcceleration = false; // 加速度グラフの表示フラグ（デフォルトでオフ）
    let showVelocity = false; // 速度グラフの表示フラグ（デフォルトでオフ）
    
    // プリセット関連
    let presetData = { version: "1.0", groups: [], presets: [] };
    let presetFilePath = null;
    let currentGroup = "default"; // 現在選択中のグループ
    
    // グローバルツールチップ（プリセットカード用）
    let globalPresetTooltip = null;
    let tooltipTimeout = null;

    // ========================================
    // プリセット機能
    // ========================================
    
    /**
     * プリセットファイルのパスを取得
     */
    function getPresetFilePath() {
        if (presetFilePath) return presetFilePath;
        
        // SystemPath.MY_DOCUMENTS = ユーザーの書類フォルダ
        // Mac: ~/Documents
        // Windows: C:\Users\[username]\Documents
        const documentsPath = csInterface.getSystemPath(SystemPath.MY_DOCUMENTS);
        
        // Windowsのバックスラッシュをスラッシュに変換（ExtendScriptはスラッシュを推奨）
        const normalizedPath = documentsPath.replace(/\\/g, '/');
        presetFilePath = normalizedPath + '/gd_AGraph/gd_AGraph_Preset.json';
        
        return presetFilePath;
    }
    
    /**
     * デフォルトプリセットデータ（Macの24個のプリセット）
     */
    function getDefaultPresets() {
        return [{"id": "preset_1766054266779", "name": "linear", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0.16666666666667, "originalValue": 0, "easing": {"outTemporal": {"speed": 0, "influence": 0.1}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 1, "originalValue": 467.639146100842, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 0.1}}, "isStart": false, "isEnd": true, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766327469004", "name": "soft ease", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": -867.588806152344, "easing": {"outTemporal": {"speed": 0, "influence": 33.333333}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 28.89999999999999, "canvasY": 189.10000000000002}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 132.411193847656, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 33.333333}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 189.10000000000002, "canvasY": 28.900000000000006}]}, {"id": "preset_1766054303213", "name": "smooth ease", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0.16666666666667, "originalValue": 0, "easing": {"outTemporal": {"speed": 0, "influence": 66}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 1, "originalValue": 467.639146100842, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 66}}, "isStart": false, "isEnd": true, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766054449155", "name": "strong ease", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0.16666666666667, "originalValue": 0, "easing": {"outTemporal": {"speed": 0, "influence": 90}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 1, "originalValue": 467.639146100842, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 90}}, "isStart": false, "isEnd": true, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766063181179", "name": "early peak", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 66}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 90}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766063217373", "name": "very early peak", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 33}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 100}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766054482163", "name": "late peak", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0.16666666666667, "originalValue": 0, "easing": {"outTemporal": {"speed": 0, "influence": 90}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 1, "originalValue": 467.639146100842, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 66}}, "isStart": false, "isEnd": true, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766063246532", "name": "very late peak", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 100}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 33}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766054341249", "name": "cubic in", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0.16666666666667, "originalValue": 0, "easing": {"outTemporal": {"speed": 0, "influence": 66}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 1, "originalValue": 467.639146100842, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 0.1}}, "isStart": false, "isEnd": true, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766054400480", "name": "cubic out", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0.16666666666667, "originalValue": 0, "easing": {"outTemporal": {"speed": 0, "influence": 0.1}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 1, "originalValue": 467.639146100842, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 66}}, "isStart": false, "isEnd": true, "propertyName": "Y Rotation", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766063316859", "name": "fast start", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 30000.000000000113, "influence": 0.1}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 100}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766063386509", "name": "fast end", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 100}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 30000.000000000113, "influence": 0.1}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766063756944", "name": "dual peak", "group": "default", "points": 2, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 100000.00000000038, "influence": 0.1}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 100000.00000000038, "influence": 0.1}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766330713678", "name": "smooth ease 3-key", "group": "default", "points": 3, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 75}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 28.89999999999999, "canvasY": 189.10000000000002}, {"time": 0.5, "value": 0.5, "originalTime": 0.49300130208333, "originalValue": 943.3564453125, "easing": {"outTemporal": {"speed": 375, "influence": 20}, "inTemporal": {"speed": 371.6293462251568, "influence": 20.1813986871101}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 109, "canvasY": 109.00000000000001}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 75}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 189.10000000000002, "canvasY": 28.900000000000006}]}, {"id": "preset_1766330896607", "name": "strong ease 3-key", "group": "default", "points": 3, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 80}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 28.89999999999999, "canvasY": 189.10000000000002}, {"time": 0.5, "value": 0.5, "originalTime": 0.49300130208333, "originalValue": 943.3564453125, "easing": {"outTemporal": {"speed": 80000, "influence": 0.1}, "inTemporal": {"speed": 80000, "influence": 0.1}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 109, "canvasY": 109.00000000000001}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 80}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 189.10000000000002, "canvasY": 28.900000000000006}]}, {"id": "preset_1766063494118", "name": "early peak 3-key", "group": "default", "points": 3, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 74.4844256412221}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 0.2900053879310369, "value": 0.3986549028632843, "originalTime": 0.28033854166667, "originalValue": 773.581848144531, "easing": {"outTemporal": {"speed": 563.2766576902183, "influence": 13.3149490531964}, "inTemporal": {"speed": 347.05590071599323, "influence": 21.6103514866833}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 54.83254310344852, "canvasY": 86.21558579138095}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 79.9181167000017}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766063567055", "name": "very early peak 3-key", "group": "default", "points": 3, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 56.3632919237118}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 0.14998653017241673, "value": 0.2657036404756342, "originalTime": 0.14498697916667, "originalValue": 613.641479492188, "easing": {"outTemporal": {"speed": 461.44617676252943, "influence": 21.6709997906131}, "inTemporal": {"speed": 225.02013069978716, "influence": 22.2202341828292}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 40.718642241379605, "canvasY": 99.61707304005608}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 77.7856809878799}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766063537276", "name": "late peak 3-key", "group": "default", "points": 3, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 83.3813789014461}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 0.7199959590517216, "value": 0.6493581516586118, "originalTime": 0.69599609375, "originalValue": 1075.17785644531, "easing": {"outTemporal": {"speed": 381.76824212980597, "influence": 19.6454266550803}, "inTemporal": {"speed": 530.0843815942353, "influence": 14.1486907753133}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 98.17559267241353, "canvasY": 60.94469831281194}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 71.2590604861134}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766063586262", "name": "very late peak 3-key", "group": "default", "points": 3, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 80.4002252104028}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 0.8600148168103419, "value": 0.7740309058083957, "originalTime": 0.83134765625, "originalValue": 1225.1591796875, "easing": {"outTemporal": {"speed": 243.69613180184055, "influence": 20.5173548017817}, "inTemporal": {"speed": 437.0823226904261, "influence": 22.8789852182668}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 112.28949353448246, "canvasY": 48.37768469451372}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 54.979748111807}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766325169352", "name": "dual peak 3-key", "group": "default", "points": 3, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 0, "easing": {"outTemporal": {"speed": 75000, "influence": 0.1}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 28.89999999999999, "canvasY": 189.10000000000002}, {"time": 0.5, "value": 0.5, "originalTime": 0.46666666666667, "originalValue": 500, "easing": {"outTemporal": {"speed": 14.347965742310297, "influence": 99.6742084886445}, "inTemporal": {"speed": 13.39143469282304, "influence": 100}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 109, "canvasY": 109.00000000000001}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1000, "easing": {"outTemporal": null, "inTemporal": {"speed": 75000, "influence": 0.1}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 189.10000000000002, "canvasY": 28.900000000000006}]}, {"id": "preset_1766063675526", "name": "short cruise", "group": "default", "points": 4, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": 294, "easing": {"outTemporal": {"speed": 0, "influence": 52.7312559248018}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 25.6, "canvasY": 126.4}, {"time": 0.38250942887930556, "value": 0.1780773235774497, "originalTime": 0.36975911458333, "originalValue": 508.227020263672, "easing": {"outTemporal": {"speed": 100.0000000000017, "influence": 0.1}, "inTemporal": {"speed": 571.5973699513952, "influence": 13.1211240538732}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 64.156950431034, "canvasY": 108.44980578339307}, {"time": 0.6325094288793082, "value": 0.8433454328047049, "originalTime": 0.61142578125, "originalValue": 1308.54455566406, "easing": {"outTemporal": {"speed": 624.2518473234811, "influence": 12.0143817469771}, "inTemporal": {"speed": 100.0000000000017, "influence": 0.1}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 89.35695043103426, "canvasY": 41.390780373285764}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 1497, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 51.0950828630091}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 126.4, "canvasY": 25.60000000000001}]}, {"id": "preset_1766328776221", "name": "long cruise", "group": "default", "points": 4, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": -867.588806152344, "easing": {"outTemporal": {"speed": 0, "influence": 40.5689335297007}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 28.89999999999999, "canvasY": 189.10000000000002}, {"time": 0.2549838362068957, "value": 0.11069769287109398, "originalTime": 0.246484375, "originalValue": -756.89111328125, "easing": {"outTemporal": {"speed": 99.99999999999955, "influence": 0.1}, "inTemporal": {"speed": 363.06033128633857, "influence": 6.8859078906869}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 69.7484105603447, "canvasY": 171.36622960205077}, {"time": 0.7549838362068906, "value": 0.8987857074737551, "originalTime": 0.72981770833333, "originalValue": 31.1969013214111, "easing": {"outTemporal": {"speed": 381.55540536768314, "influence": 6.55212837986393}, "inTemporal": {"speed": 99.99999999999955, "influence": 0.1}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 149.8484105603439, "canvasY": 45.114529662704456}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 132.411193847656, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 40.2182051207488}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 189.10000000000002, "canvasY": 28.900000000000006}]}, {"id": "preset_1766325912260", "name": "anticipated early peak", "group": "default", "points": 3, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": -867.588806152344, "easing": {"outTemporal": {"speed": 0, "influence": 25}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 28.89999999999999, "canvasY": 174.53636363636366}, {"time": 0.25, "value": -0.1, "originalTime": 0.3, "originalValue": -967.588806152344, "easing": {"outTemporal": {"speed": 0, "influence": 50}, "inTemporal": {"speed": 0, "influence": 70.3916963581797}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 68.94999999999999, "canvasY": 189.10000000000002}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 132.411193847656, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 100}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 189.10000000000002, "canvasY": 28.900000000000006}]}, {"id": "preset_1766330037815", "name": "anticipated late peak", "group": "default", "points": 3, "keyframes": [{"time": 0, "value": 0, "originalTime": 0, "originalValue": -867.588806152344, "easing": {"outTemporal": {"speed": 0, "influence": 100}, "inTemporal": null}, "isStart": true, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 28.89999999999999, "canvasY": 174.53636363636366}, {"time": 0.75, "value": 1.1, "originalTime": 0.3, "originalValue": -967.588806152344, "easing": {"outTemporal": {"speed": 0, "influence": 70}, "inTemporal": {"speed": 0, "influence": 50}}, "isStart": false, "isEnd": false, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 149.05, "canvasY": 14.336363636363615}, {"time": 1, "value": 1, "originalTime": 0.96666666666667, "originalValue": 132.411193847656, "easing": {"outTemporal": null, "inTemporal": {"speed": 0, "influence": 25}}, "isStart": false, "isEnd": true, "propertyName": "X Position", "layerName": "propertyGroup", "propertyValueType": 6417, "canvasX": 189.10000000000002, "canvasY": 28.900000000000006}]}];
    }
    
    /**
     * プリセットファイルを初期化（起動時に呼ぶ）
     */
    function initializePresets() {
        const filePath = getPresetFilePath();
        
        updateOutput('📁 Preset file path: ' + filePath);
        
        // ファイル読み込みを試行（文字列連結で確実に）
        var scriptCode = 'readPresetFile(' + JSON.stringify(filePath) + ')';
        csInterface.evalScript(scriptCode, function(result) {
            try {
                const data = JSON.parse(result);
                
                if (data.shouldCreate) {
                    // ファイルが存在しない→デフォルトプリセットで生成
                    updateOutput('📝 Creating default preset file...');
                    createDefaultPresetFile();
                } else if (data.success) {
                    // ファイル読み込み成功
                    updateOutput('✅ Preset file loaded');
                    try {
                        presetData = JSON.parse(data.content);
                        
                        // 古いフォーマット対応: groupsがない場合は追加
                        if (!presetData.groups) {
                            presetData.groups = [
                                { id: "default", name: "Default", locked: true },
                                { id: "user1", name: "User 1", locked: false }
                            ];
                        }
                        
                        // 前回開いていたグループを復元
                        if (presetData.lastOpenedGroup && presetData.groups.find(g => g.id === presetData.lastOpenedGroup)) {
                            currentGroup = presetData.lastOpenedGroup;
                        }
                        
                        updateOutput(`✅ ${presetData.presets.length} presets loaded`);
                        updateGroupDropdown(); // グループドロップダウンを更新
                        updatePresetDropdown(); // プリセットドロップダウンを更新
                    } catch (parseError) {
                        updateOutput('❌ Invalid JSON format, recreating...');
                        createDefaultPresetFile();
                    }
                } else {
                    updateOutput('❌ Error reading preset file: ' + (data.error || 'Unknown error'));
                    updateOutput('📝 Creating default preset file...');
                    createDefaultPresetFile();
                }
            } catch (e) {
                updateOutput('❌ Failed to parse result: ' + e.message);
            }
        });
    }
    
    /**
     * デフォルトプリセットファイルを作成
     */
    function createDefaultPresetFile() {
        const filePath = getPresetFilePath();
        
        // ExtendScript側のcreateDefaultPresetFile()を呼び出す（24個のプリセットがハードコード済み）
        var scriptCode = 'createDefaultPresetFile(' + JSON.stringify(filePath) + ')';
        
        csInterface.evalScript(scriptCode, function(result) {
            try {
                const data = JSON.parse(result);
                if (data.success) {
                    updateOutput('✅ Default preset file created');
                    updateOutput(`📍 Location: ${data.path}`);
                    updateOutput(`📊 Size: ${data.size} bytes`);
                    
                    // JavaScript側のpresetDataも同期（ExtendScriptと同じ構造）
                    presetData = {
                        version: "1.0",
                        lastOpenedGroup: "default",
                        groups: [
                            { id: "default", name: "Default", locked: true },
                            { id: "user1", name: "User 1", locked: false }
                        ],
                        presets: getDefaultPresets()
                    };
                    
                    updateGroupDropdown(); // グループドロップダウンを更新
                    updatePresetDropdown(); // プリセットドロップダウンを更新
                } else {
                    updateOutput('❌ Failed to create preset file: ' + (data.error || 'Unknown error'));
                }
            } catch (e) {
                updateOutput('❌ Failed to parse write result: ' + e.message);
            }
        });
    }
    
    /**
     * グループドロップダウンを更新
     */
    function updateGroupDropdown() {
        const select = document.getElementById('groupSelect');
        if (!select) return;
        
        // 既存のオプションをクリア
        select.innerHTML = '';
        
        // グループを追加
        if (presetData && presetData.groups) {
            presetData.groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                select.appendChild(option);
            });
            
            // 現在のグループを選択
            select.value = currentGroup;
            
            // グループ名表示を更新
            updateGroupNameDisplay();
            
            // プリセットカードを更新
            updatePresetCards();
        }
        
        // 保存用グループドロップダウンも更新
        updateSaveGroupDropdown();
    }
    
    /**
     * グループ名表示を更新
     */
    function updateGroupNameDisplay() {
        const display = document.getElementById('groupNameDisplay');
        if (!display) return;
        
        const currentGroupObj = presetData.groups.find(g => g.id === currentGroup);
        
        if (currentGroupObj) {
            display.textContent = currentGroupObj.name;
            // JSONファイルに保存
            presetData.lastOpenedGroup = currentGroup;
            savePresetFile();
        }
    }
    
    /**
     * 保存用グループドロップダウンを更新（デフォルトを除外）
     */
    function updateSaveGroupDropdown() {
        const select = document.getElementById('saveGroupSelect');
        if (!select) return;
        
        // 既存のオプションをクリア
        select.innerHTML = '';
        
        // デフォルト以外のグループを追加
        if (presetData && presetData.groups) {
            presetData.groups.filter(g => !g.locked).forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                select.appendChild(option);
            });
            
            // 現在のグループを選択（デフォルト以外の場合）
            if (!presetData.groups.find(g => g.id === currentGroup)?.locked) {
                select.value = currentGroup;
            }
        }
    }
    
    /**
     * カーブサムネイルを描画（色指定可能版）
     */
    function drawCurveThumbnailWithColor(canvas, keyframes, curveColor = '#b0b1b0') {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // devicePixelRatioを取得
        const dpr = window.devicePixelRatio || 1;
        
        // 既存の変換をリセット
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // canvasのサイズはすでにdpr倍されているので、表示サイズで計算
        const displayWidth = width / dpr;
        const displayHeight = height / dpr;
        
        // canvas座標系を表示座標系にスケール
        ctx.scale(dpr, dpr);
        
        // 背景をクリア（表示座標系で）
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        
        // 余白（表示サイズベース）
        const padding = 2;
        const drawWidth = displayWidth - padding * 2;
        const drawHeight = displayHeight - padding * 2;
        
        if (!keyframes || keyframes.length < 2) {
            // データがない場合
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(padding, displayHeight - padding);
            ctx.lineTo(displayWidth - padding, padding);
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }
        
        // keyframesをtimeでソート
        const sortedKf = [...keyframes].sort((a, b) => a.time - b.time);
        
        // ベジェ曲線の実際の範囲を計算（自動スケール調整）
        const bounds = calculateBezierBounds(sortedKf);
        const valueMargin = (bounds.maxValue - bounds.minValue) * 0.1;
        const displayMinValue = bounds.minValue - valueMargin;
        const displayMaxValue = bounds.maxValue + valueMargin;
        const displayValueRange = displayMaxValue - displayMinValue;
        
        // グリッド線（薄く）
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([1, 2]);
        
        // 水平線
        for (let i = 0; i <= 4; i++) {
            const y = padding + (drawHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(displayWidth - padding, y);
            ctx.stroke();
        }
        
        // 垂直線
        for (let i = 0; i <= 4; i++) {
            const x = padding + (drawWidth / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, displayHeight - padding);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        // カーブを描画（指定色）
        ctx.strokeStyle = curveColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        
        // 各セグメントを描画
        for (let i = 0; i < sortedKf.length - 1; i++) {
            const kf1 = sortedKf[i];
            const kf2 = sortedKf[i + 1];
            
            // 座標を計算（Y軸は反転、displayScaleを考慮）
            const x1 = padding + kf1.time * drawWidth;
            const normalizedValue1 = (kf1.value - displayMinValue) / displayValueRange;
            const y1 = displayHeight - padding - normalizedValue1 * drawHeight;
            
            const x2 = padding + kf2.time * drawWidth;
            const normalizedValue2 = (kf2.value - displayMinValue) / displayValueRange;
            const y2 = displayHeight - padding - normalizedValue2 * drawHeight;
            
            if (i === 0) {
                ctx.moveTo(x1, y1);
            }
            
            // ベジェ曲線の制御点を計算
            if (kf1.easing && kf1.easing.outTemporal && kf2.easing && kf2.easing.inTemporal) {
                const outSpeed = kf1.easing.outTemporal.speed || 0;
                const inSpeed = kf2.easing.inTemporal.speed || 0;
                const outInfluence = kf1.easing.outTemporal.influence || 33.333;
                const inInfluence = kf2.easing.inTemporal.influence || 33.333;
                
                // 時間差と値差（Value空間）
                const timeDiff = kf2.time - kf1.time;
                const actualValueDiff = kf2.value - kf1.value;
                
                // influenceを0-1に正規化
                const outInf = Math.min(1, outInfluence / 100);
                const inInf = Math.min(1, inInfluence / 100);
                
                // speedを0-1に正規化（速度は100倍されているので100で割る）
                const outSlope = outSpeed / 100;
                const inSlope = inSpeed / 100;
                
                // Value空間での制御点の変化量を計算
                const outHandleValueChange = actualValueDiff * outSlope * outInf;
                const inHandleValueChange = actualValueDiff * inSlope * inInf;
                
                // Pixel空間に変換
                const valueToPixelRatio = drawHeight / displayValueRange;
                const outHandlePixelChange = outHandleValueChange * valueToPixelRatio;
                const inHandlePixelChange = inHandleValueChange * valueToPixelRatio;
                
                // 制御点の位置を計算
                const cp1x = x1 + (x2 - x1) * outInf;
                const cp1y = y1 - outHandlePixelChange;
                
                const cp2x = x2 - (x2 - x1) * inInf;
                const cp2y = y2 + inHandlePixelChange; // 左ハンドルは符号が逆
                
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
            } else {
                // イージングがない場合は直線
                ctx.lineTo(x2, y2);
            }
        }
        
        ctx.stroke();
        
        // 中点のみを描画（始点終点を除く）
        ctx.fillStyle = curveColor;
        for (let i = 1; i < sortedKf.length - 1; i++) {
            const kf = sortedKf[i];
            const x = padding + kf.time * drawWidth;
            const normalizedValue = (kf.value - displayMinValue) / displayValueRange;
            const y = displayHeight - padding - normalizedValue * drawHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 描画完了後、transform を初期状態に戻す
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    
    /**
     * カーブサムネイルを描画
     */
    function drawCurveThumbnail(canvas, keyframes) {
        drawCurveThumbnailWithColor(canvas, keyframes, '#b0b1b0');
    }
    
    /**
     * グローバルツールチップを取得または作成
     */
    function getGlobalTooltip() {
        if (!globalPresetTooltip) {
            globalPresetTooltip = document.createElement('div');
            globalPresetTooltip.id = 'global-preset-tooltip';
            globalPresetTooltip.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.9);
                color: #fff;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-family: Arial, sans-serif;
                pointer-events: none;
                z-index: 10000;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: none;
            `;
            document.body.appendChild(globalPresetTooltip);
        }
        return globalPresetTooltip;
    }
    
    /**
     * グローバルツールチップを表示
     */
    function showGlobalTooltip(text, x, y) {
        const tooltip = getGlobalTooltip();
        tooltip.textContent = text;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
    }
    
    /**
     * グローバルツールチップを非表示
     */
    function hideGlobalTooltip() {
        if (globalPresetTooltip) {
            globalPresetTooltip.style.opacity = '0';
            setTimeout(() => {
                if (globalPresetTooltip) {
                    globalPresetTooltip.style.display = 'none';
                }
            }, 200);
        }
    }
    
    /**
     * プリセットカードのドラッグを開始
     */
    function startPresetDrag(card, preset, mouseEvent) {
        console.log('[Preset Drag] Starting drag for:', preset.name);
        
        // グローバルツールチップを非表示
        hideGlobalTooltip();
        
        // ドラッグ中のカードのクローンを作成
        const dragClone = card.cloneNode(true);
        dragClone.id = 'preset-drag-clone';
        dragClone.style.position = 'fixed';
        dragClone.style.opacity = '0.7';
        dragClone.style.zIndex = '10000';
        dragClone.style.pointerEvents = 'none';
        dragClone.style.transform = 'scale(1.1)';
        dragClone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        document.body.appendChild(dragClone);
        
        // 元のカードを半透明に
        card.style.opacity = '0.3';
        
        // ドロップインジケーター（挿入位置を示す線）
        const dropIndicator = document.createElement('div');
        dropIndicator.id = 'preset-drop-indicator';
        dropIndicator.style.cssText = `
            position: absolute;
            width: 2px;
            height: ${card.offsetHeight}px;
            background: #36a2eb;
            display: none;
            z-index: 9999;
        `;
        document.body.appendChild(dropIndicator);
        
        let lastDropIndex = -1;
        
        // マウス移動処理
        const onMouseMove = (e) => {
            // クローンをマウスに追従
            dragClone.style.left = (e.clientX - card.offsetWidth / 2) + 'px';
            dragClone.style.top = (e.clientY - card.offsetHeight / 2) + 'px';
            
            // カーソル下のカードを検出
            const container = document.getElementById('presetCardsContainer');
            const allCards = Array.from(container.querySelectorAll('.preset-card'));
            
            let dropIndex = -1;
            let closestCard = null;
            let closestDistance = Infinity;
            
            allCards.forEach((targetCard, index) => {
                if (targetCard === card) return; // 自分自身は除外
                
                const rect = targetCard.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distance = Math.sqrt(
                    Math.pow(e.clientX - centerX, 2) + 
                    Math.pow(e.clientY - centerY, 2)
                );
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestCard = targetCard;
                    dropIndex = index;
                }
            });
            
            // ドロップ位置を表示
            if (closestCard && closestDistance < 100) {
                const rect = closestCard.getBoundingClientRect();
                const mouseRelativeX = e.clientX - rect.left;
                const insertBefore = mouseRelativeX < rect.width / 2;
                
                dropIndicator.style.display = 'block';
                if (insertBefore) {
                    dropIndicator.style.left = rect.left + 'px';
                    dropIndicator.style.top = rect.top + 'px';
                    lastDropIndex = dropIndex;
                } else {
                    dropIndicator.style.left = (rect.right - 2) + 'px';
                    dropIndicator.style.top = rect.top + 'px';
                    lastDropIndex = dropIndex + 1;
                }
            } else {
                dropIndicator.style.display = 'none';
                lastDropIndex = -1;
            }
        };
        
        // マウスアップ処理（ドロップ）
        const onMouseUp = () => {
            console.log('[Preset Drag] Drop at index:', lastDropIndex);
            
            // クローンとインジケーターを削除
            if (dragClone.parentNode) {
                document.body.removeChild(dragClone);
            }
            if (dropIndicator.parentNode) {
                document.body.removeChild(dropIndicator);
            }
            
            // グローバルツールチップを非表示
            hideGlobalTooltip();
            
            // 元のカードの透明度を戻す
            card.style.opacity = '1';
            
            // ドロップ位置が有効な場合、並び替えを実行
            if (lastDropIndex >= 0) {
                reorderPreset(preset.id, lastDropIndex);
            }
            
            // イベントリスナーを削除
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        // イベントリスナーを登録
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // 初期位置にクローンを配置
        dragClone.style.left = (mouseEvent.clientX - card.offsetWidth / 2) + 'px';
        dragClone.style.top = (mouseEvent.clientY - card.offsetHeight / 2) + 'px';
    }
    
    /**
     * プリセットの並び替えを実行
     */
    function reorderPreset(presetId, newIndex) {
        console.log('[Preset Reorder] Moving preset', presetId, 'to group index', newIndex);
        
        // 全体の配列で操作
        const allPresets = presetData.presets;
        const groupPresets = allPresets.filter(p => p.group === currentGroup);
        
        // グループ内での元のインデックスと新しいインデックス
        const oldGroupIndex = groupPresets.findIndex(p => p.id === presetId);
        if (oldGroupIndex === -1) {
            console.error('[Preset Reorder] Preset not found in current group');
            return;
        }
        
        console.log('[Preset Reorder] Old group index:', oldGroupIndex, 'New group index:', newIndex);
        
        // 同じ位置なら何もしない
        if (oldGroupIndex === newIndex) {
            console.log('[Preset Reorder] Same position, no change needed');
            return;
        }
        
        // 全体配列での実際のインデックスを計算
        const oldGlobalIndex = allPresets.findIndex(p => p.id === presetId);
        
        // グループ内のnewIndex番目のプリセットの、全体配列でのインデックスを見つける
        let targetGlobalIndex;
        if (newIndex >= groupPresets.length) {
            // グループの最後に挿入
            const lastGroupPreset = groupPresets[groupPresets.length - 1];
            targetGlobalIndex = allPresets.findIndex(p => p.id === lastGroupPreset.id) + 1;
        } else if (newIndex < oldGroupIndex) {
            // 前に移動する場合、目標位置のプリセットの前に挿入
            targetGlobalIndex = allPresets.findIndex(p => p.id === groupPresets[newIndex].id);
        } else {
            // 後ろに移動する場合、目標位置のプリセットの後ろに挿入
            targetGlobalIndex = allPresets.findIndex(p => p.id === groupPresets[newIndex].id);
        }
        
        console.log('[Preset Reorder] Global index:', oldGlobalIndex, '->', targetGlobalIndex);
        
        // 配列から削除
        const [movedPreset] = allPresets.splice(oldGlobalIndex, 1);
        
        // 新しい位置に挿入（削除後のインデックスを調整）
        const adjustedTargetIndex = targetGlobalIndex > oldGlobalIndex ? targetGlobalIndex - 1 : targetGlobalIndex;
        allPresets.splice(adjustedTargetIndex, 0, movedPreset);
        
        console.log('[Preset Reorder] Final order:', allPresets.map(p => `${p.id}(${p.group})`));
        
        // プリセット配列を更新
        presetData.presets = allPresets;
        
        // プリセットファイルを保存
        savePresetFile();
        
        // カードを再描画
        updatePresetCards();
        
        console.log('[Preset Reorder] Reorder complete');
    }
    
    /**
     * プリセットカードを更新（現在のグループのみ表示）
     */
    function updatePresetCards() {
        const container = document.getElementById('presetCardsContainer');
        if (!container) return;
        
        // 既存のカードをクリア
        container.innerHTML = '';
        
        // 現在のグループのプリセットのみ表示
        if (presetData && presetData.presets) {
            const groupPresets = presetData.presets.filter(p => p.group === currentGroup);
            
            if (groupPresets.length === 0) {
                container.innerHTML = '<div style="color: #666; font-size: 10px; padding: 10px;">No presets in this group</div>';
                return;
            }
            
            groupPresets.forEach(preset => {
                const card = document.createElement('button');
                card.className = 'preset-card';
                card.dataset.presetId = preset.id;
                card.title = preset.name; // ホバー時にツールチップ表示
                // カードサイズの取得（window.AGraphUIから、デフォルトは80）
                const cardSize = (window.AGraphUI && window.AGraphUI.getCardSize) 
                    ? window.AGraphUI.getCardSize() 
                    : 80;
                card.style.cssText = `
                    background: #2a2a2a;
                    border: 1px solid #555;
                    border-radius: 3px;
                    padding: 0;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.2s;
                    width: ${cardSize}px;
                    height: ${cardSize}px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                `;
                
                // キャンバスでカーブサムネイルを描画
                const canvas = document.createElement('canvas');
                const canvasDisplayWidth = cardSize - 2;
                const canvasDisplayHeight = cardSize - 2;
                // Retina対応: 実際のピクセル数は2倍
                const dpr = window.devicePixelRatio || 2;
                canvas.width = canvasDisplayWidth * dpr;
                canvas.height = canvasDisplayHeight * dpr;
                canvas.className = 'preset-card-canvas';
                canvas.style.cssText = `
                    width: ${canvasDisplayWidth}px;
                    height: ${canvasDisplayHeight}px;
                    margin: 0;
                `;
                
                card.appendChild(canvas);
                
                // CSS適用を確実に待つ(ダブルrAF)
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        drawCurveThumbnail(canvas, preset.keyframes);
                    });
                });
                
                // ホバー効果とツールチップ（グローバルツールチップを使用）
                card.addEventListener('mouseenter', function(e) {
                    this.style.borderColor = '#36a2eb';
                    this.style.background = '#333';
                    
                    // カーブを黄色に再描画
                    const canvas = this.querySelector('.preset-card-canvas');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        const presetId = this.dataset.presetId;
                        if (presetId && window.AGraphExtension) {
                            const presetData = window.AGraphExtension.getPresetData();
                            if (presetData) {
                                const preset = presetData.presets.find(p => p.id === presetId);
                                if (preset) {
                                    // 黄色で再描画
                                    drawCurveThumbnailWithColor(canvas, preset.keyframes, '#FFCC00');
                                }
                            }
                        }
                    }
                    
                    // グローバルツールチップ表示（遅延）
                    if (tooltipTimeout) clearTimeout(tooltipTimeout);
                    tooltipTimeout = setTimeout(() => {
                        const rect = card.getBoundingClientRect();
                        const x = rect.left + rect.width / 2;
                        const y = rect.top - 30;
                        showGlobalTooltip(preset.name, x, y);
                    }, 200);
                });
                
                card.addEventListener('mouseleave', function() {
                    if (tooltipTimeout) clearTimeout(tooltipTimeout);
                    hideGlobalTooltip();
                    
                    // カーブを白に戻す
                    const canvas = this.querySelector('.preset-card-canvas');
                    if (canvas) {
                        const presetId = this.dataset.presetId;
                        if (presetId && window.AGraphExtension) {
                            const presetData = window.AGraphExtension.getPresetData();
                            if (presetData) {
                                const preset = presetData.presets.find(p => p.id === presetId);
                                if (preset) {
                                    drawCurveThumbnail(canvas, preset.keyframes);
                                }
                            }
                        }
                    }
                    
                    if (this.dataset.selected !== 'true') {
                        this.style.borderColor = '#555';
                        this.style.background = '#2a2a2a';
                    }
                });
                
                card.addEventListener('mousemove', function(e) {
                    // ツールチップが表示されている場合、位置を更新
                    if (globalPresetTooltip && globalPresetTooltip.style.opacity === '1') {
                        const rect = card.getBoundingClientRect();
                        globalPresetTooltip.style.left = (rect.left + rect.width / 2) + 'px';
                        globalPresetTooltip.style.top = (rect.top - 30) + 'px';
                        globalPresetTooltip.style.transform = 'translateX(-50%)';
                    }
                });
                
                // 長押しドラッグ＆ドロップ機能
                let longPressTimer;
                let isDragging = false;
                let startX, startY;
                
                card.addEventListener('mousedown', function(e) {
                    startX = e.clientX;
                    startY = e.clientY;
                    
                    // 長押しタイマー開始（500ms）
                    longPressTimer = setTimeout(() => {
                        isDragging = true;
                        
                        // グローバルツールチップを即座に非表示
                        if (tooltipTimeout) clearTimeout(tooltipTimeout);
                        hideGlobalTooltip();
                        
                        startPresetDrag(card, preset, e);
                    }, 500);
                });
                
                card.addEventListener('mouseup', function(e) {
                    clearTimeout(longPressTimer);
                    
                    // ドラッグ中でなければ通常のクリック処理
                    if (!isDragging) {
                        selectPresetCard(preset.id);
                    }
                    isDragging = false;
                });
                
                card.addEventListener('mousemove', function(e) {
                    // 長押し待機中にマウスが動いたらキャンセル
                    if (longPressTimer && !isDragging) {
                        const moveThreshold = 5; // 5px以上動いたらキャンセル
                        if (Math.abs(e.clientX - startX) > moveThreshold || 
                            Math.abs(e.clientY - startY) > moveThreshold) {
                            clearTimeout(longPressTimer);
                        }
                    }
                });
                
                // 右クリックイベント（コンテキストメニュー）
                card.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    // デフォルトグループのプリセットは右クリック無効
                    if (preset.group === 'default') {
                        return;
                    }
                    showPresetContextMenu(e, preset.id);
                });
                
                container.appendChild(card);
            });
        }
    }
    
    /**
     * プリセットカードを選択
     */
    function selectPresetCard(presetId) {
        // 全カードの選択を解除
        document.querySelectorAll('.preset-card').forEach(card => {
            card.dataset.selected = 'false';
            card.style.borderColor = '#555';
            card.style.background = '#2a2a2a';
        });
        
        // 選択されたカードをハイライト
        const selectedCard = document.querySelector(`.preset-card[data-preset-id="${presetId}"]`);
        if (selectedCard) {
            selectedCard.dataset.selected = 'true';
            selectedCard.style.borderColor = '#36a2eb';
            selectedCard.style.background = '#1e5a7a';
        }
        
        // プリセットを読み込み
        loadPreset(presetId);
    }
    
    /**
     * グラフデータを保存（共通関数）
     */
    function saveGraphDataToFile() {
        if (graphData && graphData.keyframes && graphData.keyframes.length > 0) {
            csInterface.evalScript(`savePreference("graphData", ${JSON.stringify(JSON.stringify(graphData))})`);
        }
    }
    
    /**
     * グラフデータを復元（起動時）
     */
    function restoreGraphDataFromFile() {
        csInterface.evalScript('loadPreference("graphData")', function(result) {
            try {
                const data = JSON.parse(result);
                if (data.success && data.value) {
                    const savedGraphData = JSON.parse(data.value);
                    if (savedGraphData && savedGraphData.keyframes && savedGraphData.keyframes.length > 0) {
                        graphData = savedGraphData;
                        createEasingVisualization(graphData.keyframes);
                        console.log('✅ Restored graph data:', graphData);
                    }
                }
            } catch (e) {
                console.log('No saved graph data to restore:', e);
            }
        });
    }
    
    /**
     * プリセットを読み込む
     */
    function loadPreset(presetId) {
        const preset = presetData.presets.find(p => p.id === presetId);
        if (!preset) {
            updateOutput('❌ Preset not found: ' + presetId);
            return;
        }
        
        updateOutput(`📥 Loading preset: ${preset.name}`);
        
        // graphDataをクリアして新規作成
        graphData = {
            keyframes: JSON.parse(JSON.stringify(preset.keyframes)), // ディープコピー
            handles: [],
            normalization: {
                minTime: 0,
                maxTime: 1,
                minValue: 0,
                maxValue: 1,
                timeRange: 1,
                valueRange: 1
            }
        };
        
        // デバッグ: プリセットのeasing値を確認
        console.log('[loadPreset] Keyframes:', graphData.keyframes);
        updateOutput(`🔍 Preset: ${preset.points}点, ${graphData.keyframes.length} keyframes`);
        
        // 3点の場合はvalue2も設定
        if (preset.points === 3 && preset.keyframes.length === 3) {
            window.currentEasingData = window.currentEasingData || {};
            window.currentEasingData.value2 = preset.keyframes[1].value;
        }
        
        // ハンドル編集を再初期化するためフラグをリセット
        nPointHandleEditingInitialized = false;
        
        // グラフを再描画（Analyzeと同じ方法を使用）
        createEasingVisualization(graphData.keyframes);
        
        updateOutput(`✅ Preset loaded: ${preset.name} (${preset.points}-point)`);
        
        // グラフデータとプリセットIDを保存
        csInterface.evalScript(`savePreference("selectedPreset", "${presetId}")`);
        saveGraphDataToFile();
    }
    
    /**
     * プリセットカード用のコンテキストメニューを表示
     */
    function showPresetContextMenu(e, presetId) {
        const menu = document.getElementById('presetContextMenu');
        if (!menu) return;
        
        const preset = presetData.presets.find(p => p.id === presetId);
        if (!preset) return;
        
        // Move to Groupサブメニューを構築
        const submenu = document.getElementById('moveToGroupSubmenu');
        if (submenu) {
            submenu.innerHTML = '';
            presetData.groups.forEach(group => {
                // 現在のグループとデフォルトグループは除外
                if (group.id !== preset.group && group.id !== 'default') {
                    const item = document.createElement('div');
                    item.className = 'context-menu-item';
                    item.textContent = group.name;
                    item.dataset.action = 'move-to-group';
                    item.dataset.groupId = group.id;
                    submenu.appendChild(item);
                }
            });
        }
        
        // メニューを表示（マウス位置から少しオフセット）
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.classList.add('show');
        
        // サブメニューの位置調整
        const moveItem = menu.querySelector('[data-action="move"]');
        if (moveItem && submenu) {
            moveItem.addEventListener('mouseenter', function() {
                const rect = this.getBoundingClientRect();
                submenu.style.left = rect.right + 'px';
                submenu.style.top = rect.top + 'px';
                submenu.classList.add('show');
            });
            moveItem.addEventListener('mouseleave', function(e) {
                if (!submenu.contains(e.relatedTarget)) {
                    submenu.classList.remove('show');
                }
            });
            submenu.addEventListener('mouseleave', function(e) {
                if (!moveItem.contains(e.relatedTarget)) {
                    submenu.classList.remove('show');
                }
            });
        }
        
        // メニュー項目のクリックイベント
        const handleMenuClick = function(event) {
            const action = event.target.dataset.action;
            if (!action) return;
            
            menu.classList.remove('show');
            if (submenu) submenu.classList.remove('show');
            
            if (action === 'delete') {
                deletePreset(presetId);
            } else if (action === 'rename') {
                renamePreset(presetId);
            } else if (action === 'move-to-group') {
                const targetGroupId = event.target.dataset.groupId;
                movePresetToGroup(presetId, targetGroupId);
            }
            
            // イベントリスナーを削除
            menu.removeEventListener('click', handleMenuClick);
            document.removeEventListener('click', handleOutsideClick);
        };
        
        // 外側クリックでメニューを閉じる
        const handleOutsideClick = function(event) {
            if (!menu.contains(event.target) && !submenu.contains(event.target)) {
                menu.classList.remove('show');
                if (submenu) submenu.classList.remove('show');
                menu.removeEventListener('click', handleMenuClick);
                document.removeEventListener('click', handleOutsideClick);
            }
        };
        
        // イベントリスナーを設定
        setTimeout(() => {
            menu.addEventListener('click', handleMenuClick);
            if (submenu) submenu.addEventListener('click', handleMenuClick);
            document.addEventListener('click', handleOutsideClick);
        }, 10);
    }
    
    /**
     * プリセットを別のグループに移動
     */
    async function movePresetToGroup(presetId, targetGroupId) {
        const preset = presetData.presets.find(p => p.id === presetId);
        if (!preset) return;
        
        const targetGroup = presetData.groups.find(g => g.id === targetGroupId);
        if (!targetGroup) return;
        
        preset.group = targetGroupId;
        
        // JSONファイルに保存
        savePresetFile();
        
        // カードを更新
        updatePresetCards();
        
        updateOutput(`📦 Moved "${preset.name}" to ${targetGroup.name}`);
    }
    
    /**
     * プリセットを削除
     */
    async function deletePreset(presetId) {
        const preset = presetData.presets.find(p => p.id === presetId);
        if (!preset) return;
        
        const confirmed = await showCustomConfirm(`Delete preset "${preset.name}"?`);
        if (confirmed) {
            // プリセットを配列から削除
            presetData.presets = presetData.presets.filter(p => p.id !== presetId);
            
            // JSONファイルに保存
            savePresetFile();
            
            // カードを更新
            updatePresetCards();
            
            updateOutput(`🗑️ Deleted preset: ${preset.name}`);
        }
    }
    
    /**
     * プリセットをリネーム
     */
    async function renamePreset(presetId) {
        const preset = presetData.presets.find(p => p.id === presetId);
        if (!preset) return;
        
        const newName = await showCustomPrompt('Enter new preset name:', preset.name);
        if (newName && newName.trim() !== '') {
            preset.name = newName.trim();
            
            // JSONファイルに保存
            savePresetFile();
            
            // カードを更新
            updatePresetCards();
            
            updateOutput(`✏️ Renamed preset to: ${preset.name}`);
        }
    }
    
    /**
     * プリセットドロップダウンを更新（現在のグループのみ表示）
     * @deprecated カード式UIに移行。互換性のため残す
     */
    function updatePresetDropdown() {
        updatePresetCards();
    }
    
    /**
     * プリセット選択時のハンドラ
     * @deprecated カード式UIに移行。互換性のため残す
     */
    function handlePresetSelect(event) {
        const presetId = event.target.value;
        if (!presetId) return;
        
        selectPresetCard(presetId);
    }
    
    /**
     * 旧プリセット選択ハンドラ（削除予定）
     */
    function handlePresetSelect_old(event) {
        const presetId = event.target.value;
        if (!presetId) return;
        
        // プリセットを検索
        const preset = presetData.presets.find(p => p.id === presetId);
        if (!preset) {
            updateOutput('❌ Preset not found: ' + presetId);
            return;
        }
        
        updateOutput(`📥 Loading preset: ${preset.name}`);
        
        // プリセットデータをgraphDataに設定
        graphData.keyframes = JSON.parse(JSON.stringify(preset.keyframes)); // ディープコピー
        
        // デバッグ: プリセットのeasing値を確認
        updateOutput(`🔍 Preset keyframes: ${JSON.stringify(graphData.keyframes.map(kf => ({ 
            time: kf.time, 
            value: kf.value, 
            outSpeed: kf.easing?.outTemporal?.speed,
            inSpeed: kf.easing?.inTemporal?.speed
        })))}`);
        
        // 正規化データを設定（プリセットは既に0-1の正規化済み）
        graphData.normalization = {
            minTime: 0,
            maxTime: 1,
            minValue: 0,
            maxValue: 1,
            timeRange: 1,
            valueRange: 1
        };
        
        // 3点の場合はvalue2も設定
        if (preset.points === 3 && preset.keyframes.length === 3) {
            window.currentEasingData = window.currentEasingData || {};
            window.currentEasingData.value2 = preset.keyframes[1].value;
        }
        
        // 古いハンドル情報をクリア（プリセットの値を反映するため）
        graphData.handles = [];
        
        // ハンドル編集を再初期化するためフラグをリセット
        nPointHandleEditingInitialized = false;
        
        // グラフを再描画（Analyzeと同じ方法を使用）
        createEasingVisualization(graphData.keyframes);
        
        updateOutput(`✅ Preset loaded: ${preset.name} (${preset.points}-point)`);
    }
    
    /**
     * プリセット保存ハンドラ
     */
    async function handleSavePreset() {
        // 現在のグラフデータをチェック
        if (!graphData || !graphData.keyframes || graphData.keyframes.length < 2) {
            updateOutput('❌ No graph data to save. Analyze keyframes first.');
            return;
        }
        
        // 保存先グループは現在開いているグループ
        const targetGroup = currentGroup;
        
        // デフォルトグループには保存不可（プロンプト表示前にチェック）
        if (targetGroup === 'default') {
            // カスタムダイアログで表示
            showCustomAlert('Cannot save to Default group.\nPlease select a different group.');
            updateOutput('❌ Cannot save to Default group.');
            return;
        }
        
        // カスタムプロンプトで名前を入力
        let presetName = await showCustomPrompt('Enter preset name:');
        
        // キャンセルされた場合
        if (presetName === null) {
            updateOutput('🚫 Save cancelled.');
            return;
        }
        
        // 空白の場合は自動命名
        presetName = presetName.trim();
        if (!presetName) {
            // 自動命名: "Custom 1", "Custom 2", ...
            const groupPresets = presetData.presets.filter(p => p.group === targetGroup);
            let counter = 1;
            do {
                presetName = `Custom ${counter}`;
                counter++;
            } while (presetData.presets.find(p => p.name === presetName && p.group === targetGroup));
        }
        
        // 新しいプリセットを作成
        const newPreset = {
            id: `preset_${Date.now()}`,
            name: presetName,
            group: targetGroup,
            points: graphData.keyframes.length,
            keyframes: JSON.parse(JSON.stringify(graphData.keyframes)) // ディープコピー
        };
        
        updateOutput(`💾 Saving preset: ${presetName} to ${presetData.groups.find(g => g.id === targetGroup)?.name}...`);
        
        // プリセットデータに追加
        presetData.presets.push(newPreset);
        
        // JSONファイルに保存
        savePresetFile();
        updateOutput(`✅ Preset saved: ${presetName}`);
        updateOutput(`📍 Total presets: ${presetData.presets.length}`);
        
        // グループが違う場合は切り替え
        if (currentGroup !== targetGroup) {
            currentGroup = targetGroup;
            updateGroupDropdown();
        }
        
        // プリセットカードを更新
        updatePresetCards();
        
        // 保存したプリセットを選択（カード式）
        selectPresetCard(newPreset.id);
    }
    
    /**
     * プリセット削除ハンドラ
     */
    function handleDeletePreset() {
        // 現在選択されているプリセットを取得（カード式）
        const selectedCard = document.querySelector('.preset-card[data-selected="true"]');
        if (!selectedCard) {
            updateOutput('❌ No preset selected to delete.');
            return;
        }
        
        const presetId = selectedCard.dataset.presetId;
        
        // プリセットを検索
        const preset = presetData.presets.find(p => p.id === presetId);
        if (!preset) {
            updateOutput('❌ Preset not found.');
            return;
        }
        
        // デフォルトプリセットは削除不可
        if (preset.group === 'default') {
            updateOutput('❌ Cannot delete default preset.');
            return;
        }
        
        // 確認ダイアログ
        const confirmed = confirm(`Delete preset "${preset.name}"?`);
        if (!confirmed) {
            updateOutput('🚫 Delete cancelled.');
            return;
        }
        
        updateOutput(`🗑️ Deleting preset: ${preset.name}...`);
        
        // プリセットデータから削除
        const index = presetData.presets.findIndex(p => p.id === presetId);
        if (index !== -1) {
            presetData.presets.splice(index, 1);
        }
        
        // JSONファイルに保存
        const filePath = getPresetFilePath();
        const jsonString = JSON.stringify(presetData, null, 2);
        
        var scriptCode = 'writePresetFile(' + JSON.stringify(filePath) + ', ' + JSON.stringify(jsonString) + ')';
        csInterface.evalScript(scriptCode, function(result) {
            try {
                const data = JSON.parse(result);
                if (data.success) {
                    updateOutput(`✅ Preset deleted: ${preset.name}`);
                    updateOutput(`📍 Total presets: ${presetData.presets.length}`);
                    
                    // プリセットカードを更新
                    updatePresetCards();
                } else {
                    updateOutput('❌ Failed to delete preset: ' + (data.error || 'Unknown error'));
                }
            } catch (e) {
                updateOutput('❌ Failed to parse delete result: ' + e.message);
            }
        });
    }

    // ========================================
    // グループ管理機能
    // ========================================
    
    /**
     * グループ選択ハンドラ
     */
    function handleGroupSelect(event) {
        currentGroup = event.target.value;
        // JSONファイルに保存
        presetData.lastOpenedGroup = currentGroup;
        savePresetFile();
        updatePresetDropdown();
        updateOutput(`📁 Group changed: ${presetData.groups.find(g => g.id === currentGroup)?.name}`);
    }
    
    /**
     * グループ追加ハンドラ
     */
    async function handleAddGroup() {
        const groupName = await showCustomPrompt('Enter new group name:');
        if (!groupName || !groupName.trim()) {
            updateOutput('🚫 Group creation cancelled.');
            return;
        }
        
        // 同名チェック
        if (presetData.groups.find(g => g.name === groupName.trim())) {
            showCustomAlert('Group name already exists.');
            updateOutput('❌ Group name already exists.');
            return;
        }
        
        const newGroup = {
            id: `group_${Date.now()}`,
            name: groupName.trim(),
            locked: false
        };
        
        presetData.groups.push(newGroup);
        currentGroup = newGroup.id;
        presetData.lastOpenedGroup = currentGroup;
        savePresetFile();
        updateGroupDropdown();
        updatePresetDropdown();
        updateOutput(`✅ Group created: ${newGroup.name}`);
    }
    
    /**
     * グループ名変更ハンドラ
     */
    async function handleEditGroup() {
        const group = presetData.groups.find(g => g.id === currentGroup);
        if (!group) {
            showCustomAlert('No group selected.');
            updateOutput('❌ No group selected.');
            return;
        }
        
        if (group.locked) {
            showCustomAlert('Cannot rename default group.');
            updateOutput('❌ Cannot rename default group.');
            return;
        }
        
        const newName = await showCustomPrompt('Enter new group name:', group.name);
        if (!newName || !newName.trim() || newName.trim() === group.name) {
            updateOutput('🚫 Rename cancelled.');
            return;
        }
        
        // 同名チェック
        if (presetData.groups.find(g => g.name === newName.trim() && g.id !== currentGroup)) {
            showCustomAlert('Group name already exists.');
            updateOutput('❌ Group name already exists.');
            return;
        }
        
        const oldName = group.name;
        group.name = newName.trim();
        savePresetFile();
        updateGroupDropdown();
        updateOutput(`✅ Group renamed: ${oldName} → ${newName.trim()}`);
    }
    
    /**
     * グループ削除ハンドラ
     */
    async function handleDeleteGroup() {
        const group = presetData.groups.find(g => g.id === currentGroup);
        if (!group) {
            showCustomAlert('No group selected.');
            updateOutput('❌ No group selected.');
            return;
        }
        
        if (group.locked) {
            showCustomAlert('Cannot delete default group.');
            updateOutput('❌ Cannot delete default group.');
            return;
        }
        
        // グループ内のプリセット数を確認
        const presetsInGroup = presetData.presets.filter(p => p.group === currentGroup).length;
        const confirmMsg = presetsInGroup > 0
            ? `Delete group "${group.name}" and ${presetsInGroup} preset(s)?`
            : `Delete group "${group.name}"?`;
        
        const confirmed = await showCustomConfirm(confirmMsg);
        if (!confirmed) {
            updateOutput('🚫 Delete cancelled.');
            return;
        }
        
        // グループ内のプリセットを削除
        presetData.presets = presetData.presets.filter(p => p.group !== currentGroup);
        
        // グループを削除
        const index = presetData.groups.findIndex(g => g.id === currentGroup);
        if (index !== -1) {
            presetData.groups.splice(index, 1);
        }
        
        savePresetFile();
        currentGroup = "default";
        updateGroupDropdown();
        updatePresetDropdown();
        updateOutput(`✅ Group deleted: ${group.name}`);
    }

    /**
     * プリセットをエクスポート
     */
    async function handleExportPresets() {
        updateOutput('📦 Exporting presets...');
        
        const jsonString = JSON.stringify(presetData, null, 2);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const defaultFileName = `AGraph_Presets_${timestamp}.json`;
        
        // ファイル保存ダイアログを表示
        csInterface.evalScript(`saveFileDialog("${defaultFileName}", ${JSON.stringify(jsonString)})`, function(result) {
            try {
                const data = JSON.parse(result);
                if (data.success) {
                    updateOutput(`✅ Presets exported: ${data.path}`);
                } else {
                    updateOutput(`❌ Export failed: ${data.error || 'Unknown error'}`);
                }
            } catch (e) {
                console.error('Export result parsing error:', e);
                updateOutput('❌ Export failed');
            }
        });
    }

    /**
     * プリセットをインポート
     */
    async function handleImportPresets() {
        updateOutput('📥 Importing presets...');
        
        // ファイル選択ダイアログを表示
        csInterface.evalScript('openFileDialog()', async function(result) {
            try {
                const data = JSON.parse(result);
                if (!data.success) {
                    if (data.cancelled) {
                        updateOutput('🚫 File selection cancelled');
                    } else {
                        updateOutput(`❌ Import failed: ${data.error || 'Unknown error'}`);
                    }
                    return;
                }
                
                // ファイルが選択されたら設定モーダルを閉じる
                closeSettingsModal();
                
                // JSONをパース
                let importedData;
                try {
                    importedData = JSON.parse(data.content);
                } catch (e) {
                    updateOutput('❌ Invalid JSON file');
                    showCustomAlert('Invalid preset file format');
                    return;
                }
                
                // バージョンチェック
                if (!importedData.version || !importedData.groups || !importedData.presets) {
                    updateOutput('❌ Invalid preset file structure');
                    showCustomAlert('Invalid preset file structure');
                    return;
                }
                
                // インポート方法を確認（3択ダイアログ）
                const action = await showImportDialog('Merge with existing presets?');
                
                if (action === 'cancel') {
                    updateOutput('🚫 Import cancelled');
                    return;
                }
                
                // 選択されたアクションに応じて処理
                if (action === 'merge') {
                    // マージモード：既存データを保持して追加
                    let groupsAdded = 0;
                    let presetsAdded = 0;
                    
                    // グループをマージ（重複チェック）
                    importedData.groups.forEach(importGroup => {
                        const exists = presetData.groups.some(g => g.id === importGroup.id);
                        if (!exists && importGroup.id !== 'default') {
                            presetData.groups.push(importGroup);
                            groupsAdded++;
                        }
                    });
                    
                    // プリセットをマージ（重複チェック）
                    importedData.presets.forEach(importPreset => {
                        const exists = presetData.presets.some(p => p.id === importPreset.id);
                        if (!exists) {
                            presetData.presets.push(importPreset);
                            presetsAdded++;
                        }
                    });
                    
                    savePresetFile();
                    updateGroupDropdown();
                    updatePresetCards();
                    updateOutput(`✅ Imported: ${groupsAdded} groups, ${presetsAdded} presets (merged)`);
                } else if (action === 'replace') {
                    // 置き換えモード：すべて上書き
                    presetData = importedData;
                    savePresetFile();
                    currentGroup = "default";
                    updateGroupDropdown();
                    updatePresetCards();
                    updateOutput(`✅ Presets replaced: ${importedData.groups.length} groups, ${importedData.presets.length} presets`);
                }
                
            } catch (e) {
                console.error('Import error:', e);
                updateOutput('❌ Import failed');
            }
        });
    }
    
    /**
     * プリセットファイルを保存（共通関数）
     */
    function savePresetFile() {
        const filePath = getPresetFilePath();
        const jsonString = JSON.stringify(presetData, null, 2);
        
        var scriptCode = 'writePresetFile(' + JSON.stringify(filePath) + ', ' + JSON.stringify(jsonString) + ')';
        csInterface.evalScript(scriptCode, function(result) {
            try {
                const data = JSON.parse(result);
                if (!data.success) {
                    updateOutput('❌ Failed to save: ' + (data.error || 'Unknown error'));
                }
            } catch (e) {
                updateOutput('❌ Failed to save: ' + e.message);
            }
        });
    }

    // ========================================
    // グラフデータ操作ユーティリティ (N点対応)
    // ========================================
    
    /**
     * グラフデータを初期化
     */
    function initGraphData() {
        graphData = {
            keyframes: [],
            normalization: {
                startTime: 0,
                endTime: 1,
                startValue: 0,
                endValue: 100,
                timeRange: 1,
                valueRange: 100
            },
            handles: [],
            metadata: {
                propertyType: null,
                isPosition: false,
                originalKeyframes: []
            }
        };
    }
    
    /**
     * キーフレーム配列を0-1正規化
     * @param {Array} keyframes - 元のキーフレーム配列
     * @return {Object} 正規化されたグラフデータ
     */
    function normalizeKeyframes(keyframes) {
        if (!keyframes || keyframes.length < 2) {
            console.error('normalizeKeyframes: 少なくとも2つのキーフレームが必要です');
            return null;
        }
        
        // 時間順にソート
        const sorted = [...keyframes].sort((a, b) => a.time - b.time);
        
        // 始点と終点
        const startKf = sorted[0];
        const endKf = sorted[sorted.length - 1];
        
        const timeRange = endKf.time - startKf.time;
        
        // 値の取得（位置プロパティ対応）
        const getValue = (kf) => {
            if (Array.isArray(kf.value)) {
                if (isPositionProperty(kf)) {
                    return calculateMagnitude(kf.value);
                } else {
                    return kf.value[0];
                }
            }
            return kf.value;
        };
        
        // セグメント別のspeedMultiplierを計算（gitのnormalize3PointEasingと同じロジック）
        const calculateSegmentRate = (kf1, kf2) => {
            const val1 = kf1.originalValue || kf1.value;
            const val2 = kf2.originalValue || kf2.value;
            const time1 = kf1.originalTime || kf1.time;
            const time2 = kf2.originalTime || kf2.time;
            const timeDiff = Math.abs(time2 - time1);
            
            let deltaY;
            if (isPositionProperty(kf1)) {
                // 空間プロパティ: ベクトル長
                if (Array.isArray(val1) && Array.isArray(val2)) {
                    const deltaVector = val2.map((v, i) => v - val1[i]);
                    deltaY = Math.sqrt(deltaVector.reduce((sum, d) => sum + d*d, 0));
                } else {
                    deltaY = Math.abs(val2 - val1);
                }
            } else if (Array.isArray(val1)) {
                // 多次元（スケール等）: X値(value[0])のみ使用
                deltaY = Math.abs(val2[0] - val1[0]);
            } else {
                // 1次元
                deltaY = Math.abs(val2 - val1);
            }
            
            return timeDiff > 0 ? deltaY / timeDiff : 0;
        };
        
        const startValue = getValue(startKf);
        const endValue = getValue(endKf);
        const valueRange = endValue - startValue;
        
        const normalizedKeyframes = sorted.map((kf, index) => {
            const normalizedTime = timeRange > 0 ? (kf.time - startKf.time) / timeRange : 0;
            const value = getValue(kf);
            const normalizedValue = valueRange !== 0 ? (value - startValue) / valueRange : 0.5;
            
            // セグメント別のspeedMultiplierを使用してeasing値を正規化
            const normalizedEasing = {
                outTemporal: null,
                inTemporal: null
            };
            
            // 値が減少しているかチェック（位置プロパティは常にfalse）
            const isDecreasing = (kf1, kf2) => {
                if (isPositionProperty(kf1)) return false;
                const val1 = kf1.originalValue || kf1.value;
                const val2 = kf2.originalValue || kf2.value;
                if (Array.isArray(val1)) {
                    return val2[0] < val1[0]; // 多次元: X値で判定
                }
                return val2 < val1; // 1次元
            };
            
            // outTemporal: 現在のKFから次のKFへのセグメント
            if (kf.easing?.outTemporal && index < sorted.length - 1) {
                const segmentRate = calculateSegmentRate(sorted[index], sorted[index + 1]);
                let normalizedSpeed = segmentRate !== 0 ? (kf.easing.outTemporal.speed / segmentRate) * 100 : kf.easing.outTemporal.speed;
                if (isDecreasing(sorted[index], sorted[index + 1])) {
                    normalizedSpeed = -normalizedSpeed;
                }
                normalizedEasing.outTemporal = {
                    speed: normalizedSpeed,
                    influence: kf.easing.outTemporal.influence
                };
            }
            
            // inTemporal: 前のKFから現在のKFへのセグメント
            if (kf.easing?.inTemporal && index > 0) {
                const segmentRate = calculateSegmentRate(sorted[index - 1], sorted[index]);
                let normalizedSpeed = segmentRate !== 0 ? (kf.easing.inTemporal.speed / segmentRate) * 100 : kf.easing.inTemporal.speed;
                if (isDecreasing(sorted[index - 1], sorted[index])) {
                    normalizedSpeed = -normalizedSpeed;
                }
                normalizedEasing.inTemporal = {
                    speed: normalizedSpeed,
                    influence: kf.easing.inTemporal.influence
                };
            }
            
            return {
                time: normalizedTime,
                value: normalizedValue,
                originalTime: kf.time,
                originalValue: kf.value,
                easing: normalizedEasing,
                isStart: index === 0,
                isEnd: index === sorted.length - 1,
                propertyName: kf.propertyName,
                layerName: kf.layerName,
                propertyValueType: kf.propertyValueType
            };
        });
        
        return {
            keyframes: normalizedKeyframes,
            normalization: {
                startTime: startKf.time,
                endTime: endKf.time,
                startValue: startValue,
                endValue: endValue,
                timeRange: timeRange,
                valueRange: valueRange
            },
            handles: [],
            metadata: {
                propertyType: startKf.propertyValueType,
                isPosition: isPositionProperty(startKf),
                originalKeyframes: keyframes
            }
        };
    }
    
    /**
     * 正規化されたキーフレームを実座標に変換
     * @param {Object} normalizedKf - 正規化されたキーフレーム
     * @return {Object} 実座標のキーフレーム
     */
    function denormalizeKeyframe(normalizedKf) {
        const norm = graphData.normalization;
        
        const actualTime = norm.startTime + normalizedKf.time * norm.timeRange;
        const actualValue = norm.startValue + normalizedKf.value * norm.valueRange;
        
        return {
            time: actualTime,
            value: actualValue,
            originalValue: normalizedKf.originalValue
        };
    }
    
    /**
     * 互換性レイヤー: 既存コードとの互換性のため、window.currentEasingDataを更新
     */
    function syncLegacyData() {
        if (!graphData || !graphData.keyframes || graphData.keyframes.length === 0) {
            return;
        }
        
        // 3点モード用のデータ形式で同期
        if (graphData.keyframes.length >= 3) {
            const middleKf = graphData.keyframes[Math.floor(graphData.keyframes.length / 2)];
            window.currentEasingData = {
                keyframes: graphData.keyframes,
                minValue: 0,
                maxValue: 1,
                value1: 0,
                value2: middleKf.value,
                value3: 1,
                timeDiff: graphData.normalization.timeRange,
                valueDiff: graphData.normalization.valueRange
            };
        }
        
        // currentEasingSettings も同期
        if (graphData.keyframes.length >= 2) {
            const firstKf = graphData.keyframes[0];
            const lastKf = graphData.keyframes[graphData.keyframes.length - 1];
            currentEasingSettings = {
                outTemporal: firstKf.easing?.outTemporal || null,
                inTemporal: lastKf.easing?.inTemporal || null
            };
        }
    }

    // 角度を最も近い基準角度（水平/垂直）にスナップする関数
    function snapAngleToCardinal(angle) {
        // 基準角度（ラジアン）
        const cardinalAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // 0°, 90°, 180°, -90°
        
        let closestAngle = cardinalAngles[0];
        let minDiff = Math.abs(angle - cardinalAngles[0]);
        
        for (let i = 1; i < cardinalAngles.length; i++) {
            const diff = Math.abs(angle - cardinalAngles[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closestAngle = cardinalAngles[i];
            }
        }
        
        return closestAngle;
    }

    // DOMが読み込まれたら初期化
    document.addEventListener('DOMContentLoaded', function() {
        init();
    });

    /**
     * ライセンス状態のチェックと処理
     */
    window.addEventListener('licenseChecked', function(event) {
        const licenseStatus = event.detail;
        console.log('License status received in main.js:', licenseStatus);
        
        // ライセンスが有効でなく、トライアルでもない場合
        if (!licenseStatus.isValid && !licenseStatus.isTrial) {
            console.warn('No valid license or trial. Some features may be restricted.');
            // 必要に応じて機能制限を実装
        } else if (licenseStatus.isTrial) {
            console.log('Running in trial mode');
        } else {
            console.log('Valid license detected');
        }
    });

    /**
     * エクステンションの初期化
     */
    function init() {
        console.log('AGraph Extension: 初期化開始');
        
        // CSInterfaceインスタンスを作成
        csInterface = new CSInterface();
        
        // ExtendScriptを明示的にロード（Windows対策）
        var extScriptPath = csInterface.getSystemPath(SystemPath.EXTENSION) + '/ext/extendscript.jsx';
        var normalizedPath = extScriptPath.replace(/\\/g, '/');
        csInterface.evalScript('$.evalFile(' + JSON.stringify(normalizedPath) + ')');
        
        // LocalStorageをクリア（レイアウト崩れ対策）
        try {
            localStorage.clear();
            console.log('LocalStorage cleared');
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
        }
        
        // テーマの初期化
        initializeTheme();
        
        // イベントリスナーの設定
        setupEventListeners();
        
        // After Effectsとの接続確認
        checkAfterEffectsConnection();
        
        // ウィンドウサイズの調整
        adjustWindowSize();
        
        // 初期カーブを設定（遅延実行でDOM完全レンダリング後に実行）
        setTimeout(() => {
            setupInitialCurve();
        }, 50);
        
        // プリセットファイルの初期化
        initializePresets();
        
        // Resizeバーの初期化
        setupResizeBar();
        
        // レイアウトモードを復元
        restoreLayoutMode();
        
        // ウィンドウリサイズの監視（縦モードのボタンテキスト切り替え用）
        window.addEventListener('resize', handleWindowResize);
        handleWindowResize(); // 初回実行
        
        // Applyボタンを初期状態で確実に表示（遅延実行で確実に）
        setTimeout(() => {
            const applyButton = document.getElementById('applyButton');
            if (applyButton) {
                applyButton.style.display = 'inline-block';
                console.log('Apply button made visible in initialization (delayed)');
                updateOutput('✅ 初期化完了: Applyボタンが利用可能です');
            } else {
                console.error('Apply button not found in initialization');
                updateOutput('⚠️ 警告: Applyボタンが見つかりません');
            }
        }, 100);
        
        // 保存されたグラフデータを復元
        setTimeout(() => {
            restoreGraphDataFromFile();
        }, 150);
        
        console.log('AGraph Extension: Initialization completed');
        updateOutput('AGraph Extension initialized.<br>Default curve loaded. Select layers and click "Analyze Keyframes" button.');
    }

    /**
     * テーマの初期化と更新
     */
    function initializeTheme() {
        // Adobe アプリケーションのテーマ変更を監視
        csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onThemeColorChanged);
        
        // 現在のテーマを適用
        updateTheme();
    }

    /**
     * テーマ変更時のハンドラ
     */
    function onThemeColorChanged(event) {
        updateTheme();
    }

    /**
     * テーマの更新
     */
    function updateTheme() {
        try {
            const hostEnv = csInterface.getHostEnvironment();
            const skinInfo = hostEnv.appSkinInfo;
            
            if (skinInfo) {
                // パネルの背景色を更新
                const bgColor = skinInfo.panelBackgroundColor.color;
                const rgb = `rgb(${Math.round(bgColor.red)}, ${Math.round(bgColor.green)}, ${Math.round(bgColor.blue)})`;
                
                document.body.style.backgroundColor = rgb;
                
                // Apply detailed theme settings later
                console.log('AGraph Extension: Theme updated');
            }
        } catch (error) {
            console.warn('AGraph Extension: Error occurred during theme update:', error);
        }
    }

    /**
     * イベントリスナーの設定
     */
    function setupEventListeners() {
        // レイアウト切り替えボタンのクリックイベント
        const layoutToggleButton = document.getElementById('layoutToggleButton');
        if (layoutToggleButton) {
            layoutToggleButton.addEventListener('click', toggleLayout);
        }
        
        // 設定ボタンのクリックイベント
        const settingsButton = document.getElementById('settingsButton');
        if (settingsButton) {
            settingsButton.addEventListener('click', openSettingsModal);
        }
        
        // 設定モーダルの閉じるボタン
        const settingsClose = document.getElementById('settingsClose');
        if (settingsClose) {
            settingsClose.addEventListener('click', closeSettingsModal);
        }
        
        // 設定モーダルの背景クリックで閉じる
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', function(e) {
                if (e.target === settingsModal) {
                    closeSettingsModal();
                }
            });
        }
        
        // モード切り替えラジオボタンのイベント
        // イージング解析ボタンのクリックイベント
        const easingButton = document.getElementById('easingButton');
        if (easingButton) {
            easingButton.addEventListener('click', handleEasingAnalyzeClick);
        }

        // Apply ボタンのクリックイベント
        const applyButton = document.getElementById('applyButton');
        if (applyButton) {
            applyButton.addEventListener('click', handleApplyButtonClick);
        }
        
        // Fit Graph ボタンのクリックイベント
        const fitGraphButton = document.getElementById('fitGraphButton');
        if (fitGraphButton) {
            fitGraphButton.addEventListener('click', handleFitGraphClick);
        }
        
        // Scale Up ボタンのクリックイベント
        const scaleUpButton = document.getElementById('scaleUpButton');
        if (scaleUpButton) {
            scaleUpButton.addEventListener('click', handleScaleUpClick);
        }
        
        // Scale Down ボタンのクリックイベント
        const scaleDownButton = document.getElementById('scaleDownButton');
        if (scaleDownButton) {
            scaleDownButton.addEventListener('click', handleScaleDownClick);
        }
        
        // Acceleration トグルのイベント
        const showAccelerationToggle = document.getElementById('showAccelerationToggle');
        if (showAccelerationToggle) {
            // 保存された状態を読み込み
            csInterface.evalScript('loadPreference("showAcceleration")', function(result) {
                try {
                    const data = JSON.parse(result);
                    if (data.success && data.value === 'true') {
                        showAccelerationToggle.checked = true;
                        showAcceleration = true;
                        const label = showAccelerationToggle.closest('.acceleration-toggle');
                        if (label) label.classList.add('checked');
                    }
                } catch (e) {}
            });
            
            showAccelerationToggle.addEventListener('change', function(e) {
                showAcceleration = e.target.checked;
                // 状態を保存
                csInterface.evalScript(`savePreference("showAcceleration", "${e.target.checked}")`);
                
                // 親label要素にcheckedクラスを追加/削除
                const label = e.target.closest('.acceleration-toggle');
                if (label) {
                    if (e.target.checked) {
                        label.classList.add('checked');
                    } else {
                        label.classList.remove('checked');
                    }
                }
                // 現在のグラフを再描画（ハンドル再計算はスキップ）
                if (graphData && graphData.keyframes) {
                    if (nPointHandleEditingInitialized) {
                        redrawNPointCurve(false, true);
                    } else {
                        createEasingVisualization(graphData.keyframes);
                    }
                }
            });
        }
        
        // Velocity トグルのイベント
        const showVelocityToggle = document.getElementById('showVelocityToggle');
        if (showVelocityToggle) {
            // 保存された状態を読み込み
            csInterface.evalScript('loadPreference("showVelocity")', function(result) {
                try {
                    const data = JSON.parse(result);
                    if (data.success && data.value === 'true') {
                        showVelocityToggle.checked = true;
                        showVelocity = true;
                        const label = showVelocityToggle.closest('.velocity-toggle');
                        if (label) label.classList.add('checked');
                    }
                } catch (e) {}
            });
            
            showVelocityToggle.addEventListener('change', function(e) {
                showVelocity = e.target.checked;
                // 状態を保存
                csInterface.evalScript(`savePreference("showVelocity", "${e.target.checked}")`);
                
                // 親label要素にcheckedクラスを追加/削除
                const label = e.target.closest('.velocity-toggle');
                if (label) {
                    if (e.target.checked) {
                        label.classList.add('checked');
                    } else {
                        label.classList.remove('checked');
                    }
                }
                // 現在のグラフを再描画（ハンドル再計算はスキップ）
                if (graphData && graphData.keyframes) {
                    if (nPointHandleEditingInitialized) {
                        redrawNPointCurve(false, true);
                    } else {
                        createEasingVisualization(graphData.keyframes);
                    }
                }
            });
        }
        
        // プリセット選択イベント（カード式UIなので不要）
        // const presetSelect = document.getElementById('presetSelect');
        // if (presetSelect) {
        //     presetSelect.addEventListener('change', handlePresetSelect);
        // }
        
        // プリセット保存ボタンのイベント
        const savePresetButton = document.getElementById('savePresetButton');
        if (savePresetButton) {
            savePresetButton.addEventListener('click', handleSavePreset);
        }
        
        // プリセット削除ボタンのイベント
        const deletePresetButton = document.getElementById('deletePresetButton');
        if (deletePresetButton) {
            deletePresetButton.addEventListener('click', handleDeletePreset);
        }
        
        // グループ選択のイベント
        const groupSelect = document.getElementById('groupSelect');
        if (groupSelect) {
            groupSelect.addEventListener('change', handleGroupSelect);
        }
        
        // グループ追加ボタンのイベント
        const addGroupButton = document.getElementById('addGroupButton');
        if (addGroupButton) {
            addGroupButton.addEventListener('click', handleAddGroup);
        }
        
        // グループ編集ボタンのイベント
        const editGroupButton = document.getElementById('editGroupButton');
        if (editGroupButton) {
            editGroupButton.addEventListener('click', handleEditGroup);
        }
        
        // グループ削除ボタンのイベント
        const deleteGroupButton = document.getElementById('deleteGroupButton');
        if (deleteGroupButton) {
            deleteGroupButton.addEventListener('click', handleDeleteGroup);
        }
        
        // プリセットエクスポートボタンのイベント
        const exportPresetsButton = document.getElementById('exportPresetsButton');
        if (exportPresetsButton) {
            exportPresetsButton.addEventListener('click', handleExportPresets);
        }
        
        // プリセットインポートボタンのイベント
        const importPresetsButton = document.getElementById('importPresetsButton');
        if (importPresetsButton) {
            importPresetsButton.addEventListener('click', handleImportPresets);
        }
    }

    /**
     * Handle easing analyze button click
     */
    function handleEasingAnalyzeClick() {
        updateOutput('Analyzing selected keyframes easing...');
        
        csInterface.evalScript('aGraphGetSelectedKeyframes()', function(result) {
            try {
                console.log('Selected keyframes result:', result);
                const data = JSON.parse(result);
                
                if (data.error) {
                    updateOutput(`Error: ${data.error}`);
                    return;
                }
                
                if (data.keyframes && data.keyframes.length > 0) {
                    // 【Phase 2: モード分岐を削除し、統一処理に変更】
                    // キーフレーム数を自動判定（2点以上であればOK）
                    const keyframeCount = data.keyframes.length;
                    
                    if (keyframeCount < 2) {
                        updateOutput(`Please select at least 2 keyframes. (Selected: ${keyframeCount})`);
                        return;
                    }
                    
                    // モードに応じた検証（後方互換性のため残す）
                    if (keyframeCount !== currentMode) {
                        updateOutput(`Note: ${keyframeCount} keyframes selected (current mode: ${currentMode}-Point). Displaying ${keyframeCount}-point graph.`);
                    }
                    
                    keyframeData = data;
                    
                    // 【統一処理: 点数に関係なく正規化して表示】
                    const normalized = normalizeKeyframes(data.keyframes);
                    if (normalized) {
                        graphData = normalized;
                        syncLegacyData(); // 互換性レイヤーを同期
                        createEasingVisualization(graphData.keyframes);
                        
                        console.log('✅ Normalized graph data:', {
                            keyframeCount: graphData.keyframes.length,
                            normalization: graphData.normalization
                        });
                    } else {
                        // フォールバック: 正規化失敗時
                        console.warn('⚠️ Normalization failed, using original data');
                        createEasingVisualization(data.keyframes);
                    }
                    
                    // Applyボタンを表示
                    const applyButton = document.getElementById('applyButton');
                    if (applyButton) {
                        applyButton.style.display = 'inline-block';
                    }
                    
                    let message = `Easing analysis completed: ${keyframeCount} keyframes analyzed.`;
                    updateOutput(message);
                    
                    // グラフデータを保存
                    saveGraphDataToFile();
                } else {
                    updateOutput(`No selected keyframes found. Please select at least 2 keyframes in the timeline.`);
                }
                
            } catch (error) {
                updateOutput(`Easing data parsing error: ${error.message}`);
                console.error('Easing data parsing error:', error);
            }
        });
    }

    /**
     * Handle apply button click
     */
    function handleApplyButtonClick() {
        console.log('Apply button clicked - currentMode:', currentMode);
        
        // 【Phase 4: N点対応Apply処理】
        // graphDataが存在し、N点編集データがある場合はそれを優先
        if (graphData && graphData.keyframes && graphData.keyframes.length >= 2) {
            console.log('Using N-point graphData for Apply:', graphData);
            updateOutput(`Applying N-point curve (${graphData.keyframes.length} keyframes)...`);
            
            applyNPointCurve(graphData);
            return;
        }
        
        // 3点モードの場合は特別処理（後方互換性）
        if (currentMode === 3) {
            // 3点モードではcurrentEasingDataが必要
            if (!window.currentEasingData) {
                updateOutput('❌ No 3-point curve data available. Please analyze keyframes first.');
                return;
            }
            
            console.log('3-Point mode apply - using currentEasingData:', window.currentEasingData);
            updateOutput('3-Point mode: Checking selected keyframes...');
            
            // まず現在選択されているキーフレームを確認
            csInterface.evalScript('aGraphGetSelectedKeyframes()', function(selectedResult) {
                console.log('3-Point mode - Selected keyframes check result:', selectedResult);
                
                try {
                    const selectedData = JSON.parse(selectedResult);
                    
                    if (selectedData.error) {
                        updateOutput(`❌ No keyframes selected: ${selectedData.error}`);
                        return;
                    }
                    
                    if (!selectedData.keyframes || selectedData.keyframes.length === 0) {
                        updateOutput(`❌ No keyframes selected. Please select keyframes in the timeline before applying.`);
                        return;
                    }
                    
                    if (selectedData.keyframes.length >= 2) {
                        updateOutput(`3-Point mode: ${selectedData.keyframes.length} keyframes selected - Applying with middle point generation...`);
                        apply3PointTo2Point(selectedData.keyframes, window.currentEasingData);
                    } else {
                        updateOutput(`❌ 3-Point mode: Please select 2 or more keyframes for Apply. (Selected: ${selectedData.keyframes.length})`);
                        return;
                    }
                    
                } catch (error) {
                    console.error('3-Point mode apply error:', error);
                    updateOutput(`❌ Error processing 3-point apply: ${error.message}`);
                }
            });
            
            return;
        }
        
        // 2点モードの処理（従来通り）
        // currentEasingSettingsがない場合はエラー
        if (!currentEasingSettings) {
            updateOutput('No easing curve displayed. Please set up a curve first.');
            return;
        }
        
        // Apply直前のcurrentEasingSettingsを表示
        const preApplyOut = currentEasingSettings?.outTemporal;
        const preApplyIn = currentEasingSettings?.inTemporal;
        updateOutput(`[PRE-APPLY] currentEasingSettings: out=${preApplyOut?.speed.toFixed(2) || 'null'}/${preApplyOut?.influence.toFixed(1) || 'null'}, in=${preApplyIn?.speed.toFixed(2) || 'null'}/${preApplyIn?.influence.toFixed(1) || 'null'}`);

        // カーブ表示データを保持してApply後も編集可能にする
        // window.currentEasingData = null; // コメントアウト：ハンドル編集のために保持
        // keyframeData = null; // コメントアウト：Analyze結果は保持
        console.log('Apply: Keeping curve data for continued editing');
        
        // デバッグ: Apply後の編集可能状態を確認
        const hasEasingData = !!window.currentEasingData;
        const hasHandles = !!window.currentHandles;
        const has3PointHandles = !!window.current3PointHandles;
        const debugApplyState = `Apply後状態: currentEasingData=${hasEasingData}, currentHandles=${hasHandles}, current3PointHandles=${has3PointHandles}, mode=${currentMode}`;
        updateOutput(debugApplyState);
        console.log('Apply Debug State:', debugApplyState);

        // 表示されているカーブの設定を純粋にコピー（Analyze時の影響を完全に排除）
        let easingSettingsToApply = JSON.parse(JSON.stringify(currentEasingSettings));

        console.log('Applying easing settings:', easingSettingsToApply);
        updateOutput('Checking selected keyframes and applying easing...');
        
        // 設定内容をユーザーに表示
        const outSpeed = easingSettingsToApply.outTemporal?.speed;
        const outInfluence = easingSettingsToApply.outTemporal?.influence;
        const inSpeed = easingSettingsToApply.inTemporal?.speed;
        const inInfluence = easingSettingsToApply.inTemporal?.influence;
        
        const settingsDisplay = `Out: speed=${outSpeed?.toFixed(3) || 'N/A'}, influence=${outInfluence?.toFixed(2) || 'N/A'} | In: speed=${inSpeed?.toFixed(3) || 'N/A'}, influence=${inInfluence?.toFixed(2) || 'N/A'}`;
        updateOutput(`Settings: ${settingsDisplay}`);
        
        // まず現在選択されているキーフレームを確認
        csInterface.evalScript('aGraphGetSelectedKeyframes()', function(selectedResult) {
            console.log('Selected keyframes check result:', selectedResult);
            
            try {
                const selectedData = JSON.parse(selectedResult);
                
                if (selectedData.error) {
                    updateOutput(`❌ No keyframes selected: ${selectedData.error}`);
                    return;
                }
                
                if (!selectedData.keyframes || selectedData.keyframes.length === 0) {
                    updateOutput(`❌ No keyframes selected. Please select keyframes in the timeline before applying.`);
                    return;
                }
                
                updateOutput(`Found ${selectedData.keyframes.length} selected keyframes. Applying easing...`);
                
                // 複数区間対応の処理
                if (selectedData.keyframes.length >= 2) {
                    // 基準変化率（デフォルト: 100単位/秒）
                    const baseValueChangeRate = 100;
                    let segmentSettings = [];
                    let segmentInfo = `📊 イージング適用結果:\n`;
                    let consecutiveSegmentCount = 0;
                    
                    // プロパティ別にキーフレームをグループ化
                    const propertyGroups = {};
                    selectedData.keyframes.forEach(kf => {
                        const propKey = `${kf.layerName}_${kf.propertyName}`;
                        if (!propertyGroups[propKey]) {
                            propertyGroups[propKey] = [];
                        }
                        propertyGroups[propKey].push(kf);
                    });
                    
                    // 各プロパティグループごとに処理
                    Object.keys(propertyGroups).forEach(propKey => {
                        const keyframes = propertyGroups[propKey];
                        const kf = keyframes[0]; // 最初のキーフレームからプロパティ情報を取得
                        
                        // プロパティの簡潔な情報を表示
                        const propTypeLabel = kf.propertyValueType === PropertyValueType.TwoD_SPATIAL ? '[Position]' :
                                             kf.propertyValueType === PropertyValueType.ThreeD_SPATIAL ? '[Position3D]' :
                                             kf.propertyValueType === PropertyValueType.TwoD ? '[2D]' :
                                             kf.propertyValueType === PropertyValueType.ThreeD ? '[3D]' : '[1D]';
                        segmentInfo += `${propKey} ${propTypeLabel}:\n`;
                        
                        // 各区間の設定を作成（連続性チェック付き）
                        for (let i = 0; i < keyframes.length - 1; i++) {
                            const kf1 = keyframes[i];
                            const kf2 = keyframes[i + 1];
                            
                            // 実際のキーフレーム番号での連続性チェック
                            let isConsecutive = false;
                            let keyIndex1, keyIndex2, segmentName;
                            
                            if (kf1.keyIndex !== undefined && kf2.keyIndex !== undefined) {
                                // キーフレームインデックスがある場合（0ベースなので+1して表示）
                                keyIndex1 = kf1.keyIndex;
                                keyIndex2 = kf2.keyIndex;
                                isConsecutive = (keyIndex2 === keyIndex1 + 1);
                                segmentName = `  KF${keyIndex1+1}-${keyIndex2+1}`;
                            } else {
                                // インデックスがない場合は、選択順での連続性を仮定
                                keyIndex1 = i;
                                keyIndex2 = i + 1;
                                isConsecutive = true;
                                segmentName = `  Seg${i+1}-${i+2}`;
                            }
                            
                            if (isConsecutive) {
                                // 多次元プロパティ対応の値変化計算（RealEaseロジック）
                                let segmentValueDiff;
                                
                                // プロパティタイプ名の取得
                                const getPropertyTypeName = (type) => {
                                    const typeNames = {
                                        6144: 'OneD',
                                        6145: 'TwoD', 
                                        6146: 'ThreeD',
                                        6147: 'TwoD_SPATIAL',
                                        6148: 'ThreeD_SPATIAL',
                                        6413: 'Position_Special' // 実際にPositionで検出される値
                                    };
                                    return typeNames[type] || `Unknown(${type})`;
                                };
                                
                                // デバッグ：プロパティタイプを確認
                                console.log(`Property "${kf1.propertyName}" type: ${kf1.propertyValueType}`, kf1.debug);
                                console.log('kf1.value:', kf1.value, 'kf2.value:', kf2.value);
                                
                                if (Array.isArray(kf1.value) && Array.isArray(kf2.value)) {
                                    // 多次元プロパティの場合
                                    if (kf1.propertyValueType === PropertyValueType.TwoD_SPATIAL || 
                                        kf1.propertyValueType === PropertyValueType.ThreeD_SPATIAL ||
                                        kf1.propertyValueType === 6413) { // Position特殊タイプ
                                        // 空間的プロパティ（位置）：ベクトルの大きさで計算
                                        let diffVector = [];
                                        for (let d = 0; d < Math.min(kf1.value.length, kf2.value.length); d++) {
                                            diffVector.push(kf2.value[d] - kf1.value[d]);
                                        }
                                        // ベクトルの大きさ = √(x²+y²+z²)
                                        let magnitude = 0;
                                        for (let d = 0; d < diffVector.length; d++) {
                                            magnitude += diffVector[d] * diffVector[d];
                                        }
                                        segmentValueDiff = Math.sqrt(magnitude);
                                        console.log(`Position property - diffVector:`, diffVector, 'magnitude:', segmentValueDiff);
                                    } else {
                                        // 非空間的プロパティ（スケールなど）：X値（最初の要素）で計算
                                        segmentValueDiff = kf2.value[0] - kf1.value[0];
                                        console.log(`Multi-dimensional property - X diff:`, segmentValueDiff);
                                    }
                                } else {
                                    // 単次元プロパティ（回転、透明度など）
                                    segmentValueDiff = kf2.value - kf1.value;
                                    console.log(`Single-dimensional property - diff:`, segmentValueDiff);
                                }
                                
                                const segmentTimeDiff = kf2.time - kf1.time;
                                const segmentValueChangeRate = segmentValueDiff / segmentTimeDiff;
                                const scaleRatio = segmentValueChangeRate / baseValueChangeRate;
                                
                                // キーフレーム番号での表示
                                const propTypeLabel = kf1.propertyValueType === PropertyValueType.TwoD_SPATIAL ? '[Position]' :
                                                     kf1.propertyValueType === PropertyValueType.ThreeD_SPATIAL ? '[Position3D]' :
                                                     kf1.propertyValueType === PropertyValueType.TwoD ? '[2D]' :
                                                     kf1.propertyValueType === PropertyValueType.ThreeD ? '[3D]' : '[1D]';
                                
                                // この区間用の設定
                                let segmentEasingSettings = JSON.parse(JSON.stringify(easingSettingsToApply));
                                if (segmentEasingSettings.outTemporal) {
                                    segmentEasingSettings.outTemporal.speed *= scaleRatio;
                                }
                                if (segmentEasingSettings.inTemporal) {
                                    segmentEasingSettings.inTemporal.speed *= scaleRatio;
                                }
                                
                                // 適用する値を表示に追加
                                const outSpd = segmentEasingSettings.outTemporal?.speed.toFixed(3) || 'null';
                                const outInf = segmentEasingSettings.outTemporal?.influence.toFixed(1) || 'null';
                                const inSpd = segmentEasingSettings.inTemporal?.speed.toFixed(3) || 'null';
                                const inInf = segmentEasingSettings.inTemporal?.influence.toFixed(1) || 'null';
                                
                                segmentInfo += `  ${segmentName}${propTypeLabel}: 倍率=${scaleRatio.toFixed(3)} | Apply: out=${outSpd}/${outInf}, in=${inSpd}/${inInf}\n`;
                                
                                segmentSettings.push({
                                    segment: segmentName.trim(),
                                    keyIndex1: keyIndex1,
                                    keyIndex2: keyIndex2,
                                    propertyName: kf1.propertyName,
                                    layerName: kf1.layerName,
                                    outTemporal: segmentEasingSettings.outTemporal,
                                    inTemporal: segmentEasingSettings.inTemporal
                                });
                                
                                consecutiveSegmentCount++;
                            } else {
                                console.log(`⏭️ 非連続区間 ${segmentName}: スキップ`);
                            }
                        }
                    });
                    
                    alert(`【JS】segmentSettings作成完了\n件数: ${segmentSettings.length}\n連続区間: ${consecutiveSegmentCount}`);
                    
                    if (segmentSettings.length > 0) {
                        segmentInfo += `連続区間: ${consecutiveSegmentCount}個, スキップ: ${selectedData.keyframes.length - 1 - consecutiveSegmentCount}個`;
                        
                        alert(`【JS】aGraphApplyMultipleSegments呼び出し直前`);
                        
                        // 複数区間用ExtendScript関数を呼び出し
                        const segmentsDataJson = JSON.stringify({ segments: segmentSettings });
                        const escapedJson = segmentsDataJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                        
                        updateOutput(`🔧 Applying ${segmentSettings.length} consecutive segments with individual scaling`);
                        
                        csInterface.evalScript(`aGraphApplyMultipleSegments("${escapedJson}")`, function(result) {
                            try {
                                const data = JSON.parse(result);
                                if (data.error) {
                                    updateOutput(`❌ Error: ${data.error}`);
                                } else if (data.success) {
                                    updateOutput(`✅ Success! Applied to ${data.appliedCount} segments with individual scaling\n\n${segmentInfo}`);
                                    
                                    // Apply後のハンドル編集を再初期化
                                    setTimeout(() => {
                                        if (currentMode === 3 && window.current3PointHandles) {
                                            console.log('Re-initializing 3-point handle editing after apply');
                                            initialize3PointHandleEditing();
                                        } else if (currentMode === 2 && window.currentHandles) {
                                            console.log('Re-initializing 2-point handle editing after apply');
                                            initializeHandleEditing();
                                        }
                                    }, 100);
                                }
                            } catch (error) {
                                updateOutput(`❌ Parse error: ${error.message}`);
                            }
                        });
                        
                        return; // 複数区間処理で終了
                    } else {
                        updateOutput(`⚠️ No consecutive keyframe segments found. Skipping multiple segment processing.`);
                        return;
                    }
                }
                
                // フォールバック：単一区間処理
                let adjustedEasingSettings = JSON.parse(JSON.stringify(easingSettingsToApply));
                
                // ExtendScriptを呼び出してイージングを適用
                const easingSettingsJson = JSON.stringify(adjustedEasingSettings);
                console.log('Easing settings JSON being sent to ExtendScript:', easingSettingsJson);
                console.log('Raw adjustedEasingSettings object:', adjustedEasingSettings);
                
                // 適用する設定値を画面に表示
                const outInfo = adjustedEasingSettings.outTemporal ? 
                    `Out: speed=${adjustedEasingSettings.outTemporal.speed?.toFixed(3)}, influence=${adjustedEasingSettings.outTemporal.influence?.toFixed(2)}` : 'Out: none';
                const inInfo = adjustedEasingSettings.inTemporal ? 
                    `In: speed=${adjustedEasingSettings.inTemporal.speed?.toFixed(3)}, influence=${adjustedEasingSettings.inTemporal.influence?.toFixed(2)}` : 'In: none';
                updateOutput(`📤 [APPLY] ${outInfo} | ${inInfo}`);
                
                csInterface.evalScript(`aGraphApplyEasing(${easingSettingsJson})`, function(result) {
                    console.log('ExtendScript result:', result);
                    
                    try {
                        const data = JSON.parse(result);
                        
                        if (data.error) {
                            updateOutput(`❌ Error: ${data.error}`);
                            console.error('Apply error:', data.error);
                            return;
                        }
                        
                        if (data.success) {
                            // 適用したイージング値を表示用に準備
                            const appliedOut = adjustedEasingSettings.outTemporal ? 
                                `Out: speed=${adjustedEasingSettings.outTemporal.speed?.toFixed(3)}, influence=${adjustedEasingSettings.outTemporal.influence?.toFixed(2)}` : '';
                            const appliedIn = adjustedEasingSettings.inTemporal ? 
                                `In: speed=${adjustedEasingSettings.inTemporal.speed?.toFixed(3)}, influence=${adjustedEasingSettings.inTemporal.influence?.toFixed(2)}` : '';
                            const appliedValues = [appliedOut, appliedIn].filter(v => v).join(' | ');
                            
                            updateOutput(`✅ Success! Applied to ${data.appliedCount} keyframes. ${data.message || ''} [${appliedValues}]`);
                            console.log('Apply success:', data);
                            
                            // グラフ表示値とApply値を比較表示
                            setTimeout(() => {
                                const normalizedOut = window.normalized2PointSpeeds?.outSpeed || 0;
                                const normalizedOutInf = window.normalized2PointSpeeds?.outInfluence || 0;
                                const normalizedIn = window.normalized2PointSpeeds?.inSpeed || 0;
                                const normalizedInInf = window.normalized2PointSpeeds?.inInfluence || 0;
                                
                                const settingsOut = currentEasingSettings?.outTemporal;
                                const settingsIn = currentEasingSettings?.inTemporal;
                                
                                const appliedOut = adjustedEasingSettings?.outTemporal;
                                const appliedIn = adjustedEasingSettings?.inTemporal;
                                
                                const comparison = `[COMPARE]\n` +
                                    `Graph: out=${normalizedOut.toFixed(2)}/${normalizedOutInf.toFixed(1)}, in=${normalizedIn.toFixed(2)}/${normalizedInInf.toFixed(1)}\n` +
                                    `Settings: out=${settingsOut?.speed.toFixed(2) || 'null'}/${settingsOut?.influence.toFixed(1) || 'null'}, in=${settingsIn?.speed.toFixed(2) || 'null'}/${settingsIn?.influence.toFixed(1) || 'null'}\n` +
                                    `Applied: out=${appliedOut?.speed.toFixed(2) || 'null'}/${appliedOut?.influence.toFixed(1) || 'null'}, in=${appliedIn?.speed.toFixed(2) || 'null'}/${appliedIn?.influence.toFixed(1) || 'null'}`;
                                console.log('Apply comparison:', comparison);
                                updateOutput(comparison);
                                
                                // ハンドル編集を再初期化
                                if (currentMode === 3 && window.current3PointHandles) {
                                    console.log('Re-initializing 3-point handle editing after apply');
                                    initialize3PointHandleEditing();
                                } else if (currentMode === 2 && window.currentHandles) {
                                    console.log('Re-initializing 2-point handle editing after apply');
                                    initializeHandleEditing();
                                }
                            }, 100);
                        } else {
                            updateOutput(`⚠️ Result unclear. Raw: ${JSON.stringify(data)}`);
                            console.warn('Unclear result:', data);
                        }
                        
                    } catch (error) {
                        updateOutput(`❌ Parse error: ${error.message}. Raw result: ${result}`);
                        console.error('Apply result parsing error:', error);
                        console.error('Raw result:', result);
                    }
                });
                
            } catch (error) {
                updateOutput(`❌ Error checking selected keyframes: ${error.message}`);
                console.error('Selected keyframes check error:', error);
            }
        });
    }

    /**
     * 区間別のvalue差分とtime差分を計算する関数
     */
    function calculateSegmentDifferences(kf1, kf2) {
        // 時間差分
        const timeDiff = kf2.time - kf1.time;
        
        // 値差分の計算
        let valueDiff;
        if (isPositionProperty(kf1)) {
            // 位置プロパティ：ベクトル距離
            if (Array.isArray(kf1.value) && Array.isArray(kf2.value)) {
                let diffVector = [];
                const dimensions = Math.min(kf1.value.length, kf2.value.length);
                for (let d = 0; d < dimensions; d++) {
                    diffVector.push(kf2.value[d] - kf1.value[d]);
                }
                valueDiff = calculateMagnitude(diffVector);
                console.log('🔍 Position property segment calculation:', {
                    kf1_value: kf1.value,
                    kf2_value: kf2.value,
                    diffVector: diffVector,
                    magnitude: valueDiff
                });
                updateOutput(`🔍 Segment: [${kf1.value.join(',')}] → [${kf2.value.join(',')}] = ${valueDiff.toFixed(3)} units`);
            } else {
                valueDiff = Math.abs(kf2.value - kf1.value);
            }
        } else {
            // 非位置プロパティ：単次元値の差（符号を保持）
            const value1 = Array.isArray(kf1.value) ? kf1.value[0] : kf1.value;
            const value2 = Array.isArray(kf2.value) ? kf2.value[0] : kf2.value;
            valueDiff = value2 - value1;
            console.log('🔍 Non-position property segment calculation:', {
                kf1_value: value1,
                kf2_value: value2,
                valueDiff: valueDiff,
                kf1_time: kf1.time,
                kf2_time: kf2.time,
                timeDiff: timeDiff
            });
            updateOutput(`🔍 Segment: ${value1.toFixed(3)} → ${value2.toFixed(3)} = ${valueDiff.toFixed(3)} units (${timeDiff.toFixed(3)}s)`);
        }
        
        return { valueDiff, timeDiff };
    }

    /**
     * 区間別にspeed値を正規化する関数
     */
    function normalizeSpeedForSegment(speed, segmentValueDiff, segmentTimeDiff) {
        if (segmentTimeDiff === 0) {
            console.warn('Time difference is zero for segment, returning original speed');
            return speed;
        }
        
        const segmentRate = segmentValueDiff / segmentTimeDiff;
        if (segmentRate === 0) {
            console.warn('Segment rate is zero, returning original speed');
            return speed;
        }
        
        // speed / (segmentValueDiff / segmentTimeDiff) の計算
        const normalizedSpeed = speed / segmentRate;
        
        // 🔬 試験的に逆の計算も表示
        const alternativeNormalized = speed * segmentRate;
        
        // 🔧 グラフのY軸は0-100表示だが内部は0-1のため、100倍補正
        // 符号を保持するため、正規化の符号をそのまま維持
        const correctedSpeed = normalizedSpeed * 100;
        const correctedAlternative = alternativeNormalized * 100;
        
        // UI上にデバッグ情報を表示（符号情報も含む）
        const speedSign = speed >= 0 ? '+' : '-';
        const normalizedSign = normalizedSpeed >= 0 ? '+' : '-';
        const correctedSign = correctedSpeed >= 0 ? '+' : '-';
        
        updateOutput(`🔍 Speed Debug: ${speedSign}${Math.abs(speed).toFixed(6)} → ${normalizedSign}${Math.abs(normalizedSpeed).toFixed(6)} → ${correctedSign}${Math.abs(correctedSpeed).toFixed(6)} (×100)`);
        updateOutput(`  Segment: ${segmentValueDiff.toFixed(3)} units / ${segmentTimeDiff.toFixed(3)} sec = ${segmentRate.toFixed(3)} rate`);
        updateOutput(`  Current: ${speed.toFixed(6)} / ${segmentRate.toFixed(6)} = ${normalizedSpeed.toFixed(6)} → ${correctedSpeed.toFixed(6)}`);
        updateOutput(`  Alternative: ${speed.toFixed(6)} * ${segmentRate.toFixed(6)} = ${alternativeNormalized.toFixed(6)} → ${correctedAlternative.toFixed(6)}`);
        updateOutput(`  Sign preservation check: original=${speedSign}, final=${correctedSign}`);
        
        return correctedSpeed;
    }

    /**
     * 3点モード用のApply処理
     */
    function apply3PointHandleOnly(selectedKeyframes, easingSettings) {
        console.log('Applying 3-point handle-only mode with keyframes:', selectedKeyframes);
        
        // 表示されているグラフのデータを確認
        if (!window.currentEasingData) {
            updateOutput('❌ No 3-point curve data available. Please analyze keyframes first.');
            return;
        }
        
        const legacyGraphData = window.currentEasingData;
        console.log('Using graph data for handle-only apply:', legacyGraphData);
        
        // キーフレームを時間順にソート
        const sortedKeyframes = [...selectedKeyframes].sort((a, b) => a.time - b.time);
        
        if (sortedKeyframes.length !== 3) {
            updateOutput(`❌ 3-Point handle-only mode requires exactly 3 keyframes. (Selected: ${sortedKeyframes.length})`);
            return;
        }
        
        const startKf = sortedKeyframes[0];
        const middleKf = sortedKeyframes[1];
        const endKf = sortedKeyframes[2];
        
        // ハンドルのみ適用 - キーフレーム位置は変更しない
        console.log('Applying handle adjustments only (no position changes)');
        
        // 区間別の差分を計算
        const segment1Diff = calculateSegmentDifferences(startKf, middleKf);  // KF0 → KF1
        const segment2Diff = calculateSegmentDifferences(middleKf, endKf);    // KF1 → KF2
        
        console.log('Segment differences:', {
            segment1: segment1Diff,
            segment2: segment2Diff
        });
        
        // グラフで表示されたイージング設定を各区間で正規化
        // 3点モードでは各区間に異なる設定を適用
        const segment1EasingSettings = {
            outTemporal: null, // KF0 → KF1 の出力ハンドル
            inTemporal: null   // KF0 → KF1 の入力ハンドル
        };
        
        const segment2EasingSettings = {
            outTemporal: null, // KF1 → KF2 の出力ハンドル  
            inTemporal: null   // KF1 → KF2 の入力ハンドル
        };
        
        // グラフデータから各キーフレームのイージング設定を取得し、区間別に正規化
        if (legacyGraphData.keyframes && legacyGraphData.keyframes.length >= 3) {
            // 第1区間 (KF0 → KF1)
            if (legacyGraphData.keyframes[0].easing?.outTemporal) {
                const originalSpeed = legacyGraphData.keyframes[0].easing.outTemporal.speed;
                const normalizedSpeed = normalizeSpeedForSegment(
                    originalSpeed, 
                    segment1Diff.valueDiff, 
                    segment1Diff.timeDiff
                );
                segment1EasingSettings.outTemporal = {
                    speed: normalizedSpeed,
                    influence: legacyGraphData.keyframes[0].easing.outTemporal.influence
                };
                console.log('KF0 outTemporal speed normalized:', originalSpeed, '->', normalizedSpeed);
            }
            if (legacyGraphData.keyframes[1].easing?.inTemporal) {
                const originalSpeed = legacyGraphData.keyframes[1].easing.inTemporal.speed;
                const normalizedSpeed = normalizeSpeedForSegment(
                    originalSpeed, 
                    segment1Diff.valueDiff, 
                    segment1Diff.timeDiff
                );
                segment1EasingSettings.inTemporal = {
                    speed: normalizedSpeed,
                    influence: legacyGraphData.keyframes[1].easing.inTemporal.influence
                };
                console.log('KF1 inTemporal speed normalized:', originalSpeed, '->', normalizedSpeed);
            }
            
            // 第2区間 (KF1 → KF2)
            if (legacyGraphData.keyframes[1].easing?.outTemporal) {
                const originalSpeed = legacyGraphData.keyframes[1].easing.outTemporal.speed;
                const normalizedSpeed = normalizeSpeedForSegment(
                    originalSpeed, 
                    segment2Diff.valueDiff, 
                    segment2Diff.timeDiff
                );
                segment2EasingSettings.outTemporal = {
                    speed: normalizedSpeed,
                    influence: legacyGraphData.keyframes[1].easing.outTemporal.influence
                };
                console.log('KF1 outTemporal speed normalized:', originalSpeed, '->', normalizedSpeed);
            }
            if (legacyGraphData.keyframes[2].easing?.inTemporal) {
                const originalSpeed = legacyGraphData.keyframes[2].easing.inTemporal.speed;
                const normalizedSpeed = normalizeSpeedForSegment(
                    originalSpeed, 
                    segment2Diff.valueDiff, 
                    segment2Diff.timeDiff
                );
                segment2EasingSettings.inTemporal = {
                    speed: normalizedSpeed,
                    influence: legacyGraphData.keyframes[2].easing.inTemporal.influence
                };
                console.log('KF2 inTemporal speed normalized:', originalSpeed, '->', normalizedSpeed);
            }
        }
        
        console.log('Segment easing settings:', {
            segment1: segment1EasingSettings,
            segment2: segment2EasingSettings
        });
        
        // ExtendScriptに3点ハンドル適用を指示（位置変更なし）
        const apply3PointData = {
            keyframes: sortedKeyframes, // 元のキーフレーム位置をそのまま使用
            segment1Easing: segment1EasingSettings,
            segment2Easing: segment2EasingSettings
        };
        
        const dataJson = JSON.stringify(apply3PointData);
        const escapedJson = dataJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        
        csInterface.evalScript(`aGraphApply3PointHandleOnly("${escapedJson}")`, function(result) {
            console.log('3-Point handle-only apply ExtendScript result:', result);
            
            try {
                const data = JSON.parse(result);
                if (data.error) {
                    updateOutput(`❌ 3-Point Handle Apply Error: ${data.error}`);
                    console.error('3-Point handle apply error:', data.error);
                } else if (data.success) {
                    updateOutput(`✅ 3-Point handle adjustments applied! Selection preserved.`);
                    console.log('3-Point handle apply success:', data);
                } else {
                    updateOutput(`⚠️ 3-Point handle apply result unclear: ${JSON.stringify(data)}`);
                    console.warn('3-Point handle apply unclear result:', data);
                }
            } catch (error) {
                console.error('3-Point handle apply result parsing error:', error);
                updateOutput(`❌ Failed to parse 3-point handle apply result: ${error.message}`);
                updateOutput(`Raw result: ${result}`);
            }
        });
    }

    /**
     * N点カーブをApply（2点以上すべて対応）
     */
    function applyNPointCurve(graphData) {
        console.log('=== applyNPointCurve START ===', graphData);
        
        if (!graphData || !graphData.keyframes || graphData.keyframes.length < 2) {
            updateOutput('❌ Invalid graph data for apply');
            return;
        }
        
        // 現在選択されているキーフレームを取得
        csInterface.evalScript('aGraphGetSelectedKeyframes()', function(selectedResult) {
            try {
                const selectedData = JSON.parse(selectedResult);
                
                if (selectedData.error || !selectedData.keyframes || selectedData.keyframes.length < 2) {
                    updateOutput('❌ Please select 2 or more keyframes');
                    return;
                }
                
                const selectedKfs = selectedData.keyframes;
                const graphKfs = graphData.keyframes;
                
                console.log('Selected keyframes:', selectedKfs.length);
                console.log('Graph keyframes:', graphKfs.length);
                
                updateOutput(`\n=== Apply判定 ===`);
                updateOutput(`選択キーフレーム数: ${selectedKfs.length}`);
                updateOutput(`グラフ点数: ${graphKfs.length}`);
                
                // グラフ点数が2以上なら常に中点生成モード
                if (graphKfs.length >= 2) {
                    updateOutput(`→ 中点生成モード: ${graphKfs.length}点グラフ`);
                    applyNPointWithMiddleGeneration(selectedKfs, graphKfs);
                }
                else {
                    updateOutput(`❌ グラフ点数が不足: ${graphKfs.length}点`);
                }
                
            } catch (error) {
                console.error('applyNPointCurve error:', error);
                updateOutput(`❌ Apply error: ${error.message}`);
            }
        });
    }
    
    /**
     * N点カーブを直接適用（選択数 = グラフ点数）
     */
    function applyNPointDirect(selectedKfs, graphKfs) {
        console.log('=== applyNPointDirect START ===');
        console.log('selectedKfs:', selectedKfs);
        console.log('graphKfs:', graphKfs);
        
        updateOutput(`\n=== 直接適用モード (${selectedKfs.length}点) ===`);
        
        // プロパティごとにグループ化
        const keyframesByProperty = {};
        selectedKfs.forEach(kf => {
            const propKey = `${kf.layerName}_${kf.propertyName}`;
            if (!keyframesByProperty[propKey]) {
                keyframesByProperty[propKey] = [];
            }
            keyframesByProperty[propKey].push(kf);
        });
        
        const propertyCount = Object.keys(keyframesByProperty).length;
        updateOutput(`📊 Processing ${propertyCount} property(ies)`);
        
        // 各プロパティを処理
        Object.keys(keyframesByProperty).forEach((propKey, propIndex) => {
            const propKfs = keyframesByProperty[propKey];
            const propName = propKfs[0].propertyName;
            
            updateOutput(`\n=== Property ${propIndex + 1}/${propertyCount}: ${propName} ===`);
            
            // このプロパティのキーフレーム数がグラフ点数と一致するか確認
            if (propKfs.length !== graphKfs.length) {
                updateOutput(`⚠️ Warning: Property has ${propKfs.length} keyframes but graph has ${graphKfs.length} points - Skip`);
                return;
            }
            
            // Apply先キーフレーム情報を表示
            updateOutput(`キーフレーム数: ${propKfs.length}`);
            for (let i = 0; i < propKfs.length; i++) {
                const kf = propKfs[i];
                updateOutput(`  KF${i}: time=${kf.time.toFixed(3)}s, value=${JSON.stringify(kf.value)}`);
            }
            
            // 各区間の情報を表示
            updateOutput(`\n区間情報 (${propKfs.length - 1}区間):`);
            for (let i = 0; i < propKfs.length - 1; i++) {
                const kf1 = propKfs[i];
                const kf2 = propKfs[i + 1];
                const graphKf1 = graphKfs[i];
                const graphKf2 = graphKfs[i + 1];
                
                const timeDiff = kf2.time - kf1.time;
                
                // 値変化の計算
                let valueDiff;
                if (Array.isArray(kf1.value) && Array.isArray(kf2.value)) {
                    if (isPositionProperty(kf1)) {
                        const diffVector = kf2.value.map((v, idx) => v - kf1.value[idx]);
                        valueDiff = calculateMagnitude(diffVector);
                        updateOutput(`  区間${i}: 時間=${timeDiff.toFixed(3)}s, ベクトル長=${valueDiff.toFixed(3)}`);
                    } else {
                        valueDiff = Math.abs(kf2.value[0] - kf1.value[0]);
                        updateOutput(`  区間${i}: 時間=${timeDiff.toFixed(3)}s, X軸値変化=${valueDiff.toFixed(3)}`);
                    }
                } else {
                    const val1 = Array.isArray(kf1.value) ? kf1.value[0] : kf1.value;
                    const val2 = Array.isArray(kf2.value) ? kf2.value[0] : kf2.value;
                    valueDiff = Math.abs(val2 - val1);
                    updateOutput(`  区間${i}: 時間=${timeDiff.toFixed(3)}s, 値変化=${valueDiff.toFixed(3)}`);
                }
                
                // グラフのイージング設定
                const outEasing = graphKf1.easing?.outTemporal || { speed: 0, influence: 33.33 };
                const inEasing = graphKf2.easing?.inTemporal || { speed: 0, influence: 33.33 };
                
                updateOutput(`    正規化OUT: speed=${outEasing.speed.toFixed(1)}, influence=${outEasing.influence.toFixed(1)}`);
                updateOutput(`    正規化IN:  speed=${inEasing.speed.toFixed(1)}, influence=${inEasing.influence.toFixed(1)}`);
            }
            
            // ExtendScriptに渡すデータ構築
            applySinglePropertyDirect(propKfs, graphKfs);
        });
        
        updateOutput(`\n✅ All properties processed`);
    }
    
    /**
     * 単一プロパティに直接適用（5b893ea方式: 選択を使用）
     */
    function applySinglePropertyDirect(selectedKfs, graphKfs) {
        // イージング設定のみを送信（5b893ea方式）
        const applyData = {
            segmentsEasing: []
        };
        
        // 各区間のイージング設定を作成
        for (let i = 0; i < graphKfs.length - 1; i++) {
            const outTemporal = graphKfs[i].easing?.outTemporal || { speed: 0, influence: 33.33 };
            const inTemporal = graphKfs[i + 1].easing?.inTemporal || { speed: 0, influence: 33.33 };
            
            applyData.segmentsEasing.push({
                outTemporal: outTemporal,
                inTemporal: inTemporal
            });
        }
        
        console.log('Calling ExtendScript with N-point direct apply:', applyData);
        
        const dataJson = JSON.stringify(applyData);
        const escapedJson = dataJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const scriptCommand = `aGraphApplyNPointDirect("${escapedJson}")`;
        
        console.log('Script command length:', scriptCommand.length);
        
        csInterface.evalScript(scriptCommand, function(result) {
            console.log('ExtendScript result:', result);
            
            if (!result || result.trim() === '') {
                updateOutput('❌ Empty result from ExtendScript');
                return;
            }
            
            try {
                const resultData = JSON.parse(result);
                
                if (resultData.error) {
                    updateOutput(`❌ Error: ${resultData.error}`);
                    if (resultData.debug) {
                        console.log('Debug info:', resultData.debug);
                        updateOutput(`\n=== ExtendScript Debug Info ===`);
                        resultData.debug.forEach(line => updateOutput(line));
                    }
                } else if (resultData.success) {
                    updateOutput(`✅ Property applied: ${resultData.message}`);
                    
                    // デバッグ情報を表示
                    if (resultData.debug) {
                        resultData.debug.forEach(line => {
                            if (line.includes('Segment') || line.includes('speed') || line.includes('multiplier') || line.includes('deltaY')) {
                                updateOutput(line);
                            }
                        });
                    }
                } else {
                    updateOutput(`⚠️ Unknown result: ${result}`);
                }
            } catch (parseError) {
                console.error('Result parse error:', parseError);
                updateOutput(`❌ Failed to parse result: ${parseError.message}`);
            }
        });
    }
    
    /**
     * N点カーブを2点に適用（中点自動生成）
     */
    function applyNPointWithMiddleGeneration(selectedKfs, graphKfs) {
        console.log('=== applyNPointWithMiddleGeneration START ===');
        console.log('selectedKfs:', selectedKfs);
        console.log('graphKfs:', graphKfs);
        
        updateOutput(`🔧 Generating middle points from ${graphKfs.length}-point graph...`);
        
        // キーフレームを時間順にソート
        const sortedKeyframes = [...selectedKfs].sort((a, b) => a.time - b.time);
        
        // プロパティごとにグループ化
        const keyframesByProperty = {};
        sortedKeyframes.forEach(kf => {
            const propKey = `${kf.layerId}_${kf.propertyName}`;
            if (!keyframesByProperty[propKey]) {
                keyframesByProperty[propKey] = [];
            }
            keyframesByProperty[propKey].push(kf);
        });
        
        const propertyCount = Object.keys(keyframesByProperty).length;
        
        updateOutput(`📊 Processing ${propertyCount} property(ies), total ${sortedKeyframes.length} keyframes`);
        
        // 各プロパティを処理
        Object.keys(keyframesByProperty).forEach((propKey, propIndex) => {
            const propKfs = keyframesByProperty[propKey];
            const propName = propKfs[0].propertyName;
            
            updateOutput(`\n=== Property ${propIndex + 1}/${propertyCount}: ${propName} ===`);
            
            if (propKfs.length === 2) {
                applySinglePropertyWithMiddle(propKfs[0], propKfs[1], window.currentEasingData);
            } else if (propKfs.length > 2) {
                // 3つ以上：gitのコピー元ロジック - 連続する隣接ペアのみ処理
                updateOutput(`  複数キーフレーム: ${propKfs.length}個`);
                
                for (let i = 0; i < propKfs.length - 1; i++) {
                    const startKf = propKfs[i];
                    const endKf = propKfs[i + 1];
                    
                    // keyIndexが連続しているかチェック（間にキーフレームがない = 隣接）
                    const isAdjacent = (endKf.keyIndex === startKf.keyIndex + 1);
                    
                    if (isAdjacent) {
                        updateOutput(`    ペア ${i + 1}: KF${startKf.keyIndex} → KF${endKf.keyIndex} (連続)`);
                        applySinglePropertyWithMiddle(startKf, endKf, window.currentEasingData);
                    } else {
                        updateOutput(`    ペア ${i + 1}: KF${startKf.keyIndex} → KF${endKf.keyIndex} (スキップ: 非連続)`);
                    }
                }
            } else {
                updateOutput(`  ⚠️ キーフレームが1つのみ: スキップ`);
            }
        });
        
        updateOutput(`\n✅ All properties processed`);
    }
    
    /**
     * 単一プロパティに中点生成付きでN点カーブを適用
     */
    function applySinglePropertyWithMiddle(startKf, endKf, graphData) {
        // デバッグ情報は全てExtendScript側で表示するため、ここでは最小限のみ
        
        const graphKfs = graphData.keyframes;
        
        // デバッグ: graphDataの中身を確認
        console.log('=== applySinglePropertyWithMiddle DEBUG ===');
        console.log('graphKfs.length:', graphKfs.length);
        console.log('graphData.value2:', graphData.value2);
        console.log('graphKfs[1]:', graphKfs[1]);
        console.log('startKf.value:', startKf.value, 'endKf.value:', endKf.value);
        
        updateOutput('🔍 DEBUG: graphData.value2=' + (graphData.value2 !== undefined ? graphData.value2.toFixed(3) : 'undefined'));
        updateOutput('🔍 DEBUG: graphKfs[1].value=' + (graphKfs[1] ? graphKfs[1].value.toFixed(3) : 'undefined'));
        updateOutput('🔍 DEBUG: graphKfs[1].time=' + (graphKfs[1] ? graphKfs[1].time.toFixed(3) : 'undefined'));
        
        // N-2個の中点を生成（正規化値のみ - 実際の値はExtendScript側で各プロパティごとに計算）
        const middleKeyframes = [];
        for (let i = 1; i < graphKfs.length - 1; i++) {
            const normalizedTime = graphKfs[i].time; // 0-1範囲
            
            // gitのロジック: 3点の場合はgraphData.value2を使用、N点の場合はgraphKfs[i].valueを使用
            let normalizedValue;
            if (graphKfs.length === 3 && i === 1 && graphData.value2 !== undefined) {
                // 3点モードの中点: graphData.value2を優先（編集後の値）
                normalizedValue = graphData.value2;
                console.log('Using graphData.value2:', normalizedValue);
            } else {
                // N点モード、または3点でもvalue2がない場合
                normalizedValue = graphKfs[i].value;
                console.log('Using graphKfs[' + i + '].value:', normalizedValue);
            }
            
            console.log('Middle point', i, '- normalized time:', normalizedTime, 'normalized value:', normalizedValue);
            
            // 正規化値のみを保存（実際の時間・値はExtendScript側で各プロパティのstartValue/endValueを使って計算）
            middleKeyframes.push({
                normalizedTime: normalizedTime,
                normalizedValue: normalizedValue
            });
        }
        
        // N-1区間のイージング設定を作成
        const segmentsEasing = [];
        for (let i = 0; i < graphKfs.length - 1; i++) {
            const kf1 = graphKfs[i];
            const kf2 = graphKfs[i + 1];
            
            // グラフから直接speed値を取得（Analyze時に既に正規化×100されている）
            // gitのロジック: "3点モードは0-1正規化空間なので、speed値をそのまま使用"
            const outSpeed = kf1.easing?.outTemporal?.speed || 0;
            const inSpeed = kf2.easing?.inTemporal?.speed || 0;
            
            segmentsEasing.push({
                outTemporal: { 
                    speed: outSpeed, 
                    influence: kf1.easing?.outTemporal?.influence || 33.33 
                },
                inTemporal: { 
                    speed: inSpeed, 
                    influence: kf2.easing?.inTemporal?.influence || 33.33 
                }
            });
        }
        
        // ExtendScriptに渡すデータを構築
        const applyData = {
            startTime: startKf.time,
            endTime: endKf.time,
            middleKeyframes: middleKeyframes,
            segmentsEasing: segmentsEasing
        };
        
        const dataJson = JSON.stringify(applyData);
        // Base64エンコードで日本語などの特殊文字を安全に渡す
        const encodedJson = btoa(unescape(encodeURIComponent(dataJson)));
        const scriptCommand = `aGraphApplyNPointBase64("${encodedJson}")`;
        csInterface.evalScript(scriptCommand, function(result) {
            if (!result || result.trim() === '') {
                updateOutput('❌ Empty result from ExtendScript');
                return;
            }
            
            try {
                const resultData = JSON.parse(result);
                
                if (resultData.error) {
                    updateOutput(`\n❌ Error: ${resultData.error}`);
                } else if (resultData.success) {
                    updateOutput(`\n✅ ${resultData.message}`);
                }
                
                // デバッグ情報を必ず表示
                if (resultData.debug && Array.isArray(resultData.debug) && resultData.debug.length > 0) {
                    updateOutput(`\n━━━ 詳細情報 (${resultData.debug.length}行) ━━━`);
                    for (let i = 0; i < resultData.debug.length; i++) {
                        updateOutput(String(resultData.debug[i]));
                    }
                    updateOutput(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                }
                
            } catch (parseError) {
                updateOutput(`\n❌ Parse error: ${parseError.message}`);
                updateOutput(result.substring(0, 300));
            }
        });
    }

    /**
     * 3点モードで2点選択時: グラフに基づいて中点自動生成とハンドル反映
     */
    function apply3PointTo2Point(selectedKeyframes, graphData) {
        console.log('=== apply3PointTo2Point START ===');
        console.log('selectedKeyframes:', selectedKeyframes);
        console.log('graphData:', graphData);
        
        updateOutput('🔧 apply3PointTo2Point function called');
        updateOutput(`📊 Graph data exists: ${!!graphData}`);
        updateOutput(`📊 Selected keyframes: ${selectedKeyframes.length}`);
        
        console.log('Applying 3-point graph to 2 selected keyframes:', selectedKeyframes);
        
        if (!graphData || !graphData.keyframes || graphData.keyframes.length !== 3) {
            console.log('VALIDATION FAILED:', {
                graphData: !!graphData,
                keyframes: !!(graphData && graphData.keyframes),
                length: graphData && graphData.keyframes ? graphData.keyframes.length : 'N/A'
            });
            updateOutput(`❌ Invalid graph data for 3-point to 2-point apply.`);
            updateOutput(`  graphData exists: ${!!graphData}`);
            updateOutput(`  graphData.keyframes exists: ${!!(graphData && graphData.keyframes)}`);
            updateOutput(`  graphData.keyframes.length: ${graphData && graphData.keyframes ? graphData.keyframes.length : 'N/A'}`);
            return;
        }
        
        console.log('VALIDATION PASSED');
        updateOutput(`✅ Graph validation passed - 3 keyframes in graph`);
        
        // キーフレームを時間順にソート
        const sortedKeyframes = [...selectedKeyframes].sort((a, b) => a.time - b.time);
        
        // プロパティごとにグループ化（2点モードと同じ処理）
        const keyframesByProperty = {};
        sortedKeyframes.forEach(kf => {
            const propKey = `${kf.layerName}_${kf.propertyName}`;
            if (!keyframesByProperty[propKey]) {
                keyframesByProperty[propKey] = [];
            }
            keyframesByProperty[propKey].push(kf);
        });
        
        const propertyCount = Object.keys(keyframesByProperty).length;
        updateOutput(`📊 処理対象: ${propertyCount}個のプロパティ, 合計${sortedKeyframes.length}個のキーフレーム`);
        
        // プロパティごとに処理
        Object.keys(keyframesByProperty).forEach((propKey, propIndex) => {
            const propKeyframes = keyframesByProperty[propKey];
            const propName = propKeyframes[0].propertyName;
            
            updateOutput(`\n=== プロパティ ${propIndex + 1}/${propertyCount}: ${propName} (${propKeyframes.length}個のキーフレーム) ===`);
            
            // 2点モードと同じ：選択されたキーフレームが2つの場合は単一ペア処理
            if (propKeyframes.length === 2) {
                applySinglePair(propKeyframes[0], propKeyframes[1], graphData);
            } else if (propKeyframes.length > 2) {
                // 3つ以上：2点モードと同じロジックで連続する隣接ペアのみ処理
                updateOutput(`  複数キーフレーム: ${propKeyframes.length}個`);
                
                // 各ペアについて、連続しているか（間にキーフレームがないか）をチェック
                for (let i = 0; i < propKeyframes.length - 1; i++) {
                    const startKf = propKeyframes[i];
                    const endKf = propKeyframes[i + 1];
                    
                    // keyIndexが連続しているかチェック（間にキーフレームがない = 隣接）
                    const isAdjacent = (endKf.keyIndex === startKf.keyIndex + 1);
                    
                    if (isAdjacent) {
                        updateOutput(`    ペア ${i + 1}: KF${startKf.keyIndex} → KF${endKf.keyIndex} (連続)`);
                        applySinglePair(startKf, endKf, graphData);
                    } else {
                        updateOutput(`    ペア ${i + 1}: KF${startKf.keyIndex} → KF${endKf.keyIndex} (スキップ: 非連続)`);
                    }
                }
            } else {
                updateOutput(`  ⚠️ キーフレームが1つのみ: スキップ`);
            }
        });
        
        updateOutput(`\n✅ 全プロパティの処理完了`);
    }
    
    /**
     * 単一の隣接キーフレームペアに3点グラフを適用
     */
    function applySinglePair(startKf, endKf, graphData) {
        
        // グラフの中点データから実際の中点位置を計算
        const editedMiddleTime = graphData.keyframes[1].time; // 0-1の範囲
        const normalizedMiddleValue = graphData.value2; // 正規化された中点値（0-1の範囲）
        
        // 実際の時間範囲で中点の時間を計算
        const actualMiddleTime = startKf.time + (endKf.time - startKf.time) * editedMiddleTime;
        
        // 実際の値範囲で中点の値を計算
        let actualMiddleValue;
        if (Array.isArray(startKf.value) && Array.isArray(endKf.value)) {
            // 多次元プロパティ（位置、スケール等）: 各軸ごとに補間
            actualMiddleValue = [];
            const dimensions = Math.min(startKf.value.length, endKf.value.length);
            for (let d = 0; d < dimensions; d++) {
                const startVal = startKf.value[d];
                const endVal = endKf.value[d];
                actualMiddleValue[d] = startVal + (endVal - startVal) * normalizedMiddleValue;
            }
        } else {
            // 1次元プロパティ
            const startValue = Array.isArray(startKf.value) ? startKf.value[0] : startKf.value;
            const endValue = Array.isArray(endKf.value) ? endKf.value[0] : endKf.value;
            actualMiddleValue = startValue + (endValue - startValue) * normalizedMiddleValue;
        }
        
        // 中間キーフレームが作成されるので、区間別の差分を計算
        const middleKf = {
            time: actualMiddleTime,
            value: actualMiddleValue
        };
        
        // 区間別の差分を計算
        const segment1Diff = calculateSegmentDifferences(startKf, middleKf);  // KF0 → KF1
        const segment2Diff = calculateSegmentDifferences(middleKf, endKf);    // KF1 → KF2
        
        console.log('Segment differences for 3-point to 2-point:', {
            segment1: segment1Diff,
            segment2: segment2Diff
        });
        
        // 3点モードは0-1正規化空間なので、speed値をそのまま使用
        const segment1Easing = {
            outTemporal: {
                influence: graphData.keyframes[0].easing?.outTemporal?.influence || 33.33,
                speed: graphData.keyframes[0].easing?.outTemporal?.speed || 0
            },
            inTemporal: {
                influence: graphData.keyframes[1].easing?.inTemporal?.influence || 33.33,
                speed: graphData.keyframes[1].easing?.inTemporal?.speed || 0
            }
        };
        
        const segment2Easing = {
            outTemporal: {
                influence: graphData.keyframes[1].easing?.outTemporal?.influence || 33.33,
                speed: graphData.keyframes[1].easing?.outTemporal?.speed || 0
            },
            inTemporal: {
                influence: graphData.keyframes[2].easing?.inTemporal?.influence || 33.33,
                speed: graphData.keyframes[2].easing?.inTemporal?.speed || 0
            }
        };
        
        console.log('Normalized easing settings:', {
            segment1: segment1Easing,
            segment2: segment2Easing
        });
        
        // ログ出力用の全体的な差分計算（参考値として）
        const overallValueDiff = isPositionProperty(startKf) 
            ? (Array.isArray(startKf.value) && Array.isArray(endKf.value)
                ? calculateMagnitude(endKf.value.map((val, i) => val - startKf.value[i]))
                : Math.abs(endKf.value - startKf.value))
            : ((Array.isArray(endKf.value) ? endKf.value[0] : endKf.value) - 
               (Array.isArray(startKf.value) ? startKf.value[0] : startKf.value));
        const overallTimeDiff = endKf.time - startKf.time;
        
        console.log('Overall reference values:', {
            overallValueDiff,
            overallTimeDiff,
            segment1ValueDiff: segment1Diff.valueDiff,
            segment1TimeDiff: segment1Diff.timeDiff,
            segment2ValueDiff: segment2Diff.valueDiff,
            segment2TimeDiff: segment2Diff.timeDiff
        });
        
        const easingSettings = {
            segment1: segment1Easing,
            segment2: segment2Easing,
            minValue: 0,           // グラフの最小値（正規化空間なので0）
            maxValue: 1,           // グラフの最大値（正規化空間なので1）
            value2: normalizedMiddleValue  // グラフの中点値（正規化済み）
        };
        
        updateOutput(`=== SPEED値の変化 ===`);
        updateOutput(`適用前のspeed (グラフから): ${graphData.keyframes[0].easing?.outTemporal?.speed || 0}`);
        updateOutput(`適用するspeed: ${segment1Easing.outTemporal.speed.toFixed(6)}`);
        updateOutput(``);
        updateOutput(`詳細:`);
        updateOutput(`  KF0→KF1 out: ${graphData.keyframes[0].easing?.outTemporal?.speed || 0} → ${segment1Easing.outTemporal.speed.toFixed(3)}`);
        updateOutput(`  KF0→KF1 in:  ${graphData.keyframes[1].easing?.inTemporal?.speed || 0} → ${segment1Easing.inTemporal.speed.toFixed(3)}`);
        updateOutput(`  KF1→KF2 out: ${graphData.keyframes[1].easing?.outTemporal?.speed || 0} → ${segment2Easing.outTemporal.speed.toFixed(3)}`);
        updateOutput(`  KF1→KF2 in:  ${graphData.keyframes[2].easing?.inTemporal?.speed || 0} → ${segment2Easing.inTemporal.speed.toFixed(3)}`);
        
        // ExtendScriptを実行して中点挿入とハンドル適用
        const scriptCommand = `aGraphApply3PointTo2Point(
            ${JSON.stringify(startKf)}, 
            ${JSON.stringify(endKf)}, 
            ${actualMiddleTime}, 
            ${JSON.stringify(actualMiddleValue)}, 
            ${JSON.stringify(easingSettings)}
        )`;
        
        console.log('Executing 3-point to 2-point script:', scriptCommand);
        
        // コールバック前に強制的にspeed情報を表示
        updateOutput(`=== SPEED値の変化 ===`);
        updateOutput(`適用前のspeed (グラフから): ${((graphData.keyframes[0].easing?.outTemporal?.speed || 0) / 100).toFixed(3)}`);
        updateOutput(`適用するspeed: ${(segment1Easing.outTemporal.speed / 100).toFixed(3)}`);
        updateOutput(``);
        updateOutput(`詳細:`);
        updateOutput(`  KF0→KF1 out: ${((graphData.keyframes[0].easing?.outTemporal?.speed || 0) / 100).toFixed(3)} → ${(segment1Easing.outTemporal.speed / 100).toFixed(3)}`);
        updateOutput(`  KF0→KF1 in:  ${((graphData.keyframes[1].easing?.inTemporal?.speed || 0) / 100).toFixed(3)} → ${(segment1Easing.inTemporal.speed / 100).toFixed(3)}`);
        updateOutput(`  KF1→KF2 out: ${((graphData.keyframes[1].easing?.outTemporal?.speed || 0) / 100).toFixed(3)} → ${(segment2Easing.outTemporal.speed / 100).toFixed(3)}`);
        updateOutput(`  KF1→KF2 in:  ${((graphData.keyframes[2].easing?.inTemporal?.speed || 0) / 100).toFixed(3)} → ${(segment2Easing.inTemporal.speed / 100).toFixed(3)}`);
        
        csInterface.evalScript(scriptCommand, function(result) {
            updateOutput('📥 ExtendScript callback received');
            console.log('3-point to 2-point apply result:', result);
            
            if (!result || result.trim() === '') {
                updateOutput('❌ Empty result from ExtendScript');
                return;
            }
            
            try {
                const data = JSON.parse(result);
                updateOutput(`✅ JSON parse successful`);
                updateOutput(`success: ${data.success}`);
                
                if (data.success) {
                    updateOutput(`✅ 3-point to 2-point apply completed`);
                    updateOutput(`Applied count: ${data.appliedCount}, Total keyframes: ${data.totalKeyframes}`);
                    
                    // デバッグ情報を全件表示
                    if (data.debug && data.debug.length > 0) {
                        updateOutput(`🔧 デバッグ情報 (全${data.debug.length}件):`);
                        
                        // 全てのデバッグ情報を表示
                        for (let i = 0; i < data.debug.length; i++) {
                            updateOutput(`  [${i}] ${data.debug[i]}`);
                        }
                    } else {
                        updateOutput('⚠️ No debug info in result');
                    }
                } else {
                    updateOutput(`❌ Apply failed: ${data.error || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('3-point to 2-point apply result parsing error:', error);
                updateOutput(`❌ Failed to parse apply result: ${error.message}`);
                updateOutput(`Raw result: ${result}`);
            }
        });
    }

    function apply2PointWithMiddleGeneration(selectedKeyframes, easingSettings) {
        console.log('Applying 2-point with middle generation mode:', selectedKeyframes);
        
        // 表示されているグラフのデータを確認
        if (!window.currentEasingData) {
            updateOutput('❌ No 3-point curve data available. Please analyze keyframes first.');
            return;
        }
        
        const legacyGraphData = window.currentEasingData;
        console.log('Using graph data for 2-point apply:', legacyGraphData);
        
        // キーフレームを時間順にソート
        const sortedKeyframes = [...selectedKeyframes].sort((a, b) => a.time - b.time);
        
        if (sortedKeyframes.length !== 2) {
            updateOutput(`❌ 2-Point mode requires exactly 2 keyframes. (Selected: ${sortedKeyframes.length})`);
            return;
        }
        
        const startKf = sortedKeyframes[0];
        const endKf = sortedKeyframes[1];
        
        // グラフの中点データから実際の中点位置を計算
        const editedMiddleTime = legacyGraphData.keyframes[1].time; // 0-1の範囲
        const editedMiddleValue = legacyGraphData.keyframes[1].value; // 編集された値
        
        // 実際の時間範囲で中点の時間を計算
        const actualMiddleTime = startKf.time + (endKf.time - startKf.time) * editedMiddleTime;
        
        // 実際の値範囲で中点の値を計算
        let actualMiddleValue;
        if (isPositionProperty(startKf)) {
            // 位置プロパティの場合、各軸ごとに補間
            if (Array.isArray(startKf.value) && Array.isArray(endKf.value)) {
                actualMiddleValue = [];
                const dimensions = Math.min(startKf.value.length, endKf.value.length);
                for (let d = 0; d < dimensions; d++) {
                    const startVal = startKf.value[d];
                    const endVal = endKf.value[d];
                    const normalizedValue = (editedMiddleValue - legacyGraphData.minValue) / (legacyGraphData.maxValue - legacyGraphData.minValue);
                    actualMiddleValue[d] = startVal + (endVal - startVal) * normalizedValue;
                }
            } else {
                // フォールバック：線形補間
                const startValue = Array.isArray(startKf.value) ? startKf.value[0] : startKf.value;
                const endValue = Array.isArray(endKf.value) ? endKf.value[0] : endKf.value;
                actualMiddleValue = startValue + (endValue - startValue) * editedMiddleTime;
            }
        } else {
            // 非位置プロパティ
            const startValue = Array.isArray(startKf.value) ? startKf.value[0] : startKf.value;
            const endValue = Array.isArray(endKf.value) ? endKf.value[0] : endKf.value;
            const valueRange = endValue - startValue;
            const normalizedValue = (editedMiddleValue - legacyGraphData.minValue) / (legacyGraphData.maxValue - legacyGraphData.minValue);
            actualMiddleValue = startValue + valueRange * normalizedValue;
        }
        
        console.log('Middle keyframe to create:', {
            time: actualMiddleTime,
            value: actualMiddleValue,
            graphData: { time: editedMiddleTime, value: editedMiddleValue }
        });
        
        // 中間キーフレームを生成
        const generatedMiddleKf = {
            time: actualMiddleTime,
            value: actualMiddleValue,
            propertyName: startKf.propertyName
        };
        
        // 3つのキーフレーム配列を作成
        const keyframes3Point = [startKf, generatedMiddleKf, endKf];
        
        // スケール計算は3点モードと同じ
        let actualValueDiff;
        if (isPositionProperty(startKf)) {
            if (Array.isArray(startKf.value) && Array.isArray(endKf.value)) {
                let diffVector = [];
                const dimensions = Math.min(startKf.value.length, endKf.value.length);
                for (let d = 0; d < dimensions; d++) {
                    diffVector.push(endKf.value[d] - startKf.value[d]);
                }
                actualValueDiff = calculateMagnitude(diffVector);
            } else {
                actualValueDiff = Math.abs(endKf.value - startKf.value);
            }
        } else {
            const startValue = Array.isArray(startKf.value) ? startKf.value[0] : startKf.value;
            const endValue = Array.isArray(endKf.value) ? endKf.value[0] : endKf.value;
            actualValueDiff = endValue - startValue;
        }
        
        const actualTimeDiff = endKf.time - startKf.time;
        // 区間別の差分を計算（2点→3点変換）
        const segment1Diff = calculateSegmentDifferences(startKf, generatedMiddleKf);  // KF0 → KF1
        const segment2Diff = calculateSegmentDifferences(generatedMiddleKf, endKf);    // KF1 → KF2
        
        console.log('Segment differences for 2-point with middle generation:', {
            segment1: segment1Diff,
            segment2: segment2Diff
        });
        
        // イージング設定を区間別に正規化
        const segment1EasingSettings = {
            outTemporal: null,
            inTemporal: null
        };
        
        const segment2EasingSettings = {
            outTemporal: null,
            inTemporal: null
        };
        
        if (legacyGraphData.keyframes && legacyGraphData.keyframes.length >= 3) {
            if (legacyGraphData.keyframes[0].easing?.outTemporal) {
                const originalSpeed = legacyGraphData.keyframes[0].easing.outTemporal.speed;
                const normalizedSpeed = normalizeSpeedForSegment(
                    originalSpeed,
                    segment1Diff.valueDiff,
                    segment1Diff.timeDiff
                );
                segment1EasingSettings.outTemporal = {
                    speed: normalizedSpeed,
                    influence: legacyGraphData.keyframes[0].easing.outTemporal.influence
                };
                console.log('2-point middle gen: KF0 outTemporal speed normalized:', originalSpeed, '->', normalizedSpeed);
            }
            if (legacyGraphData.keyframes[1].easing?.inTemporal) {
                const originalSpeed = legacyGraphData.keyframes[1].easing.inTemporal.speed;
                const normalizedSpeed = normalizeSpeedForSegment(
                    originalSpeed,
                    segment1Diff.valueDiff,
                    segment1Diff.timeDiff
                );
                segment1EasingSettings.inTemporal = {
                    speed: normalizedSpeed,
                    influence: legacyGraphData.keyframes[1].easing.inTemporal.influence
                };
                console.log('2-point middle gen: KF1 inTemporal speed normalized:', originalSpeed, '->', normalizedSpeed);
            }
            if (legacyGraphData.keyframes[1].easing?.outTemporal) {
                const originalSpeed = legacyGraphData.keyframes[1].easing.outTemporal.speed;
                const normalizedSpeed = normalizeSpeedForSegment(
                    originalSpeed,
                    segment2Diff.valueDiff,
                    segment2Diff.timeDiff
                );
                segment2EasingSettings.outTemporal = {
                    speed: normalizedSpeed,
                    influence: legacyGraphData.keyframes[1].easing.outTemporal.influence
                };
                console.log('2-point middle gen: KF1 outTemporal speed normalized:', originalSpeed, '->', normalizedSpeed);
            }
            if (legacyGraphData.keyframes[2].easing?.inTemporal) {
                const originalSpeed = legacyGraphData.keyframes[2].easing.inTemporal.speed;
                const normalizedSpeed = normalizeSpeedForSegment(
                    originalSpeed,
                    segment2Diff.valueDiff,
                    segment2Diff.timeDiff
                );
                segment2EasingSettings.inTemporal = {
                    speed: normalizedSpeed,
                    influence: legacyGraphData.keyframes[2].easing.inTemporal.influence
                };
                console.log('2-point middle gen: KF2 inTemporal speed normalized:', originalSpeed, '->', normalizedSpeed);
            }
        }
        
        // ExtendScriptに2点→3点変換を指示
        const apply2PointData = {
            originalKeyframes: sortedKeyframes, // 元の2点
            generatedMiddleKeyframe: generatedMiddleKf, // 生成する中点
            segment1Easing: segment1EasingSettings,
            segment2Easing: segment2EasingSettings
        };
        
        const dataJson = JSON.stringify(apply2PointData);
        const escapedJson = dataJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        
        csInterface.evalScript(`aGraphApply2PointWithMiddle("${escapedJson}")`, function(result) {
            console.log('2-Point with middle generation ExtendScript result:', result);
            
            try {
                const data = JSON.parse(result);
                if (data.error) {
                    updateOutput(`❌ 2-Point Middle Generation Error: ${data.error}`);
                    console.error('2-Point middle generation error:', data.error);
                } else if (data.success) {
                    updateOutput(`✅ 2-Point mode applied! Middle keyframe generated and selection preserved.`);
                    console.log('2-Point middle generation success:', data);
                } else {
                    updateOutput(`⚠️ 2-Point apply result unclear: ${JSON.stringify(data)}`);
                    console.warn('2-Point apply unclear result:', data);
                }
            } catch (error) {
                console.error('2-Point apply result parsing error:', error);
                updateOutput(`❌ Failed to parse 2-point apply result: ${error.message}`);
                updateOutput(`Raw result: ${result}`);
            }
        });
    }

    /**
            original: { time: middleKf.time, value: middleKf.value },
            edited: { time: editedMiddleTime, value: editedMiddleValue },
            actual: { time: actualMiddleTime, value: actualMiddleValue }
        });
        
        // 実際の値の変化量を計算（全体の変化量）
        let actualValueDiff;
        if (isPositionProperty(startKf)) {
            // 位置プロパティ：ベクトル距離
            if (Array.isArray(startKf.value) && Array.isArray(endKf.value)) {
                let diffVector = [];
                const dimensions = Math.min(startKf.value.length, endKf.value.length);
                for (let d = 0; d < dimensions; d++) {
                    diffVector.push(endKf.value[d] - startKf.value[d]);
                }
                actualValueDiff = calculateMagnitude(diffVector);
            } else {
                actualValueDiff = Math.abs(endKf.value - startKf.value);
            }
        } else {
            // 非位置プロパティ：単次元値の差
            const startValue = Array.isArray(startKf.value) ? startKf.value[0] : startKf.value;
            const endValue = Array.isArray(endKf.value) ? endKf.value[0] : endKf.value;
            actualValueDiff = endValue - startValue;
        }
        
        const actualTimeDiff = endKf.time - startKf.time;
        
        // グラフで分析された変化量との倍率を計算
        const graphValueDiff = graphData.valueDiff || 1; // 分析時の値変化量
        const graphTimeDiff = graphData.timeDiff || 1;   // 分析時の時間変化量
        
        const valueScaleFactor = actualValueDiff / graphValueDiff;
        const timeScaleFactor = actualTimeDiff / graphTimeDiff;
        
        console.log('Scale factors:', {
            valueScale: valueScaleFactor,
            timeScale: timeScaleFactor,
            actualValueDiff: actualValueDiff,
            actualTimeDiff: actualTimeDiff,
            graphValueDiff: graphValueDiff,
            graphTimeDiff: graphTimeDiff
        });
        
        // グラフで表示されたイージング設定を実際の値の倍率に応じてスケール
        // 3点モードでは各区間に異なる設定を適用
        const segment1EasingSettings = {
            outTemporal: null, // KF0 → KF1 の出力ハンドル
            inTemporal: null   // KF0 → KF1 の入力ハンドル
        };
        
        const segment2EasingSettings = {
            outTemporal: null, // KF1 → KF2 の出力ハンドル  
            inTemporal: null   // KF1 → KF2 の入力ハンドル
        };
        
        // グラフデータから各キーフレームのイージング設定を取得
        if (graphData.keyframes && graphData.keyframes.length >= 3) {
            // 第1区間 (KF0 → KF1)
            if (graphData.keyframes[0].easing?.outTemporal) {
                segment1EasingSettings.outTemporal = {
                    speed: graphData.keyframes[0].easing.outTemporal.speed * valueScaleFactor / timeScaleFactor,
                    influence: graphData.keyframes[0].easing.outTemporal.influence
                };
            }
            if (graphData.keyframes[1].easing?.inTemporal) {
                segment1EasingSettings.inTemporal = {
                    speed: graphData.keyframes[1].easing.inTemporal.speed * valueScaleFactor / timeScaleFactor,
                    influence: graphData.keyframes[1].easing.inTemporal.influence
                };
            }
            
            // 第2区間 (KF1 → KF2)
            if (graphData.keyframes[1].easing?.outTemporal) {
                segment2EasingSettings.outTemporal = {
                    speed: graphData.keyframes[1].easing.outTemporal.speed * valueScaleFactor / timeScaleFactor,
                    influence: graphData.keyframes[1].easing.outTemporal.influence
                };
            }
            if (graphData.keyframes[2].easing?.inTemporal) {
                segment2EasingSettings.inTemporal = {
                    speed: graphData.keyframes[2].easing.inTemporal.speed * valueScaleFactor / timeScaleFactor,
                    influence: graphData.keyframes[2].easing.inTemporal.influence
                };
            }
        }
        
        console.log('Segment easing settings:', {
            segment1: segment1EasingSettings,
            segment2: segment2EasingSettings,
            scaleFactor: valueScaleFactor / timeScaleFactor
        });
        
        // ExtendScriptに3点適用を指示
        const apply3PointData = {
            keyframes: [startKf, updatedMiddleKf, endKf], // 更新された中間キーフレームを含む3つのキーフレーム
            segment1Easing: segment1EasingSettings, // 第1区間のイージング
            segment2Easing: segment2EasingSettings, // 第2区間のイージング
            scaleInfo: {
                valueScale: valueScaleFactor,
                timeScale: timeScaleFactor,
                actualValueDiff: actualValueDiff,
                actualTimeDiff: actualTimeDiff
            }
        };
        
        const dataJson = JSON.stringify(apply3PointData);
        const escapedJson = dataJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        
        csInterface.evalScript(`aGraphApply3PointMode("${escapedJson}")`, function(result) {
            console.log('3-Point apply ExtendScript result:', result);
            
            try {
                const data = JSON.parse(result);
                if (data.error) {
                    updateOutput(`❌ 3-Point Apply Error: ${data.error}`);
                    console.error('3-Point apply error:', data.error);
                } else if (data.success) {
                    const selectionInfo = data.selectionRestored ? "✅ Selection maintained" : "⚠️ Selection may be lost";
                    updateOutput(`✅ 3-Point mode applied! Middle keyframe position updated. ${selectionInfo}`);
                    console.log('3-Point apply success:', data);
                } else {
                    updateOutput(`⚠️ 3-Point apply result unclear: ${JSON.stringify(data)}`);
                    console.warn('3-Point apply unclear result:', data);
                }
            } catch (error) {
                console.error('3-Point apply result parsing error:', error);
                updateOutput(`❌ Failed to parse 3-point apply result: ${error.message}`);
                updateOutput(`Raw result: ${result}`);
            }
        });
    }

    /**
     * Handle test influence range button click
     */
    /**
     * Handle fit graph button click
     */
    function handleFitGraphClick() {
        if (!graphData || !graphData.keyframes || graphData.keyframes.length < 2) {
            updateOutput('⚠️ グラフデータがありません。まずAnalyzeを実行してください。');
            return;
        }
        
        graphScale = 0.9;
        updateOutput('📐 グラフ表示を調整中...');
        
        // ハンドル編集済みの場合はredrawを使用（ハンドル位置を保持）
        if (nPointHandleEditingInitialized) {
            redrawNPointCurve();
        } else {
            createEasingVisualization(graphData.keyframes);
        }
        
        updateOutput('✅ グラフ表示を調整しました');
    }
    
    /**
     * Handle scale up button click
     */
    function handleScaleUpClick() {
        if (!graphData || !graphData.keyframes || graphData.keyframes.length < 2) {
            updateOutput('⚠️ グラフデータがありません。まずAnalyzeを実行してください。');
            return;
        }
        
        graphScale = Math.min(1.5, graphScale + 0.1);
        updateOutput(`📈 Scale Up: ${(graphScale * 100).toFixed(0)}%`);
        
        // ハンドル編集済みの場合はredrawを使用（ハンドル位置を保持）
        if (nPointHandleEditingInitialized) {
            redrawNPointCurve();
        } else {
            createEasingVisualization(graphData.keyframes);
        }
    }
    
    /**
     * Handle scale down button click
     */
    function handleScaleDownClick() {
        if (!graphData || !graphData.keyframes || graphData.keyframes.length < 2) {
            updateOutput('⚠️ グラフデータがありません。まずAnalyzeを実行してください。');
            return;
        }
        
        graphScale = Math.max(0.3, graphScale - 0.1);
        updateOutput(`📉 Scale Down: ${(graphScale * 100).toFixed(0)}%`);
        
        // ハンドル編集済みの場合はredrawを使用（ハンドル位置を保持）
        if (nPointHandleEditingInitialized) {
            redrawNPointCurve();
        } else {
            createEasingVisualization(graphData.keyframes);
        }
    }

    /**
     * Handle test influence range button click
     */
    /**
     * After Effectsとの接続確認
     */
    function checkAfterEffectsConnection() {
        try {
            const hostEnv = csInterface.getHostEnvironment();
            console.log('AGraph Extension: ホスト環境情報:', hostEnv);
            
            if (hostEnv.appName && hostEnv.appName.indexOf('After Effects') !== -1) {
                updateOutput(`Connected to ${hostEnv.appName} (${hostEnv.appVersion}).`);
            } else {
                updateOutput('Warning: Running on non-After Effects application.');
            }
        } catch (error) {
            console.error('AGraph Extension: Failed to get host environment:', error);
            updateOutput('Error: Problem connecting to host application.');
        }
    }

    /**
     * Adjust window size
     */
    function adjustWindowSize() {
        try {
            // Set to default size
            csInterface.resizeContent(300, 400);
        } catch (error) {
            console.warn('AGraph Extension: Failed to adjust window size:', error);
        }
    }

    /**
     * 初期カーブの設定
     */
    function setupInitialCurve() {
        let initialKeyframes;
        
        if (currentMode === 3) {
            // 3点モードの初期カーブ（視覚的にわかりやすいカーブ）
            initialKeyframes = [
                {
                    time: 0,
                    value: 0,
                    propertyName: 'Initial',
                    easing: {
                        outTemporal: {
                            speed: 0,
                            influence: 77.5
                        }
                    }
                },
                {
                    time: 0.5,
                    value: 50,  // 中間値を50に設定（0-100範囲で中間）
                    propertyName: 'Initial',
                    easing: {
                        inTemporal: {
                            speed: 300,
                            influence: 20
                        },
                        outTemporal: {
                            speed: 300,
                            influence: 20
                        }
                    }
                },
                {
                    time: 1,
                    value: 100,
                    propertyName: 'Initial',
                    easing: {
                        inTemporal: {
                            speed: 0,
                            influence: 77.5
                        }
                    }
                }
            ];
        } else {
            // 2点モードの初期カーブ
            initialKeyframes = [
                {
                    time: 0,
                    value: 0,
                    propertyName: 'Initial',
                    easing: {
                        outTemporal: {
                            speed: 0,
                            influence: 66.6
                        }
                    }
                },
                {
                    time: 1,
                    value: 100,
                    propertyName: 'Initial',
                    easing: {
                        inTemporal: {
                            speed: 0,
                            influence: 66.6
                        }
                    }
                }
            ];
        }
        
        // 【統一されたデータ構造を使用】
        const normalized = normalizeKeyframes(initialKeyframes);
        if (normalized) {
            graphData = normalized;
            syncLegacyData(); // 互換性レイヤーを同期
            keyframeData = { keyframes: initialKeyframes };
            createEasingVisualization(graphData.keyframes);
            
            // 初期表示後にFitを実行（正しい表示範囲で描画し直す）
            setTimeout(() => {
                if (graphData && graphData.keyframes) {
                    createEasingVisualization(graphData.keyframes);
                }
            }, 50);
        } else {
            // フォールバック: 旧形式
            keyframeData = { keyframes: initialKeyframes };
            createEasingVisualization(initialKeyframes);
        }
        
        // Applyボタンを確実に表示（遅延実行で確実に）
        setTimeout(() => {
            const applyButton = document.getElementById('applyButton');
            if (applyButton) {
                applyButton.style.display = 'inline-block';
                console.log('Apply button made visible in setupInitialCurve (delayed)');
            } else {
                console.error('Apply button not found in setupInitialCurve');
            }
        }, 50);
        
        console.log(`Initial ${currentMode}-point curve setup completed`);
        
        // デバッグ: 初期状態の編集可能性を確認
        setTimeout(() => {
            const hasGraphData = graphData && graphData.keyframes && graphData.keyframes.length > 0;
            const hasHandles = !!window.currentHandles;
            const has3PointHandles = !!window.current3PointHandles;
            const debugInitialState = `初期状態: graphData=${hasGraphData}, currentHandles=${hasHandles}, current3PointHandles=${has3PointHandles}, mode=${currentMode}`;
            console.log('Initial Debug State:', debugInitialState);
        }, 500);
    }

    /**
     * Create normalized 3-point visualization
     */
    // ベクトルの大きさを計算するヘルパー関数
    function calculateMagnitude(vector) {
        let sum = 0;
        for (let i = 0; i < vector.length; i++) {
            sum += vector[i] * vector[i];
        }
        return Math.sqrt(sum);
    }

    /**
     * 位置プロパティかどうか判定するヘルパー関数
     */
    function isPositionProperty(keyframe) {
        return keyframe.propertyValueType === PropertyValueType.TwoD_SPATIAL || // 6147
               keyframe.propertyValueType === PropertyValueType.ThreeD_SPATIAL || // 6148
               keyframe.propertyValueType === 6413 || // Position特殊タイプ
               (keyframe.propertyName && keyframe.propertyName === "Position");
    }

    /**
     * プロパティタイプに応じた値変化量を計算
     */
    function calculateValueDifference(kf1, kf2) {
        if (isPositionProperty(kf1)) {
            // 位置プロパティ：ベクトルの大きさで計算
            if (Array.isArray(kf1.value) && Array.isArray(kf2.value)) {
                let diffVector = [];
                const dimensions = Math.min(kf1.value.length, kf2.value.length);
                for (let d = 0; d < dimensions; d++) {
                    diffVector.push(kf2.value[d] - kf1.value[d]);
                }
                return calculateMagnitude(diffVector);
            } else {
                // 単次元の場合はそのまま
                return Math.abs(kf2.value - kf1.value);
            }
        } else {
            // 非位置プロパティ：X値（第1要素）または単次元値を使用
            const value1 = Array.isArray(kf1.value) ? kf1.value[0] : kf1.value;
            const value2 = Array.isArray(kf2.value) ? kf2.value[0] : kf2.value;
            return value2 - value1;
        }
    }

    function createNormalized3PointVisualization(keyframes) {
        console.log('Creating normalized 3-point visualization for keyframes:', keyframes);
        
        if (keyframes.length !== 3) {
            updateOutput(`3-Point mode requires exactly 3 keyframes. (Selected: ${keyframes.length})`);
            
            // デバッグ情報を表示
            const debugInfo = [
                `📊 DEBUG INFO:`,
                `Selected keyframes: ${keyframes.length}`,
                `Property type: ${keyframes[0]?.propertyValueType || 'unknown'}`,
                `Property name: ${keyframes[0]?.propertyName || 'unknown'}`,
                `Is position property: ${keyframes[0] ? isPositionProperty(keyframes[0]) : 'unknown'}`,
                `Keyframe times: ${keyframes.map(kf => kf?.time?.toFixed(3) || 'unknown').join(', ')}`,
                `Keyframe values: ${keyframes.map(kf => {
                    if (!kf?.value) return 'unknown';
                    if (Array.isArray(kf.value)) {
                        return `[${kf.value.map(v => v.toFixed(2)).join(', ')}]`;
                    }
                    return kf.value.toFixed(2);
                }).join(', ')}`
            ];
            updateOutput(debugInfo.join('<br>'));
            return;
        }
        
        // 【統一されたデータ構造を使用】
        const normalized = normalizeKeyframes(keyframes);
        if (!normalized) {
            updateOutput('❌ Failed to normalize keyframes');
            return;
        }
        
        // グローバルデータを更新
        graphData = normalized;
        
        // 互換性レイヤーを同期
        syncLegacyData();
        
        console.log('Normalized graph data:', graphData);
        
        // デバッグ情報をパネルに表示
        const norm = graphData.normalization;
        updateOutput(`Time: ${norm.startTime.toFixed(3)}s → ${norm.endTime.toFixed(3)}s (range: ${norm.timeRange.toFixed(3)}s)`);
        updateOutput(`Value: ${norm.startValue.toFixed(3)} → ${norm.endValue.toFixed(3)} (range: ${norm.valueRange.toFixed(3)})`);
        
        // 各キーフレームの正規化情報
        graphData.keyframes.forEach((kf, i) => {
            console.log(`KF${i}: time=${kf.time.toFixed(3)} (${kf.originalTime.toFixed(3)}s), value=${kf.value.toFixed(3)}`);
        });
        
        // 正規化されたデータでビジュアライゼーションを作成
        createEasingVisualization(graphData.keyframes);
    }
    
    /**
     * Normalize easing parameters for 3-point mode
     */
    function normalizeEasing(easing, valueRange, timeRange, keyframe) {
        if (!easing) return easing;
        
        const normalizedEasing = {};
        
        if (easing.inTemporal) {
            normalizedEasing.inTemporal = {
                speed: easing.inTemporal.speed,
                influence: easing.inTemporal.influence
            };
        }
        
        if (easing.outTemporal) {
            normalizedEasing.outTemporal = {
                speed: easing.outTemporal.speed,
                influence: easing.outTemporal.influence
            };
        }
        
        return normalizedEasing;
    }

    /**
     * Create easing visualization for selected keyframes
     */
    function createEasingVisualization(keyframes) {
        console.log('Creating easing visualization for keyframes:', keyframes);
        
        const canvas = document.getElementById('valueChart');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // 固定サイズで設定（CSSで管理）
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // CSSで設定されたサイズを取得
        const rect = canvas.getBoundingClientRect();
        const displayWidth = rect.width || 160;
        const displayHeight = rect.height || 160;
        
        console.log('[Canvas Size] rect.width:', rect.width, 'rect.height:', rect.height, 'using:', displayWidth, 'x', displayHeight);
        updateOutput(`🖼️ Canvas: ${displayWidth.toFixed(0)}x${displayHeight.toFixed(0)}px`);
        
        // Canvas内部解像度を設定（高解像度対応）
        canvas.width = displayWidth * devicePixelRatio;
        canvas.height = displayHeight * devicePixelRatio;
        
        // コンテキストをスケール（setTransformで累積ではなく置き換え）
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        
        // 描画品質を向上
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const width = displayWidth;
        const height = displayHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, width, height);
        
        if (keyframes.length === 0) {
            drawNoKeyframesMessage(ctx, width, height);
            return;
        }
        
        if (keyframes.length === 1) {
            drawSingleKeyframeEasing(ctx, keyframes[0], width, height);
            return;
        }
        
        // 【Phase 3: N点対応の汎用グラフ描画】2点以上すべて統一
        if (keyframes.length >= 2) {
            drawNPointEasingCurve(ctx, keyframes, width, height);
            // ハンドル編集を初期化（グラフ描画後に1回だけ実行）
            if (!nPointHandleEditingInitialized) {
                initializeNPointHandleEditing();
                nPointHandleEditingInitialized = true;
            }
            return;
        }
    }
    
    /**
     * 2点間の3次エルミート補間から時間に対する加速度 d²y/dt² を計算
     * 
     * 3次エルミート補間: Y(t) = a*t³ + b*t² + c*t + d (0 ≤ t ≤ 1)
     * 境界条件:
     *   Y(0) = y0, Y(1) = y1
     *   Y'(0) = v0, Y'(1) = v1
     * 
     * 係数:
     *   d = y0
     *   c = v0
     *   b = 3(y1 - y0) - 2*v0 - v1
     *   a = 2(y0 - y1) + v0 + v1
     * 
     * 1階微分（速度）: Y'(t) = 3*a*t² + 2*b*t + c
     * 2階微分（加速度）: Y''(t) = 6*a*t + 2*b （必ず一次関数＝直線）
     * 
     * @param {number} y0 - 始点の値
     * @param {number} y1 - 終点の値
     * @param {number} v0 - 始点の速度（傾き）
     * @param {number} v1 - 終点の速度（傾き）
     * @param {number} t - パラメータ (0 ≤ t ≤ 1)
     * @returns {number} 時刻tにおける加速度 d²y/dt²
     */
    function hermiteAcceleration(y0, y1, v0, v1, t) {
        // 3次エルミート補間の係数
        const a = 2*(y0 - y1) + v0 + v1;
        const b = 3*(y1 - y0) - 2*v0 - v1;
        
        // 加速度 Y''(t) = 6*a*t + 2*b
        return 6*a*t + 2*b;
    }
    
    /**
     * 速度グラフを描画（ベジェ曲線の1階微分、正規化空間）
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} bezierSegments - ベジェセグメント配列 [{p0, p1, p2, p3, t0, t1}, ...]
     * @param {number} gridX - グリッド左端X座標
     * @param {number} gridY - グリッド上端Y座標
     * @param {number} curveWidth - グリッド幅
     * @param {number} curveHeight - グリッド高さ
     * @param {Array} keyframes - 元のキーフレーム情報（実時間・実値のスケール用）
     */
    function drawVelocityGraphFromBezier(ctx, bezierSegments, gridX, gridY, curveWidth, curveHeight, keyframes) {
        ctx.save();
        
        const samples = 100;
        let velocityValues = [];
        let debugInfo = '📈 速度計算:\n';
        
        for (let segIdx = 0; segIdx < bezierSegments.length; segIdx++) {
            const segment = bezierSegments[segIdx];
            const { p0, p1, p2, p3, t0, t1 } = segment;
            
            // keyframesから実際の時間と値を取得
            const kf0 = keyframes && keyframes[segIdx];
            const kf1 = keyframes && keyframes[segIdx + 1];
            
            if (!kf0 || !kf1) {
                console.log('[Velocity] Missing keyframe data for segment', segIdx);
                continue;
            }
            
            const actualTime0 = kf0.time;
            const actualTime1 = kf1.time;
            const actualTimeDiff = actualTime1 - actualTime0;
            
            if (Math.abs(actualTimeDiff) < 0.001) continue;
            
            const actualValue0 = kf0.value;
            const actualValue1 = kf1.value;
            const actualValueDiff = actualValue1 - actualValue0;
            
            // ベジェ曲線のコントロールポイント（正規化空間）
            const x0 = (p0.x - gridX) / curveWidth;
            const x1 = (p1.x - gridX) / curveWidth;
            const x2 = (p2.x - gridX) / curveWidth;
            const x3 = (p3.x - gridX) / curveWidth;
            
            const y0 = (gridY + curveHeight - p0.y) / curveHeight;
            const y1 = (gridY + curveHeight - p1.y) / curveHeight;
            const y2 = (gridY + curveHeight - p2.y) / curveHeight;
            const y3 = (gridY + curveHeight - p3.y) / curveHeight;
            
            if (segIdx === 0) {
                debugInfo += `\nセグメント${segIdx} (サンプル: 最初の3点のみ表示):\n`;
                debugInfo += `  実時間: ${actualTime0.toFixed(3)}→${actualTime1.toFixed(3)}, dt=${actualTimeDiff.toFixed(3)}\n`;
                debugInfo += `  実値: ${actualValue0.toFixed(3)}→${actualValue1.toFixed(3)}, dv=${actualValueDiff.toFixed(3)}\n`;
            }
            
            // ベジェパラメータ t での微分を計算
            // B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
            // B'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
            
            const segmentSamples = Math.ceil(samples * (t1 - t0));
            
            for (let j = 0; j <= segmentSamples; j++) {
                const t = j / segmentSamples;  // ベジェパラメータ [0,1]
                
                // Bézier曲線のX座標を計算（正確な時間位置）
                const oneMinusT = 1 - t;
                const X_t = oneMinusT * oneMinusT * oneMinusT * x0 +
                            3 * oneMinusT * oneMinusT * t * x1 +
                            3 * oneMinusT * t * t * x2 +
                            t * t * t * x3;
                
                // グローバルな正規化時間（全キーフレーム範囲での位置）
                const globalTime = X_t;  // すでに0-1に正規化されている
                
                // X方向の微分 dX/dt
                const dX_dt = 3 * oneMinusT * oneMinusT * (x1 - x0) +
                              6 * oneMinusT * t * (x2 - x1) +
                              3 * t * t * (x3 - x2);
                
                // Y方向の微分 dY/dt
                const dY_dt = 3 * oneMinusT * oneMinusT * (y1 - y0) +
                              6 * oneMinusT * t * (y2 - y1) +
                              3 * t * t * (y3 - y2);
                
                // 正規化空間での速度（0-1範囲）
                let velocity;
                if (Math.abs(dX_dt) < 0.0001) {
                    // X変化がほぼゼロ（垂直）の場合
                    velocity = 0;
                } else {
                    // 正規化空間での速度 dY/dX（スケール変換なし）
                    velocity = dY_dt / dX_dt;
                    
                    if (segIdx === 0 && j < 3) {
                        debugInfo += `  t=${t.toFixed(2)}: dY/dt=${dY_dt.toFixed(4)}, dX/dt=${dX_dt.toFixed(4)} → 速度=${velocity.toFixed(4)}\n`;
                    }
                }
                
                velocityValues.push({ time: globalTime, value: velocity });
            }
        }
        
        if (velocityValues.length === 0) {
            ctx.restore();
            return;
        }
        
        // 速度の範囲を計算
        let minVel = Math.min(...velocityValues.map(v => v.value));
        let maxVel = Math.max(...velocityValues.map(v => v.value));
        
        debugInfo += `\n速度範囲: min=${minVel.toFixed(4)}, max=${maxVel.toFixed(4)}\n`;
        if (showAcceleration) {
            // 加速度表示中は速度情報は表示しない（加速度情報が優先）
        } else {
            updateOutput(debugInfo);
        }
        
        // 0を中央に配置するため、範囲を対称にする
        const maxAbsVel = Math.max(Math.abs(minVel), Math.abs(maxVel));
        minVel = -maxAbsVel;
        maxVel = maxAbsVel;
        
        const velRange = maxVel - minVel;
        
        if (Math.abs(maxAbsVel) < 0.001) {
            // 速度が0に近い場合、0ライン上に描画
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const zeroY = gridY + curveHeight / 2;
            ctx.moveTo(gridX, zeroY);
            ctx.lineTo(gridX + curveWidth, zeroY);
            ctx.stroke();
            
            // 0ライン
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(gridX, zeroY);
            ctx.lineTo(gridX + curveWidth, zeroY);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // 速度曲線を描画
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            let first = true;
            for (const point of velocityValues) {
                const x = gridX + curveWidth * point.time;
                // 0中心でスケーリング
                const normalizedVel = (point.value - minVel) / velRange;
                const y = gridY + curveHeight * (1 - normalizedVel);
                
                if (first) {
                    ctx.moveTo(x, y);
                    first = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            
            // 0ラインを描画（破線）
            const zeroNormalized = (0 - minVel) / velRange;
            const zeroY = gridY + curveHeight * (1 - zeroNormalized);
            
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(gridX, zeroY);
            ctx.lineTo(gridX + curveWidth, zeroY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }
    
    /**
     * Bezier曲線上の特定のパラメータ t での速度を計算（速度グラフと同じ方法）
     */
    function calculateBezierVelocityAtT(segment, t, gridX, gridY, curveWidth, curveHeight, kf0, kf1) {
        const { p0, p1, p2, p3 } = segment;
        
        const actualTime0 = kf0.time;
        const actualTime1 = kf1.time;
        const actualTimeDiff = actualTime1 - actualTime0;
        
        if (Math.abs(actualTimeDiff) < 0.001) return 0;
        
        const actualValue0 = kf0.value;
        const actualValue1 = kf1.value;
        const actualValueDiff = actualValue1 - actualValue0;
        
        // 正規化空間のコントロールポイント
        const x0 = (p0.x - gridX) / curveWidth;
        const x1 = (p1.x - gridX) / curveWidth;
        const x2 = (p2.x - gridX) / curveWidth;
        const x3 = (p3.x - gridX) / curveWidth;
        
        const y0 = (gridY + curveHeight - p0.y) / curveHeight;
        const y1 = (gridY + curveHeight - p1.y) / curveHeight;
        const y2 = (gridY + curveHeight - p2.y) / curveHeight;
        const y3 = (gridY + curveHeight - p3.y) / curveHeight;
        
        // Bezier 1階微分
        const oneMinusT = 1 - t;
        const dX_dt = 3 * oneMinusT * oneMinusT * (x1 - x0) +
                      6 * oneMinusT * t * (x2 - x1) +
                      3 * t * t * (x3 - x2);
        
        const dY_dt = 3 * oneMinusT * oneMinusT * (y1 - y0) +
                      6 * oneMinusT * t * (y2 - y1) +
                      3 * t * t * (y3 - y2);
        
        if (Math.abs(dX_dt) < 0.0001) {
            return 0;
        }
        
        // dY/dX に実スケールを適用（速度グラフと全く同じ計算）
        const dY_dX = dY_dt / dX_dt;
        return dY_dX * (actualValueDiff / actualTimeDiff);
    }

    /**
     * Bezier曲線上の特定のパラメータ t での速度を計算（正規化空間での値）
     * Hermite補間の加速度計算用
     */
    function calculateBezierVelocityNormalized(segment, t, gridX, gridY, curveWidth, curveHeight) {
        const { p0, p1, p2, p3 } = segment;
        
        // 正規化空間のコントロールポイント
        const x0 = (p0.x - gridX) / curveWidth;
        const x1 = (p1.x - gridX) / curveWidth;
        const x2 = (p2.x - gridX) / curveWidth;
        const x3 = (p3.x - gridX) / curveWidth;
        
        const y0 = (gridY + curveHeight - p0.y) / curveHeight;
        const y1 = (gridY + curveHeight - p1.y) / curveHeight;
        const y2 = (gridY + curveHeight - p2.y) / curveHeight;
        const y3 = (gridY + curveHeight - p3.y) / curveHeight;
        
        // 🔍 デバッグ: 制御点を出力（t=0の時のみ）
        if (Math.abs(t) < 0.001) {
            updateOutput(`🔍 Bézier制御点（正規化空間）:\n  P0=(${x0.toFixed(4)}, ${y0.toFixed(4)})\n  P1=(${x1.toFixed(4)}, ${y1.toFixed(4)})\n  P2=(${x2.toFixed(4)}, ${y2.toFixed(4)})\n  P3=(${x3.toFixed(4)}, ${y3.toFixed(4)})`);
        }
        
        // Bezier 1階微分
        const oneMinusT = 1 - t;
        const dX_dt = 3 * oneMinusT * oneMinusT * (x1 - x0) +
                      6 * oneMinusT * t * (x2 - x1) +
                      3 * t * t * (x3 - x2);
        
        const dY_dt = 3 * oneMinusT * oneMinusT * (y1 - y0) +
                      6 * oneMinusT * t * (y2 - y1) +
                      3 * t * t * (y3 - y2);
        
        // 🔍 デバッグ: 微分値を出力
        if (Math.abs(t) < 0.001 || Math.abs(t - 1) < 0.001) {
            updateOutput(`🔍 τ=${t.toFixed(1)}での微分: dX/dτ=${dX_dt.toFixed(6)}, dY/dτ=${dY_dt.toFixed(6)}`);
        }
        
        if (Math.abs(dX_dt) < 0.0001) {
            return 0;
        }
        
        // 正規化空間での速度 dY/dX（スケール変換なし）
        const velocity = dY_dt / dX_dt;
        
        // 🔍 デバッグ: 速度を出力
        if (Math.abs(t) < 0.001 || Math.abs(t - 1) < 0.001) {
            updateOutput(`🔍 τ=${t.toFixed(1)}での速度: dY/dX=${velocity.toFixed(6)}`);
        }
        
        return velocity;
    }

    /**
     * 加速度グラフを描画（Hermite補間による時間tに対する加速度）
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} bezierSegments - ベジェセグメント配列
     * @param {number} gridX - グリッド左端X座標
     * @param {number} gridY - グリッド上端Y座標
     * @param {number} curveWidth - グリッド幅
     * @param {number} curveHeight - グリッド高さ
     * @param {Array} keyframes - 元のキーフレーム情報（時間・値・速度）
     */
    function drawAccelerationGraphFromBezier(ctx, bezierSegments, gridX, gridY, curveWidth, curveHeight, keyframes) {
        if (!keyframes || keyframes.length < 2) {
            return;
        }
        
        ctx.save();
        
        const samples = 100;
        let accelerationValues = [];
        let debugInfo = '📊 加速度計算 (Hermite補間):\n';
        
        // 各キーフレーム位置での速度とY座標をBezier曲線から計算
        const N = keyframes.length;
        const speeds = new Array(N);
        const yCoords = new Array(N);  // 正規化空間でのY座標を保存
        
        for (let i = 0; i < N; i++) {
            if (i === 0 && bezierSegments.length > 0) {
                // 始点: 最初のセグメントの t=0 での速度と座標
                const seg = bezierSegments[0];
                speeds[i] = calculateBezierVelocityNormalized(seg, 0, gridX, gridY, curveWidth, curveHeight);
                // Y座標を取得
                const { p0 } = seg;
                yCoords[i] = (gridY + curveHeight - p0.y) / curveHeight;
            } else if (i === N - 1 && bezierSegments.length > 0) {
                // 終点: 最後のセグメントの t=1 での速度と座標
                const seg = bezierSegments[bezierSegments.length - 1];
                speeds[i] = calculateBezierVelocityNormalized(seg, 1, gridX, gridY, curveWidth, curveHeight);
                // Y座標を取得
                const { p3 } = seg;
                yCoords[i] = (gridY + curveHeight - p3.y) / curveHeight;
            } else if (i > 0 && i < N - 1 && bezierSegments.length > i) {
                // 中間点: 右側のセグメント開始点の速度と座標を使用
                const segRight = bezierSegments[i];
                speeds[i] = calculateBezierVelocityNormalized(segRight, 0, gridX, gridY, curveWidth, curveHeight);
                // Y座標を取得（右側セグメントのP0）
                const { p0 } = segRight;
                yCoords[i] = (gridY + curveHeight - p0.y) / curveHeight;
                
                if (false) {  // デバッグ用（通常はオフ）
                    const segLeft = bezierSegments[i - 1];
                    const velLeft = calculateBezierVelocityNormalized(segLeft, 1, gridX, gridY, curveWidth, curveHeight);
                    const velRight = speeds[i];
                    debugInfo += `  KF${i}速度連続性: left=${velLeft.toFixed(6)}, right=${velRight.toFixed(6)}\n`;
                }
            } else {
                speeds[i] = 0;
                yCoords[i] = 0;
            }
        }
        
        // 各区間でHermite補間の加速度を計算
        for (let i = 0; i < N - 1; i++) {
            const t_i = keyframes[i].time;
            const t_i1 = keyframes[i + 1].time;
            
            // 事前に計算した正規化Y座標を使用
            const y_i = yCoords[i];
            const y_i1 = yCoords[i + 1];
            
            const Delta_i = t_i1 - t_i;
            
            if (Math.abs(Delta_i) < 0.001) {
                debugInfo += `セグメント${i}: スキップ (Δt=${Delta_i.toFixed(6)})\n`;
                continue;
            }
            
            const s_i = speeds[i];
            const s_i1 = speeds[i + 1];
            
            // Hermite接線ベクトル（正規化空間での値を使用）
            const m_0 = s_i;  // 正規化空間なのでΔt=1相当
            const m_1 = s_i1;
            
            debugInfo += `\nセグメント${i} (t=${t_i.toFixed(3)}→${t_i1.toFixed(3)}, Δt=${Delta_i.toFixed(3)}):\n`;
            debugInfo += `  値: y_i=${y_i.toFixed(3)}, y_i+1=${y_i1.toFixed(3)}\n`;
            debugInfo += `  速度: s_i=${s_i.toFixed(4)}, s_i+1=${s_i1.toFixed(4)}\n`;
            debugInfo += `  接線: m_0=${m_0.toFixed(4)}, m_1=${m_1.toFixed(4)}\n`;
            
            // 区間を正規化: τ ∈ [0, 1]
            // Hermite補間: y(τ) = (2τ³-3τ²+1)y_i + (-2τ³+3τ²)y_i+1 + (τ³-2τ²+τ)m_0 + (τ³-τ²)m_1
            // 
            // 一階微分: dy/dτ = (6τ²-6τ)(y_i-y_i+1) + (3τ²-4τ+1)m_0 + (3τ²-2τ)m_1
            // 二階微分: d²y/dτ² = (12τ-6)(y_i-y_i+1) + (6τ-4)m_0 + (6τ-2)m_1
            //
            // 時間に対する加速度: d²y/dt² = (1/Δt²) · d²y/dτ²
            
            const y_diff = y_i - y_i1;
            
            // 端点での加速度（デバッグ用）
            const a_left = (6 * y_diff + 2 * m_0 + 4 * m_1);  // τ=0（正規化空間）
            const a_right = (6 * (y_i1 - y_i) - 4 * m_0 - 2 * m_1);  // τ=1（正規化空間）
            
            debugInfo += `  端点加速度: a(t_i+)=${a_left.toFixed(4)}, a(t_i+1-)=${a_right.toFixed(4)}\n`;
            
            // サンプリング
            const segmentSamples = Math.max(10, Math.ceil(samples * Delta_i / (keyframes[N-1].time - keyframes[0].time)));
            
            for (let j = 0; j <= segmentSamples; j++) {
                const tau = j / segmentSamples;  // τ ∈ [0, 1]
                
                // 実時間を計算するため、このセグメントのBézier X座標を取得
                let t; // スコープを広げる
                
                // セグメントiに対応するbezierSegments[i]から制御点を取得
                if (bezierSegments[i]) {
                    const seg = bezierSegments[i];
                    const { p0, p1, p2, p3 } = seg;
                    
                    // 正規化空間のX座標
                    const seg_x0 = (p0.x - gridX) / curveWidth;
                    const seg_x1 = (p1.x - gridX) / curveWidth;
                    const seg_x2 = (p2.x - gridX) / curveWidth;
                    const seg_x3 = (p3.x - gridX) / curveWidth;
                    
                    // Bézier X座標を計算
                    const oneMinusTau = 1 - tau;
                    const X_tau = oneMinusTau * oneMinusTau * oneMinusTau * seg_x0 +
                                  3 * oneMinusTau * oneMinusTau * tau * seg_x1 +
                                  3 * oneMinusTau * tau * tau * seg_x2 +
                                  tau * tau * tau * seg_x3;
                    
                    // 全体の時間範囲での位置を計算
                    const totalTimeRange = keyframes[N-1].time - keyframes[0].time;
                    t = keyframes[0].time + X_tau * totalTimeRange;
                } else {
                    // フォールバック（bezierSegmentsが無い場合）
                    t = t_i + tau * Delta_i;
                }
                
                // d²y/dτ² = (12τ-6)(y_i-y_i+1) + (6τ-4)m_0 + (6τ-2)m_1
                const d2y_dtau2 = (12 * tau - 6) * y_diff +
                                  (6 * tau - 4) * m_0 +
                                  (6 * tau - 2) * m_1;
                
                // 正規化空間での加速度（Δτ=1なので割らない）
                const acceleration = d2y_dtau2;
                
                // 正規化時間（グラフ描画用）
                const normalizedTime = (t - keyframes[0].time) / (keyframes[N-1].time - keyframes[0].time);
                
                accelerationValues.push({ time: normalizedTime, value: acceleration });
            }
        }
        
        if (accelerationValues.length === 0) {
            ctx.restore();
            return;
        }
        
        // 加速度の範囲を計算
        let minAccel = Math.min(...accelerationValues.map(a => a.value));
        let maxAccel = Math.max(...accelerationValues.map(a => a.value));
        
        debugInfo += `\n範囲: min=${minAccel.toFixed(4)}, max=${maxAccel.toFixed(4)}\n`;
        updateOutput(debugInfo);
        
        // NaNチェック
        if (!isFinite(minAccel) || !isFinite(maxAccel)) {
            ctx.restore();
            return;
        }
        
        // 0を中央に配置するため、範囲を対称にする
        const maxAbsAccel = Math.max(Math.abs(minAccel), Math.abs(maxAccel));
        minAccel = -maxAbsAccel;
        maxAccel = maxAbsAccel;
        
        const accelRange = maxAccel - minAccel;
        
        // 全て0の場合（リニアなど）、0ライン上に描画
        if (Math.abs(maxAbsAccel) < 0.01) {
            ctx.strokeStyle = 'rgba(255, 99, 132, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const zeroY = gridY + curveHeight / 2;
            ctx.moveTo(gridX, zeroY);
            ctx.lineTo(gridX + curveWidth, zeroY);
            ctx.stroke();
            
            // 0ラインも描画
            ctx.strokeStyle = 'rgba(255, 99, 132, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(gridX, zeroY);
            ctx.lineTo(gridX + curveWidth, zeroY);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.restore();
            return;
        }
        
        // 加速度グラフを描画（半透明）
        ctx.strokeStyle = 'rgba(255, 99, 132, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        accelerationValues.forEach((point, idx) => {
            const x = gridX + point.time * curveWidth;
            // 加速度を0中心でスケーリング
            const normalizedAccel = (point.value - minAccel) / accelRange;
            const y = gridY + curveHeight - (normalizedAccel * curveHeight);
            
            if (idx === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // 0ラインを描画（破線）
        const zeroNormalized = (0 - minAccel) / accelRange;
        const zeroY = gridY + curveHeight - (zeroNormalized * curveHeight);
        
        ctx.strokeStyle = 'rgba(255, 99, 132, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(gridX, zeroY);
        ctx.lineTo(gridX + curveWidth, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
    }

    /**
     * 旧バージョン（互換性のため残す）
     */
    function drawAccelerationGraph(ctx, keyframes, gridX, gridY, curveWidth, curveHeight, displayMinValue, displayMaxValue, displayValueRange) {
        if (!keyframes || keyframes.length < 2) return;
        
        ctx.save();
        
        // 加速度の値を計算
        const samples = 100; // サンプル数
        let accelerationValues = [];
        
        for (let i = 0; i < keyframes.length - 1; i++) {
            const kf1 = keyframes[i];
            const kf2 = keyframes[i + 1];
            
            // ベジェ曲線の制御点を取得（実際に描画されている曲線から）
            let p0, p1, p2, p3;
            
            if (kf1.easing?.outTemporal && kf2.easing?.inTemporal) {
                // イージングがある場合
                p0 = kf1.value;
                p3 = kf2.value;
                const valueDiff = kf2.value - kf1.value;
                
                const outInf = Math.min(1, (kf1.easing.outTemporal.influence || 33.333) / 100);
                const inInf = Math.min(1, (kf2.easing.inTemporal.influence || 33.333) / 100);
                const outSlope = (kf1.easing.outTemporal.speed || 0) / 100;
                const inSlope = (kf2.easing.inTemporal.speed || 0) / 100;
                
                p1 = p0 + valueDiff * outSlope * outInf;
                p2 = p3 - valueDiff * inSlope * inInf;
            } else {
                // イージングがない場合（リニア）
                // 直線なので制御点は始点と終点上にある
                p0 = kf1.value;
                p3 = kf2.value;
                p1 = p0 + (p3 - p0) / 3; // 制御点を1/3の位置に
                p2 = p0 + (p3 - p0) * 2 / 3; // 制御点を2/3の位置に
            }
            
            // このセグメントのサンプリング
            const segmentSamples = Math.ceil(samples * (kf2.time - kf1.time));
            
            for (let j = 0; j <= segmentSamples; j++) {
                const t = j / segmentSamples;
                const globalTime = kf1.time + (kf2.time - kf1.time) * t;
                
                // ベジェ曲線の2階微分（加速度）
                // B''(t) = 6(1-t)(p2-2p1+p0) + 6t(p3-2p2+p1)
                const mt = 1 - t;
                const acceleration = 6 * mt * (p2 - 2*p1 + p0) + 6 * t * (p3 - 2*p2 + p1);
                
                accelerationValues.push({ time: globalTime, value: acceleration });
            }
        }
        
        if (accelerationValues.length === 0) {
            ctx.restore();
            return;
        }
        
        // 加速度の範囲を計算
        let minAccel = Math.min(...accelerationValues.map(a => a.value));
        let maxAccel = Math.max(...accelerationValues.map(a => a.value));
        
        // 0を含むように範囲を調整
        minAccel = Math.min(minAccel, 0);
        maxAccel = Math.max(maxAccel, 0);
        
        const accelRange = maxAccel - minAccel;
        if (accelRange === 0) {
            // 全て0の場合（リニアなど）、0ライン上に描画
            ctx.strokeStyle = 'rgba(255, 99, 132, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const zeroY = gridY + curveHeight / 2;
            ctx.moveTo(gridX, zeroY);
            ctx.lineTo(gridX + curveWidth, zeroY);
            ctx.stroke();
            
            // 0ラインも描画
            ctx.strokeStyle = 'rgba(255, 99, 132, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(gridX, zeroY);
            ctx.lineTo(gridX + curveWidth, zeroY);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.restore();
            return;
        }
        
        // 加速度グラフを描画（半透明）
        ctx.strokeStyle = 'rgba(255, 99, 132, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        accelerationValues.forEach((point, idx) => {
            const x = gridX + point.time * curveWidth;
            // 加速度を0中心でスケーリング
            const normalizedAccel = (point.value - minAccel) / accelRange;
            const y = gridY + curveHeight - (normalizedAccel * curveHeight);
            
            if (idx === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // 0ラインを描画（破線）
        const zeroNormalized = (0 - minAccel) / accelRange;
        const zeroY = gridY + curveHeight - (zeroNormalized * curveHeight);
        
        ctx.strokeStyle = 'rgba(255, 99, 132, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(gridX, zeroY);
        ctx.lineTo(gridX + curveWidth, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
    }

    /**
     * ベジェ曲線の実際の値の範囲を計算（時間と値の両方）
     * @param {Array} keyframes - キーフレーム配列
     * @returns {Object} { minValue, maxValue, minTime, maxTime }
     */
    function calculateBezierBounds(keyframes) {
        if (!keyframes || keyframes.length < 2) {
            return { minValue: 0, maxValue: 1, minTime: 0, maxTime: 1 };
        }
        
        let minValue = Infinity;
        let maxValue = -Infinity;
        let minTime = Infinity;
        let maxTime = -Infinity;
        
        // キーフレームの値をチェック
        keyframes.forEach(kf => {
            minValue = Math.min(minValue, kf.value);
            maxValue = Math.max(maxValue, kf.value);
            minTime = Math.min(minTime, kf.time);
            maxTime = Math.max(maxTime, kf.time);
        });
        
        // 各セグメントのベジェ曲線の極値を計算
        for (let i = 0; i < keyframes.length - 1; i++) {
            const kf1 = keyframes[i];
            const kf2 = keyframes[i + 1];
            
            if (!kf1.easing?.outTemporal || !kf2.easing?.inTemporal) {
                // イージングがない場合は線形補間なのでキーフレーム値のみ
                continue;
            }
            
            // ベジェ曲線のパラメータを計算
            const p0 = kf1.value;
            const p3 = kf2.value;
            
            const timeDiff = kf2.time - kf1.time;
            const valueDiff = kf2.value - kf1.value;
            
            const outInf = Math.min(1, (kf1.easing.outTemporal.influence || 33.333) / 100);
            const inInf = Math.min(1, (kf2.easing.inTemporal.influence || 33.333) / 100);
            const outSlope = (kf1.easing.outTemporal.speed || 0) / 100;
            const inSlope = (kf2.easing.inTemporal.speed || 0) / 100;
            
            // 制御点の値を計算（calculateSegmentControlPointsと同じロジック）
            // handleY = slope * handleX の関係を使用
            const outHandleY = outSlope * outInf;
            const inHandleY = inSlope * inInf;
            
            const p1 = p0 + valueDiff * outHandleY;
            const p2 = p3 - valueDiff * inHandleY;
            
            // ベジェ曲線の極値を求める（導関数 = 0 の点）
            // B(t) = (1-t)³p0 + 3(1-t)²t*p1 + 3(1-t)t²p2 + t³p3
            // B'(t) = 3(1-t)²(p1-p0) + 6(1-t)t(p2-p1) + 3t²(p3-p2) = 0
            const a = 3 * (p3 - 3*p2 + 3*p1 - p0);
            const b = 6 * (p2 - 2*p1 + p0);
            const c = 3 * (p1 - p0);
            
            // 2次方程式の解
            if (Math.abs(a) > 1e-10) {
                const discriminant = b*b - 4*a*c;
                if (discriminant >= 0) {
                    const sqrtD = Math.sqrt(discriminant);
                    const t1 = (-b + sqrtD) / (2*a);
                    const t2 = (-b - sqrtD) / (2*a);
                    
                    [t1, t2].forEach(t => {
                        if (t >= 0 && t <= 1) {
                            // t位置での値を計算
                            const mt = 1 - t;
                            const value = mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
                            minValue = Math.min(minValue, value);
                            maxValue = Math.max(maxValue, value);
                        }
                    });
                }
            } else if (Math.abs(b) > 1e-10) {
                // 1次方程式
                const t = -c / b;
                if (t >= 0 && t <= 1) {
                    const mt = 1 - t;
                    const value = mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
                    minValue = Math.min(minValue, value);
                    maxValue = Math.max(maxValue, value);
                }
            }
        }
        
        return { minValue, maxValue, minTime, maxTime };
    }
    
    /**
     * N点対応の汎用グラフ描画関数
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} keyframes - 正規化済みキーフレーム配列（graphData.keyframes）
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    function drawNPointEasingCurve(ctx, keyframes, width, height) {
        console.log(`[drawNPointEasingCurve] Drawing ${keyframes.length} keyframes`, {
            graphData: !!graphData,
            graphDataKeyframes: graphData?.keyframes?.length,
            normalization: graphData?.normalization,
            keyframes: keyframes.map(kf => ({ time: kf.time, value: kf.value }))
        });
        
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const curveWidth = Math.min(chartWidth * graphScale, chartHeight * graphScale);
        const curveHeight = curveWidth;
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        const gridX = centerX - curveWidth / 2;
        const gridY = centerY - curveHeight / 2;
        
        // ベジェ曲線の実際の範囲を計算
        const bounds = calculateBezierBounds(keyframes);
        
        // 表示範囲を決定（余白なし）
        const displayMinValue = bounds.minValue;
        const displayMaxValue = bounds.maxValue;
        const displayValueRange = displayMaxValue - displayMinValue;
        
        console.log(`[drawNPointEasingCurve] Bounds:`, bounds);
        console.log(`[drawNPointEasingCurve] Display range: ${displayMinValue} to ${displayMaxValue}`);
        console.log(`[drawNPointEasingCurve] Grid: x=${gridX}, y=${gridY}, w=${curveWidth}, h=${curveHeight}`);
        updateOutput(`📊 Display range: ${displayMinValue.toFixed(2)} to ${displayMaxValue.toFixed(2)}`);
        
        // グリッド描画（表示範囲を渡す）
        draw3PointGrid(ctx, gridX, gridY, curveWidth, curveHeight, displayMinValue, displayMaxValue);
        
        // キーフレーム座標を計算（表示範囲に基づく）
        const points = keyframes.map(kf => {
            const x = gridX + kf.time * curveWidth;
            // 値を表示範囲に合わせて変換
            const normalizedValue = (kf.value - displayMinValue) / displayValueRange;
            const y = gridY + curveHeight - (normalizedValue * curveHeight);
            console.log(`[drawNPointEasingCurve] KF time=${kf.time}, value=${kf.value}, normalizedValue=${normalizedValue} -> x=${x}, y=${y}`);
            // キーフレームにキャンバス座標を保存（ハンドル編集用）
            kf.canvasX = x;
            kf.canvasY = y;
            return { x, y, kf };
        });
        
        // 表示スケール情報を保存（ハンドル編集で使用）
        graphData.displayScale = {
            minValue: displayMinValue,
            maxValue: displayMaxValue,
            valueRange: displayValueRange
        };
        
        // ハンドルデータを初期化（初回のみ）または既存のハンドルを更新
        const isFirstInit = !graphData.handles || graphData.handles.length === 0;
        if (isFirstInit) {
            graphData.handles = [];
        }
        
        // 加速度グラフ用の制御点情報を保存
        const bezierSegments = [];
        
        // セグメントごとにベジェ曲線を描画
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const kf1 = keyframes[i];
            const kf2 = keyframes[i + 1];
            
            // このセグメントのコントロールポイントを計算（表示スケールを考慮）
            const { cp1, cp2 } = calculateSegmentControlPoints(
                p1.x, p1.y, p2.x, p2.y,
                kf1.easing?.outTemporal,
                kf2.easing?.inTemporal,
                graphData.normalization,
                kf1, kf2
            );
            
            // 加速度グラフ用に制御点を保存
            bezierSegments.push({
                p0: { x: p1.x, y: p1.y },
                p1: { x: cp1.x, y: cp1.y },
                p2: { x: cp2.x, y: cp2.y },
                p3: { x: p2.x, y: p2.y },
                t0: kf1.time,
                t1: kf2.time
            });
            
            // ハンドル情報を保存または更新（編集用）
            // 初回のみ作成、2回目以降はeasingパラメータから座標を再計算
            if (isFirstInit) {
                graphData.handles.push({
                    x: cp1.x,
                    y: cp1.y,
                    type: `handle${i}_out`,
                    segmentIndex: i,
                    keyframeIndex: i,
                    isOut: true,
                    p: p1,
                    baseX: p1.x,
                    baseY: p1.y
                });
                graphData.handles.push({
                    x: cp2.x,
                    y: cp2.y,
                    type: `handle${i}_in`,
                    segmentIndex: i,
                    keyframeIndex: i + 1,
                    isOut: false,
                    p: p2,
                    baseX: p2.x,
                    baseY: p2.y
                });
            } else {
                // 既存ハンドルの座標を更新
                const outHandle = graphData.handles.find(h => h.segmentIndex === i && h.isOut);
                const inHandle = graphData.handles.find(h => h.segmentIndex === i && !h.isOut);
                
                if (outHandle) {
                    outHandle.x = cp1.x;
                    outHandle.y = cp1.y;
                    outHandle.baseX = p1.x;
                    outHandle.baseY = p1.y;
                }
                if (inHandle) {
                    inHandle.x = cp2.x;
                    inHandle.y = cp2.y;
                    inHandle.baseX = p2.x;
                    inHandle.baseY = p2.y;
                }
            }
            
            // ベジェ曲線を描画（ハンドル位置を使用）
            ctx.strokeStyle = '#ffce56';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
            ctx.stroke();
            
            // ハンドルを描画
            ctx.strokeStyle = '#66ccff';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(cp1.x, cp1.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(p2.x, p2.y);
            ctx.lineTo(cp2.x, cp2.y);
            ctx.stroke();
            
            // ハンドルポイントを描画
            ctx.fillStyle = '#66ccff';
            
            ctx.beginPath();
            ctx.arc(cp1.x, cp1.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(cp2.x, cp2.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 速度グラフを描画（ONの場合、ベジェ曲線の背後に）
        if (showVelocity && bezierSegments.length > 0) {
            drawVelocityGraphFromBezier(ctx, bezierSegments, gridX, gridY, curveWidth, curveHeight, keyframes);
        }
        
        // 加速度グラフを描画（ONの場合、ベジェ曲線の上に）
        if (showAcceleration && bezierSegments.length > 0) {
            drawAccelerationGraphFromBezier(ctx, bezierSegments, gridX, gridY, curveWidth, curveHeight, keyframes);
        }
        
        // キーフレームポイントを描画（アウトラインなし）
        points.forEach((p, i) => {
            const color = i === 0 ? '#ff6384' : (i === points.length - 1 ? '#36a2eb' : '#ffce56');
            ctx.fillStyle = color;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // グローバルデータを保存（互換性のため）
        if (graphData && graphData.normalization) {
            window.currentEasingData = {
                keyframes: keyframes,
                minValue: 0,
                maxValue: 1,
                timeDiff: graphData.normalization.timeRange,
                valueDiff: graphData.normalization.valueRange,
                canvasInfo: {
                    gridX, gridY, curveWidth, curveHeight,
                    centerX, centerY
                }
            };
            
            // 3点グラフの場合、value2を初期化
            if (keyframes.length === 3) {
                window.currentEasingData.value2 = keyframes[1].value;
                console.log('Initialized value2 for 3-point graph:', keyframes[1].value);
            }
        }
        
        // キーフレーム数表示を削除（シンプルに）
    }
    

    
    /**
     * セグメントのコントロールポイントを計算
     * @param {number} x1, y1 - 開始点座標（正規化済み 0-1）
     * @param {number} x2, y2 - 終了点座標（正規化済み 0-1）
     * @param {Object} outEasing - 開始点のoutTemporal（AE speed値そのまま）
     * @param {Object} inEasing - 終了点のinTemporal（AE speed値そのまま）
     * @param {Object} normalization - 全体の正規化情報（始点→終点の値変化基準）
     * @param {Object} kf1 - セグメント開始キーフレーム（originalTime/originalValue含む）
     * @param {Object} kf2 - セグメント終了キーフレーム（originalTime/originalValue含む）
     */
    function calculateSegmentControlPoints(x1, y1, x2, y2, outEasing, inEasing, normalization, kf1, kf2) {
        const segmentWidth = x2 - x1;
        const segmentHeight = y2 - y1;
        
        // デフォルト: ハンドルなし（リニア）
        let cp1x = x1, cp1y = y1;
        let cp2x = x2, cp2y = y2;
        
        // outTemporal (開始点から出る)
        if (outEasing) {
            const influence = Math.min(1, outEasing.influence / 100);
            
            // speed値は既に正規化×100形式なので、100で割って正規化slope (0-1)に変換
            const normalizedSlope = outEasing.speed / 100;
            
            const handleX = influence;
            const handleY = normalizedSlope * handleX;
            
            // セグメントの幅と高さで変換
            cp1x = x1 + segmentWidth * handleX;
            cp1y = y1 + segmentHeight * handleY;
        }
        
        // inTemporal (終了点に入る)
        if (inEasing) {
            const influence = Math.min(1, inEasing.influence / 100);
            
            // speed値は既に正規化×100形式なので、100で割って正規化slope (0-1)に変換
            const normalizedSlope = inEasing.speed / 100;
            
            const handleX = influence;
            const handleY = normalizedSlope * handleX;
            
            // セグメントの幅と高さで変換
            cp2x = x2 - segmentWidth * handleX;
            cp2y = y2 - segmentHeight * handleY;
        }
        
        return {
            cp1: { x: cp1x, y: cp1y },
            cp2: { x: cp2x, y: cp2y }
        };
    }
    
    /**
     * ハンドルポイントを描画
     */
    function drawHandlePoint(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    /**
     * N点対応のハンドル編集を初期化
     */
    function initializeNPointHandleEditing() {
        const canvas = document.getElementById('valueChart');
        if (!canvas) {
            console.error('[N-point editing] Canvas not found');
            updateOutput('[N-point] キャンバスが見つかりません');
            return;
        }

        if (!graphData || !graphData.handles || graphData.handles.length === 0) {
            console.error('[N-point editing] No handles data available', {
                graphData: !!graphData,
                handles: graphData?.handles,
                handlesLength: graphData?.handles?.length
            });
            updateOutput('[N-point] ハンドルデータが利用できません');
            return;
        }

        console.log('[N-point editing] Initializing with', graphData.handles.length, 'handles');
        console.log('[N-point editing] Handles:', graphData.handles);
        updateOutput(`[N-point] ハンドル編集機能が有効になりました (${graphData.handles.length}ハンドル)`);

        // 既存のイベントリスナーを完全に削除
        const oldHandlers = [
            canvas._mouseDownHandler,
            canvas._mouseMoveHandler, 
            canvas._mouseUpHandler,
            canvas._mouseLeaveHandler
        ];
        
        if (canvas._mouseDownHandler) {
            canvas.removeEventListener('mousedown', canvas._mouseDownHandler, true);
            canvas.removeEventListener('mousedown', canvas._mouseDownHandler, false);
        }
        if (canvas._mouseMoveHandler) {
            canvas.removeEventListener('mousemove', canvas._mouseMoveHandler, true);
            canvas.removeEventListener('mousemove', canvas._mouseMoveHandler, false);
        }
        if (canvas._mouseUpHandler) {
            canvas.removeEventListener('mouseup', canvas._mouseUpHandler, true);
            canvas.removeEventListener('mouseup', canvas._mouseUpHandler, false);
        }
        if (canvas._mouseLeaveHandler) {
            canvas.removeEventListener('mouseleave', canvas._mouseLeaveHandler, true);
            canvas.removeEventListener('mouseleave', canvas._mouseLeaveHandler, false);
        }
        
        let dragOffset = { x: 0, y: 0 };

        // マウスイベントの処理（3点版と同じパターン）
        const mouseDownHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            console.log('[N-point editing] Mouse down at:', mouseX, mouseY, 'handles:', graphData.handles.length);

            // ダブルクリック検出（独自実装）
            const currentTime = Date.now();
            const timeSinceLastClick = currentTime - lastClickTime;
            const distanceFromLastClick = Math.sqrt(
                Math.pow(mouseX - lastClickX, 2) + 
                Math.pow(mouseY - lastClickY, 2)
            );
            
            const isDoubleClick = (
                timeSinceLastClick < DOUBLE_CLICK_THRESHOLD &&
                timeSinceLastClick > 50 && // 最小間隔
                distanceFromLastClick < DOUBLE_CLICK_DISTANCE
            );
            
            lastClickTime = currentTime;
            lastClickX = mouseX;
            lastClickY = mouseY;
            
            if (isDoubleClick) {
                console.log('[N-point] Double-click detected at:', mouseX, mouseY);
                
                // ハンドルをチェック
                for (const handle of graphData.handles) {
                    if (!handle) continue;
                    
                    const distance = Math.sqrt(
                        Math.pow(mouseX - handle.x, 2) + 
                        Math.pow(mouseY - handle.y, 2)
                    );
                    
                    if (distance <= 15) {
                        console.log('[N-point] Double-click on handle detected');
                        showNumericInputForHandle(handle);
                        return;
                    }
                }
                
                // 中点をチェック
                for (let i = 1; i < graphData.keyframes.length - 1; i++) {
                    const kf = graphData.keyframes[i];
                    const distance = Math.sqrt(
                        Math.pow(mouseX - kf.canvasX, 2) + 
                        Math.pow(mouseY - kf.canvasY, 2)
                    );
                    
                    if (distance <= 15) {
                        console.log(`[N-point] Double-click on middle point ${i} detected`);
                        showNumericInputForMidpoint(kf, i);
                        return;
                    }
                }
                
                console.log('[N-point] Double-click: no handle or midpoint found near position');
                return; // ダブルクリックの場合はドラッグを開始しない
            }

            // Shift+クリック: 中点の追加
            if (e.shiftKey && !e.altKey) {
                console.log('[N-point] Shift+Click detected - adding middle point at', mouseX, mouseY);
                addMiddlePointAtPosition(mouseX, mouseY);
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Alt+クリック: 中点の削除
            if (e.altKey && !e.shiftKey) {
                console.log('[N-point] Alt+Click detected - checking for middle point to delete');
                for (let i = 1; i < graphData.keyframes.length - 1; i++) {
                    const kf = graphData.keyframes[i];
                    const distance = Math.sqrt(
                        Math.pow(mouseX - kf.canvasX, 2) + 
                        Math.pow(mouseY - kf.canvasY, 2)
                    );
                    
                    if (distance <= 15) {
                        console.log(`[N-point] Deleting middle point ${i}`);
                        deleteMiddlePoint(i);
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                }
                console.log('[N-point] No middle point found at click position');
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // 中点（中間キーフレーム）のドラッグチェック（3点版と同じパターン）
            for (let i = 1; i < graphData.keyframes.length - 1; i++) {
                const kf = graphData.keyframes[i];
                const centerPointDistance = Math.sqrt(
                    Math.pow(mouseX - kf.canvasX, 2) + 
                    Math.pow(mouseY - kf.canvasY, 2)
                );
                
                if (centerPointDistance <= 15) {
                    isDragging = true;
                    dragHandle = { 
                        type: 'centerPoint', 
                        keyframeIndex: i,
                        x: kf.canvasX, 
                        y: kf.canvasY 
                    };
                    dragOffset.x = mouseX - kf.canvasX;
                    dragOffset.y = mouseY - kf.canvasY;
                    shiftConstraintDirection = null;
                    canvas.style.cursor = 'move';
                    console.log(`[N-point editing] Center point ${i} selected for value editing`);
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            // すべてのハンドルとの距離を確認
            const handleRadius = 15;

            for (const handle of graphData.handles) {
                if (!handle) continue;
                
                const distance = Math.sqrt(
                    Math.pow(mouseX - handle.x, 2) + 
                    Math.pow(mouseY - handle.y, 2)
                );
                
                console.log(`[N-point editing] Checking handle ${handle.type} at (${handle.x.toFixed(1)}, ${handle.y.toFixed(1)}), distance: ${distance.toFixed(1)}`);
                
                if (distance <= handleRadius) {
                    isDragging = true;
                    dragHandle = handle;
                    dragOffset.x = mouseX - handle.x;
                    dragOffset.y = mouseY - handle.y;
                    shiftConstraintDirection = null;
                    canvas.style.cursor = 'move';
                    const handleName = `handle${handle.segmentIndex}_${handle.isOut ? 'out' : 'in'}`;
                    console.log(`[N-point editing] ✅ Dragging: ${handleName} at (${handle.x.toFixed(1)}, ${handle.y.toFixed(1)})`);
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }
            
            console.log('[N-point editing] ❌ No handle found at click position');
        };

        const mouseMoveHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            isShiftPressed = e.shiftKey;
            isAltPressed = e.altKey;

            if (isDragging && dragHandle) {
                if (dragHandle.type === 'centerPoint') {
                    // 中点のドラッグ処理（3点版と同じパターン）
                    const kfIndex = dragHandle.keyframeIndex;
                    let newX = mouseX - dragOffset.x;
                    let newY = mouseY - dragOffset.y;
                    
                    // 中点の移動可能範囲を制限
                    const prevKF = graphData.keyframes[kfIndex - 1];
                    const nextKF = graphData.keyframes[kfIndex + 1];
                    const marginPixels = 5;
                    
                    if (prevKF && nextKF) {
                        newX = Math.max(prevKF.canvasX + marginPixels, Math.min(nextKF.canvasX - marginPixels, newX));
                    }
                    
                    // Shiftキーが押されている場合、X/Y軸固定
                    if (isShiftPressed) {
                        if (shiftConstraintDirection === null) {
                            const initialDeltaX = Math.abs(newX - dragHandle.x);
                            const initialDeltaY = Math.abs(newY - dragHandle.y);
                            if (initialDeltaX > 5 || initialDeltaY > 5) {
                                shiftConstraintDirection = initialDeltaX > initialDeltaY ? 'horizontal' : 'vertical';
                            }
                        }
                        if (shiftConstraintDirection === 'horizontal') {
                            newY = dragHandle.y;
                        } else if (shiftConstraintDirection === 'vertical') {
                            newX = dragHandle.x;
                        }
                    }
                    
                    // キーフレームの位置を更新
                    graphData.keyframes[kfIndex].canvasX = newX;
                    graphData.keyframes[kfIndex].canvasY = newY;
                    dragHandle.x = newX;
                    dragHandle.y = newY;
                    
                    // 時間と値を逆算してgraphDataに保存
                    const canvasInfo = window.currentEasingData.canvasInfo;
                    const normalizedTime = (newX - canvasInfo.gridX) / canvasInfo.curveWidth;
                    const normalizedValue = (canvasInfo.gridY + canvasInfo.curveHeight - newY) / canvasInfo.curveHeight;
                    
                    graphData.keyframes[kfIndex].time = Math.max(0, Math.min(1, normalizedTime));
                    graphData.keyframes[kfIndex].value = normalizedValue; // 0-1を超えることを許可
                    
                    // 3点グラフの場合、value2も更新
                    if (graphData.keyframes.length === 3 && kfIndex === 1) {
                        window.currentEasingData.value2 = normalizedValue;
                        console.log('Updated value2 for 3-point graph:', normalizedValue);
                    }
                    
                    console.log('Middle point moved to time:', normalizedTime, 'value:', normalizedValue);
                    
                    // 中点の移動に合わせてハンドルを追従（3点版と同じパターン）
                    updateHandlesFollowingCenterPointN(kfIndex);
                    
                    // イージングパラメータを再計算
                    updateNPointEasingFromHandles();
                    
                    redrawNPointCurve();
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    // ハンドルのドラッグ処理
                    console.log('[N-point editing] Mouse move while dragging handle');
                    
                    let newX = mouseX - dragOffset.x;
                    let newY = mouseY - dragOffset.y;

                    // X軸制約: セグメントの範囲内に制限
                    const segmentIndex = dragHandle.segmentIndex;
                    const startKeyframe = graphData.keyframes[segmentIndex];
                    const endKeyframe = graphData.keyframes[segmentIndex + 1];
                    
                    if (dragHandle.isOut) {
                        const maxX = endKeyframe.canvasX || dragHandle.baseX + 100;
                        newX = Math.max(dragHandle.baseX, Math.min(maxX, newX));
                    } else {
                        const minX = startKeyframe.canvasX || dragHandle.baseX - 100;
                        newX = Math.max(minX, Math.min(dragHandle.baseX, newX));
                    }

                    // 中点ハンドルの連動処理（3点版と完全に同じロジック）
                    // handle1_in (中点の入力) または handle2_out (中点の出力) のみ連動
                    // keyframeIndexで中点かどうかを判定
                    const isMiddlePointHandle = dragHandle.keyframeIndex > 0 && dragHandle.keyframeIndex < graphData.keyframes.length - 1;
                    const shouldLinkHandles = !isAltPressed && isMiddlePointHandle && (
                        (!dragHandle.isOut) || // 中点の入力ハンドル
                        (dragHandle.isOut)      // 中点の出力ハンドル
                    );
                    
                    if (shouldLinkHandles) {
                        // 反対側のハンドルを探す（3点版と完全に同じ）
                        const centerX = dragHandle.baseX;
                        const centerY = dragHandle.baseY;
                        
                        let otherHandle;
                        
                        // 中点に属する反対側のハンドルを探す
                        if (!dragHandle.isOut) {
                            // 入力ハンドル→同じ中点の出力ハンドルを探す
                            otherHandle = graphData.handles.find(h => 
                                h.keyframeIndex === dragHandle.keyframeIndex && h.isOut
                            );
                        } else {
                            // 出力ハンドル→同じ中点の入力ハンドルを探す
                            otherHandle = graphData.handles.find(h => 
                                h.keyframeIndex === dragHandle.keyframeIndex && !h.isOut
                            );
                        }
                        
                        // Shift制約を適用（ドラッグハンドルに）
                        if (isShiftPressed) {
                            const deltaX = newX - dragHandle.baseX;
                            const deltaY = newY - dragHandle.baseY;
                            const currentAngle = Math.atan2(deltaY, deltaX);
                            const snappedAngle = snapAngleToCardinal(currentAngle);
                            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                            newX = dragHandle.baseX + distance * Math.cos(snappedAngle);
                            newY = dragHandle.baseY + distance * Math.sin(snappedAngle);
                        }
                        
                        dragHandle.x = newX;
                        dragHandle.y = newY;
                        
                        // 反対側ハンドルの角度を連動（長さは保持）- 3点版と完全に同じ
                        if (otherHandle) {
                            // ドラッグしたハンドルの角度を計算
                            const dragDeltaX = dragHandle.x - centerX;
                            const dragDeltaY = dragHandle.y - centerY;
                            const dragAngle = Math.atan2(dragDeltaY, dragDeltaX);
                            
                            // 反対側ハンドルの現在の長さを保持
                            const otherDeltaX = otherHandle.x - centerX;
                            const otherDeltaY = otherHandle.y - centerY;
                            const otherDistance = Math.sqrt(otherDeltaX * otherDeltaX + otherDeltaY * otherDeltaY);
                            
                            // 反対側ハンドルを180度反対の角度で、元の長さを保持して配置
                            const otherAngle = dragAngle + Math.PI;
                            otherHandle.x = centerX + Math.cos(otherAngle) * otherDistance;
                            otherHandle.y = centerY + Math.sin(otherAngle) * otherDistance;
                            
                            console.log('[N-point] Updated linked handle angle, preserving distance:', otherDistance.toFixed(1));
                        }
                    } else {
                        // 連動なしの場合のShift制約適用
                        if (isShiftPressed) {
                            const deltaX = newX - dragHandle.baseX;
                            const deltaY = newY - dragHandle.baseY;
                            const currentAngle = Math.atan2(deltaY, deltaX);
                            const snappedAngle = snapAngleToCardinal(currentAngle);
                            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                            newX = dragHandle.baseX + distance * Math.cos(snappedAngle);
                            newY = dragHandle.baseY + distance * Math.sin(snappedAngle);
                        }
                        
                        dragHandle.x = newX;
                        dragHandle.y = newY;
                    }

                    console.log('[N-point editing] Dragging handle to', newX, newY);

                    // イージングパラメータを再計算
                    updateNPointEasingFromHandles();

                    // カーブを再描画
                    redrawNPointCurve();
                    
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else {
                // ホバー時のカーソル変更
                // 中点チェック
                for (let i = 1; i < graphData.keyframes.length - 1; i++) {
                    const kf = graphData.keyframes[i];
                    const centerPointDistance = Math.sqrt(
                        Math.pow(mouseX - kf.canvasX, 2) + 
                        Math.pow(mouseY - kf.canvasY, 2)
                    );
                    if (centerPointDistance <= 15) {
                        canvas.style.cursor = 'move';
                        return;
                    }
                }
                
                // ハンドルチェック
                let overHandle = false;
                for (const handle of graphData.handles) {
                    if (!handle) continue;
                    
                    const distance = Math.sqrt(
                        Math.pow(mouseX - handle.x, 2) + 
                        Math.pow(mouseY - handle.y, 2)
                    );
                    
                    if (distance <= 15) {
                        overHandle = true;
                        break;
                    }
                }
                
                canvas.style.cursor = overHandle ? 'pointer' : 'default';
            }
        };

        const mouseUpHandler = (e) => {
            if (isDragging && dragHandle) {
                console.log('[N-point editing] Handle drag completed, type:', dragHandle.type);
                
                // 中点ドラッグ終了時のinfluence自動調整（3点版と同じ）
                if (dragHandle.type === 'centerPoint') {
                    const kfIndex = dragHandle.keyframeIndex;
                    console.log('✅ Center point drag completed - adjusting influence values for keyframe', kfIndex);
                    updateOutput(`✨ 中点${kfIndex}ドラッグ終了 - influence自動調整実行中...`);
                    try {
                        adjustInfluenceForMiddlePointHandles(kfIndex);
                        console.log('✅ Influence adjustment completed successfully');
                    } catch (error) {
                        console.error('❌ Error during influence adjustment:', error);
                        updateOutput('❌ Influence調整エラー: ' + error.message);
                    }
                } else if (dragHandle.keyframeIndex !== undefined) {
                    // 中点のハンドルをドラッグした場合も調整
                    const kfIndex = dragHandle.keyframeIndex;
                    if (kfIndex > 0 && kfIndex < graphData.keyframes.length - 1) {
                        console.log('✅ Middle point handle drag completed - adjusting influence values for keyframe', kfIndex);
                        try {
                            adjustInfluenceForMiddlePointHandles(kfIndex);
                            console.log('✅ Influence adjustment completed successfully');
                        } catch (error) {
                            console.error('❌ Error during influence adjustment:', error);
                        }
                    }
                } else {
                    console.log('🔍 Not center point drag, type was:', dragHandle.type);
                }
                
                // ドラッグ終了後は通常の再描画のみ（自動スケール調整しない）
                redrawNPointCurve();
                
                // グラフデータを保存
                saveGraphDataToFile();
            }
            isDragging = false;
            dragHandle = null;
            isShiftPressed = false;
            isAltPressed = false;
            shiftConstraintDirection = null;
            canvas.style.cursor = 'default';
            e.preventDefault();
        };

        const mouseLeaveHandler = (e) => {
            if (isDragging && dragHandle) {
                console.log('[N-point editing] Handle drag interrupted by mouse leave');
            }
            isDragging = false;
            dragHandle = null;
            isShiftPressed = false;
            isAltPressed = false;
            shiftConstraintDirection = null;
            canvas.style.cursor = 'default';
        };

        // イベントリスナーを追加
        canvas.addEventListener('mousedown', mouseDownHandler, { capture: true });
        canvas.addEventListener('mousemove', mouseMoveHandler, { capture: true });
        canvas.addEventListener('mouseup', mouseUpHandler, { capture: true });
        canvas.addEventListener('mouseleave', mouseLeaveHandler);
        
        // イベントハンドラーを保存
        canvas._mouseDownHandler = mouseDownHandler;
        canvas._mouseMoveHandler = mouseMoveHandler;
        canvas._mouseUpHandler = mouseUpHandler;
        canvas._mouseLeaveHandler = mouseLeaveHandler;
        
        console.log(`✅ [N-point editing] Handle editing ready - ${graphData.handles.length} handles`);
    }
    
    /**
     * 中点の移動に合わせてハンドルを追従させる（3点版と同じパターン）
     */
    function updateHandlesFollowingCenterPointN(centerKeyframeIndex) {
        if (!graphData || !graphData.handles || !graphData.keyframes) {
            console.log('[N-point] Cannot update handles: missing data');
            return;
        }

        const kf = graphData.keyframes[centerKeyframeIndex];
        const centerX = kf.canvasX;
        const centerY = kf.canvasY;
        
        // 中点の左右ハンドルを追従させる
        for (const handle of graphData.handles) {
            // この中点に属するハンドルを更新
            if (handle.keyframeIndex === centerKeyframeIndex) {
                // 相対的な位置を保持
                const relativeX = handle.x - handle.baseX || 0;
                const relativeY = handle.y - handle.baseY || 0;
                
                handle.x = centerX + relativeX;
                handle.y = centerY + relativeY;
                handle.baseX = centerX;
                handle.baseY = centerY;
            }
        }
        
        console.log(`[N-point] Center point ${centerKeyframeIndex} handles updated to follow at:`, centerX, centerY);
    }

    /**
     * N点カーブを再描画（編集中）- 3点版のパターンで実装
     * @param {boolean} forceResize - 内部解像度を強制的に再設定するか
     * @param {boolean} skipHandleRecalc - ハンドル座標の再計算をスキップするか（V/Aトグル時など）
     */
    function redrawNPointCurve(forceResize = false, skipHandleRecalc = false) {
        const canvas = document.getElementById('valueChart');
        if (!canvas || !graphData) return;
        
        const ctx = canvas.getContext('2d');
        
        // デバイスピクセル比を取得
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // キャンバスサイズを取得（表示サイズ）
        const rect = canvas.getBoundingClientRect();
        const displayWidth = rect.width || 160;
        const displayHeight = rect.height || 160;
        
        // Canvas内部解像度は初回のみ設定、または強制リサイズ時のみ
        // Resizeバーのドラッグ後は内部解像度を変更せず、再描画のみ
        const isFirstDraw = canvas.width === 0;
        
        if (isFirstDraw || forceResize) {
            canvas.width = displayWidth * devicePixelRatio;
            canvas.height = displayHeight * devicePixelRatio;
            console.log('Canvas internal resolution set:', canvas.width, 'x', canvas.height);
        }
        
        // デバッグログ
        const debugInfo = `redrawNPointCurve:\ncanvas.width: ${canvas.width}\ncanvas.height: ${canvas.height}\nrect.width: ${rect.width}\nrect.height: ${rect.height}\ndisplayWidth: ${displayWidth}\ndisplayHeight: ${displayHeight}\ngraphScale: ${graphScale}\nisFirstDraw: ${isFirstDraw}\nforceResize: ${forceResize}`;
        console.log(debugInfo);
        window._lastRedrawInfo = debugInfo;
        
        // コンテキストをスケール（内部解像度に基づく）
        // canvas内部解像度 / 表示サイズ の比率でスケーリング
        const scaleX = canvas.width / displayWidth;
        const scaleY = canvas.height / displayHeight;
        ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
        
        // 描画品質を向上
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const width = displayWidth;
        const height = displayHeight;
        
        // 既存のChartを破棄してカスタム描画に切り替え
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, width, height);
        
        // 背景色設定
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, width, height);
        
        // 現在の表示スケールを使用してグリッド描画
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const curveWidth = Math.min(chartWidth * graphScale, chartHeight * graphScale);
        const curveHeight = curveWidth;
        const centerX = width / 2;
        const centerY = height / 2;
        const gridX = centerX - curveWidth / 2;
        const gridY = centerY - curveHeight / 2;
        
        // デバッグログに追加
        window._lastRedrawInfo += `\nwidth: ${width}, height: ${height}\npadding: ${padding}\nchartWidth: ${chartWidth}, chartHeight: ${chartHeight}\ncurveWidth: ${curveWidth}, curveHeight: ${curveHeight}\ncenterX: ${centerX}, centerY: ${centerY}\ngridX: ${gridX}, gridY: ${gridY}`;
        
        // displayScaleが設定されていればそれを使用、なければ0-1
        const minValue = graphData.displayScale ? graphData.displayScale.minValue : 0;
        const maxValue = graphData.displayScale ? graphData.displayScale.maxValue : 1;
        const valueRange = maxValue - minValue;
        
        draw3PointGrid(ctx, gridX, gridY, curveWidth, curveHeight, minValue, maxValue);
        
        // ★修正: canvasInfoを常に最新の座標系で更新
        if (window.currentEasingData) {
            window.currentEasingData.canvasInfo = {
                gridX: gridX,
                gridY: gridY,
                curveWidth: curveWidth,
                curveHeight: curveHeight
            };
        }
        
        // ★重要: キーフレーム座標を現在のdisplayサイズに基づいて再計算
        // Resize後は表示サイズが変わるため、座標を更新する必要がある
        // ただし、ドラッグ中は座標を更新しない（ドラッグ中のハンドルがリセットされるため）
        // skipHandleRecalc=trueの場合（V/Aトグル時など）は座標再計算もスキップ
        if (!isDragging && !skipHandleRecalc) {
            graphData.keyframes.forEach(kf => {
                const x = gridX + kf.time * curveWidth;
                const normalizedValue = (kf.value - minValue) / valueRange;
                const y = gridY + curveHeight - (normalizedValue * curveHeight);
                kf.canvasX = x;
                kf.canvasY = y;
            });
            
            // ★重要: ハンドル座標を更新
            // キーフレーム位置が変わった場合、ハンドル座標もeasingパラメータから再計算する必要がある
            // ただし、既存のeasingパラメータを使用することで、De Casteljauで設定された値を維持できる
            for (let i = 0; i < graphData.keyframes.length - 1; i++) {
                const kf1 = graphData.keyframes[i];
                const kf2 = graphData.keyframes[i + 1];
                
                // ハンドルを探す
                const outHandle = graphData.handles.find(h => h.segmentIndex === i && h.isOut);
                const inHandle = graphData.handles.find(h => h.segmentIndex === i && !h.isOut);
                
                // セグメント幅を計算
                const segmentWidth = kf2.canvasX - kf1.canvasX;
                const segmentHeight = kf2.canvasY - kf1.canvasY;
                
                // easingパラメータからハンドル座標を計算
                // これらのeasingパラメータは、De Casteljauで既に正しい値に更新されている
                const outInfluence = (kf1.easing?.outTemporal?.influence || 33.33) / 100;
                const outSpeed = kf1.easing?.outTemporal?.speed || 0;
                const outHandleX = kf1.canvasX + segmentWidth * outInfluence;
                // speedとinfluenceを使ってhandleYを計算（calculateSegmentControlPointsと同じ式）
                const outHandleY = kf1.canvasY + (segmentHeight * (outSpeed / 100) * outInfluence);
                
                const inInfluence = (kf2.easing?.inTemporal?.influence || 33.33) / 100;
                const inSpeed = kf2.easing?.inTemporal?.speed || 0;
                const inHandleX = kf2.canvasX - segmentWidth * inInfluence;
                // speedとinfluenceを使ってhandleYを計算（calculateSegmentControlPointsと同じ式）
                const inHandleY = kf2.canvasY - (segmentHeight * (inSpeed / 100) * inInfluence);
                
                if (outHandle) {
                    outHandle.x = outHandleX;
                    outHandle.y = outHandleY;
                    outHandle.baseX = kf1.canvasX;
                    outHandle.baseY = kf1.canvasY;
                }
                
                if (inHandle) {
                    inHandle.x = inHandleX;
                    inHandle.y = inHandleY;
                    inHandle.baseX = kf2.canvasX;
                    inHandle.baseY = kf2.canvasY;
                }
            }
        }
        
        // 加速度グラフ用の制御点情報を収集
        const bezierSegments = [];
        for (let i = 0; i < graphData.keyframes.length - 1; i++) {
            const kf1 = graphData.keyframes[i];
            const kf2 = graphData.keyframes[i + 1];
            
            const outHandle = graphData.handles.find(h => h.segmentIndex === i && h.isOut);
            const inHandle = graphData.handles.find(h => h.segmentIndex === i && !h.isOut);
            
            if (outHandle && inHandle) {
                bezierSegments.push({
                    p0: { x: kf1.canvasX, y: kf1.canvasY },
                    p1: { x: outHandle.x, y: outHandle.y },
                    p2: { x: inHandle.x, y: inHandle.y },
                    p3: { x: kf2.canvasX, y: kf2.canvasY },
                    t0: kf1.time,
                    t1: kf2.time
                });
            }
        }
        
        // セグメントごとにベジェ曲線を描画（3点版と同じスタイル）
        for (let i = 0; i < graphData.keyframes.length - 1; i++) {
            const kf1 = graphData.keyframes[i];
            const kf2 = graphData.keyframes[i + 1];
            
            const outHandle = graphData.handles.find(h => h.segmentIndex === i && h.isOut);
            const inHandle = graphData.handles.find(h => h.segmentIndex === i && !h.isOut);
            
            if (!outHandle || !inHandle) continue;
            
            // ベジェ曲線を描画
            ctx.strokeStyle = '#ffce56';
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(255, 206, 86, 0.3)';
            ctx.shadowBlur = 2;
            
            ctx.beginPath();
            ctx.moveTo(kf1.canvasX, kf1.canvasY);
            ctx.bezierCurveTo(outHandle.x, outHandle.y, inHandle.x, inHandle.y, kf2.canvasX, kf2.canvasY);
            ctx.stroke();
        }
        
        // Shadow reset
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // ハンドルラインを描画（実線）
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < graphData.keyframes.length - 1; i++) {
            const kf1 = graphData.keyframes[i];
            const kf2 = graphData.keyframes[i + 1];
            
            const outHandle = graphData.handles.find(h => h.segmentIndex === i && h.isOut);
            const inHandle = graphData.handles.find(h => h.segmentIndex === i && !h.isOut);
            
            if (!outHandle || !inHandle) continue;
            
            ctx.beginPath();
            ctx.moveTo(kf1.canvasX, kf1.canvasY);
            ctx.lineTo(outHandle.x, outHandle.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(kf2.canvasX, kf2.canvasY);
            ctx.lineTo(inHandle.x, inHandle.y);
            ctx.stroke();
        }
        
        // ハンドルポイントを描画
        ctx.fillStyle = '#66ccff';
        
        for (const handle of graphData.handles) {
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 速度グラフを描画（ONの場合、ベジェ曲線の背後に）
        if (showVelocity && bezierSegments.length > 0) {
            drawVelocityGraphFromBezier(ctx, bezierSegments, gridX, gridY, curveWidth, curveHeight, graphData.keyframes);
        }
        
        // 加速度グラフを描画（ONの場合、ベジェ曲線の上に）
        if (showAcceleration && bezierSegments.length > 0) {
            drawAccelerationGraphFromBezier(ctx, bezierSegments, gridX, gridY, curveWidth, curveHeight, graphData.keyframes);
        }
        
        // キーフレームポイントを描画（アウトラインなし）
        graphData.keyframes.forEach((kf, i) => {
            const color = kf.isStart ? '#ff6384' : (kf.isEnd ? '#36a2eb' : '#ffce56');
            ctx.fillStyle = color;
            
            ctx.beginPath();
            ctx.arc(kf.canvasX, kf.canvasY, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    /**
     * N点カーブのハンドル位置からイージングパラメータを逆算
     */
    function updateNPointEasingFromHandles() {
        if (!graphData || !graphData.handles || !graphData.keyframes) {
            console.log('[N-point editing] No graph data available for easing update');
            return;
        }
        
        console.log('[N-point] Updating easing from handles...');
        
        // 各セグメントごとにハンドルペアを処理
        const segments = graphData.keyframes.length - 1;
        
        for (let i = 0; i < segments; i++) {
            const kf1 = graphData.keyframes[i];
            const kf2 = graphData.keyframes[i + 1];
            
            // キャンバス座標を取得
            const startX = kf1.canvasX || 0;
            const startY = kf1.canvasY || 0;
            const endX = kf2.canvasX || 0;
            const endY = kf2.canvasY || 0;
            
            // このセグメントのハンドルを取得
            const outHandle = graphData.handles.find(h => h.segmentIndex === i && h.isOut);
            const inHandle = graphData.handles.find(h => h.segmentIndex === i && !h.isOut);
            
            if (!outHandle || !inHandle) {
                console.log(`[N-point] Skipping segment ${i}: missing handles`);
                continue;
            }
            
            // セグメント幅（時間軸、X方向）
            const segmentWidth = endX - startX;
            const segmentHeight = endY - startY;
            
            // ★重要: speedは0-100の範囲で正規化して保存
            
            // Out handleの処理
            const outDx = outHandle.x - startX;
            const outDy = outHandle.y - startY;
            const outInfluence = Math.max(0.1, Math.min(100, (outDx / segmentWidth) * 100));
            // speedをsegmentHeightとinfluenceで正規化（calculateSegmentControlPointsの逆演算）
            // handleY = (speed/100) * (influence/100) なので、speed = handleY / (influence/100) * 100
            const normalizedInfluence = outInfluence / 100;
            const outSpeed = (segmentHeight !== 0 && normalizedInfluence !== 0) 
                ? (outDy / segmentHeight / normalizedInfluence) * 100 
                : 0;
            
            if (!kf1.easing) kf1.easing = {};
            kf1.easing.outTemporal = { speed: outSpeed, influence: outInfluence };
            
            // In handleの処理
            const inDx = endX - inHandle.x;
            const inDy = endY - inHandle.y;
            const inInfluence = Math.max(0.1, Math.min(100, (inDx / segmentWidth) * 100));
            // speedをsegmentHeightとinfluenceで正規化（calculateSegmentControlPointsの逆演算）
            const normalizedInInfluence = inInfluence / 100;
            const inSpeed = (segmentHeight !== 0 && normalizedInInfluence !== 0) 
                ? (inDy / segmentHeight / normalizedInInfluence) * 100 
                : 0;
            
            if (!kf2.easing) kf2.easing = {};
            kf2.easing.inTemporal = { speed: inSpeed, influence: inInfluence };
            
            console.log(`[N-point] Segment ${i}:`,
                       'OUT influence=' + outInfluence.toFixed(1) + '% speed=' + outSpeed.toFixed(2),
                       'IN influence=' + inInfluence.toFixed(1) + '% speed=' + inSpeed.toFixed(2));
        }
        
        console.log('[N-point] ✅ Easing updated from handles for', segments, 'segments');
    }

    /**
     * 中点移動後の全ハンドルinfluence自動調整（3点版と完全に同じロジック）
     * - すべてのハンドル（始点・中点・終点）がセグメント範囲を超えた場合、
     *   influenceを100%に制限し、ハンドル座標も傾きを保ったまま制限内に調整する
     */
    function adjustInfluenceForMiddlePointHandles(keyframeIndex) {
        console.log('[N-point] adjustInfluenceForMiddlePointHandles called for keyframe', keyframeIndex);
        
        if (!graphData || !graphData.keyframes || !graphData.handles) {
            console.log('[N-point] Missing graphData');
            return;
        }

        let adjusted = false;
        let adjustedHandles = [];
        
        // すべてのセグメントをチェック（3点版と同じ）
        for (let i = 0; i < graphData.keyframes.length - 1; i++) {
            const kf1 = graphData.keyframes[i];
            const kf2 = graphData.keyframes[i + 1];
            
            // セグメント間の距離
            const segmentDist = Math.abs(kf2.canvasX - kf1.canvasX);
            
            // このセグメントの出力ハンドル（kf1から出る）
            const outHandle = graphData.handles.find(h => h.segmentIndex === i && h.isOut);
            if (outHandle) {
                const handleDist = Math.abs(outHandle.x - kf1.canvasX);
                if (handleDist > segmentDist && segmentDist > 0) {
                    // influence を 100% に制限
                    if (!kf1.easing) kf1.easing = {};
                    if (!kf1.easing.outTemporal) kf1.easing.outTemporal = { speed: 0, influence: 0 };
                    kf1.easing.outTemporal.influence = 100;
                    
                    // ハンドル座標を傾きを保ったまま制限内に調整
                    const baseX = kf1.canvasX;
                    const baseY = kf1.canvasY;
                    const originalAngle = Math.atan2(outHandle.y - baseY, outHandle.x - baseX);
                    
                    outHandle.x = baseX + segmentDist; // 右方向（次のキーフレームまで）
                    outHandle.y = baseY + segmentDist * Math.tan(originalAngle);
                    
                    adjusted = true;
                    adjustedHandles.push(`kf${i}_out`);
                    console.log(`[N-point] ✅ Adjusted OUT handle for keyframe ${i} to influence=100`);
                }
            }
            
            // このセグメントの入力ハンドル（kf2に入る）
            const inHandle = graphData.handles.find(h => h.segmentIndex === i && !h.isOut);
            if (inHandle) {
                const handleDist = Math.abs(inHandle.x - kf2.canvasX);
                if (handleDist > segmentDist && segmentDist > 0) {
                    // influence を 100% に制限
                    if (!kf2.easing) kf2.easing = {};
                    if (!kf2.easing.inTemporal) kf2.easing.inTemporal = { speed: 0, influence: 0 };
                    kf2.easing.inTemporal.influence = 100;
                    
                    // ハンドル座標を傾きを保ったまま制限内に調整
                    const baseX = kf2.canvasX;
                    const baseY = kf2.canvasY;
                    const originalAngle = Math.atan2(inHandle.y - baseY, inHandle.x - baseX);
                    
                    inHandle.x = baseX - segmentDist; // 左方向（前のキーフレームまで）
                    inHandle.y = baseY - segmentDist * Math.tan(originalAngle);
                    
                    adjusted = true;
                    adjustedHandles.push(`kf${i + 1}_in`);
                    console.log(`[N-point] ✅ Adjusted IN handle for keyframe ${i + 1} to influence=100`);
                }
            }
        }
        
        if (adjusted) {
            console.log('[N-point] ✅ Influence auto-adjustment completed. Adjusted:', adjustedHandles.join(', '));
            updateOutput(`✅ Influence調整: ${adjustedHandles.join(', ')}`);
            // カーブを再描画
            redrawNPointCurve();
        } else {
            console.log('[N-point] ℹ️ No adjustment needed - all handles within range');
        }
    }

    /**
     * 2点間の線形補間
     */
    function lerpPoint(p1, p2, t) {
        return {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
        };
    }

    /**
     * De Casteljauアルゴリズムでベジェ曲線を分割
     * @param {Object} p0 - 始点
     * @param {Object} p1 - 始点の制御点
     * @param {Object} p2 - 終点の制御点
     * @param {Object} p3 - 終点
     * @param {number} t - 分割位置 (0-1)
     * @returns {Object} - 左右のベジェ曲線情報
     */
    function splitBezierCurve(p0, p1, p2, p3, t) {
        // 1段階目の線形補間
        const q0 = lerpPoint(p0, p1, t);
        const q1 = lerpPoint(p1, p2, t);
        const q2 = lerpPoint(p2, p3, t);
        
        // 2段階目
        const r0 = lerpPoint(q0, q1, t);
        const r1 = lerpPoint(q1, q2, t);
        
        // 3段階目（分割点）
        const s = lerpPoint(r0, r1, t);
        
        console.log('[De Casteljau] Split at t=', t.toFixed(3));
        console.log('[De Casteljau] Original curve:', 
                    'p0:', p0.x.toFixed(1), p0.y.toFixed(1),
                    'p1:', p1.x.toFixed(1), p1.y.toFixed(1),
                    'p2:', p2.x.toFixed(1), p2.y.toFixed(1),
                    'p3:', p3.x.toFixed(1), p3.y.toFixed(1));
        console.log('[De Casteljau] Split point:', s.x.toFixed(1), s.y.toFixed(1));
        console.log('[De Casteljau] Left curve handles:', 
                    'p1:', q0.x.toFixed(1), q0.y.toFixed(1),
                    'p2:', r0.x.toFixed(1), r0.y.toFixed(1));
        console.log('[De Casteljau] Right curve handles:', 
                    'p1:', r1.x.toFixed(1), r1.y.toFixed(1),
                    'p2:', q2.x.toFixed(1), q2.y.toFixed(1));
        
        // 左側のベジェ曲線: p0 -> q0 -> r0 -> s
        // 右側のベジェ曲線: s -> r1 -> q2 -> p3
        return {
            splitPoint: s,
            left: { p0: p0, p1: q0, p2: r0, p3: s },
            right: { p0: s, p1: r1, p2: q2, p3: p3 }
        };
    }

    /**
     * 指定位置に中点を追加
     */
    function addMiddlePointAtPosition(mouseX, mouseY) {
        console.log('[N-point] addMiddlePointAtPosition called:', mouseX, mouseY);
        
        if (!graphData || !graphData.keyframes || graphData.keyframes.length < 2) {
            console.log('[N-point] Not enough keyframes:', graphData?.keyframes?.length);
            updateOutput('[N-point] 中点追加: キーフレームが不足しています');
            return;
        }

        console.log('[N-point] Current keyframes:', graphData.keyframes.length);

        // クリック位置がどのセグメント上にあるかを判定
        let targetSegmentIndex = -1;
        let insertPosition = -1;
        
        for (let i = 0; i < graphData.keyframes.length - 1; i++) {
            const kf1 = graphData.keyframes[i];
            const kf2 = graphData.keyframes[i + 1];
            
            console.log(`[N-point] Checking segment ${i}: kf1.canvasX=${kf1.canvasX}, kf2.canvasX=${kf2.canvasX}, mouseX=${mouseX}`);
            
            // X座標がセグメント範囲内かチェック
            if (mouseX >= kf1.canvasX && mouseX <= kf2.canvasX) {
                targetSegmentIndex = i;
                insertPosition = i + 1;
                console.log(`[N-point] Found target segment: ${i}`);
                break;
            }
        }

        if (targetSegmentIndex === -1) {
            console.log('[N-point] No segment found for mouseX:', mouseX);
            updateOutput('[N-point] 中点追加: セグメント上でクリックしてください');
            return;
        }

        const kf1 = graphData.keyframes[targetSegmentIndex];
        const kf2 = graphData.keyframes[targetSegmentIndex + 1];

        // 既存セグメントのハンドル位置を取得
        const outHandle = graphData.handles.find(h => h.segmentIndex === targetSegmentIndex && h.isOut);
        const inHandle = graphData.handles.find(h => h.segmentIndex === targetSegmentIndex && !h.isOut);
        
        if (!outHandle || !inHandle) {
            updateOutput('[N-point] 中点追加: ハンドル情報が見つかりません');
            return;
        }

        // 既存ベジェ曲線のパラメータ
        const p0 = { x: kf1.canvasX, y: kf1.canvasY };
        const p1 = { x: outHandle.x, y: outHandle.y };
        const p2 = { x: inHandle.x, y: inHandle.y };
        const p3 = { x: kf2.canvasX, y: kf2.canvasY };
        
        console.log('[N-point] Bezier curve points:', 
                    'p0:', p0.x.toFixed(1), p0.y.toFixed(1),
                    'p1:', p1.x.toFixed(1), p1.y.toFixed(1),
                    'p2:', p2.x.toFixed(1), p2.y.toFixed(1),
                    'p3:', p3.x.toFixed(1), p3.y.toFixed(1));
        
        const debugInfo1 = `p0:(${p0.x.toFixed(0)},${p0.y.toFixed(0)}) p1:(${p1.x.toFixed(0)},${p1.y.toFixed(0)}) p2:(${p2.x.toFixed(0)},${p2.y.toFixed(0)}) p3:(${p3.x.toFixed(0)},${p3.y.toFixed(0)})`;
        
        // mouseXに対応するt parameterをニュートン法で求める
        let t = (mouseX - p0.x) / (p3.x - p0.x); // 初期推定値
        for (let i = 0; i < 10; i++) {
            const oneMinusT = 1 - t;
            // X(t)を計算
            const xt = oneMinusT * oneMinusT * oneMinusT * p0.x +
                       3 * oneMinusT * oneMinusT * t * p1.x +
                       3 * oneMinusT * t * t * p2.x +
                       t * t * t * p3.x;
            
            // X'(t)を計算
            const dxdt = 3 * oneMinusT * oneMinusT * (p1.x - p0.x) +
                         6 * oneMinusT * t * (p2.x - p1.x) +
                         3 * t * t * (p3.x - p2.x);
            
            // ニュートン法: t_new = t - (X(t) - mouseX) / X'(t)
            const error = xt - mouseX;
            if (Math.abs(error) < 0.1 || Math.abs(dxdt) < 0.001) break;
            t = t - error / dxdt;
            t = Math.max(0, Math.min(1, t)); // 0-1の範囲に制限
        }
        
        const ratio = t;
        
        // ratio位置での既存ベジェ曲線上のY座標を計算
        const oneMinusT = 1 - t;
        const newCanvasY = 
            oneMinusT * oneMinusT * oneMinusT * p0.y +
            3 * oneMinusT * oneMinusT * t * p1.y +
            3 * oneMinusT * t * t * p2.y +
            t * t * t * p3.y;

        // 既存ベジェ曲線の接線の傾き（dy/dx）を計算
        // dx/dt と dy/dt を計算
        const dxdt = 
            3 * oneMinusT * oneMinusT * (p1.x - p0.x) +
            6 * oneMinusT * t * (p2.x - p1.x) +
            3 * t * t * (p3.x - p2.x);
        
        const dydt = 
            3 * oneMinusT * oneMinusT * (p1.y - p0.y) +
            6 * oneMinusT * t * (p2.y - p1.y) +
            3 * t * t * (p3.y - p2.y);
        
        console.log('[N-point] At t=', t.toFixed(3), 'dxdt:', dxdt.toFixed(2), 'dydt:', dydt.toFixed(2));
        
        const debugInfo2 = `t=${t.toFixed(2)} dxdt=${dxdt.toFixed(1)} dydt=${dydt.toFixed(1)}`;
        
        // De Casteljauアルゴリズムでベジェ曲線を分割（元のカーブ形状を完全に維持）
        console.log('[N-point] ===== De Casteljau分割開始 =====');
        const splitResult = splitBezierCurve(p0, p1, p2, p3, t);
        const splitPoint = splitResult.splitPoint;
        const leftCurve = splitResult.left;
        const rightCurve = splitResult.right;
        
        // 分割点の座標を使用（これが元のカーブ上の正確な位置）
        const newCanvasX = splitPoint.x;
        const newCanvasYFromSplit = splitPoint.y;
        
        console.log('[N-point] Split point from De Casteljau:', 
                    'X:', newCanvasX.toFixed(1), 'Y:', newCanvasYFromSplit.toFixed(1));
        console.log('[N-point] Original newCanvasY from manual calc:', newCanvasY.toFixed(1));
        console.log('[N-point] Difference:', Math.abs(newCanvasY - newCanvasYFromSplit).toFixed(3), 'pixels');
        
        // De Casteljauの結果を使用（より正確）
        const finalCanvasY = newCanvasYFromSplit;
        
        // Canvas座標から時間と値を逆算
        const canvasInfo = window.currentEasingData?.canvasInfo;
        if (!canvasInfo) {
            console.error('[N-point] canvasInfo not available!');
            updateOutput('[N-point] エラー: Canvas情報が取得できません');
            return;
        }
        
        // 時間の計算（X座標から）
        const newTime = (newCanvasX - canvasInfo.gridX) / canvasInfo.curveWidth;
        
        // 値の計算（Y座標から、displayScaleを考慮）
        const minValue = graphData.displayScale?.minValue || 0;
        const maxValue = graphData.displayScale?.maxValue || 1;
        const valueRange = maxValue - minValue;
        
        // Canvas Y座標から正規化値を計算（上下反転に注意）
        const normalizedValue = (canvasInfo.gridY + canvasInfo.curveHeight - finalCanvasY) / canvasInfo.curveHeight;
        
        // 実際の値に変換
        const newValue = minValue + normalizedValue * valueRange;
        
        console.log('[N-point] ✅ Calculated from Canvas coords:');
        console.log('[N-point]   Canvas X:', newCanvasX.toFixed(1), '→ time:', newTime.toFixed(4));
        console.log('[N-point]   Canvas Y:', finalCanvasY.toFixed(1), '→ normalized:', normalizedValue.toFixed(4), '→ value:', newValue.toFixed(4));
        console.log('[N-point]   Display scale:', minValue, 'to', maxValue);
        
        // 左セグメントと右セグメントのハンドル座標（De Casteljauから取得）
        // 左セグメント: kf1 -> 新中点
        const leftOutHandle = leftCurve.p1;  // kf1の出力ハンドル
        const leftInHandle = leftCurve.p2;   // 新中点の入力ハンドル
        
        // 右セグメント: 新中点 -> kf2
        const rightOutHandle = rightCurve.p1; // 新中点の出力ハンドル
        const rightInHandle = rightCurve.p2;  // kf2の入力ハンドル
        
        // ハンドル座標からspeedとinfluenceを逆算
        // 左セグメント
        const leftSegmentWidth = newCanvasX - kf1.canvasX;
        const leftSegmentHeight = finalCanvasY - kf1.canvasY;
        
        const leftOutInfluence = (leftOutHandle.x - kf1.canvasX) / leftSegmentWidth;
        // 正しいspeed計算: handleY = baseY + (segmentHeight * (speed / 100) * (influence / 100))
        // 逆算: speed = ((handleY - baseY) / segmentHeight) * (100 / influence) * 100
        const leftOutSpeed = leftSegmentHeight !== 0 
            ? ((leftOutHandle.y - kf1.canvasY) / leftSegmentHeight) * (100 / (leftOutInfluence * 100)) * 100
            : 0;
        
        const leftInInfluence = (newCanvasX - leftInHandle.x) / leftSegmentWidth;
        const leftInSpeed = leftSegmentHeight !== 0
            ? ((finalCanvasY - leftInHandle.y) / leftSegmentHeight) * (100 / (leftInInfluence * 100)) * 100
            : 0;
        
        // 右セグメント
        const rightSegmentWidth = kf2.canvasX - newCanvasX;
        const rightSegmentHeight = kf2.canvasY - finalCanvasY;
        
        const rightOutInfluence = (rightOutHandle.x - newCanvasX) / rightSegmentWidth;
        const rightOutSpeed = rightSegmentHeight !== 0
            ? ((rightOutHandle.y - finalCanvasY) / rightSegmentHeight) * (100 / (rightOutInfluence * 100)) * 100
            : 0;
        
        const rightInInfluence = (kf2.canvasX - rightInHandle.x) / rightSegmentWidth;
        const rightInSpeed = rightSegmentHeight !== 0
            ? ((kf2.canvasY - rightInHandle.y) / rightSegmentHeight) * (100 / (rightInInfluence * 100)) * 100
            : 0;
        
        console.log('[N-point] ✅ Handles from De Casteljau:');
        console.log('[N-point]   Left segment - kf1 out:', 
                    'influence:', (leftOutInfluence * 100).toFixed(1) + '%',
                    'speed:', leftOutSpeed.toFixed(2));
        console.log('[N-point]   Left segment - newPoint in:', 
                    'influence:', (leftInInfluence * 100).toFixed(1) + '%',
                    'speed:', leftInSpeed.toFixed(2));
        console.log('[N-point]   Right segment - newPoint out:', 
                    'influence:', (rightOutInfluence * 100).toFixed(1) + '%',
                    'speed:', rightOutSpeed.toFixed(2));
        console.log('[N-point]   Right segment - kf2 in:', 
                    'influence:', (rightInInfluence * 100).toFixed(1) + '%',
                    'speed:', rightInSpeed.toFixed(2));

        const debugInfo3 = `Split@${newCanvasX.toFixed(0)},${finalCanvasY.toFixed(0)} t=${newTime.toFixed(2)} v=${newValue.toFixed(2)}`;

        updateOutput(`[N-point] 中点追加: ${graphData.keyframes.length}点 | De Casteljau分割 | ${debugInfo3}`);

        // 新しいキーフレームを作成（De Casteljauで計算された値を使用）
        const newKeyframe = {
            time: Math.max(0, Math.min(1, newTime)),
            value: newValue,
            canvasX: newCanvasX,
            canvasY: finalCanvasY,
            easing: {
                inTemporal: { 
                    speed: leftInSpeed, 
                    influence: Math.max(0, Math.min(100, leftInInfluence * 100))
                },
                outTemporal: { 
                    speed: rightOutSpeed, 
                    influence: Math.max(0, Math.min(100, rightOutInfluence * 100))
                }
            },
            isStart: false,
            isEnd: false
        };

        // キーフレーム配列に挿入（この時点でインデックスがシフトする）
        graphData.keyframes.splice(insertPosition, 0, newKeyframe);
        
        // 挿入後のインデックスで参照する必要がある
        // targetSegmentIndex の kf1 は挿入後も同じ位置
        // insertPosition に新中点が入る
        // insertPosition + 1 に元のkf2が移動する
        
        // kf1のeasingを更新（左セグメント用）- インデックスは変わらない
        graphData.keyframes[targetSegmentIndex].easing.outTemporal = {
            speed: leftOutSpeed,
            influence: Math.max(0, Math.min(100, leftOutInfluence * 100))
        };
        
        // 新中点のeasingは既にnewKeyframeに設定済み
        
        // kf2のeasingを更新（右セグメント用）- insertPosition + 1 に移動している
        graphData.keyframes[insertPosition + 1].easing.inTemporal = {
            speed: rightInSpeed,
            influence: Math.max(0, Math.min(100, rightInInfluence * 100))
        };

        console.log('[N-point] ✅ Easing parameters updated:');
        console.log('[N-point]   kf1[' + targetSegmentIndex + '] OUT:', 
                   'influence=' + (leftOutInfluence * 100).toFixed(1) + '%',
                   'speed=' + leftOutSpeed.toFixed(2));
        console.log('[N-point]   newPoint[' + insertPosition + '] IN:', 
                   'influence=' + (leftInInfluence * 100).toFixed(1) + '%',
                   'speed=' + leftInSpeed.toFixed(2));
        console.log('[N-point]   newPoint[' + insertPosition + '] OUT:', 
                   'influence=' + (rightOutInfluence * 100).toFixed(1) + '%',
                   'speed=' + rightOutSpeed.toFixed(2));
        console.log('[N-point]   kf2[' + (insertPosition + 1) + '] IN:', 
                   'influence=' + (rightInInfluence * 100).toFixed(1) + '%',
                   'speed=' + rightInSpeed.toFixed(2));

        // De Casteljauで計算された全4つのハンドル座標
        const allHandles = {
            leftOut: { x: leftOutHandle.x, y: leftOutHandle.y },
            leftIn: { x: leftInHandle.x, y: leftInHandle.y },
            rightOut: { x: rightOutHandle.x, y: rightOutHandle.y },
            rightIn: { x: rightInHandle.x, y: rightInHandle.y }
        };

        // ハンドルを再構築（De Casteljauの座標を直接使用）
        rebuildHandlesPreservingExisting(targetSegmentIndex, insertPosition, allHandles);

        console.log('[N-point] ✅ Middle point added successfully with De Casteljau algorithm');
        console.log('[N-point] ✅ Curve shape is perfectly preserved');

        // カーブを再描画
        redrawNPointCurve();

        console.log('[N-point] Added middle point at segment', targetSegmentIndex, 'new keyframes count:', graphData.keyframes.length);
    }

    /**
     * 指定インデックスの中点を削除
     */
    function deleteMiddlePoint(keyframeIndex) {
        if (!graphData || !graphData.keyframes) {
            updateOutput('[N-point] 中点削除: データがありません');
            return;
        }

        if (keyframeIndex <= 0 || keyframeIndex >= graphData.keyframes.length - 1) {
            updateOutput('[N-point] 中点削除: 始点・終点は削除できません');
            return;
        }

        if (graphData.keyframes.length <= 2) {
            updateOutput('[N-point] 中点削除: 最低2点が必要です');
            return;
        }

        // キーフレームを削除
        graphData.keyframes.splice(keyframeIndex, 1);

        // ハンドルを再構築（シンプル削除：既存easingから再計算）
        rebuildHandles();

        // カーブを再描画
        redrawNPointCurve();

        updateOutput(`[N-point] 中点削除: ${graphData.keyframes.length}点になりました`);
        console.log('[N-point] Deleted middle point', keyframeIndex, 'new keyframes count:', graphData.keyframes.length);
    }

    /**
     * ハンドルを再構築（キーフレーム削除後、既存ハンドルの座標を保持）
     */
    function rebuildHandlesAfterDeletion(deletedKeyframeIndex) {
        if (!graphData || !graphData.keyframes) return;

        // 既存ハンドルをバックアップ
        const oldHandles = [...graphData.handles];
        graphData.handles = [];

        for (let i = 0; i < graphData.keyframes.length - 1; i++) {
            const kf1 = graphData.keyframes[i];
            const kf2 = graphData.keyframes[i + 1];
            const segmentWidth = kf2.canvasX - kf1.canvasX;

            // 削除されたキーフレームがあった位置の前後を繋ぐ新セグメント
            const isMergedSegment = (i === deletedKeyframeIndex - 1);

            // 出力ハンドル（kf1から）
            let outHandleX, outHandleY;
            
            if (isMergedSegment) {
                // 削除前の左セグメントの出力ハンドルを保持
                const oldOutHandle = oldHandles.find(h => h.segmentIndex === i && h.isOut);
                if (oldOutHandle) {
                    outHandleX = oldOutHandle.x;
                    outHandleY = oldOutHandle.y;
                } else {
                    const outInfluence = (kf1.easing?.outTemporal?.influence || 33.33) / 100;
                    outHandleX = kf1.canvasX + segmentWidth * outInfluence;
                    outHandleY = kf1.canvasY + (kf1.easing?.outTemporal?.speed || 0);
                }
            } else {
                // 他のセグメント：segmentIndexを調整して元の位置を取得
                const adjustedOldIndex = i >= deletedKeyframeIndex ? i + 1 : i;
                const oldOutHandle = oldHandles.find(h => h.segmentIndex === adjustedOldIndex && h.isOut);
                if (oldOutHandle) {
                    outHandleX = oldOutHandle.x;
                    outHandleY = oldOutHandle.y;
                } else {
                    const outInfluence = (kf1.easing?.outTemporal?.influence || 33.33) / 100;
                    outHandleX = kf1.canvasX + segmentWidth * outInfluence;
                    outHandleY = kf1.canvasY + (kf1.easing?.outTemporal?.speed || 0);
                }
            }

            graphData.handles.push({
                x: outHandleX,
                y: outHandleY,
                type: 'handle',
                segmentIndex: i,
                keyframeIndex: i,
                isOut: true,
                baseX: kf1.canvasX,
                baseY: kf1.canvasY
            });

            // 入力ハンドル（kf2へ）
            let inHandleX, inHandleY;
            
            if (isMergedSegment) {
                // 削除前の右セグメントの入力ハンドルを保持
                const oldInHandle = oldHandles.find(h => h.segmentIndex === deletedKeyframeIndex && !h.isOut);
                if (oldInHandle) {
                    inHandleX = oldInHandle.x;
                    inHandleY = oldInHandle.y;
                } else {
                    const inInfluence = (kf2.easing?.inTemporal?.influence || 33.33) / 100;
                    inHandleX = kf2.canvasX - segmentWidth * inInfluence;
                    inHandleY = kf2.canvasY - (kf2.easing?.inTemporal?.speed || 0);
                }
            } else {
                // 他のセグメント：segmentIndexを調整して元の位置を取得
                const adjustedOldIndex = i >= deletedKeyframeIndex ? i + 1 : i;
                const oldInHandle = oldHandles.find(h => h.segmentIndex === adjustedOldIndex && !h.isOut);
                if (oldInHandle) {
                    inHandleX = oldInHandle.x;
                    inHandleY = oldInHandle.y;
                } else {
                    const inInfluence = (kf2.easing?.inTemporal?.influence || 33.33) / 100;
                    inHandleX = kf2.canvasX - segmentWidth * inInfluence;
                    inHandleY = kf2.canvasY - (kf2.easing?.inTemporal?.speed || 0);
                }
            }

            graphData.handles.push({
                x: inHandleX,
                y: inHandleY,
                type: 'handle',
                segmentIndex: i,
                keyframeIndex: i + 1,
                isOut: false,
                baseX: kf2.canvasX,
                baseY: kf2.canvasY
            });
        }

        console.log('[N-point] Rebuilt handles after deletion:', graphData.handles.length, 'handles for', graphData.keyframes.length, 'keyframes');
    }

    /**
     * ハンドルを再構築（De Casteljauで計算されたハンドル座標を直接使用）
     * @param {number} oldSegmentIndex - 分割された元のセグメントのインデックス
     * @param {number} newKeyframeIndex - 新しく追加された中点のインデックス
     * @param {Object} allHandles - De Casteljauで計算された全4つのハンドル座標
     */
    function rebuildHandlesPreservingExisting(oldSegmentIndex, newKeyframeIndex, allHandles) {
        if (!graphData || !graphData.keyframes) return;

        graphData.handles = [];

        console.log('[N-point] ===== Rebuilding ALL handles =====');
        console.log('[N-point] Split segment:', oldSegmentIndex, '→ new keyframe at:', newKeyframeIndex);
        console.log('[N-point] De Casteljau handles:');
        console.log('[N-point]   leftOut:', allHandles.leftOut.x.toFixed(1), allHandles.leftOut.y.toFixed(1));
        console.log('[N-point]   leftIn:', allHandles.leftIn.x.toFixed(1), allHandles.leftIn.y.toFixed(1));
        console.log('[N-point]   rightOut:', allHandles.rightOut.x.toFixed(1), allHandles.rightOut.y.toFixed(1));
        console.log('[N-point]   rightIn:', allHandles.rightIn.x.toFixed(1), allHandles.rightIn.y.toFixed(1));

        for (let i = 0; i < graphData.keyframes.length - 1; i++) {
            const kf1 = graphData.keyframes[i];
            const kf2 = graphData.keyframes[i + 1];
            const segmentWidth = kf2.canvasX - kf1.canvasX;

            // 出力ハンドル（kf1から）
            let outHandleX, outHandleY;
            
            if (i === oldSegmentIndex) {
                // 左セグメント（kf1 → 新中点）: De Casteljauの座標を直接使用
                outHandleX = allHandles.leftOut.x;
                outHandleY = allHandles.leftOut.y;
                console.log(`[N-point] Segment ${i} (LEFT) OUT: De Casteljau`, 
                           outHandleX.toFixed(1), outHandleY.toFixed(1));
            } else if (i === newKeyframeIndex) {
                // 右セグメント（新中点 → kf2）: De Casteljauの座標を直接使用
                outHandleX = allHandles.rightOut.x;
                outHandleY = allHandles.rightOut.y;
                console.log(`[N-point] Segment ${i} (RIGHT) OUT: De Casteljau`, 
                           outHandleX.toFixed(1), outHandleY.toFixed(1));
            } else {
                // 他のセグメント: easingから再計算
                const outInfluence = (kf1.easing?.outTemporal?.influence || 33.33) / 100;
                const outSpeed = kf1.easing?.outTemporal?.speed || 0;
                outHandleX = kf1.canvasX + segmentWidth * outInfluence;
                outHandleY = kf1.canvasY + outSpeed;
                console.log(`[N-point] Segment ${i} (other) OUT: from easing`, 
                           outHandleX.toFixed(1), outHandleY.toFixed(1));
            }

            graphData.handles.push({
                x: outHandleX,
                y: outHandleY,
                type: 'handle',
                segmentIndex: i,
                keyframeIndex: i,
                isOut: true,
                baseX: kf1.canvasX,
                baseY: kf1.canvasY
            });

            // 入力ハンドル（kf2へ）
            let inHandleX, inHandleY;
            
            if (i === oldSegmentIndex) {
                // 左セグメント（kf1 → 新中点）: De Casteljauの座標を直接使用
                inHandleX = allHandles.leftIn.x;
                inHandleY = allHandles.leftIn.y;
                console.log(`[N-point] Segment ${i} (LEFT) IN: De Casteljau`, 
                           inHandleX.toFixed(1), inHandleY.toFixed(1));
            } else if (i === newKeyframeIndex) {
                // 右セグメント（新中点 → kf2）: De Casteljauの座標を直接使用
                inHandleX = allHandles.rightIn.x;
                inHandleY = allHandles.rightIn.y;
                console.log(`[N-point] Segment ${i} (RIGHT) IN: De Casteljau`, 
                           inHandleX.toFixed(1), inHandleY.toFixed(1));
            } else {
                // 他のセグメント: easingから再計算
                const inInfluence = (kf2.easing?.inTemporal?.influence || 33.33) / 100;
                const inSpeed = kf2.easing?.inTemporal?.speed || 0;
                inHandleX = kf2.canvasX - segmentWidth * inInfluence;
                inHandleY = kf2.canvasY - inSpeed;
                console.log(`[N-point] Segment ${i} (other) IN: from easing`, 
                           inHandleX.toFixed(1), inHandleY.toFixed(1));
            }

            graphData.handles.push({
                x: inHandleX,
                y: inHandleY,
                type: 'handle',
                segmentIndex: i,
                keyframeIndex: i + 1,
                isOut: false,
                baseX: kf2.canvasX,
                baseY: kf2.canvasY
            });
        }

        console.log('[N-point] ✅ Built', graphData.handles.length, 'handles for', graphData.keyframes.length, 'keyframes');
        console.log('[N-point] ✅ Split segments use De Casteljau coordinates directly');
    }

    /**
     * ハンドルを再構築（キーフレーム追加・削除後）
     */
    function rebuildHandles() {
        if (!graphData || !graphData.keyframes) return;

        graphData.handles = [];

        for (let i = 0; i < graphData.keyframes.length - 1; i++) {
            const kf1 = graphData.keyframes[i];
            const kf2 = graphData.keyframes[i + 1];

            // セグメント幅を計算
            const segmentWidth = kf2.canvasX - kf1.canvasX;
            const segmentHeight = kf2.canvasY - kf1.canvasY;

            // 出力ハンドル（kf1から）
            const outInfluence = (kf1.easing?.outTemporal?.influence || 33.33) / 100;
            const outHandleX = kf1.canvasX + segmentWidth * outInfluence;
            const outSpeed = kf1.easing?.outTemporal?.speed || 0;
            // 正しい式: handleY = baseY + (segmentHeight * (speed / 100) * (influence / 100))
            const outHandleY = kf1.canvasY + (segmentHeight * (outSpeed / 100) * outInfluence);

            graphData.handles.push({
                x: outHandleX,
                y: outHandleY,
                type: 'handle',
                segmentIndex: i,
                keyframeIndex: i,
                isOut: true,
                baseX: kf1.canvasX,
                baseY: kf1.canvasY
            });

            // 入力ハンドル（kf2へ）
            const inInfluence = (kf2.easing?.inTemporal?.influence || 33.33) / 100;
            const inHandleX = kf2.canvasX - segmentWidth * inInfluence;
            const inSpeed = kf2.easing?.inTemporal?.speed || 0;
            // 正しい式: handleY = baseY - (segmentHeight * (speed / 100) * (influence / 100))
            const inHandleY = kf2.canvasY - (segmentHeight * (inSpeed / 100) * inInfluence);

            graphData.handles.push({
                x: inHandleX,
                y: inHandleY,
                type: 'handle',
                segmentIndex: i,
                keyframeIndex: i + 1,
                isOut: false,
                baseX: kf2.canvasX,
                baseY: kf2.canvasY
            });
        }

        console.log('[N-point] Rebuilt handles:', graphData.handles.length, 'handles for', graphData.keyframes.length, 'keyframes');
    }

    /**
     * ハンドルの数値入力ダイアログを表示
     * @param {Object} handle - 編集対象のハンドル
     */
    function showNumericInputForHandle(handle) {
        const modal = document.getElementById('numericInputModal');
        const title = document.getElementById('numericInputTitle');
        const fieldsContainer = document.getElementById('numericInputFields');
        
        if (!modal || !title || !fieldsContainer) {
            console.error('[Numeric Input] Required modal elements not found');
            return;
        }

        // 現在のeasing設定を取得
        const kf = graphData.keyframes[handle.keyframeIndex];
        if (!kf) {
            console.error('[Numeric Input] Keyframe not found for handle');
            return;
        }

        const easingKey = handle.isOut ? 'outTemporal' : 'inTemporal';
        const easing = kf.easing?.[easingKey] || { speed: 0, influence: 33.33 };
        
        // Speed/Influence → X,Y に変換して表示
        const displayX = easing.influence / 100;  // Influence(0-100) → X(0-1)
        const displayY = easing.speed * easing.influence / 10000;  // Y = Speed × influence / 10000
        
        // ハンドルタイプを取得（ログ出力用）
        const handleType = handle.isOut ? '出力ハンドル' : '入力ハンドル';
        
        // タイトルを非表示
        title.style.display = 'none';
        
        // 入力フィールドを作成（X,Y形式）
        fieldsContainer.innerHTML = `
            <div style="display: flex; gap: 12px;">
                <div class="numeric-input-field" style="flex: 1;">
                    <label>X</label>
                    <input type="number" id="numericInputX" value="${displayX.toFixed(2)}" min="0" max="1" step="0.01">
                </div>
                <div class="numeric-input-field" style="flex: 1;">
                    <label>Y</label>
                    <input type="number" id="numericInputY" value="${displayY.toFixed(2)}" step="0.01">
                </div>
            </div>
        `;
        
        // モーダルを表示
        modal.style.display = 'flex';
        
        // 適用ボタン
        const applyBtn = document.getElementById('numericInputApply');
        const cancelBtn = document.getElementById('numericInputCancel');
        
        // 古いイベントリスナーを完全に削除するため、ボタンを複製して置き換える
        const newApplyBtn = applyBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        const applyHandler = () => {
            const xInput = document.getElementById('numericInputX');
            const yInput = document.getElementById('numericInputY');
            
            const inputX = parseFloat(xInput.value);
            const inputY = parseFloat(yInput.value);
            
            // 値の検証
            if (isNaN(inputX) || isNaN(inputY)) {
                alert('有効な数値を入力してください');
                return;
            }
            
            if (inputX < 0 || inputX > 1) {
                alert('Xは0から1の範囲で入力してください');
                return;
            }
            
            // X,Y → Speed/Influence に変換
            // Influenceが最小値（0.1%）以下の場合は最小値にクランプ
            const calculatedInfluence = inputX * 100;
            const newInfluence = calculatedInfluence >= 0.1 ? calculatedInfluence : 0.1;
            const newSpeed = inputY * 10000 / newInfluence;  // Speed = Y × 10000 / influence
            
            console.log(`[Numeric Input] Applying to keyframe ${handle.keyframeIndex}, ${easingKey}: X=${inputX}, Y=${inputY} → speed=${newSpeed}, influence=${newInfluence}`);
            
            // Easing設定を更新
            if (!kf.easing) {
                kf.easing = {};
            }
            kf.easing[easingKey] = {
                speed: newSpeed,
                influence: newInfluence
            };
            
            // グラフを再描画（ハンドル位置はredrawNPointCurveで自動的に再計算される）
            redrawNPointCurve();
            
            // モーダルを閉じる
            closeNumericInputModal();
        };
        
        const cancelHandler = () => {
            closeNumericInputModal();
        };
        
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeNumericInputModal();
            } else if (e.key === 'Enter') {
                applyHandler();
            }
        };
        
        // 新しいボタンにイベントリスナーを追加
        newApplyBtn.addEventListener('click', applyHandler);
        newCancelBtn.addEventListener('click', cancelHandler);
        
        // Escapeキーハンドラーは古いものを削除してから追加
        // （ただしこれも完全ではないので、グローバル変数で管理する）
        if (window.currentEscapeHandler) {
            document.removeEventListener('keydown', window.currentEscapeHandler);
        }
        window.currentEscapeHandler = escapeHandler;
        document.addEventListener('keydown', escapeHandler);
        
        // 最初の入力フィールドにフォーカス
        setTimeout(() => {
            const xInput = document.getElementById('numericInputX');
            if (xInput) xInput.select();
        }, 100);
    }

    /**
     * 中点の数値入力ダイアログを表示
     * @param {Object} kf - 編集対象の中点キーフレーム
     * @param {number} index - キーフレームのインデックス
     */
    function showNumericInputForMidpoint(kf, index) {
        const modal = document.getElementById('numericInputModal');
        const title = document.getElementById('numericInputTitle');
        const fieldsContainer = document.getElementById('numericInputFields');
        
        if (!modal || !title || !fieldsContainer) {
            console.error('[Numeric Input] Required modal elements not found');
            return;
        }

        // タイトルを非表示
        title.style.display = 'none';
        
        // 正規化された値を取得
        const normalizedTime = kf.time;
        const normalizedValue = kf.value;
        
        // 入力フィールドを作成
        fieldsContainer.innerHTML = `
            <div class="numeric-input-field">
                <label>Time</label>
                <input type="number" id="numericInputTime" value="${normalizedTime.toFixed(4)}" min="0" max="1" step="0.0001">
            </div>
            <div class="numeric-input-field">
                <label>Value</label>
                <input type="number" id="numericInputValue" value="${normalizedValue.toFixed(4)}" step="0.0001">
            </div>
        `;
        
        // モーダルを表示
        modal.style.display = 'flex';
        
        // 適用ボタン
        const applyBtn = document.getElementById('numericInputApply');
        const cancelBtn = document.getElementById('numericInputCancel');
        
        const applyHandler = () => {
            const timeInput = document.getElementById('numericInputTime');
            const valueInput = document.getElementById('numericInputValue');
            
            const newTime = parseFloat(timeInput.value);
            const newValue = parseFloat(valueInput.value);
            
            // 値の検証
            if (isNaN(newTime) || isNaN(newValue)) {
                alert('Please enter valid numbers');
                return;
            }
            
            // 中点の移動範囲を制限（前後のキーフレーム間）
            const prevKF = graphData.keyframes[index - 1];
            const nextKF = graphData.keyframes[index + 1];
            
            if (prevKF && nextKF) {
                const marginTime = 0.001;
                if (newTime <= prevKF.time + marginTime || newTime >= nextKF.time - marginTime) {
                    alert(`Time must be between ${(prevKF.time + marginTime).toFixed(4)} and ${(nextKF.time - marginTime).toFixed(4)}`);
                    return;
                }
            }
            
            // キーフレームの値を更新
            kf.time = newTime;
            kf.value = newValue;
            
            console.log(`[Numeric Input] Updated midpoint ${index}: time=${newTime}, value=${newValue}`);
            
            // Canvas座標を再計算
            const canvas = document.getElementById('valueChart');
            if (!canvas) return;
            
            const rect = canvas.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            
            const gridX = Math.round(width * 0.1);
            const gridY = Math.round(height * 0.1);
            const gridWidth = width - 2 * gridX;
            const gridHeight = height - 2 * gridY;
            
            kf.canvasX = gridX + gridWidth * newTime;
            kf.canvasY = gridY + gridHeight * (1 - newValue);
            
            // ハンドルを再構築
            rebuildHandles();
            
            // グラフを再描画
            redrawNPointCurve();
            
            // モーダルを閉じる
            closeNumericInputModal();
        };
        
        const cancelHandler = () => {
            closeNumericInputModal();
        };
        
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeNumericInputModal();
            } else if (e.key === 'Enter') {
                applyHandler();
            }
        };
        
        // イベントリスナーをクリーンアップしてから追加
        applyBtn.removeEventListener('click', applyHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        document.removeEventListener('keydown', escapeHandler);
        
        applyBtn.addEventListener('click', applyHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        document.addEventListener('keydown', escapeHandler);
        
        // 最初の入力フィールドにフォーカス
        setTimeout(() => {
            const timeInput = document.getElementById('numericInputTime');
            if (timeInput) timeInput.select();
        }, 100);
    }

    /**
     * 数値入力モーダルを閉じる
     */
    function closeNumericInputModal() {
        const modal = document.getElementById('numericInputModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 設定モーダルを開く
     */
    function openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * 設定モーダルを閉じる
     */
    function closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Draw message when no keyframes are selected
     */
    function drawNoKeyframesMessage(ctx, width, height) {
        ctx.fillStyle = '#888888';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No Selected Keyframes', width / 2, height / 2 - 10);
        ctx.font = '10px Arial';
        ctx.fillText('Select keyframes in timeline', width / 2, height / 2 + 10);
    }
    
    /**
     * Draw single keyframe easing information
     */
    function drawSingleKeyframeEasing(ctx, keyframe, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Draw keyframe point
        ctx.fillStyle = '#ffce56';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Display easing information
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        
        let yOffset = centerY + 25;
        ctx.fillText(`${keyframe.propertyName}`, centerX, yOffset);
        yOffset += 15;
        
        if (keyframe.easing && keyframe.easing.inTemporal) {
            ctx.fillText(`In: ${keyframe.easing.inTemporal.speed.toFixed(1)}% / ${keyframe.easing.inTemporal.influence.toFixed(2)}%`, centerX, yOffset);
            yOffset += 12;
        }
        
        if (keyframe.easing && keyframe.easing.outTemporal) {
            ctx.fillText(`Out: ${keyframe.easing.outTemporal.speed.toFixed(1)}% / ${keyframe.easing.outTemporal.influence.toFixed(2)}%`, centerX, yOffset);
        }
    }
    
    /**
     * Draw 3-point grid with extended range support
     */
    function draw3PointGrid(ctx, x, y, width, height, minValue, maxValue) {
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        // Vertical grid lines (time)
        for (let i = 0; i <= 4; i++) {
            const lineX = x + (width * i / 4);
            ctx.beginPath();
            ctx.moveTo(lineX, y);
            ctx.lineTo(lineX, y + height);
            ctx.stroke();
        }
        
        // Horizontal grid lines (value)
        const valueRange = maxValue - minValue;
        const steps = 4;
        for (let i = 0; i <= steps; i++) {
            const lineY = y + (height * i / steps);
            ctx.beginPath();
            ctx.moveTo(x, lineY);
            ctx.lineTo(x + width, lineY);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
        
        // Draw border
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // ラベル表示を削除（グラフをシンプルに）
    }

    /**
     * Draw 3-point easing curve
     */
    function draw3PointEasingCurve(ctx, keyframes, width, height) {
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const curveWidth = Math.min(chartWidth * graphScale, chartHeight * graphScale);
        const curveHeight = curveWidth;
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        // 値の範囲を始点-終点のみで計算（常に0-1に正規化）
        const minValue = keyframes[0].value;
        const maxValue = keyframes[2].value;
        const valueRange = maxValue - minValue;
        
        // 3点の位置を計算（正規化された時間値を使用）
        const x1 = centerX - curveWidth / 2;     // 開始点 (t=0)
        const x2 = centerX - curveWidth / 2 + (keyframes[1].time * curveWidth);  // 中間点（正規化された時間）
        const x3 = centerX + curveWidth / 2;     // 終了点 (t=1)
        
        // Y座標は始点-終点の範囲で正規化
        const normalizeValue = (value) => (value - minValue) / valueRange;
        const y1 = centerY + curveHeight / 2 - (normalizeValue(keyframes[0].value) * curveHeight);
        const y2 = centerY + curveHeight / 2 - (normalizeValue(keyframes[1].value) * curveHeight);
        const y3 = centerY + curveHeight / 2 - (normalizeValue(keyframes[2].value) * curveHeight);
        
        // Store easing data globally for editing
        // 実際の時間差と値差を計算（プロパティタイプ対応）
        const originalValue1 = keyframes[0].originalValue || keyframes[0].value;
        const originalValue2 = keyframes[1].originalValue || keyframes[1].value;
        const originalValue3 = keyframes[2].originalValue || keyframes[2].value;
        const originalTime1 = keyframes[0].originalTime || keyframes[0].time;
        const originalTime2 = keyframes[1].originalTime || keyframes[1].time;
        const originalTime3 = keyframes[2].originalTime || keyframes[2].time;
        
        const actualTimeDiff = originalTime3 - originalTime1;  // 全体の時間差
        
        // 値差をプロパティタイプに応じて計算
        let actualValueDiff;
        if (isPositionProperty(keyframes[0])) {
            // 位置プロパティ：ベクトル計算
            if (Array.isArray(originalValue1) && Array.isArray(originalValue3)) {
                let diffVector = [];
                const dimensions = Math.min(originalValue1.length, originalValue3.length);
                for (let d = 0; d < dimensions; d++) {
                    diffVector.push(originalValue3[d] - originalValue1[d]);
                }
                actualValueDiff = calculateMagnitude(diffVector);
            } else {
                actualValueDiff = Math.abs(originalValue3 - originalValue1);
            }
        } else {
            // 非位置プロパティ：X値または単次元値
            const val1 = Array.isArray(originalValue1) ? originalValue1[0] : originalValue1;
            const val3 = Array.isArray(originalValue3) ? originalValue3[0] : originalValue3;
            actualValueDiff = val3 - val1;
        }
        
        // 中点の正規化された値を計算（0-1の範囲）
        const normalizedMiddleValue = normalizeValue(keyframes[1].value);
        
        window.currentEasingData = {
            keyframes: keyframes,
            minValue: 0,
            maxValue: 1,
            value1: 0,  // 始点は常に0
            value2: normalizedMiddleValue,  // 正規化された中点値
            value3: 1,  // 終点は常に1
            timeDiff: actualTimeDiff,    // 実際の時間差
            valueDiff: actualValueDiff,  // 実際の値差
            canvasInfo: {
                x1: x1, y1: y1, 
                x2: x2, y2: y2,
                x3: x3, y3: y3,
                centerX: centerX, centerY: centerY,
                curveWidth: curveWidth, curveHeight: curveHeight
            }
        };
        
        console.log('3-Point currentEasingData:', window.currentEasingData);
        
        // Draw grid with 0-1 range (始点=0, 終点=1)
        draw3PointGrid(ctx, centerX - curveWidth/2, centerY - curveHeight/2, curveWidth, curveHeight, 0, 1);
        
        // Draw 3-point bezier curves
        draw3PointBezierCurves(ctx, keyframes, x1, y1, x2, y2, x3, y3);
        
        // ハンドルが生成された後にcurrentEasingSettingsを同期
        currentEasingSettings = {
            outTemporal: keyframes[0].easing?.outTemporal || null,
            inTemporal: keyframes[2].easing?.inTemporal || null,
            segment1: {
                outTemporal: keyframes[0].easing?.outTemporal || null,
                inTemporal: keyframes[1].easing?.inTemporal || null
            },
            segment2: {
                outTemporal: keyframes[1].easing?.outTemporal || null,
                inTemporal: keyframes[2].easing?.inTemporal || null
            }
        };
        
        console.log('3-point currentEasingSettings synchronized:', currentEasingSettings);
        
        // ハンドルが生成された後に編集初期化
        console.log('3-point handles generated, initializing editing...');
        console.log('Handle data:', window.current3PointHandles);
        
        // 初期描画でハンドルポイントを先に表示（背面）
        if (window.current3PointHandles) {
            draw3PointHandlePoints(ctx);
        }
        
        // Draw keyframe points（最前面）
        drawKeyframePoint(ctx, x1, y1, '#ff6384', '0.0');  // 開始点
        drawKeyframePoint(ctx, x2, y2, '#4bc0c0', normalizedMiddleValue.toFixed(2));  // 中間点（正規化値）
        drawKeyframePoint(ctx, x3, y3, '#36a2eb', '1.0');  // 終了点
        
        // Draw easing information for 3 points
        draw3PointEasingInfo(ctx, keyframes, width, height);
        
        // 3点モード用のハンドル編集を即座に初期化
        setTimeout(() => {
            console.log('Initializing 3-point handle editing after timeout...');
            initialize3PointHandleEditing();
        }, 200);
    }
    
    /**
     * Draw 3-point bezier curves
     */
    function draw3PointBezierCurves(ctx, keyframes, x1, y1, x2, y2, x3, y3) {
        // 第1区間のベジェカーブ (point1 -> point2)
        let cp1x_1 = x1, cp1y_1 = y1, cp2x_1 = x2, cp2y_1 = y2;
        
        if (keyframes[0].easing && keyframes[0].easing.outTemporal) {
            const influence = keyframes[0].easing.outTemporal.influence;
            const speed = keyframes[0].easing.outTemporal.speed;
            
            const normalizedInfluence = Math.min(1, influence / 100);
            // 3点モードでは値が0-1に正規化されているので、speedも0-100スケール
            const normalizedSlope = speed / 100;
            
            const handleX = normalizedInfluence;
            const handleY = normalizedSlope * handleX;
            
            cp1x_1 = x1 + (x2 - x1) * handleX;
            cp1y_1 = y1 + (y2 - y1) * handleY;
        }
        
        if (keyframes[1].easing && keyframes[1].easing.inTemporal) {
            const influence = keyframes[1].easing.inTemporal.influence;
            const speed = keyframes[1].easing.inTemporal.speed;
            
            const normalizedInfluence = Math.min(1, influence / 100);
            const normalizedSlope = speed / 100;
            
            const handleX = normalizedInfluence;
            const handleY = normalizedSlope * handleX;
            
            cp2x_1 = x2 - (x2 - x1) * handleX;
            cp2y_1 = y2 - (y2 - y1) * handleY;
        }
        
        // 第2区間のベジェカーブ (point2 -> point3)
        let cp1x_2 = x2, cp1y_2 = y2, cp2x_2 = x3, cp2y_2 = y3;
        
        if (keyframes[1].easing && keyframes[1].easing.outTemporal) {
            const influence = keyframes[1].easing.outTemporal.influence;
            const speed = keyframes[1].easing.outTemporal.speed;
            
            const normalizedInfluence = Math.min(1, influence / 100);
            const normalizedSlope = speed / 100;
            
            const handleX = normalizedInfluence;
            const handleY = normalizedSlope * handleX;
            
            cp1x_2 = x2 + (x3 - x2) * handleX;
            cp1y_2 = y2 + (y3 - y2) * handleY;
        }
        
        if (keyframes[2].easing && keyframes[2].easing.inTemporal) {
            const influence = keyframes[2].easing.inTemporal.influence;
            const speed = keyframes[2].easing.inTemporal.speed;
            
            const normalizedInfluence = Math.min(1, influence / 100);
            const normalizedSlope = speed / 100;
            
            const handleX = normalizedInfluence;
            const handleY = normalizedSlope * handleX;
            
            cp2x_2 = x3 - (x3 - x2) * handleX;
            cp2y_2 = y3 - (y3 - y2) * handleY;
        }
        
        // ハンドル情報を保存（編集用）
        window.current3PointHandles = {
            handle1_out: { x: cp1x_1, y: cp1y_1, type: 'handle1_out' },
            handle1_in: { x: cp2x_1, y: cp2y_1, type: 'handle1_in', baseX: x2, baseY: y2 },
            handle2_out: { x: cp1x_2, y: cp1y_2, type: 'handle2_out', baseX: x2, baseY: y2 },
            handle2_in: { x: cp2x_2, y: cp2y_2, type: 'handle2_in' }
        };
        
        // Draw the curves
        ctx.strokeStyle = '#ffce56';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(255, 206, 86, 0.3)';
        ctx.shadowBlur = 2;
        
        // 第1区間
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cp1x_1, cp1y_1, cp2x_1, cp2y_1, x2, y2);
        ctx.stroke();
        
        // 第2区間
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.bezierCurveTo(cp1x_2, cp1y_2, cp2x_2, cp2y_2, x3, y3);
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // Draw control handles
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        
        // 第1区間のハンドル
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(cp1x_1, cp1y_1);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(cp2x_1, cp2y_1);
        ctx.stroke();
        
        // 第2区間のハンドル
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(cp1x_2, cp1y_2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x3, y3);
        ctx.lineTo(cp2x_2, cp2y_2);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // Store handle data for editing
        window.current3PointHandles = {
            handle1_out: { x: cp1x_1, y: cp1y_1, type: 'handle1_out' },
            handle1_in: { x: cp2x_1, y: cp2y_1, type: 'handle1_in', baseX: x2, baseY: y2 },
            handle2_out: { x: cp1x_2, y: cp1y_2, type: 'handle2_out', baseX: x2, baseY: y2 },
            handle2_in: { x: cp2x_2, y: cp2y_2, type: 'handle2_in' }
        };
        
        console.log('3-Point handles stored:', window.current3PointHandles);
    }

    /**
     * Draw 3-point handle points only
     */
    function draw3PointHandlePoints(ctx) {
        if (!window.current3PointHandles) return;
        
        ctx.fillStyle = '#66ccff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Draw all handle points
        Object.values(window.current3PointHandles).forEach(handle => {
            if (handle && handle.x !== undefined && handle.y !== undefined) {
                ctx.beginPath();
                ctx.arc(handle.x, handle.y, 6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
        });
    }
    
    /**
     * Draw 3-point easing information
     */
    function draw3PointEasingInfo(ctx, keyframes, width, height) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        
        let y = 20;
        ctx.fillText(`Property: ${keyframes[0].propertyName} (3-Point)`, 10, y);
        y += 14;
        
        ctx.fillText(`Values: ${keyframes[0].value.toFixed(2)} → ${keyframes[1].value.toFixed(2)} → ${keyframes[2].value.toFixed(2)}`, 10, y);
        y += 14;
        
        // 各点のイージング情報を表示
        keyframes.forEach((kf, index) => {
            if (kf.easing) {
                if (kf.easing.outTemporal) {
                    ctx.fillText(`P${index+1} Out: spd=${(kf.easing.outTemporal.speed / 100).toFixed(2)} inf=${kf.easing.outTemporal.influence.toFixed(0)}%`, 10, y);
                    y += 12;
                }
                if (kf.easing.inTemporal) {
                    ctx.fillText(`P${index+1} In: spd=${(kf.easing.inTemporal.speed / 100).toFixed(2)} inf=${kf.easing.inTemporal.influence.toFixed(0)}%`, 10, y);
                    y += 12;
                }
            }
        });
    }

    /**
     * Draw easing curve between two keyframes (Flow-style)
     */
    function drawEasingCurve(ctx, kf1, kf2, width, height) {
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        // Calculate positions - 正方形に近いエリアでカーブを描画
        const curveWidth = Math.min(chartWidth * graphScale, chartHeight * graphScale);
        const curveHeight = curveWidth; // 正方形に設定
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        const x1 = centerX - curveWidth / 2;     // 開始点 (t=0)
        const x2 = centerX + curveWidth / 2;     // 終了点 (t=1)
        const y1 = centerY + curveHeight / 2;    // 開始点 (value=0) - 下側
        const y2 = centerY - curveHeight / 2;    // 終了点 (value=1) - 上側
        
        // 【Phase 2バグ修正】正規化情報を使用して実座標の差分を計算
        let actualTimeDiff, actualValueDiff;
        if (graphData && graphData.normalization) {
            // 正規化済みデータの場合、元の実座標情報を使用
            actualTimeDiff = graphData.normalization.timeRange;
            actualValueDiff = graphData.normalization.valueRange;
        } else {
            // 未正規化データの場合（後方互換性）
            actualTimeDiff = kf2.time - kf1.time;
            actualValueDiff = calculateValueDifference(kf1, kf2);
        }
        
        // 表示用の値（0→1正規化のため）
        const value1 = Array.isArray(kf1.value) ? kf1.value[0] : kf1.value;
        const value2 = Array.isArray(kf2.value) ? kf2.value[0] : kf2.value;
        
        window.currentEasingData = {
            keyframes: [kf1, kf2],
            minValue: Math.min(value1, value2),
            maxValue: Math.max(value1, value2),
            value1: value1,
            value2: value2,
            timeDiff: actualTimeDiff,
            valueDiff: actualValueDiff,
            canvasInfo: {
                x1: x1, y1: y1, x2: x2, y2: y2,
                centerX: centerX, centerY: centerY,
                curveWidth: curveWidth, curveHeight: curveHeight
            }
        };
        
        // Draw grid
        drawEasingGrid(ctx, centerX - curveWidth/2, centerY - curveHeight/2, curveWidth, curveHeight);
        
        // Draw bezier curve based on easing information
        drawBezierEasingCurve(ctx, kf1, kf2, x1, y1, x2, y2);
        
        // ハンドルが生成された後にcurrentEasingSettingsを同期（2点モード）
        // drawBezierEasingCurveで計算された正規化済みの値を使用
        if (window.normalized2PointSpeeds) {
            currentEasingSettings = {
                outTemporal: {
                    speed: window.normalized2PointSpeeds.outSpeed,
                    influence: window.normalized2PointSpeeds.outInfluence
                },
                inTemporal: {
                    speed: window.normalized2PointSpeeds.inSpeed,
                    influence: window.normalized2PointSpeeds.inInfluence
                }
            };
            console.log('2-point currentEasingSettings synchronized with normalized speeds:', currentEasingSettings);
        }
        
        // Draw keyframe points with fixed values
        drawKeyframePoint(ctx, x1, y1, '#ff6384', '0.0');  // 開始点 (0)
        drawKeyframePoint(ctx, x2, y2, '#36a2eb', '1.0');  // 終了点 (1)
        
        // Draw easing information
        drawEasingInfo(ctx, kf1, kf2, width, height);
    }
    
    /**
     * Draw grid for easing visualization
     */
    function drawEasingGrid(ctx, startX, startY, gridWidth, gridHeight) {
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 1;
        
        // Vertical lines (time)
        for (let i = 0; i <= 4; i++) {
            const x = startX + (gridWidth / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, startY + gridHeight);
            ctx.stroke();
        }
        
        // Horizontal lines (value)
        for (let i = 0; i <= 4; i++) {
            const y = startY + (gridHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(startX + gridWidth, y);
            ctx.stroke();
        }
        
        // Add value labels (0 to 1) - 正方形に合わせて調整
        ctx.fillStyle = '#666666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        
        // 1.0 at top
        ctx.fillText('1.0', startX - 10, startY + 5);
        // 0.5 at middle
        ctx.fillText('0.5', startX - 10, startY + gridHeight/2 + 4);
        // 0.0 at bottom
        ctx.fillText('0.0', startX - 10, startY + gridHeight + 5);
        
        // Time labels
        ctx.textAlign = 'center';
        ctx.fillText('0%', startX, startY + gridHeight + 18);
        ctx.fillText('50%', startX + gridWidth/2, startY + gridHeight + 18);
        ctx.fillText('100%', startX + gridWidth, startY + gridHeight + 18);
    }
    
    /**
     * Draw bezier curve based on easing information
     */
    function drawBezierEasingCurve(ctx, kf1, kf2, x1, y1, x2, y2) {
        // Calculate control points based on easing data
        let cp1x = x1, cp1y = y1, cp2x = x2, cp2y = y2;
        
        const timeDiff = x2 - x1;
        const valueDiff = y2 - y1;
        // 値の変化方向（正規化された座標系での方向）
        const isDecreasing = valueDiff < 0; // y2 < y1 の場合、値が減少している
        
        // 正規化されたspeed値を保存（Apply用）
        let normalizedOutSpeed = 0;
        let normalizedInSpeed = 0;
        
        // Use easing information to calculate control points
        // After Effects temporal easingを正規化された空間に正しく変換
        if (kf1.easing && kf1.easing.outTemporal) {
            const influence = kf1.easing.outTemporal.influence; // 0.1-100.0 の範囲
            const speed = kf1.easing.outTemporal.speed; // After Effectsの速度値（実際の単位/秒）
            
            // influenceを0-1の範囲に正規化（最小値制限なし、After Effectsの値をそのまま使用）
            const normalizedInfluence = Math.min(1, influence / 100);
            
            // After Effectsの速度を正規化空間での傾きに変換
            // speed = 実際の値変化率（単位/秒）
            // 正規化空間での傾き = speed / (実際の値変化率/時間) = speed * 時間 / 値変化量
            const actualValueChangeRate = window.currentEasingData.valueDiff / window.currentEasingData.timeDiff;
            const normalizedSlope = actualValueChangeRate !== 0 ? speed / actualValueChangeRate : 0;
            
            // 正規化されたspeedを保存（0-100スケール）
            normalizedOutSpeed = normalizedSlope * 100;
            
            // CSS cubic-bezier座標に変換
            const handleX = normalizedInfluence;
            const handleY = normalizedSlope * handleX;
            
            cp1x = x1 + (x2 - x1) * handleX;
            cp1y = y1 + (y2 - y1) * handleY;
        }
        
        if (kf2.easing && kf2.easing.inTemporal) {
            const influence = kf2.easing.inTemporal.influence; // 0.1-100.0 の範囲
            const speed = kf2.easing.inTemporal.speed; // After Effectsの速度値（実際の単位/秒）
            
            // influenceを0-1の範囲に正規化（最小値制限なし、After Effectsの値をそのまま使用）
            const normalizedInfluence = Math.min(1, influence / 100);
            
            // After Effectsの速度を正規化空間での傾きに変換
            const actualValueChangeRate = window.currentEasingData.valueDiff / window.currentEasingData.timeDiff;
            const normalizedSlope = actualValueChangeRate !== 0 ? speed / actualValueChangeRate : 0;
            
            // 正規化されたspeedを保存（0-100スケール）
            normalizedInSpeed = normalizedSlope * 100;
            
            // CSS cubic-bezier座標に変換（in handleは終点から逆方向）
            const handleX = normalizedInfluence;
            const handleY = normalizedSlope * handleX;
            
            cp2x = x2 - (x2 - x1) * handleX;
            cp2y = y2 - (y2 - y1) * handleY;
        }
        
        // 正規化されたspeed値をグローバルに保存（Apply用）
        window.normalized2PointSpeeds = {
            outSpeed: normalizedOutSpeed,
            outInfluence: kf1.easing?.outTemporal?.influence || 0,
            inSpeed: normalizedInSpeed,
            inInfluence: kf2.easing?.inTemporal?.influence || 0
        };
        
        // デバッグ: 制御点の座標とハンドル計算をコンソールに出力
        console.log('Bezier control points calculation (位置プロパティ対応版):', {
            propertyName: kf1.propertyName,
            propertyValueType: kf1.propertyValueType,
            isPositionProperty: isPositionProperty(kf1),
            rawValues: { value1: kf1.value, value2: kf2.value },
            displayValues: { value1: window.currentEasingData.value1, value2: window.currentEasingData.value2 },
            actualValueDiff: window.currentEasingData.valueDiff,
            timeDiff: window.currentEasingData.timeDiff,
            actualValueChangeRate: window.currentEasingData.valueDiff / window.currentEasingData.timeDiff,
            start: { x: x1, y: y1, note: 'bottom (normalized 0)' },
            end: { x: x2, y: y2, note: 'top (normalized 1)' },
            cp1: { x: cp1x, y: cp1y, note: 'out handle' },
            cp2: { x: cp2x, y: cp2y, note: 'in handle' },
            outEasing: kf1.easing?.outTemporal ? {
                influence: kf1.easing.outTemporal.influence,
                speed: kf1.easing.outTemporal.speed,
                normalizedSlope: kf1.easing.outTemporal.speed / (window.currentEasingData.valueDiff / window.currentEasingData.timeDiff),
                handleDeltaX: cp1x - x1,
                handleDeltaY: cp1y - y1
            } : null,
            inEasing: kf2.easing?.inTemporal ? {
                influence: kf2.easing.inTemporal.influence,
                speed: kf2.easing.inTemporal.speed,
                normalizedSlope: kf2.easing.inTemporal.speed / (window.currentEasingData.valueDiff / window.currentEasingData.timeDiff),
                handleDeltaX: x2 - cp2x,
                handleDeltaY: y2 - cp2y
            } : null
        });
        
        // Draw the bezier curve with high quality
        ctx.strokeStyle = '#ffce56';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(255, 206, 86, 0.3)';
        ctx.shadowBlur = 2;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // Draw control point handles with improved styling
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        
        // Handle from first keyframe
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(cp1x, cp1y);
        ctx.stroke();
        
        // Handle to second keyframe
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(cp2x, cp2y);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // Store handle positions for interaction
        const canvas = document.getElementById('valueChart');
        window.currentHandles = {
            handle1: { x: cp1x, y: cp1y, keyframe: kf1, type: 'out' },
            handle2: { x: cp2x, y: cp2y, keyframe: kf2, type: 'in' },
            canvasRect: canvas.getBoundingClientRect(),
            devicePixelRatio: window.devicePixelRatio || 1
        };
        
        console.log('2-Point handles stored:', window.currentHandles);
        
        // Draw control points with larger, more visible handles
        ctx.fillStyle = '#66ccff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Draw handle 1 with enhanced visibility
        ctx.beginPath();
        ctx.arc(cp1x, cp1y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Add inner circle for better visibility
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cp1x, cp1y, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw handle 2 with enhanced visibility
        ctx.fillStyle = '#66ccff';
        ctx.beginPath();
        ctx.arc(cp2x, cp2y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Add inner circle for better visibility
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cp2x, cp2y, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Initialize handle editing after drawing
        setTimeout(() => {
            console.log('Initializing 2-point handle editing...');
            const hasHandles = !!window.currentHandles;
            console.log('currentHandles available:', hasHandles);
            if (hasHandles) {
                console.log('currentHandles data:', window.currentHandles);
                
                // 現在のグラフの値を表示
                const normalizedOut = window.normalized2PointSpeeds?.outSpeed || 0;
                const normalizedOutInf = window.normalized2PointSpeeds?.outInfluence || 0;
                const normalizedIn = window.normalized2PointSpeeds?.inSpeed || 0;
                const normalizedInInf = window.normalized2PointSpeeds?.inInfluence || 0;
                
                const settingsOut = currentEasingSettings?.outTemporal;
                const settingsIn = currentEasingSettings?.inTemporal;
                
                updateOutput(`[2点初期化] Graph: out=${normalizedOut.toFixed(2)}/${normalizedOutInf.toFixed(1)}, in=${normalizedIn.toFixed(2)}/${normalizedInInf.toFixed(1)} | Settings: out=${settingsOut?.speed.toFixed(2) || 'null'}/${settingsOut?.influence.toFixed(1) || 'null'}, in=${settingsIn?.speed.toFixed(2) || 'null'}/${settingsIn?.influence.toFixed(1) || 'null'}`);
            }
            initializeHandleEditing();
        }, 100);
    }
    
    /**
     * Draw keyframe point
     */
    function drawKeyframePoint(ctx, x, y, color, label) {
        // Diamond shape
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x, y + 6);
        ctx.lineTo(x - 6, y);
        ctx.closePath();
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 18);
    }
    
    /**
     * Draw easing information text
     */
    function drawEasingInfo(ctx, kf1, kf2, width, height) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        
        let y = 20;
        ctx.fillText(`Property: ${kf1.propertyName}`, 10, y);
        y += 14;
        
        // 固定値で0→1の変化を表示
        ctx.fillText(`Value: 0.0 → 1.0`, 10, y);
        y += 14;
        
        const timeDiff = kf2.time - kf1.time;
        ctx.fillText(`Duration: ${timeDiff.toFixed(3)}s`, 10, y);
        y += 14;
        
        // ハンドル情報を傾きとして表示（修正版）
        if (kf1.easing && kf1.easing.outTemporal) {
            const correctedSpeed = isPositionProperty(kf1.propertyType) ?
                calculateValueDifference(kf1.value, kf2.value) / (kf2.time - kf1.time) :
                kf1.easing.outTemporal.speed;
            const slope = correctedSpeed / 100;
            ctx.fillText(`Out Handle: slope=${slope.toFixed(2)} len=${kf1.easing.outTemporal.influence.toFixed(0)}%`, 10, y);
            y += 14;
        }
        
        if (kf2.easing && kf2.easing.inTemporal) {
            const correctedSpeed = isPositionProperty(kf2.propertyType) ?
                calculateValueDifference(kf1.value, kf2.value) / (kf2.time - kf1.time) :
                kf2.easing.inTemporal.speed;
            const slope = correctedSpeed / 100;
            ctx.fillText(`In Handle: slope=${slope.toFixed(2)} len=${kf2.easing.inTemporal.influence.toFixed(0)}%`, 10, y);
            y += 14;
        }
        
        // 修正されたspeed値も表示（参考用）
        if (kf1.easing && kf1.easing.outTemporal) {
            const correctedSpeed = isPositionProperty(kf1.propertyType) ?
                calculateValueDifference(kf1.value, kf2.value) / (kf2.time - kf1.time) :
                kf1.easing.outTemporal.speed;
            ctx.fillText(`Corrected Out: spd=${(correctedSpeed / 100).toFixed(2)} inf=${kf1.easing.outTemporal.influence.toFixed(0)}%`, 10, y);
            y += 14;
        }
        
        if (kf2.easing && kf2.easing.inTemporal) {
            const correctedSpeed = isPositionProperty(kf2.propertyType) ?
                calculateValueDifference(kf1.value, kf2.value) / (kf2.time - kf1.time) :
                kf2.easing.inTemporal.speed;
            ctx.fillText(`Corrected In: spd=${(correctedSpeed / 100).toFixed(2)} inf=${kf2.easing.inTemporal.influence.toFixed(0)}%`, 10, y);
        }
    }

    /**
     * 出力エリアの更新
     */
    function updateOutput(message) {
        const outputElement = document.getElementById('output');
        if (outputElement) {
            // 追加表示（上書きしない）
            const p = document.createElement('p');
            p.textContent = message;
            outputElement.appendChild(p);
            // 自動スクロール
            outputElement.scrollTop = outputElement.scrollHeight;
        }
        console.log('AGraph Extension Output:', message);
    }

    /**
     * カスタムアラートダイアログを表示
     */
    function showCustomAlert(message) {
        // オーバーレイを作成
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // ダイアログボックス
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 6px;
            padding: 20px;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        
        // メッセージテキスト
        const messageText = document.createElement('div');
        messageText.textContent = message;
        messageText.style.cssText = `
            color: #fff;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 20px;
            white-space: pre-line;
        `;
        
        // OKボタン
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = `
            background: #36a2eb;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 8px 24px;
            font-size: 14px;
            cursor: pointer;
            float: right;
        `;
        okButton.addEventListener('mouseenter', function() {
            this.style.background = '#2d8cc8';
        });
        okButton.addEventListener('mouseleave', function() {
            this.style.background = '#36a2eb';
        });
        okButton.addEventListener('click', function() {
            document.body.removeChild(overlay);
        });
        
        dialog.appendChild(messageText);
        dialog.appendChild(okButton);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Escキーでも閉じる
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                if (overlay.parentNode) {
                    document.body.removeChild(overlay);
                }
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * カスタムプロンプトダイアログを表示
     */
    function showCustomPrompt(message, defaultValue = '') {
        return new Promise((resolve) => {
            // オーバーレイを作成
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // ダイアログボックス
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2a2a2a;
                border: 1px solid #555;
                border-radius: 6px;
                padding: 20px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            `;
            
            // メッセージテキスト
            const messageText = document.createElement('div');
            messageText.textContent = message;
            messageText.style.cssText = `
                color: #fff;
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 12px;
            `;
            
            // 入力フィールド
            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaultValue;
            input.style.cssText = `
                width: 100%;
                background: #1a1a1a;
                color: #fff;
                border: 1px solid #555;
                border-radius: 4px;
                padding: 8px;
                font-size: 14px;
                margin-bottom: 20px;
                box-sizing: border-box;
            `;
            
            // ボタンコンテナ
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            `;
            
            // Cancelボタン
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.cssText = `
                background: #555;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 8px 24px;
                font-size: 14px;
                cursor: pointer;
            `;
            cancelButton.addEventListener('mouseenter', function() {
                this.style.background = '#666';
            });
            cancelButton.addEventListener('mouseleave', function() {
                this.style.background = '#555';
            });
            cancelButton.addEventListener('click', function() {
                document.body.removeChild(overlay);
                resolve(null);
            });
            
            // OKボタン
            const okButton = document.createElement('button');
            okButton.textContent = 'OK';
            okButton.style.cssText = `
                background: #36a2eb;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 8px 24px;
                font-size: 14px;
                cursor: pointer;
            `;
            okButton.addEventListener('mouseenter', function() {
                this.style.background = '#2d8cc8';
            });
            okButton.addEventListener('mouseleave', function() {
                this.style.background = '#36a2eb';
            });
            okButton.addEventListener('click', function() {
                const value = input.value;
                document.body.removeChild(overlay);
                resolve(value);
            });
            
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(okButton);
            
            dialog.appendChild(messageText);
            dialog.appendChild(input);
            dialog.appendChild(buttonContainer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // 入力フィールドにフォーカス
            setTimeout(() => input.focus(), 100);
            
            // Enterキーで送信
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    okButton.click();
                }
            });
            
            // Escキーでキャンセル
            const escHandler = function(e) {
                if (e.key === 'Escape') {
                    if (overlay.parentNode) {
                        document.body.removeChild(overlay);
                        resolve(null);
                    }
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * カスタム確認ダイアログを表示
     */
    function showCustomConfirm(message) {
        return new Promise((resolve) => {
            // オーバーレイを作成
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // ダイアログボックス
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2a2a2a;
                border: 1px solid #555;
                border-radius: 6px;
                padding: 20px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            `;
            
            // メッセージテキスト
            const messageText = document.createElement('div');
            messageText.textContent = message;
            messageText.style.cssText = `
                color: #fff;
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 20px;
                white-space: pre-line;
            `;
            
            // ボタンコンテナ
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            `;
            
            // Cancelボタン
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.cssText = `
                background: #555;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 8px 24px;
                font-size: 14px;
                cursor: pointer;
            `;
            cancelButton.addEventListener('mouseenter', function() {
                this.style.background = '#666';
            });
            cancelButton.addEventListener('mouseleave', function() {
                this.style.background = '#555';
            });
            cancelButton.addEventListener('click', function() {
                document.body.removeChild(overlay);
                resolve(false);
            });
            
            // OKボタン
            const okButton = document.createElement('button');
            okButton.textContent = 'OK';
            okButton.style.cssText = `
                background: #e74c3c;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 8px 24px;
                font-size: 14px;
                cursor: pointer;
            `;
            okButton.addEventListener('mouseenter', function() {
                this.style.background = '#c0392b';
            });
            okButton.addEventListener('mouseleave', function() {
                this.style.background = '#e74c3c';
            });
            okButton.addEventListener('click', function() {
                document.body.removeChild(overlay);
                resolve(true);
            });
            
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(okButton);
            
            dialog.appendChild(messageText);
            dialog.appendChild(buttonContainer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Escキーでキャンセル
            const escHandler = function(e) {
                if (e.key === 'Escape') {
                    if (overlay.parentNode) {
                        document.body.removeChild(overlay);
                        resolve(false);
                    }
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * 3択ダイアログを表示（Cancel / Merge / Replace）
     */
    function showImportDialog(message) {
        return new Promise((resolve) => {
            // オーバーレイを作成
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // ダイアログボックス
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2a2a2a;
                border: 1px solid #555;
                border-radius: 6px;
                padding: 20px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            `;
            
            // メッセージテキスト
            const messageText = document.createElement('div');
            messageText.textContent = message;
            messageText.style.cssText = `
                color: #fff;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 20px;
                white-space: pre-line;
            `;
            
            // ボタンコンテナ
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            `;
            
            const closeDialog = (result) => {
                if (overlay.parentNode) {
                    document.body.removeChild(overlay);
                }
                document.removeEventListener('keydown', escHandler);
                resolve(result);
            };
            
            // Cancelボタン
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.cssText = `
                background: #555;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 8px 24px;
                font-size: 14px;
                cursor: pointer;
            `;
            cancelButton.addEventListener('mouseenter', function() {
                this.style.background = '#666';
            });
            cancelButton.addEventListener('mouseleave', function() {
                this.style.background = '#555';
            });
            cancelButton.addEventListener('click', () => closeDialog('cancel'));
            
            // Mergeボタン
            const mergeButton = document.createElement('button');
            mergeButton.textContent = 'Merge';
            mergeButton.style.cssText = `
                background: #00a0c8;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 8px 24px;
                font-size: 14px;
                cursor: pointer;
            `;
            mergeButton.addEventListener('mouseenter', function() {
                this.style.background = '#008fb3';
            });
            mergeButton.addEventListener('mouseleave', function() {
                this.style.background = '#00a0c8';
            });
            mergeButton.addEventListener('click', () => closeDialog('merge'));
            
            // Replaceボタン
            const replaceButton = document.createElement('button');
            replaceButton.textContent = 'Replace';
            replaceButton.style.cssText = `
                background: #e74c3c;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 8px 24px;
                font-size: 14px;
                cursor: pointer;
            `;
            replaceButton.addEventListener('mouseenter', function() {
                this.style.background = '#c0392b';
            });
            replaceButton.addEventListener('mouseleave', function() {
                this.style.background = '#e74c3c';
            });
            replaceButton.addEventListener('click', () => closeDialog('replace'));
            
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(mergeButton);
            buttonContainer.appendChild(replaceButton);
            
            dialog.appendChild(messageText);
            dialog.appendChild(buttonContainer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Escキーでキャンセル
            const escHandler = function(e) {
                if (e.key === 'Escape') {
                    closeDialog('cancel');
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * 3点モード用ハンドル編集機能の初期化
     */
    function initialize3PointHandleEditing() {
        const canvas = document.getElementById('valueChart');
        if (!canvas) {
            console.error('Canvas not found for 3-point handle editing');
            updateOutput('3点モード: キャンバスが見つかりません');
            return;
        }

        if (!window.current3PointHandles) {
            console.error('No 3-point handles data available');
            updateOutput('3点モード: ハンドルデータが利用できません');
            return;
        }

        if (!window.currentEasingData) {
            console.error('No easing data available');
            updateOutput('3点モード: イージングデータが利用できません');
            return;
        }

        console.log('Initializing 3-point handle editing with data:', window.current3PointHandles);
        updateOutput(`3点モード: ハンドル編集機能が有効になりました (4ハンドル)`);

        // 既存のイベントリスナーを削除
        if (canvas._mouseDownHandler) {
            canvas.removeEventListener('mousedown', canvas._mouseDownHandler);
            canvas.removeEventListener('mousemove', canvas._mouseMoveHandler);
            canvas.removeEventListener('mouseup', canvas._mouseUpHandler);
            canvas.removeEventListener('mouseleave', canvas._mouseLeaveHandler);
        }
        
        let dragOffset = { x: 0, y: 0 };
        let dragHandle = null;
        let isDragging = false;
        let isShiftPressed = false;

        // マウスイベントの処理
        const mouseDownHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            console.log('Mouse down at:', mouseX, mouseY);

            // 中央点（中間点）のドラッグチェック
            const canvasInfo = window.currentEasingData.canvasInfo;
            const centerPointDistance = Math.sqrt(
                Math.pow(mouseX - canvasInfo.x2, 2) + 
                Math.pow(mouseY - canvasInfo.y2, 2)
            );
            
            if (centerPointDistance <= 15) {
                isDragging = true;
                dragHandle = { type: 'centerPoint', x: canvasInfo.x2, y: canvasInfo.y2 };
                dragOffset.x = mouseX - canvasInfo.x2;
                dragOffset.y = mouseY - canvasInfo.y2;
                shiftConstraintDirection = null; // Shift制約方向をリセット
                canvas.style.cursor = 'move';
                console.log('Center point selected for value editing');
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // すべてのハンドルとの距離を確認
            const allHandles = [
                window.current3PointHandles.handle1_out,
                window.current3PointHandles.handle1_in,
                window.current3PointHandles.handle2_out,
                window.current3PointHandles.handle2_in
            ];
            
            const handleRadius = 15; // クリック範囲を少し大きく

            for (const handle of allHandles) {
                if (!handle) continue;
                
                const distance = Math.sqrt(
                    Math.pow(mouseX - handle.x, 2) + 
                    Math.pow(mouseY - handle.y, 2)
                );
                
                console.log('Checking handle', handle.type, 'at', handle.x, handle.y, 'distance:', distance);
                
                if (distance <= handleRadius) {
                    isDragging = true;
                    dragHandle = handle;
                    dragOffset.x = mouseX - handle.x;
                    dragOffset.y = mouseY - handle.y;
                    shiftConstraintDirection = null; // Shift制約方向をリセット
                    canvas.style.cursor = 'move';
                    console.log('3-Point handle selected for dragging:', handle.type);
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }
            
            console.log('No handle found at click position');
        };

        const mouseMoveHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            // Shift/Altキーの状態を更新
            isShiftPressed = e.shiftKey;
            isAltPressed = e.altKey;

            if (isDragging && dragHandle) {
                if (dragHandle.type === 'centerPoint') {
                    // 中央点の値と時間を変更
                    const canvasInfo = window.currentEasingData.canvasInfo;
                    let newX = mouseX - dragOffset.x;
                    let newY = mouseY - dragOffset.y;
                    
                    // 中点の移動可能範囲を制限（0と1に厳密に一致させない）
                    const marginPixels = 5; // 最小マージン（ピクセル）
                    const totalWidth = canvasInfo.x3 - canvasInfo.x1; // 0-1区間の総ピクセル幅
                    const marginTime = marginPixels / totalWidth; // ピクセルを0-1時間値に変換
                    
                    updateOutput(`中点制限: ${marginTime.toFixed(4)} - ${(1 - marginTime).toFixed(4)} (マージン: ${marginTime.toFixed(4)})`);
                    
                    const centerMinX = canvasInfo.x1 + marginPixels; // 0より少し右
                    const centerMaxX = canvasInfo.x3 - marginPixels; // 1より少し左
                    newX = Math.max(centerMinX, Math.min(centerMaxX, newX));
                    
                    // Shiftキーが押されている場合、X/Y軸固定
                    if (isShiftPressed) {
                        // 初期移動方向に基づいて軸を決定
                        if (shiftConstraintDirection === null) {
                            const initialDeltaX = Math.abs(newX - dragHandle.x);
                            const initialDeltaY = Math.abs(newY - dragHandle.y);
                            
                            // 一定以上動いた時点で方向を決定
                            if (initialDeltaX > 5 || initialDeltaY > 5) {
                                shiftConstraintDirection = initialDeltaX > initialDeltaY ? 'horizontal' : 'vertical';
                                console.log('Center point Shift constraint direction determined:', shiftConstraintDirection);
                            }
                        }
                        
                        // 決定した方向に制約を適用
                        if (shiftConstraintDirection === 'horizontal') {
                            newY = dragHandle.y; // Y座標を固定（水平移動）
                        } else if (shiftConstraintDirection === 'vertical') {
                            newX = dragHandle.x; // X座標を固定（垂直移動）
                        }
                    }
                    
                    // X座標を時間に制限（0〜1の範囲）
                    const minX = canvasInfo.centerX - canvasInfo.curveWidth/2;  // 0の位置
                    const maxX = canvasInfo.centerX + canvasInfo.curveWidth/2;  // 1の位置
                    newX = Math.max(minX, Math.min(maxX, newX));
                    
                    // Y座標は無制限（制限を削除）
                    // newY = newY; // Y軸無制限
                    
                    // X座標から時間を逆算（0〜1の範囲）
                    const timeProgress = (newX - (canvasInfo.centerX - canvasInfo.curveWidth/2)) / canvasInfo.curveWidth;
                    const newTime = Math.max(0, Math.min(1, timeProgress));
                    
                    // Y座標から正規化値を逆算（0〜1の範囲）
                    const normalizedValue = (canvasInfo.centerY + canvasInfo.curveHeight/2 - newY) / canvasInfo.curveHeight;
                    
                    // 中間点の時間と値を更新（正規化値）
                    window.currentEasingData.keyframes[1].time = newTime;
                    window.currentEasingData.keyframes[1].value = normalizedValue;  // 正規化値（0-1）
                    window.currentEasingData.value2 = normalizedValue;  // 正規化値（0-1）
                    
                    // キャンバス情報を更新
                    canvasInfo.x2 = newX;
                    canvasInfo.y2 = newY;
                    
                    console.log('Center point moved to time:', newTime, 'value:', normalizedValue, '(normalized 0-1)');
                    
                    // 中点の移動に合わせてハンドルを更新
                    updateHandlesFollowingCenterPoint();
                    
                    // ハンドル位置からイージングパラメータを逆算
                    update3PointEasingFromHandles();
                    
                    // カーブを再描画
                    redraw3PointEasingCurveWithHandles();
                } else {
                    // ハンドルの新しい位置を計算
                    let newX = mouseX - dragOffset.x;
                    let newY = mouseY - dragOffset.y;

                    // ハンドルタイプに応じてX軸制限を適用（Shift制約の前に）
                    const canvasInfo = window.currentEasingData.canvasInfo;
                    if (dragHandle.type === 'handle1_out') {
                        // KF0の出力ハンドル: KF0からKF1の時間まで
                        const maxX = canvasInfo.x2; // KF1の位置まで
                        newX = Math.max(canvasInfo.x1, Math.min(maxX, newX));
                    } else if (dragHandle.type === 'handle1_in') {
                        // KF1の入力ハンドル: KF0からKF1の時間まで  
                        const minX = canvasInfo.x1; // KF0の位置まで
                        newX = Math.max(minX, Math.min(canvasInfo.x2, newX));
                    } else if (dragHandle.type === 'handle2_out') {
                        // KF1の出力ハンドル: KF1からKF2の時間まで
                        const maxX = canvasInfo.x3; // KF2の位置まで
                        newX = Math.max(canvasInfo.x2, Math.min(maxX, newX));
                    } else if (dragHandle.type === 'handle2_in') {
                        // KF2の入力ハンドル: KF1からKF2の時間まで
                        const minX = canvasInfo.x2; // KF1の位置まで
                        newX = Math.max(minX, Math.min(canvasInfo.x3, newX));
                    }

                    // 中点ハンドルの連動処理
                    // 通常ドラッグ: 連動あり
                    // Shiftドラッグ: 吸着＋連動あり  
                    // Altドラッグ: 連動なし
                    // Shift+Altドラッグ: 吸着のみ、連動なし
                    const shouldLinkHandles = !isAltPressed && (dragHandle.type === 'handle1_in' || dragHandle.type === 'handle2_out');
                    
                    if (shouldLinkHandles) {
                        // 反対側のハンドルの現在の長さを保存
                        const handles = window.current3PointHandles;
                        const canvasInfo = window.currentEasingData.canvasInfo;
                        const centerX = canvasInfo.x2;
                        const centerY = canvasInfo.y2;
                        
                        let otherHandle, otherDistance;
                        
                        if (dragHandle.type === 'handle1_in') {
                            otherHandle = handles.handle2_out;
                        } else if (dragHandle.type === 'handle2_out') {
                            otherHandle = handles.handle1_in;
                        }
                        
                        if (otherHandle) {
                            // 反対側ハンドルの現在の距離を保存
                            const otherDeltaX = otherHandle.x - centerX;
                            const otherDeltaY = otherHandle.y - centerY;
                            otherDistance = Math.sqrt(otherDeltaX * otherDeltaX + otherDeltaY * otherDeltaY);
                        }
                        
                        // ドラッグハンドルにShift制約を適用（連動前に）
                        if (isShiftPressed) {
                            // ハンドルタイプに応じて基準点を決定
                            let baseX, baseY;
                            if (dragHandle.type === 'handle1_out') {
                                baseX = canvasInfo.x1;  // KF0の位置
                                baseY = canvasInfo.y1;
                            } else if (dragHandle.type === 'handle1_in' || dragHandle.type === 'handle2_out') {
                                baseX = canvasInfo.x2;  // KF1（中点）の位置
                                baseY = canvasInfo.y2;
                            } else if (dragHandle.type === 'handle2_in') {
                                baseX = canvasInfo.x3;  // KF2の位置
                                baseY = canvasInfo.y3;
                            }
                            
                            // 基準点からハンドルへのベクトルの角度を計算
                            const deltaX = newX - baseX;
                            const deltaY = newY - baseY;
                            const currentAngle = Math.atan2(deltaY, deltaX);
                            
                            // 最も近い基準角度（水平/垂直）にスナップ
                            const snappedAngle = snapAngleToCardinal(currentAngle);
                            
                            // 現在の距離を保持して、スナップした角度で新しい位置を計算
                            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                            newX = baseX + distance * Math.cos(snappedAngle);
                            newY = baseY + distance * Math.sin(snappedAngle);
                        }
                        
                        // ドラッグハンドルの位置を更新
                        dragHandle.x = newX;
                        dragHandle.y = newY;
                        
                        // 反対側ハンドルを角度連動させる（距離は保持）
                        if (otherHandle && otherDistance !== undefined) {
                            const dragDeltaX = dragHandle.x - centerX;
                            const dragDeltaY = dragHandle.y - centerY;
                            const dragAngle = Math.atan2(dragDeltaY, dragDeltaX);
                            const otherAngle = dragAngle + Math.PI; // 180度反対
                            
                            let otherNewX = centerX + Math.cos(otherAngle) * otherDistance;
                            let otherNewY = centerY + Math.sin(otherAngle) * otherDistance;
                            
                            // Shiftドラッグ時は反対側ハンドルにも角度制約を適用
                            if (isShiftPressed) {
                                const otherDeltaX = otherNewX - centerX;
                                const otherDeltaY = otherNewY - centerY;
                                const otherCurrentAngle = Math.atan2(otherDeltaY, otherDeltaX);
                                const otherSnappedAngle = snapAngleToCardinal(otherCurrentAngle);
                                
                                otherNewX = centerX + otherDistance * Math.cos(otherSnappedAngle);
                                otherNewY = centerY + otherDistance * Math.sin(otherSnappedAngle);
                            }
                            
                            otherHandle.x = otherNewX;
                            otherHandle.y = otherNewY;
                        }
                    } else {
                        // 連動なしの場合のShift制約適用
                        if (isShiftPressed) {
                            const canvasInfo = window.currentEasingData.canvasInfo;
                            
                            // ハンドルタイプに応じて基準点を決定
                            let baseX, baseY;
                            if (dragHandle.type === 'handle1_out') {
                                baseX = canvasInfo.x1;  // KF0の位置
                                baseY = canvasInfo.y1;
                            } else if (dragHandle.type === 'handle1_in' || dragHandle.type === 'handle2_out') {
                                baseX = canvasInfo.x2;  // KF1（中点）の位置
                                baseY = canvasInfo.y2;
                            } else if (dragHandle.type === 'handle2_in') {
                                baseX = canvasInfo.x3;  // KF2の位置
                                baseY = canvasInfo.y3;
                            }
                            
                            // 基準点からハンドルへのベクトルの角度を計算
                            const deltaX = newX - baseX;
                            const deltaY = newY - baseY;
                            const currentAngle = Math.atan2(deltaY, deltaX);
                            
                            // 最も近い基準角度（水平/垂直）にスナップ
                            const snappedAngle = snapAngleToCardinal(currentAngle);
                            
                            // 現在の距離を保持して、スナップした角度で新しい位置を計算
                            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                            newX = baseX + distance * Math.cos(snappedAngle);
                            newY = baseY + distance * Math.sin(snappedAngle);
                        }
                        
                        // 通常のハンドル位置更新（連動なし）
                        dragHandle.x = newX;
                        dragHandle.y = newY;
                    }

                    console.log('Dragging handle', dragHandle.type, 'to', newX, newY, 'with X constraint');

                    // ハンドルからイージングパラメータを逆算
                    update3PointEasingFromHandles();

                    // カーブを再描画
                    redraw3PointEasingCurveWithHandles();
                }
                
                e.preventDefault();
                e.stopPropagation();
            } else {
                // ホバー時のカーソル変更
                const canvasInfo = window.currentEasingData.canvasInfo;
                
                // 中央点のホバーチェック
                const centerPointDistance = Math.sqrt(
                    Math.pow(mouseX - canvasInfo.x2, 2) + 
                    Math.pow(mouseY - canvasInfo.y2, 2)
                );
                
                if (centerPointDistance <= 15) {
                    canvas.style.cursor = 'move'; // 全方向移動カーソル
                    return;
                }
                
                // ハンドルのホバーチェック
                const allHandles = [
                    window.current3PointHandles.handle1_out,
                    window.current3PointHandles.handle1_in,
                    window.current3PointHandles.handle2_out,
                    window.current3PointHandles.handle2_in
                ];
                
                let overHandle = false;
                for (const handle of allHandles) {
                    if (!handle) continue;
                    
                    const distance = Math.sqrt(
                        Math.pow(mouseX - handle.x, 2) + 
                        Math.pow(mouseY - handle.y, 2)
                    );
                    
                    if (distance <= 15) {
                        overHandle = true;
                        break;
                    }
                }
                
                canvas.style.cursor = overHandle ? 'pointer' : 'default';
            }
        };

        const mouseUpHandler = (e) => {
            if (isDragging && dragHandle) {
                console.log('3-Point handle drag completed:', dragHandle.type);
                
                // 中点ドラッグ終了時のinfluence自動調整
                if (dragHandle.type === 'centerPoint') {
                    console.log('✅ Center point drag completed - adjusting influence values');
                    updateOutput('✨ 中点ドラッグ終了 - influence自動調整実行中...');
                    try {
                        adjustInfluenceForCenterPointMovement();
                    } catch (error) {
                        console.error('❌ Error during influence adjustment:', error);
                        updateOutput('❌ Influence調整エラー: ' + error.message);
                    }
                } else {
                    console.log('🔍 Not center point drag, type was:', dragHandle.type);
                }
            }
            isDragging = false;
            dragHandle = null;
            isShiftPressed = false;
            isAltPressed = false;
            shiftConstraintDirection = null; // Shift制約方向をリセット
            canvas.style.cursor = 'default';
            e.preventDefault();
        };

        const mouseLeaveHandler = (e) => {
            if (isDragging && dragHandle) {
                console.log('3-Point handle drag interrupted by mouse leave');
            }
            isDragging = false;
            dragHandle = null;
            isShiftPressed = false;
            isAltPressed = false;
            shiftConstraintDirection = null; // Shift制約方向をリセット
            canvas.style.cursor = 'default';
        };

        // イベントリスナーを追加
        canvas.addEventListener('mousedown', mouseDownHandler, { capture: true });
        canvas.addEventListener('mousemove', mouseMoveHandler, { capture: true });
        canvas.addEventListener('mouseup', mouseUpHandler, { capture: true });
        canvas.addEventListener('mouseleave', mouseLeaveHandler);
        
        // イベントハンドラーを保存
        canvas._mouseDownHandler = mouseDownHandler;
        canvas._mouseMoveHandler = mouseMoveHandler;
        canvas._mouseUpHandler = mouseUpHandler;
        canvas._mouseLeaveHandler = mouseLeaveHandler;
        
        // ハンドル数を確認
        const handleCount = Object.keys(window.current3PointHandles || {}).length;
        console.log('3-Point handle editing initialized successfully with', handleCount, 'handles');
    }

    /**
     * ハンドル編集機能の初期化
     */
    function initializeHandleEditing() {
        const canvas = document.getElementById('valueChart');
        if (!canvas || !window.currentHandles) {
            console.log('Cannot initialize handle editing: canvas=' + !!canvas + ', currentHandles=' + !!window.currentHandles);
            return;
        }
        
        console.log('Initializing 2-point handle editing successfully');

        // 既存のイベントリスナーを削除（重複を避けるため）
        // キャンバスの置き換えをしないで、イベントリスナーのみクリア
        canvas.removeEventListener('mousedown', canvas._mouseDownHandler);
        canvas.removeEventListener('mousemove', canvas._mouseMoveHandler);
        canvas.removeEventListener('mouseup', canvas._mouseUpHandler);
        canvas.removeEventListener('mouseleave', canvas._mouseLeaveHandler);
        
        let dragOffset = { x: 0, y: 0 };

        // マウスイベントの処理
        const mouseDownHandler = (e) => {
            if (!window.currentHandles) return;

            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            // ハンドルとの距離を確認（device pixel ratioを考慮）
            const handles = [window.currentHandles.handle1, window.currentHandles.handle2];
            const handleRadius = 12; // クリック判定の半径を大きく

            for (const handle of handles) {
                // Canvas座標からディスプレイ座標に変換
                const displayX = handle.x;
                const displayY = handle.y;
                
                const distance = Math.sqrt(
                    Math.pow(mouseX - displayX, 2) + 
                    Math.pow(mouseY - displayY, 2)
                );
                
                console.log('Handle click detection:', {
                    mousePos: { x: mouseX, y: mouseY },
                    handlePos: { x: displayX, y: displayY },
                    distance: distance,
                    threshold: handleRadius,
                    handleType: handle.type
                });
                
                if (distance <= handleRadius) {
                    isDragging = true;
                    dragHandle = handle;
                    dragOffset.x = mouseX - displayX;
                    dragOffset.y = mouseY - displayY;
                    canvas.style.cursor = 'grabbing';
                    console.log('Started dragging handle:', handle.type);
                    e.preventDefault();
                    break;
                }
            }
        };

        const mouseMoveHandler = (e) => {
            if (!window.currentHandles) return;

            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            // Shiftキーの状態を更新
            isShiftPressed = e.shiftKey;

            if (isDragging && dragHandle) {
                // ハンドル位置を更新
                let newDisplayX = mouseX - dragOffset.x;
                let newDisplayY = mouseY - dragOffset.y;
                
                // X方向の制限を適用
                const canvasInfo = window.currentEasingData.canvasInfo;
                const x1 = canvasInfo.x1; // 開始点のX座標
                const x2 = canvasInfo.x2; // 終了点のX座標
                
                if (dragHandle.type === 'out') {
                    // out handle: 0-100%の範囲（x1からx2まで）
                    newDisplayX = Math.max(x1, Math.min(x2, newDisplayX));
                } else {
                    // in handle: -100-0%の範囲（x1からx2まで）
                    newDisplayX = Math.max(x1, Math.min(x2, newDisplayX));
                }
                
                // Shiftキーが押されている場合、ハンドルの角度を水平または垂直に吸着
                if (isShiftPressed) {
                    // ハンドルタイプに応じて基準点を決定
                    let baseX, baseY;
                    if (dragHandle.type === 'out') {
                        baseX = canvasInfo.x1;  // 開始点の位置
                        baseY = canvasInfo.y1;
                    } else {
                        baseX = canvasInfo.x2;  // 終了点の位置
                        baseY = canvasInfo.y2;
                    }
                    
                    // 基準点からハンドルへのベクトルの角度を計算
                    const deltaX = newDisplayX - baseX;
                    const deltaY = newDisplayY - baseY;
                    const currentAngle = Math.atan2(deltaY, deltaX);
                    
                    // 最も近い基準角度（水平/垂直）にスナップ
                    const snappedAngle = snapAngleToCardinal(currentAngle);
                    
                    // 現在の距離を保持して、スナップした角度で新しい位置を計算
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    newDisplayX = baseX + distance * Math.cos(snappedAngle);
                    newDisplayY = baseY + distance * Math.sin(snappedAngle);
                    
                    console.log('2-Point Shift angle constraint applied:', {
                        handleType: dragHandle.type,
                        basePoint: { baseX, baseY },
                        originalAngle: currentAngle * 180 / Math.PI,
                        snappedAngle: snappedAngle * 180 / Math.PI,
                        newPosition: { newDisplayX, newDisplayY }
                    });
                }
                
                dragHandle.x = newDisplayX;
                dragHandle.y = newDisplayY;

                // Y方向の制約をかける（キャンバス内に制限）
                const canvasRect = canvas.getBoundingClientRect();
                dragHandle.y = Math.max(0, Math.min(canvasRect.height, dragHandle.y));

                // リアルタイムでカーブを再描画
                redrawEasingCurveWithHandles();
                e.preventDefault();
            } else {
                // カーソルスタイルの更新
                const handles = [window.currentHandles.handle1, window.currentHandles.handle2];
                const handleRadius = 12;
                let overHandle = false;

                for (const handle of handles) {
                    const displayX = handle.x;
                    const displayY = handle.y;
                    const distance = Math.sqrt(
                        Math.pow(mouseX - displayX, 2) + 
                        Math.pow(mouseY - displayY, 2)
                    );
                    
                    if (distance <= handleRadius) {
                        overHandle = true;
                        break;
                    }
                }

                canvas.style.cursor = overHandle ? 'grab' : 'default';
            }
        };

        const mouseUpHandler = (e) => {
            if (isDragging && dragHandle) {
                console.log('Finished dragging handle:', dragHandle.type, 'Shift pressed:', e.shiftKey);
                // After Effectsにイージング変更を適用
                applyEasingChanges(dragHandle);
            }
            
            isDragging = false;
            dragHandle = null;
            isShiftPressed = false;
            canvas.style.cursor = 'default';
        };

        const mouseLeaveHandler = () => {
            if (isDragging && dragHandle) {
                console.log('Mouse left canvas while dragging');
            }
            isDragging = false;
            dragHandle = null;
            isShiftPressed = false;
            canvas.style.cursor = 'default';
        };

        // イベントリスナーを追加
        canvas.addEventListener('mousedown', mouseDownHandler);
        canvas.addEventListener('mousemove', mouseMoveHandler);
        canvas.addEventListener('mouseup', mouseUpHandler);
        canvas.addEventListener('mouseleave', mouseLeaveHandler);
        
        // イベントハンドラーを保存（後で削除できるように）
        canvas._mouseDownHandler = mouseDownHandler;
        canvas._mouseMoveHandler = mouseMoveHandler;
        canvas._mouseUpHandler = mouseUpHandler;
        canvas._mouseLeaveHandler = mouseLeaveHandler;
        
        console.log('Handle editing initialized for canvas:', canvas);
    }

    /**
     * 2つのキーフレーム間の値差分を計算（originalValueを使用）
     */
    function calculateSegmentValueDiff(kf1, kf2) {
        const originalVal1 = kf1.originalValue || kf1.value;
        const originalVal2 = kf2.originalValue || kf2.value;
        
        if (isPositionProperty(kf1)) {
            // 位置プロパティ：ベクトル距離
            if (Array.isArray(originalVal1) && Array.isArray(originalVal2)) {
                let diffVector = [];
                const dimensions = Math.min(originalVal1.length, originalVal2.length);
                for (let d = 0; d < dimensions; d++) {
                    diffVector.push(originalVal2[d] - originalVal1[d]);
                }
                return calculateMagnitude(diffVector);
            } else {
                return Math.abs(originalVal2 - originalVal1);
            }
        } else {
            // 非位置プロパティ：単次元値の差
            const value1 = Array.isArray(originalVal1) ? originalVal1[0] : originalVal1;
            const value2 = Array.isArray(originalVal2) ? originalVal2[0] : originalVal2;
            return Math.abs(value2 - value1);
        }
    }

    /**
     * 3点モード用: ハンドルからイージングパラメータを逆算
     */
    function update3PointEasingFromHandles() {
        if (!window.current3PointHandles || !window.currentEasingData) return;

        const canvasInfo = window.currentEasingData.canvasInfo;
        const keyframes = window.currentEasingData.keyframes;
        
        // 第1区間のハンドル処理 (point1 -> point2)
        if (window.current3PointHandles.handle1_out) {
            const handle = window.current3PointHandles.handle1_out;
            const dx = handle.x - canvasInfo.x1;
            const dy = handle.y - canvasInfo.y1;
            const segmentWidth = canvasInfo.x2 - canvasInfo.x1;
            const segmentHeight = canvasInfo.y2 - canvasInfo.y1;
            
            // influenceは隣のキーフレームまでの距離を100%として計算（最小値0.1）
            const normalizedInfluence = Math.abs(dx) / segmentWidth;
            const influence = Math.max(0.1, Math.min(100, normalizedInfluence * 100));
            
            // speed計算（グラフ座標そのまま使用）
            const timeFraction = influence / 100;
            const normalizedSlope = dy / segmentHeight / timeFraction;
            const speed = normalizedSlope * 100;
            
            if (!keyframes[0].easing) keyframes[0].easing = {};
            keyframes[0].easing.outTemporal = { speed: speed, influence: influence };
        }
        
        if (window.current3PointHandles.handle1_in) {
            const handle = window.current3PointHandles.handle1_in;
            const dx = handle.x - canvasInfo.x2;
            const dy = handle.y - canvasInfo.y2;
            const segmentWidth = canvasInfo.x2 - canvasInfo.x1;
            const segmentHeight = canvasInfo.y2 - canvasInfo.y1;
            
            // influenceは隣のキーフレームまでの距離を100%として計算（最小値0.1）
            const normalizedInfluence = Math.abs(dx) / segmentWidth;
            const influence = Math.max(0.1, Math.min(100, normalizedInfluence * 100));
            
            // speed計算（グラフ座標そのまま使用、In handleは逆向き）
            const timeFraction = influence / 100;
            const normalizedSlope = -dy / segmentHeight / timeFraction;
            const speed = normalizedSlope * 100;
            
            if (!keyframes[1].easing) keyframes[1].easing = {};
            keyframes[1].easing.inTemporal = { speed: speed, influence: influence };
        }
        
        // 第2区間のハンドル処理 (point2 -> point3)
        if (window.current3PointHandles.handle2_out) {
            const handle = window.current3PointHandles.handle2_out;
            const dx = handle.x - canvasInfo.x2;
            const dy = handle.y - canvasInfo.y2;
            const segmentWidth = canvasInfo.x3 - canvasInfo.x2;
            const segmentHeight = canvasInfo.y3 - canvasInfo.y2;
            
            // influenceは隣のキーフレームまでの距離を100%として計算（最小値0.1）
            const normalizedInfluence = Math.abs(dx) / segmentWidth;
            const influence = Math.max(0.1, Math.min(100, normalizedInfluence * 100));
            
            // speed計算（グラフ座標そのまま使用）
            const timeFraction = influence / 100;
            const normalizedSlope = dy / segmentHeight / timeFraction;
            const speed = normalizedSlope * 100;
            
            if (!keyframes[1].easing) keyframes[1].easing = {};
            keyframes[1].easing.outTemporal = { speed: speed, influence: influence };
        }
        
        if (window.current3PointHandles.handle2_in) {
            const handle = window.current3PointHandles.handle2_in;
            const dx = handle.x - canvasInfo.x3;
            const dy = handle.y - canvasInfo.y3;
            const segmentWidth = canvasInfo.x3 - canvasInfo.x2;
            const segmentHeight = canvasInfo.y3 - canvasInfo.y2;
            
            // influenceは隣のキーフレームまでの距離を100%として計算（最小値0.1）
            const normalizedInfluence = Math.abs(dx) / segmentWidth;
            const influence = Math.max(0.1, Math.min(100, normalizedInfluence * 100));
            
            // speed計算（グラフ座標そのまま使用、In handleは逆向き）
            const timeFraction = influence / 100;
            const normalizedSlope = -dy / segmentHeight / timeFraction;
            const speed = normalizedSlope * 100;
            
            if (!keyframes[2].easing) keyframes[2].easing = {};
            keyframes[2].easing.inTemporal = { speed: speed, influence: influence };
        }
        
        console.log('3-Point easing updated from handles with fixed base rate (same as 2-point mode):', keyframes);
    }

    /**
     * 中点ハンドルの連動処理（傾きのみ連動、長さは保持）
     */
    function updateCenterHandlesSymmetry(draggedHandle) {
        if (!window.current3PointHandles || !window.currentEasingData) {
            return;
        }

        const handles = window.current3PointHandles;
        const canvasInfo = window.currentEasingData.canvasInfo;
        const centerX = canvasInfo.x2;
        const centerY = canvasInfo.y2;

        if (draggedHandle.type === 'handle1_in') {
            // 左ハンドル（handle1_in）をドラッグ中 -> 右ハンドル（handle2_out）の傾きを連動
            const leftHandle = handles.handle1_in;
            const rightHandle = handles.handle2_out;
            
            if (leftHandle && rightHandle) {
                // 左ハンドルの中点からの相対位置（ベクトル）を取得
                const leftDeltaX = leftHandle.x - centerX;
                const leftDeltaY = leftHandle.y - centerY;
                
                // 左ハンドルの角度を計算
                const leftAngle = Math.atan2(leftDeltaY, leftDeltaX);
                
                // 右ハンドルの現在の長さを保持
                const rightDeltaX = rightHandle.x - centerX;
                const rightDeltaY = rightHandle.y - centerY;
                const rightDistance = Math.sqrt(rightDeltaX * rightDeltaX + rightDeltaY * rightDeltaY);
                
                // 右ハンドルを左ハンドルと平行（180度反対）の角度で、元の長さを保持して配置
                const rightAngle = leftAngle + Math.PI; // 180度反対
                rightHandle.x = centerX + Math.cos(rightAngle) * rightDistance;
                rightHandle.y = centerY + Math.sin(rightAngle) * rightDistance;
                
                console.log('Updated right handle angle to match left handle, preserving distance');
            }
        } else if (draggedHandle.type === 'handle2_out') {
            // 右ハンドル（handle2_out）をドラッグ中 -> 左ハンドル（handle1_in）の傾きを連動
            const rightHandle = handles.handle2_out;
            const leftHandle = handles.handle1_in;
            
            if (rightHandle && leftHandle) {
                // 右ハンドルの中点からの相対位置（ベクトル）を取得
                const rightDeltaX = rightHandle.x - centerX;
                const rightDeltaY = rightHandle.y - centerY;
                
                // 右ハンドルの角度を計算
                const rightAngle = Math.atan2(rightDeltaY, rightDeltaX);
                
                // 左ハンドルの現在の長さを保持
                const leftDeltaX = leftHandle.x - centerX;
                const leftDeltaY = leftHandle.y - centerY;
                const leftDistance = Math.sqrt(leftDeltaX * leftDeltaX + leftDeltaY * leftDeltaY);
                
                // 左ハンドルを右ハンドルと平行（180度反対）の角度で、元の長さを保持して配置
                const leftAngle = rightAngle + Math.PI; // 180度反対
                leftHandle.x = centerX + Math.cos(leftAngle) * leftDistance;
                leftHandle.y = centerY + Math.sin(leftAngle) * leftDistance;
                
                console.log('Updated left handle angle to match right handle, preserving distance');
            }
        }
    }

    /**
     * 中点の移動に合わせてハンドルを更新
     */
    function updateHandlesFollowingCenterPoint() {
        if (!window.current3PointHandles || !window.currentEasingData) {
            console.log('Cannot update handles: missing data');
            return;
        }

        const canvasInfo = window.currentEasingData.canvasInfo;
        const centerX = canvasInfo.x2;
        const centerY = canvasInfo.y2;
        
        // ハンドルの相対的な位置を維持しつつ、中点を基準に更新
        const handles = window.current3PointHandles;
        
        // handle1_in（中点の左ハンドル）を中点に追従させる
        if (handles.handle1_in) {
            // 中点からの相対的な距離を保持
            const relativeX = handles.handle1_in.x - handles.handle1_in.baseX || 0;
            const relativeY = handles.handle1_in.y - handles.handle1_in.baseY || 0;
            
            handles.handle1_in.x = centerX + relativeX;
            handles.handle1_in.y = centerY + relativeY;
            handles.handle1_in.baseX = centerX;
            handles.handle1_in.baseY = centerY;
        }
        
        // handle2_out（中点の右ハンドル）を中点に追従させる
        if (handles.handle2_out) {
            // 中点からの相対的な距離を保持
            const relativeX = handles.handle2_out.x - handles.handle2_out.baseX || 0;
            const relativeY = handles.handle2_out.y - handles.handle2_out.baseY || 0;
            
            handles.handle2_out.x = centerX + relativeX;
            handles.handle2_out.y = centerY + relativeY;
            handles.handle2_out.baseX = centerX;
            handles.handle2_out.baseY = centerY;
        }
        
        console.log('Center point handles updated to follow center point at:', centerX, centerY);
    }

    /**
     * 中点ハンドルの対称性を更新（通常ドラッグ時）
     */
    function updateCenterHandlesSymmetry(movedHandle) {
        if (!window.current3PointHandles || !window.currentEasingData) {
            return;
        }

        const canvasInfo = window.currentEasingData.canvasInfo;
        const centerX = canvasInfo.x2;
        const centerY = canvasInfo.y2;
        const handles = window.current3PointHandles;

        if (movedHandle.type === 'handle1_in') {
            // handle1_in（左ハンドル）が動いた場合、handle2_out（右ハンドル）を対称位置に移動
            const deltaX = movedHandle.x - centerX;
            const deltaY = movedHandle.y - centerY;
            
            if (handles.handle2_out) {
                handles.handle2_out.x = centerX - deltaX;  // X軸対称
                handles.handle2_out.y = centerY - deltaY;  // Y軸対称
            }
        } else if (movedHandle.type === 'handle2_out') {
            // handle2_out（右ハンドル）が動いた場合、handle1_in（左ハンドル）を対称位置に移動
            const deltaX = movedHandle.x - centerX;
            const deltaY = movedHandle.y - centerY;
            
            if (handles.handle1_in) {
                handles.handle1_in.x = centerX - deltaX;  // X軸対称
                handles.handle1_in.y = centerY - deltaY;  // Y軸対称
            }
        }

        console.log('Center handles synchronized symmetrically');
    }

    /**
     * 3点モード用: イージングカーブの再描画（ハンドル付き）
     */
    function redraw3PointEasingCurveWithHandles() {
        if (!window.current3PointHandles || !window.currentEasingData) {
            console.log('Cannot redraw 3-point curve: missing handles or easing data');
            console.log('current3PointHandles:', !!window.current3PointHandles);
            console.log('currentEasingData:', !!window.currentEasingData);
            return;
        }

        console.log('Redrawing 3-point curve with handles...');

        const canvas = document.getElementById('valueChart');
        const ctx = canvas.getContext('2d');
        
        // キャンバスサイズを取得
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // 既存のChartを破棄してカスタム描画に切り替え
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 背景色設定
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const keyframes = window.currentEasingData.keyframes;
        const canvasInfo = window.currentEasingData.canvasInfo;
        const handles = window.current3PointHandles;
        
        // グリッドを描画（0-1固定）
        draw3PointGrid(ctx, canvasInfo.centerX - canvasInfo.curveWidth/2, 
                      canvasInfo.centerY - canvasInfo.curveHeight/2, 
                      canvasInfo.curveWidth, canvasInfo.curveHeight,
                      0, 1);
        
        // ベジェカーブを描画（第1区間）
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(102, 204, 255, 0.3)';
        ctx.shadowBlur = 2;
        
        ctx.beginPath();
        ctx.moveTo(canvasInfo.x1, canvasInfo.y1);
        ctx.bezierCurveTo(handles.handle1_out.x, handles.handle1_out.y, 
                         handles.handle1_in.x, handles.handle1_in.y, 
                         canvasInfo.x2, canvasInfo.y2);
        ctx.stroke();
        
        // ベジェカーブを描画（第2区間）
        ctx.beginPath();
        ctx.moveTo(canvasInfo.x2, canvasInfo.y2);
        ctx.bezierCurveTo(handles.handle2_out.x, handles.handle2_out.y, 
                         handles.handle2_in.x, handles.handle2_in.y, 
                         canvasInfo.x3, canvasInfo.y3);
        ctx.stroke();
        
        // Shadow reset
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // ハンドルラインを描画
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        
        // 第1区間のハンドル
        ctx.beginPath();
        ctx.moveTo(canvasInfo.x1, canvasInfo.y1);
        ctx.lineTo(handles.handle1_out.x, handles.handle1_out.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(canvasInfo.x2, canvasInfo.y2);
        ctx.lineTo(handles.handle1_in.x, handles.handle1_in.y);
        ctx.stroke();
        
        // 第2区間のハンドル
        ctx.beginPath();
        ctx.moveTo(canvasInfo.x2, canvasInfo.y2);
        ctx.lineTo(handles.handle2_out.x, handles.handle2_out.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(canvasInfo.x3, canvasInfo.y3);
        ctx.lineTo(handles.handle2_in.x, handles.handle2_in.y);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // ハンドルポイントを描画
        ctx.fillStyle = '#66ccff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        const allHandles = [handles.handle1_out, handles.handle1_in, handles.handle2_out, handles.handle2_in];
        allHandles.forEach(handle => {
            if (!handle) return;
            
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // 内側の円を描画
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#66ccff';
        });
        
        // キーフレームポイントを描画
        drawKeyframePoint(ctx, canvasInfo.x1, canvasInfo.y1, '#ff6384', '0.0');
        drawKeyframePoint(ctx, canvasInfo.x2, canvasInfo.y2, '#4bc0c0', window.currentEasingData.value2.toFixed(2));
        drawKeyframePoint(ctx, canvasInfo.x3, canvasInfo.y3, '#36a2eb', '1.0');
        
        // イージング情報を描画
        draw3PointEasingInfo(ctx, keyframes, canvas.width, canvas.height);
    }

    /**
     * イージングカーブの再描画（ハンドル付き）
     */
    function redrawEasingCurveWithHandles() {
        if (!window.currentHandles || !window.currentEasingData) return;

        const canvas = document.getElementById('valueChart');
        const ctx = canvas.getContext('2d');
        
        // キャンバスサイズを取得
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // 既存のChartを破棄してカスタム描画に切り替え
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 背景色設定
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // イージングカーブの基本情報
        const kf1 = window.currentEasingData.keyframes[0];
        const kf2 = window.currentEasingData.keyframes[1];
        const handle1 = window.currentHandles.handle1;
        const handle2 = window.currentHandles.handle2;
        
        const canvasInfo = window.currentEasingData.canvasInfo;
        const x1 = canvasInfo.x1;
        const y1 = canvasInfo.y1;
        const x2 = canvasInfo.x2;
        const y2 = canvasInfo.y2;
        
        // グリッドを描画
        drawEasingGrid(ctx, canvasInfo.centerX - canvasInfo.curveWidth/2, 
                      canvasInfo.centerY - canvasInfo.curveHeight/2, 
                      canvasInfo.curveWidth, canvasInfo.curveHeight);
        
        // ベジェカーブを描画
        ctx.strokeStyle = '#ffce56';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(255, 206, 86, 0.3)';
        ctx.shadowBlur = 2;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(handle1.x, handle1.y, handle2.x, handle2.y, x2, y2);
        ctx.stroke();
        
        // Shadow reset
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // ハンドルラインを描画
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        
        // Handle from first keyframe
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(handle1.x, handle1.y);
        ctx.stroke();
        
        // Handle to second keyframe
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(handle2.x, handle2.y);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // ハンドルポイントを描画
        ctx.fillStyle = '#66ccff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Draw handle 1 with enhanced visibility
        ctx.beginPath();
        ctx.arc(handle1.x, handle1.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Add inner circle for better visibility
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(handle1.x, handle1.y, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw handle 2 with enhanced visibility
        ctx.fillStyle = '#66ccff';
        ctx.beginPath();
        ctx.arc(handle2.x, handle2.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Add inner circle for better visibility
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(handle2.x, handle2.y, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // キーフレームポイントを描画
        drawKeyframePoint(ctx, x1, y1, '#ff6384', '0.0');  // 開始点 (0)
        drawKeyframePoint(ctx, x2, y2, '#36a2eb', '1.0');  // 終了点 (1)
        
        // イージング情報を描画
        drawEasingInfo(ctx, kf1, kf2, canvas.width, canvas.height);
        
        // Shiftキーの状態表示
        if (isShiftPressed && isDragging) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('HORIZONTAL LOCK (Shift)', canvas.width / 2, 30);
        }
        
        // X方向制限の視覚的ガイドを描画
        drawXConstraintGuides(ctx, canvasInfo);
    }

    /**
     * X方向制限の視覚的ガイドを描画
     */
    function drawXConstraintGuides(ctx, canvasInfo) {
        if (!window.currentHandles || !isDragging) return;
        
        const x1 = canvasInfo.x1; // 開始点
        const x2 = canvasInfo.x2; // 終了点
        const y1 = canvasInfo.y1;
        const y2 = canvasInfo.y2;
        
        // 制限範囲を示す縦線を描画
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        
        // 開始点の縦線
        ctx.beginPath();
        ctx.moveTo(x1, canvasInfo.centerY - canvasInfo.curveHeight/2);
        ctx.lineTo(x1, canvasInfo.centerY + canvasInfo.curveHeight/2);
        ctx.stroke();
        
        // 終了点の縦線
        ctx.beginPath();
        ctx.moveTo(x2, canvasInfo.centerY - canvasInfo.curveHeight/2);
        ctx.lineTo(x2, canvasInfo.centerY + canvasInfo.curveHeight/2);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // 制限範囲の説明テキスト
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        
        if (dragHandle && dragHandle.type === 'out') {
            ctx.fillText('Out Handle: 0-100%', canvasInfo.centerX, canvasInfo.centerY + canvasInfo.curveHeight/2 + 25);
        } else if (dragHandle && dragHandle.type === 'in') {
            ctx.fillText('In Handle: -100-0%', canvasInfo.centerX, canvasInfo.centerY + canvasInfo.curveHeight/2 + 25);
        }
    }

    /**
     * イージングカーブの再描画
     */
    function redrawEasingCurve() {
        // 新しい関数を使用
        redrawEasingCurveWithHandles();
    }

    /**
     * After Effectsにイージング変更を適用
     */
    function applyEasingChanges(dragHandle) {
        // ハンドル位置から新しいspeedとinfluenceを計算
        const canvas = document.getElementById('valueChart');
        const canvasInfo = window.currentEasingData.canvasInfo;
        
        // キーフレーム位置を再計算
        const kf1 = window.currentEasingData.keyframes[0];
        const kf2 = window.currentEasingData.keyframes[1];
        
        const x1 = canvasInfo.x1;  // 左端（t=0）
        const x2 = canvasInfo.x2;  // 右端（t=1）
        const y1 = canvasInfo.y1;  // 下端（value=0）
        const y2 = canvasInfo.y2;  // 上端（value=1）

        let newInfluence, newSpeed;

        if (dragHandle.type === 'out') {
            // Out handle: 始点から右向きのハンドル
            const handleDeltaX = dragHandle.x - x1;  // 右方向への距離
            const handleDeltaY = dragHandle.y - y1;  // 下から上への距離（正=上向き、負=下向き）
            
            // influenceを計算（0.1-100の範囲）
            const rawTimeFraction = handleDeltaX / (x2 - x1);  // 実際のグラフ上の比率
            newInfluence = Math.max(0.1, Math.min(100, rawTimeFraction * 100));
            
            // speed計算用のtimeFractionは、実際のinfluence値から逆算
            // これにより、influence=0.1でも適切なspeed計算ができる
            const timeFraction = newInfluence / 100;  // influence値をそのまま使用
            
            // speedを計算
            // timeFractionが最小値以上であれば常に計算する（handleDeltaXが小さくてもOK）
            const canvasHeight = y1 - y2;  // Canvas上での値軸の高さ（正の値）
            const normalizedDeltaY = -handleDeltaY / canvasHeight;  // 正規化された値変化（上向きが正）
            const normalizedSlope = normalizedDeltaY / timeFraction;  // 正規化空間での傾き
            
            // Apply時は純粋なカーブ形状のみを使用（Analyze時のデータは使わない）
            // 基準変化率（100単位/秒）で正規化されたspeed値をそのまま使用
            newSpeed = normalizedSlope * 100; // 固定の基準変化率を使用
        } else {
            // In handle: 終点から左向きのハンドル
            const handleDeltaX = x2 - dragHandle.x;  // 左方向への距離
            const handleDeltaY = y2 - dragHandle.y;  // 上から下への距離（正=下向き、負=上向き）
            
            // influenceを計算（0.1-100の範囲）
            const rawTimeFraction = handleDeltaX / (x2 - x1);  // 実際のグラフ上の比率
            newInfluence = Math.max(0.1, Math.min(100, rawTimeFraction * 100));
            
            // speed計算用のtimeFractionは、実際のinfluence値から逆算
            // これにより、influence=0.1でも適切なspeed計算ができる
            const timeFraction = newInfluence / 100;  // influence値をそのまま使用
            
            // speedを計算
            // timeFractionが最小値以上であれば常に計算する（handleDeltaXが小さくてもOK）
            const canvasHeight = y1 - y2;  // Canvas上での値軸の高さ（正の値）
            const normalizedDeltaY = -handleDeltaY / canvasHeight;  // 正規化された値変化（上向きが正）
            const normalizedSlope = normalizedDeltaY / timeFraction;  // 正規化空間での傾き
            
            // Apply時は純粋なカーブ形状のみを使用（Analyze時のデータは使わない）
            // 正規化グラフ上のspeed値（×100）をそのまま保存
            // ExtendScriptで (speed / 100) * speedMultiplier により実数値に変換される
            newSpeed = normalizedSlope * 100;
        }

        // 現在のイージング設定を更新
        if (!currentEasingSettings) {
            currentEasingSettings = {
                outTemporal: null,
                inTemporal: null
            };
        }

        if (dragHandle.type === 'out') {
            currentEasingSettings.outTemporal = {
                speed: newSpeed,
                influence: newInfluence
            };
            
            // 🔧 graphData.keyframesも同期更新
            if (graphData && graphData.keyframes && graphData.keyframes.length > 0) {
                if (!graphData.keyframes[0].easing) {
                    graphData.keyframes[0].easing = {};
                }
                graphData.keyframes[0].easing.outTemporal = {
                    speed: newSpeed,
                    influence: newInfluence
                };
            }
        } else {
            currentEasingSettings.inTemporal = {
                speed: newSpeed,
                influence: newInfluence
            };
            
            // 🔧 graphData.keyframesも同期更新
            if (graphData && graphData.keyframes && graphData.keyframes.length > 1) {
                const lastIndex = graphData.keyframes.length - 1;
                if (!graphData.keyframes[lastIndex].easing) {
                    graphData.keyframes[lastIndex].easing = {};
                }
                graphData.keyframes[lastIndex].easing.inTemporal = {
                    speed: newSpeed,
                    influence: newInfluence
                };
            }
        }

        console.log('Updated easing settings:', currentEasingSettings);
        console.log('Handle calculation details:', {
            type: dragHandle.type,
            handlePos: { x: dragHandle.x, y: dragHandle.y },
            keyframePos: dragHandle.type === 'out' ? { x: x1, y: y1 } : { x: x2, y: y2 },
            deltaX: dragHandle.type === 'out' ? (dragHandle.x - x1) : (x2 - dragHandle.x),
            deltaY: dragHandle.type === 'out' ? (dragHandle.y - y1) : (y2 - dragHandle.y),
            normalizedSlope: dragHandle.type === 'out' ? 
                ((dragHandle.y - y1) / (dragHandle.x - x1)) : 
                ((y2 - dragHandle.y) / (x2 - dragHandle.x)),
            baseValueChangeRate: 100, // 固定の基準変化率
            influence: newInfluence,
            speed: newSpeed,
            note: 'Pure curve mode: speed = normalizedSlope * 100 (fixed base rate)'
        });

        // 変更内容をユーザーに表示
        const changeInfo = `${dragHandle.type} handle: speed=${newSpeed.toFixed(1)}, influence=${newInfluence.toFixed(2)}`;
        updateOutput(`Edited ${changeInfo}. Click Apply to update keyframes.`);
    }

    /**
     * グリッドの描画
     */
    function drawGrid(ctx, width, height) {
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        // 縦線
        for (let x = 0; x <= width; x += width / 4) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // 横線
        for (let y = 0; y <= height; y += height / 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }

    /**
     * 中点移動時にinfluenceを自動調整（100%超過を制限）
     */
    function adjustInfluenceForCenterPointMovement() {
        if (!window.currentEasingData?.keyframes || window.currentEasingData.keyframes.length < 3) {
            return;
        }
        
        if (!window.current3PointHandles || !window.currentEasingData.canvasInfo) {
            return;
        }
        
        const keyframes = window.currentEasingData.keyframes;
        const canvasInfo = window.currentEasingData.canvasInfo;
        const handles = window.current3PointHandles;
        
        // 調整前のinfluence値を記録
        const beforeInfluences = {
            kf0_out: keyframes[0].easing?.outTemporal?.influence || 0,
            kf1_in: keyframes[1].easing?.inTemporal?.influence || 0,
            kf1_out: keyframes[1].easing?.outTemporal?.influence || 0,
            kf2_in: keyframes[2].easing?.inTemporal?.influence || 0
        };
        
        // KF0からKF1への距離
        const dist01 = Math.abs(canvasInfo.x2 - canvasInfo.x1);
        // KF1からKF2への距離  
        const dist12 = Math.abs(canvasInfo.x3 - canvasInfo.x2);
        
        let adjusted = false;
        let adjustedHandles = [];
        
        // KF0の出力ハンドルの実際の距離
        const handle1OutDist = Math.abs(handles.handle1_out.x - canvasInfo.x1);
        if (handle1OutDist > dist01 && dist01 > 0) {
            if (keyframes[0].easing?.outTemporal) {
                keyframes[0].easing.outTemporal.influence = 100;
                adjustedHandles.push('handle1_out');
                adjusted = true;
            }
        }
        
        // KF1の入力ハンドルの実際の距離
        const handle1InDist = Math.abs(handles.handle1_in.x - canvasInfo.x2);
        if (handle1InDist > dist01 && dist01 > 0) {
            if (keyframes[1].easing?.inTemporal) {
                keyframes[1].easing.inTemporal.influence = 100;
                adjustedHandles.push('handle1_in');
                adjusted = true;
            }
        }
        
        // KF1の出力ハンドルの実際の距離
        const handle2OutDist = Math.abs(handles.handle2_out.x - canvasInfo.x2);
        if (handle2OutDist > dist12 && dist12 > 0) {
            if (keyframes[1].easing?.outTemporal) {
                keyframes[1].easing.outTemporal.influence = 100;
                adjustedHandles.push('handle2_out');
                adjusted = true;
            }
        }
        
        // KF2の入力ハンドルの実際の距離
        const handle2InDist = Math.abs(handles.handle2_in.x - canvasInfo.x3);
        if (handle2InDist > dist12 && dist12 > 0) {
            if (keyframes[2].easing?.inTemporal) {
                keyframes[2].easing.inTemporal.influence = 100;
                adjustedHandles.push('handle2_in');
                adjusted = true;
            }
        }
        
        if (adjusted) {
            const afterInfluences = {
                kf0_out: keyframes[0].easing?.outTemporal?.influence || 0,
                kf1_in: keyframes[1].easing?.inTemporal?.influence || 0,
                kf1_out: keyframes[1].easing?.outTemporal?.influence || 0,
                kf2_in: keyframes[2].easing?.inTemporal?.influence || 0
            };
            
            updateOutput(`調整前: ${beforeInfluences.kf0_out}, ${beforeInfluences.kf1_in}, ${beforeInfluences.kf1_out}, ${beforeInfluences.kf2_in}`);
            updateOutput(`調整後: ${afterInfluences.kf0_out}, ${afterInfluences.kf1_in}, ${afterInfluences.kf1_out}, ${afterInfluences.kf2_in}`);
            
            // ハンドル座標を記録（更新前）
            const beforeHandles = {
                h1out: `${handles.handle1_out.x.toFixed(1)},${handles.handle1_out.y.toFixed(1)}`,
                h1in: `${handles.handle1_in.x.toFixed(1)},${handles.handle1_in.y.toFixed(1)}`,
                h2out: `${handles.handle2_out.x.toFixed(1)},${handles.handle2_out.y.toFixed(1)}`,
                h2in: `${handles.handle2_in.x.toFixed(1)},${handles.handle2_in.y.toFixed(1)}`
            };
            
            try {
                // 調整されたハンドルのみ座標を再計算（X軸制限内で傾き保持）
                updateOutput(`調整されたハンドル: ${adjustedHandles.join(', ')}`);
                
                adjustedHandles.forEach(handleName => {
                    if (handleName === 'handle1_out') {
                        const baseX = canvasInfo.x1;
                        const baseY = canvasInfo.y1;
                        const limitX = canvasInfo.x2; // 隣のキーフレーム位置が制限
                        
                        // 元のハンドルの傾きを計算
                        const originalAngle = Math.atan2(handles.handle1_out.y - baseY, handles.handle1_out.x - baseX);
                        
                        // X軸の制限距離
                        const maxXDistance = Math.abs(limitX - baseX);
                        
                        // 傾きを保ったままX制限に合わせた座標を計算
                        const newX = baseX + maxXDistance; // influence=100の位置
                        const newY = baseY + maxXDistance * Math.tan(originalAngle);
                        
                        handles.handle1_out.x = newX;
                        handles.handle1_out.y = newY;
                    }
                    else if (handleName === 'handle1_in') {
                        const baseX = canvasInfo.x2;
                        const baseY = canvasInfo.y2;
                        const limitX = canvasInfo.x1; // 隣のキーフレーム位置が制限
                        
                        // 元のハンドルの傾きを計算
                        const originalAngle = Math.atan2(handles.handle1_in.y - baseY, handles.handle1_in.x - baseX);
                        
                        // X軸の制限距離
                        const maxXDistance = Math.abs(limitX - baseX);
                        
                        // 傾きを保ったままX制限に合わせた座標を計算
                        let newX = baseX - maxXDistance; // influence=100の位置
                        let newY = baseY - maxXDistance * Math.tan(originalAngle);
                        
                        // 中点ハンドルの絶対制限: X軸0-1範囲内に収める
                        newX = Math.max(canvasInfo.x1, Math.min(canvasInfo.x3, newX));
                        
                        handles.handle1_in.x = newX;
                        handles.handle1_in.y = newY;
                    }
                    else if (handleName === 'handle2_out') {
                        const baseX = canvasInfo.x2;
                        const baseY = canvasInfo.y2;
                        const limitX = canvasInfo.x3; // 隣のキーフレーム位置が制限
                        
                        // 元のハンドルの傾きを計算
                        const originalAngle = Math.atan2(handles.handle2_out.y - baseY, handles.handle2_out.x - baseX);
                        
                        // X軸の制限距離
                        const maxXDistance = Math.abs(limitX - baseX);
                        
                        // 傾きを保ったままX制限に合わせた座標を計算
                        let newX = baseX + maxXDistance; // influence=100の位置
                        let newY = baseY + maxXDistance * Math.tan(originalAngle);
                        
                        // 中点ハンドルの絶対制限: X軸0-1範囲内に収める
                        newX = Math.max(canvasInfo.x1, Math.min(canvasInfo.x3, newX));
                        
                        handles.handle2_out.x = newX;
                        handles.handle2_out.y = newY;
                    }
                    else if (handleName === 'handle2_in') {
                        const baseX = canvasInfo.x3;
                        const baseY = canvasInfo.y3;
                        const limitX = canvasInfo.x2; // 隣のキーフレーム位置が制限
                        
                        // 元のハンドルの傾きを計算
                        const originalAngle = Math.atan2(handles.handle2_in.y - baseY, handles.handle2_in.x - baseX);
                        
                        // X軸の制限距離
                        const maxXDistance = Math.abs(limitX - baseX);
                        
                        // 傾きを保ったままX制限に合わせた座標を計算
                        const newX = baseX - maxXDistance; // influence=100の位置
                        const newY = baseY - maxXDistance * Math.tan(originalAngle);
                        
                        handles.handle2_in.x = newX;
                        handles.handle2_in.y = newY;
                    }
                });
                
                updateOutput('X軸制限内で傾き保持してハンドル座標を再計算完了');
                
            } catch (error) {
                updateOutput('ハンドル座標更新エラー: ' + error.message);
            }
            
            try {
                redraw3PointEasingCurveWithHandles();
                updateOutput('redraw完了');
            } catch (error) {
                updateOutput('redrawエラー: ' + error.message);
            }
        } else {
            updateOutput('調整不要: 全ハンドルが距離制限内');
        }
    }

    // ========================================
    // レイアウト切り替え機能
    // ========================================
    
    /**
     * ウィンドウリサイズ時の処理（縦モード用）
     * ウィンドウ幅が狭い時はボタンをアイコンのみにする
     */
    function handleWindowResize() {
        const screen = document.querySelector('.screen');
        const sectionButton = document.querySelector('.section-button');
        
        if (!screen || !sectionButton) return;
        
        const layoutMode = screen.getAttribute('data-layout');
        
        // 縦モードの場合のみウィンドウ幅で判定
        if (layoutMode === 'vertical') {
            const windowWidth = window.innerWidth;
            const threshold = 200; // 200px以下でアイコンのみ
            
            if (windowWidth <= threshold) {
                sectionButton.classList.add('icon-only');
            } else {
                sectionButton.classList.remove('icon-only');
            }
        }
    }
    
    /**
     * レイアウトモードを切り替える (Vertical ⟷ Horizontal)
     */
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
        
        // 現在のグラフサイズを取得
        let currentGraphSize = 300;
        if (graphContainer && graphContainer.offsetWidth > 0) {
            currentGraphSize = graphContainer.offsetWidth;
        }
        
        // Horizontalに切り替える場合、data-layout変更前にサイズを設定
        if (newLayout === 'horizontal' && graphContainer) {
            graphContainer.style.width = `${currentGraphSize}px`;
            graphContainer.style.height = `${currentGraphSize}px`;
        }
        
        // data-layout属性を更新
        screen.setAttribute('data-layout', newLayout);
        
        // アイコンを更新 (次に切り替わるモードを表示)
        if (layoutIcon) {
            const iconSrc = newLayout === 'vertical' ? 'img/horizontal.svg' : 'img/vertical.svg';
            layoutIcon.src = iconSrc;
            console.log(`Icon updated to: ${iconSrc} (showing next mode)`);
        } else {
            console.error('Layout icon not found');
        }
        
        // レイアウトモードを保存
        csInterface.evalScript(`savePreference("layoutMode", "${newLayout}")`, function(result) {
            console.log(`Layout mode saved: ${newLayout}`);
        });
        
        // モード別の処理
        if (newLayout === 'horizontal') {
            // Horizontalモード: プリセット位置を調整、Grid column設定
            const mianDiv = document.querySelector('.mian-div');
            const sectionButton = document.querySelector('.section-button');
            if (mianDiv) {
                mianDiv.style.gridTemplateColumns = `${currentGraphSize}px 4px 1fr`;
            }
            
            // ボタンのテキスト表示切り替え
            if (sectionButton) {
                if (currentGraphSize <= 150) {
                    sectionButton.classList.add('icon-only');
                } else {
                    sectionButton.classList.remove('icon-only');
                }
            }
            
            requestAnimationFrame(() => {
                updatePresetMarginForResize(currentGraphSize);
            });
        } else {
            // Verticalモード: リセット
            const mianDiv = document.querySelector('.mian-div');
            const sectionButton = document.querySelector('.section-button');
            if (mianDiv) {
                mianDiv.style.gridTemplateColumns = '';
            }
            // 縦モードではウィンドウ幅で判定するため、ここではクラス削除しない
            if (presetSection) {
                presetSection.style.marginTop = '';
            }
            if (graphContainer) {
                graphContainer.style.width = '';
                graphContainer.style.height = '';
            }
            
            // ウィンドウ幅でボタンテキストの表示を判定
            handleWindowResize();
        }
        
        updateOutput(`Layout switched to: ${newLayout}`);
    }
    
    /**
     * 保存されたレイアウトモードを復元
     */
    function restoreLayoutMode() {
        csInterface.evalScript('loadPreference("layoutMode")', function(result) {
            try {
                const data = JSON.parse(result);
                const screen = document.querySelector('.screen');
                const layoutIcon = document.getElementById('layoutToggleIcon');
                
                if (data.success && data.value && screen) {
                    const layout = data.value;
                    screen.setAttribute('data-layout', layout);
                    
                    // アイコンを更新
                    if (layoutIcon) {
                        layoutIcon.src = layout === 'vertical' ? 'img/vertical.svg' : 'img/horizontal.svg';
                    }
                    
                    // Horizontalモードの場合、プリセット位置を初期化
                    if (layout === 'horizontal') {
                        // 保存されたグラフ幅を読み込んで初期化
                        csInterface.evalScript('loadPreference("resizeBarGraphWidth")', function(result) {
                            let graphWidth = 300; // デフォルト値
                            
                            try {
                                const data = JSON.parse(result);
                                if (data.success && data.value) {
                                    const parsedWidth = parseFloat(data.value);
                                    if (!isNaN(parsedWidth) && parsedWidth >= 50) {
                                        graphWidth = parsedWidth;
                                    }
                                }
                            } catch (e) {}
                            
                            // グラフサイズを設定
                            const graphContainer = document.querySelector('.div-graph');
                            const mianDiv = document.querySelector('.mian-div');
                            const sectionButton = document.querySelector('.section-button');
                            if (graphContainer) {
                                graphContainer.style.width = `${graphWidth}px`;
                                graphContainer.style.height = `${graphWidth}px`;
                            }
                            
                            // Grid column 1の幅を設定
                            if (mianDiv) {
                                mianDiv.style.gridTemplateColumns = `${graphWidth}px 4px 1fr`;
                            }
                            
                            // ボタンのテキスト表示切り替え
                            if (sectionButton) {
                                if (graphWidth <= 150) {
                                    sectionButton.classList.add('icon-only');
                                } else {
                                    sectionButton.classList.remove('icon-only');
                                }
                            }
                            
                            // レンダリング完了後にマージン計算
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    updatePresetMarginForResize(graphWidth);
                                });
                            });
                        });
                    }
                    
                    console.log(`Layout restored: ${layout}`);
                } else {
                    // デフォルトはvertical
                    if (screen) {
                        screen.setAttribute('data-layout', 'vertical');
                    }
                    console.log('Layout defaulted to: vertical');
                }
            } catch (e) {
                console.error('Failed to restore layout mode:', e);
            }
        });
    }

    // ========================================
    // Resizeバー機能
    // ========================================
    
    /**
     * プリセットセクションのmargin-topを動的に調整する関数
     * Horizontalモード専用
     */
    function updatePresetMarginForResize(graphSize) {
        const presetSection = document.querySelector('.section-1');
        const graphSection = document.querySelector('.section-graph');
        const screen = document.querySelector('.screen');
        const layoutMode = screen ? screen.getAttribute('data-layout') : 'vertical';
        
        if (presetSection && graphSection && layoutMode === 'horizontal') {
            // グラフセクションの実際の高さを取得
            const graphSectionHeight = graphSection.offsetHeight;
            const gap = 8; // グリッドのgap
            // グラフセクションの高さ - グラフのサイズ + gap分を引く
            const marginTop = -(graphSectionHeight) + gap * 2;
            presetSection.style.marginTop = `${marginTop}px`;
        }
    }
    
    function setupResizeBar() {
        const resizeBar = document.getElementById('resizeBar');
        const graphSection = document.querySelector('.section-graph');
        const presetSection = document.querySelector('.section-1');
        const screen = document.querySelector('.screen');
        
        if (!resizeBar || !graphSection || !presetSection || !screen) {
            return;
        }
        
        let isResizing = false;
        let startY = 0;
        let startX = 0;
        let startGraphHeight = 0;
        let startPresetHeight = 0;
        let startGraphWidth = 0;
        
        // レイアウトモードを取得
        function getLayoutMode() {
            return screen.getAttribute('data-layout') || 'vertical';
        }
        
        // 起動時に保存された位置を読み込み（Verticalモード用）
        csInterface.evalScript('loadPreference("resizeBarGraphHeight")', function(result) {
            try {
                const data = JSON.parse(result);
                if (data.success && data.value && getLayoutMode() === 'vertical') {
                    const graphHeight = parseFloat(data.value);
                    if (!isNaN(graphHeight) && graphHeight >= 50) {
                        const totalSize = 700;
                        const presetHeight = totalSize - graphHeight;
                        
                        if (presetHeight >= 50) {
                            graphSection.style.flexBasis = `${graphHeight}px`;
                            presetSection.style.flexBasis = `${presetHeight}px`;
                        }
                    }
                }
            } catch (e) {
                // 読み込み失敗時はデフォルト値を使用
            }
        });
        
        // Horizontalモードの初期化は restoreLayoutMode() で実行される
        
        resizeBar.addEventListener('mousedown', (e) => {
            isResizing = true;
            const layoutMode = getLayoutMode();
            
            if (layoutMode === 'vertical') {
                startY = e.clientY;
                startGraphHeight = graphSection.offsetHeight;
                startPresetHeight = presetSection.offsetHeight;
                document.body.style.cursor = 'ns-resize';
            } else {
                // Horizontal mode
                startX = e.clientX;
                const graphContainer = document.querySelector('.div-graph');
                if (graphContainer) {
                    startGraphWidth = graphContainer.offsetWidth;
                }
                document.body.style.cursor = 'ew-resize';
            }
            
            resizeBar.style.backgroundColor = 'var(--accent-red)';
            
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, { capture: true });
        
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            
            const layoutMode = getLayoutMode();
            
            if (layoutMode === 'vertical') {
                // Vertical mode: Y軸で高さ調整
                const deltaY = e.clientY - startY;
                let newGraphHeight = startGraphHeight + deltaY;
                let newPresetHeight = startPresetHeight - deltaY;
                
                const minSize = 50;
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
            } else {
                // Horizontal mode: X軸で幅調整
                const deltaX = e.clientX - startX;
                let newGraphWidth = startGraphWidth + deltaX;
                
                const minSize = 50;
                const maxSize = 600;
                if (newGraphWidth < minSize) newGraphWidth = minSize;
                if (newGraphWidth > maxSize) newGraphWidth = maxSize;
                
                const graphContainer = document.querySelector('.div-graph');
                const mianDiv = document.querySelector('.mian-div');
                const sectionButton = document.querySelector('.section-button');
                if (graphContainer) {
                    graphContainer.style.width = `${newGraphWidth}px`;
                    graphContainer.style.height = `${newGraphWidth}px`;
                    
                    // Grid column 1の幅を強制的にグラフサイズに固定
                    if (mianDiv) {
                        mianDiv.style.gridTemplateColumns = `${newGraphWidth}px 4px 1fr`;
                    }
                    
                    // ボタンのテキスト表示切り替え（150px以下でアイコンのみ）
                    if (sectionButton) {
                        if (newGraphWidth <= 150) {
                            sectionButton.classList.add('icon-only');
                        } else {
                            sectionButton.classList.remove('icon-only');
                        }
                    }
                    
                    // プリセットセクションのmargin-topを動的に調整
                    updatePresetMarginForResize(newGraphWidth);
                }
            }
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        const handleMouseUp = () => {
            if (isResizing) {
                isResizing = false;
                resizeBar.style.backgroundColor = '';
                document.body.style.cursor = '';
                
                const layoutMode = getLayoutMode();
                
                if (layoutMode === 'vertical') {
                    const currentGraphHeight = graphSection.offsetHeight;
                    csInterface.evalScript(`savePreference("resizeBarGraphHeight", "${currentGraphHeight}")`);
                } else {
                    const graphContainer = document.querySelector('.div-graph');
                    if (graphContainer) {
                        const currentGraphWidth = graphContainer.offsetWidth;
                        csInterface.evalScript(`savePreference("resizeBarGraphWidth", "${currentGraphWidth}")`);
                    }
                }
                
                nPointHandleEditingInitialized = false;
                
                setTimeout(() => {
                    if (graphData && graphData.keyframes && graphData.keyframes.length > 0) {
                        redrawNPointCurve(true); // forceResize=true でCanvas解像度を更新
                    }
                }, 0);
            }
        };
        
        // capture: true で優先的に処理
        document.addEventListener('mousemove', handleMouseMove, { capture: true });
        document.addEventListener('mouseup', handleMouseUp, { capture: true });
    }

    // グローバルスコープにエクスポート（デバッグ用）
    window.AGraphExtension = {
        csInterface: function() { return csInterface; },
        updateOutput: updateOutput,
        getPresetData: function() { return presetData; },
        version: '4.0.0',
        showDebugLog: function() {
            if (debugLog.length === 0) {
                alert('No debug logs available.');
                return;
            }
            alert(debugLog.join('\n'));
            debugLog = [];
        },
        showSliderDebugLog: function() {
            // スライダー操作後の状態をスナップショット取得
            const container = document.getElementById('presetCardsContainer');
            if (!container) {
                alert('No preset cards found.');
                return;
            }
            
            const firstCard = container.querySelector('.preset-card');
            if (!firstCard) {
                alert('No preset cards available.');
                return;
            }
            
            const canvas = firstCard.querySelector('.preset-card-canvas');
            if (!canvas) {
                alert('No canvas found in first card.');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            const transform = ctx.getTransform();
            const dpr = window.devicePixelRatio || 1;
            const cardSize = parseInt(firstCard.style.width) || 80;
            const displaySize = cardSize - 2;
            
            const report = [
                '=== AFTER SLIDER DEBUG INFO ===',
                `Time: ${new Date().toISOString()}`,
                `Card Size: ${cardSize}px`,
                `Display Size: ${displaySize}x${displaySize}px`,
                `Canvas Size: ${canvas.width}x${canvas.height}px`,
                `DPR: ${dpr}`,
                `Transform: a=${transform.a.toFixed(2)}, d=${transform.d.toFixed(2)}`,
                `Expected: a=${dpr.toFixed(2)}, d=${dpr.toFixed(2)}`
            ].join('\n');
            
            alert(report);
        }
    };
    
    // ui-bridge-v48.jsから使用できるようにグローバル関数として公開
    window.drawCurveThumbnail = drawCurveThumbnail;

})();