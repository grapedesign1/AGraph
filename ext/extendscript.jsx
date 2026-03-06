// AGraph Extension - ExtendScript for After Effects
// After Effects側で実行されるスクリプト

/**
 * Polyfill for Array.isArray (ExtendScript doesn't have it)
 */
if (!Array.isArray) {
    Array.isArray = function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
}

/**
 * Simple JSON.stringify polyfill for ExtendScript
 */
if (typeof JSON === 'undefined') {
    JSON = {};
}
if (typeof JSON.stringify === 'undefined') {
    JSON.stringify = function(obj, replacer, space) {
        var indent = '';
        var separator = ',';
        
        if (typeof space === 'number' && space > 0) {
            for (var i = 0; i < space; i++) {
                indent += ' ';
            }
            separator = ',\n' + indent;
        }
        
        function stringifyValue(val, currentIndent) {
            var t = typeof(val);
            if (t !== "object" || val === null) {
                if (t === "string") {
                    return '"' + val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
                }
                if (t === 'number') {
                    if (isNaN(val) || !isFinite(val)) {
                        return 'null';
                    }
                    return String(val);
                }
                if (t === 'boolean') return String(val);
                return 'null';
            } else {
                var n, v, json = [], arr = (val && val.constructor === Array);
                var nextIndent = currentIndent + indent;
                
                for (n in val) {
                    if (val.hasOwnProperty(n)) {
                        v = val[n];
                        var stringified = stringifyValue(v, nextIndent);
                        if (stringified !== undefined) {
                            json.push((arr ? "" : '"' + n + '":') + stringified);
                        }
                    }
                }
                
                var result = json.join(separator);
                return (arr ? "[" : "{") + result + (arr ? "]" : "}");
            }
        }
        
        return stringifyValue(obj, '');
    };
}
if (typeof JSON.parse === 'undefined') {
    JSON.parse = function(str) {
        return eval('(' + str + ')');
    };
}

/**
 * AGraph エクステンション用のExtendScript
 * After Effects APIを使用してアプリケーションとの連携を行う
 */

// ユーティリティ関数群
var AGraphUtils = {
    
    /**
     * プロジェクト情報を取得
     */
    getProjectInfo: function() {
        try {
            var projectInfo = {
                name: app.project.name || "無題プロジェクト",
                numItems: app.project.numItems,
                selection: app.project.selection.length,
                renderQueue: app.project.renderQueue.numItems,
                activeItem: null
            };
            
            // アクティブなアイテム情報
            if (app.project.activeItem) {
                projectInfo.activeItem = {
                    name: app.project.activeItem.name,
                    typeName: app.project.activeItem.typeName,
                    duration: app.project.activeItem.duration || 0
                };
            }
            
            return projectInfo;
        } catch (error) {
            return { error: "Failed to get project information: " + error.toString() };
        }
    },
    
    /**
     * Get information about selected layers
     */
    getSelectedLayers: function() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                return { error: "No active composition found" };
            }
            
            var layers = [];
            var selectedLayers = comp.selectedLayers;
            
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                layers.push({
                    name: layer.name,
                    index: layer.index,
                    enabled: layer.enabled,
                    locked: layer.locked,
                    shy: layer.shy,
                    inPoint: layer.inPoint,
                    outPoint: layer.outPoint,
                    startTime: layer.startTime
                });
            }
            
            return {
                compName: comp.name,
                selectedCount: selectedLayers.length,
                layers: layers
            };
        } catch (error) {
            return { error: "Failed to get selected layer information: " + error.toString() };
        }
    },
    
    /**
     * Display simple alert message
     */
    showAlert: function(message) {
        try {
            alert("AGraph Extension: " + message);
            return { success: true };
        } catch (error) {
            return { error: "Failed to show alert: " + error.toString() };
        }
    },
    
    /**
     * Create test layer
     */
    createTestLayer: function() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                return { error: "No active composition found" };
            }
            
            // Create solid layer
            var solidLayer = comp.layers.addSolid([1, 0, 0], "AGraph Test Layer", comp.width, comp.height, comp.pixelAspect);
            
            return {
                success: true,
                layerName: solidLayer.name,
                layerIndex: solidLayer.index
            };
        } catch (error) {
            return { error: "Failed to create layer: " + error.toString() };
        }
    },
    
    /**
     * Get application information
     */
    getAppInfo: function() {
        try {
            return {
                name: app.appName,
                version: app.version,
                buildNumber: app.buildNumber,
                language: app.isoLanguage,
                isWatchFolder: app.isWatchFolder,
                isRenderEngine: app.isRenderEngine,
                memoryInUse: app.memoryInUse,
                settings: {
                    autosave: app.settings.getSetting("Auto Save", "Auto Save Interval Minutes") || "N/A"
                }
            };
        } catch (error) {
            return { error: "Failed to get application information: " + error.toString() };
        }
    },
    
    /**
     * Get only selected keyframes with detailed easing information
     */
    getSelectedKeyframesOnly: function() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                return { error: "No active composition found" };
            }

            var selectedProperties = comp.selectedProperties;
            if (selectedProperties.length === 0) {
                return { error: "No properties selected. Please select keyframes in the timeline." };
            }

            var keyframeData = [];
            
            // 各選択されたプロパティを処理
            for (var i = 0; i < selectedProperties.length; i++) {
                var prop = selectedProperties[i];
                
                // キーフレームを持つプロパティかチェック
                if (prop.numKeys && prop.numKeys > 0) {
                    var selectedKeys = prop.selectedKeys;
                    
                    if (selectedKeys && selectedKeys.length > 0) {
                        // 複数区間対応のため制限を削除
                        var maxKeys = selectedKeys.length;
                        
                        for (var j = 0; j < maxKeys; j++) {
                            var keyIndex = selectedKeys[j];
                            var keyframeInfo = AGraphUtils.getDetailedKeyframeInfo(prop, keyIndex);
                            if (keyframeInfo) {
                                keyframeData.push(keyframeInfo);
                            }
                        }
                    }
                }
            }
            
            if (keyframeData.length === 0) {
                return { error: "No keyframes selected. Please select specific keyframes in the timeline." };
            }
            
            return {
                success: true,
                keyframes: keyframeData,
                totalKeyframes: keyframeData.length
            };
            
        } catch (error) {
            return { error: "Failed to get selected keyframes: " + error.toString() };
        }
    },
    
    /**
     * Get detailed keyframe information including easing
     */
    getDetailedKeyframeInfo: function(property, keyIndex) {
        try {
            var keyTime = property.keyTime(keyIndex);
            var keyValue = property.keyValue(keyIndex);
            
            // レイヤーIDと名前を取得
            var layerId = 0;
            var layerName = "Unknown Layer";
            var propName = "Unknown Property";
            
            try {
                propName = property.name || "Unknown";
                
                // プロパティグループを上に遡ってレイヤーを探す
                // depth 2 がレイヤーであることが判明
                var depth = 1;
                while (property.propertyGroup(depth)) {
                    var group = property.propertyGroup(depth);
                    
                    // indexプロパティを持ち、nameプロパティを持つものをレイヤーとみなす
                    if (group.index !== undefined && group.name !== undefined && depth >= 2) {
                        layerId = group.index;
                        layerName = group.name;
                        break;
                    }
                    depth++;
                }
            } catch (nameError) {
                // 名前取得に失敗した場合はデフォルト値のまま
            }
            
            // イージング情報を詳細に取得
            var easingInfo = {
                inTemporal: null,
                outTemporal: null,
                inSpatial: null,
                outSpatial: null,
                inInterpolationType: null,
                outInterpolationType: null
            };
            
            try {
                // テンポラルイージング（時間的な加速度）
                var inTemporal = property.keyInTemporalEase(keyIndex);
                var outTemporal = property.keyOutTemporalEase(keyIndex);
                
                if (inTemporal && inTemporal.length > 0) {
                    easingInfo.inTemporal = {
                        speed: inTemporal[0].speed,
                        influence: inTemporal[0].influence
                    };
                }
                
                if (outTemporal && outTemporal.length > 0) {
                    easingInfo.outTemporal = {
                        speed: outTemporal[0].speed,
                        influence: outTemporal[0].influence
                    };
                }
                
                // 空間的イージング（位置プロパティの場合）
                if (propName === "Position" || property.matchName === "ADBE Position") {
                    try {
                        var inSpatial = property.keyInSpatialTangent(keyIndex);
                        var outSpatial = property.keyOutSpatialTangent(keyIndex);
                        
                        if (inSpatial && inSpatial.length >= 2) {
                            easingInfo.inSpatial = {
                                x: inSpatial[0],
                                y: inSpatial[1]
                            };
                        }
                        
                        if (outSpatial && outSpatial.length >= 2) {
                            easingInfo.outSpatial = {
                                x: outSpatial[0],
                                y: outSpatial[1]
                            };
                        }
                    } catch (spatialError) {
                        // 空間的イージングが利用できない場合
                    }
                }
                
                // 補間タイプ
                easingInfo.inInterpolationType = property.keyInInterpolationType(keyIndex);
                easingInfo.outInterpolationType = property.keyOutInterpolationType(keyIndex);
                
            } catch (easingError) {
                // イージング情報取得に失敗した場合はnullのまま
            }
            
            return {
                keyIndex: keyIndex,
                time: keyTime,
                value: keyValue,
                propertyName: propName,
                layerId: layerId,
                layerName: layerName,
                propertyValueType: property.propertyValueType,
                easing: easingInfo,
                isSelected: true,
                debug: {
                    propertyValueType: property.propertyValueType,
                    propertyValueTypeName: this.getPropertyValueTypeName(property.propertyValueType),
                    valueIsArray: keyValue instanceof Array,
                    valueLength: keyValue instanceof Array ? keyValue.length : 1
                }
            };
            
        } catch (error) {
            return null;
        }
    },
    
    /**
     * プロパティタイプ名を取得するヘルパー関数
     */
    getPropertyValueTypeName: function(valueType) {
        switch (valueType) {
            case PropertyValueType.OneD: return "OneD (6144)";
            case PropertyValueType.TwoD: return "TwoD (6145)";
            case PropertyValueType.ThreeD: return "ThreeD (6146)";
            case PropertyValueType.TwoD_SPATIAL: return "TwoD_SPATIAL (6147)";
            case PropertyValueType.ThreeD_SPATIAL: return "ThreeD_SPATIAL (6148)";
            case 6413: return "Position_Special (6413)";
            case PropertyValueType.COLOR: return "COLOR (6149)";
            case PropertyValueType.CUSTOM_VALUE: return "CUSTOM_VALUE (6150)";
            case PropertyValueType.MARKER: return "MARKER (6151)";
            case PropertyValueType.LAYER_INDEX: return "LAYER_INDEX (6152)";
            case PropertyValueType.MASK_INDEX: return "MASK_INDEX (6153)";
            case PropertyValueType.SHAPE: return "SHAPE (6154)";
            case PropertyValueType.TEXT_DOCUMENT: return "TEXT_DOCUMENT (6155)";
            default: return "Unknown (" + valueType + ")";
        }
    },
    
    /**
     * Get keyframe information from selected properties (original function)
     */
    getSelectedKeyframes: function() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                return { error: "No active composition found" };
            }
            
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                return { error: "No layers selected" };
            }
            
            var keyframeData = [];
            
            // 各選択レイヤーのプロパティをチェック
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                
                // Position プロパティのキーフレームを取得
                var position = layer.transform.position;
                if (position.numKeys > 0) {
                    var positionKeys = AGraphUtils.extractKeyframes(position, "Position", layer.name);
                    keyframeData = keyframeData.concat(positionKeys);
                }
                
                // Scale プロパティのキーフレームを取得
                var scale = layer.transform.scale;
                if (scale.numKeys > 0) {
                    var scaleKeys = AGraphUtils.extractKeyframes(scale, "Scale", layer.name);
                    keyframeData = keyframeData.concat(scaleKeys);
                }
                
                // Rotation プロパティのキーフレームを取得
                var rotation = layer.transform.rotation;
                if (rotation.numKeys > 0) {
                    var rotationKeys = AGraphUtils.extractKeyframes(rotation, "Rotation", layer.name);
                    keyframeData = keyframeData.concat(rotationKeys);
                }
                
                // Opacity プロパティのキーフレームを取得
                var opacity = layer.transform.opacity;
                if (opacity.numKeys > 0) {
                    var opacityKeys = AGraphUtils.extractKeyframes(opacity, "Opacity", layer.name);
                    keyframeData = keyframeData.concat(opacityKeys);
                }
            }
            
            return {
                success: true,
                keyframes: keyframeData,
                layerCount: selectedLayers.length,
                totalKeyframes: keyframeData.length
            };
        } catch (error) {
            return { error: "Failed to get keyframe information: " + error.toString() };
        }
    },
    
    /**
     * Extract keyframe information from property
     */
    extractKeyframes: function(property, propertyName, layerName) {
        var keyframes = [];
        
        for (var i = 1; i <= property.numKeys; i++) {
            try {
                var keyTime = property.keyTime(i);
                var keyValue = property.keyValue(i);
                
                // 速度情報を取得
                var inVelocity = null;
                var outVelocity = null;
                var inInfluence = null;
                var outInfluence = null;
                
                try {
                    var inTemporal = property.keyInTemporalEase(i);
                    var outTemporal = property.keyOutTemporalEase(i);
                    
                    if (inTemporal && inTemporal.length > 0) {
                        inVelocity = inTemporal[0].speed;
                        inInfluence = inTemporal[0].influence;
                    }
                    if (outTemporal && outTemporal.length > 0) {
                        outVelocity = outTemporal[0].speed;
                        outInfluence = outTemporal[0].influence;
                    }
                } catch (velocityError) {
                    // 速度情報取得に失敗した場合はnullのまま
                }
                
                // 補間タイプ
                var inInterpolationType = null;
                var outInterpolationType = null;
                
                try {
                    inInterpolationType = property.keyInInterpolationType(i);
                    outInterpolationType = property.keyOutInterpolationType(i);
                } catch (interpError) {
                    // 補間タイプ取得に失敗した場合はnullのまま
                }
                
                var keyframe = {
                    keyIndex: i,
                    time: keyTime,
                    value: keyValue,
                    propertyName: propertyName,
                    layerName: layerName,
                    inVelocity: inVelocity,
                    outVelocity: outVelocity,
                    inInfluence: inInfluence,
                    outInfluence: outInfluence,
                    inInterpolationType: inInterpolationType,
                    outInterpolationType: outInterpolationType
                };
                
                keyframes.push(keyframe);
            } catch (keyError) {
                // 個別のキーフレーム処理でエラーが発生した場合はスキップ
                continue;
            }
        }
        
        return keyframes;
    }
};

// エクステンションから呼び出される関数
function aGraphGetProjectInfo() {
    return JSON.stringify(AGraphUtils.getProjectInfo());
}

function aGraphGetSelectedLayers() {
    return JSON.stringify(AGraphUtils.getSelectedLayers());
}

function aGraphShowAlert(message) {
    return JSON.stringify(AGraphUtils.showAlert(message));
}

function aGraphCreateTestLayer() {
    return JSON.stringify(AGraphUtils.createTestLayer());
}

function aGraphGetAppInfo() {
    return JSON.stringify(AGraphUtils.getAppInfo());
}

function aGraphGetKeyframes() {
    return JSON.stringify(AGraphUtils.getSelectedKeyframes());
}

function aGraphGetSelectedKeyframes() {
    return JSON.stringify(AGraphUtils.getSelectedKeyframesOnly());
}

function aGraphApplyEasing(easingSettings) {
    return JSON.stringify(AGraphUtils.applyEasingToSelected(easingSettings));
}

/**
 * 選択されたキーフレームにイージング設定を適用（ハンドル制限付き）
 */
AGraphUtils.applyEasingToSelected = function(easingSettings) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return { error: "No active composition found" };
        }

        var selectedProperties = comp.selectedProperties;
        if (selectedProperties.length === 0) {
            return { error: "No properties selected. Please select keyframes in the timeline." };
        }

        var appliedCount = 0;
        var debugInfo = [];
        
        debugInfo.push("Starting apply process...");
        debugInfo.push("Selected properties count: " + selectedProperties.length);
        
        // クロスプロパティ分析（複数プロパティの場合）
        var crossPropertyData = null;
        if (selectedProperties.length > 1) {
            crossPropertyData = this.analyzeCrossProperty(selectedProperties);
            debugInfo.push("Cross-property mode: " + crossPropertyData.propertyCount + " properties");
        }
        
        // 各選択されたプロパティを処理
        for (var i = 0; i < selectedProperties.length; i++) {
            var prop = selectedProperties[i];
            
            debugInfo.push("Processing property: " + (prop.name || "Unknown"));
            
            if (prop.numKeys && prop.numKeys > 0) {
                var selectedKeys = prop.selectedKeys;
                debugInfo.push("Total keys: " + prop.numKeys + ", Selected keys: " + selectedKeys.length);
                
                if (selectedKeys && selectedKeys.length > 0) {
                    // 選択されたキーフレームをソート
                    var sortedKeys = [];
                    for (var j = 0; j < selectedKeys.length; j++) {
                        sortedKeys.push(selectedKeys[j]);
                    }
                    sortedKeys.sort(function(a, b) { return a - b; });
                    
                    // 選択されたキーフレームの中での最初と最後を特定
                    var firstSelectedKey = sortedKeys[0];
                    var lastSelectedKey = sortedKeys[sortedKeys.length - 1];
                    
                    debugInfo.push("Among selected keys - First: " + firstSelectedKey + ", Last: " + lastSelectedKey);
                    
                    // 各選択されたキーフレームを処理
                    for (var k = 0; k < sortedKeys.length; k++) {
                        var keyIndex = sortedKeys[k];
                        var isFirstSelected = (keyIndex === firstSelectedKey);
                        var isLastSelected = (keyIndex === lastSelectedKey);
                        var isSingleSelected = (sortedKeys.length === 1);
                        
                        debugInfo.push("Processing key " + keyIndex + " - isFirstSelected: " + isFirstSelected + ", isLastSelected: " + isLastSelected + ", isSingle: " + isSingleSelected);
                        
                        // クロスプロパティ倍率を取得
                        var crossPropertyMultiplier = 1.0;
                        if (crossPropertyData) {
                            crossPropertyMultiplier = this.getCrossPropertyMultiplier(prop, crossPropertyData);
                            debugInfo.push("Cross-property multiplier for " + prop.name + ": " + crossPropertyMultiplier.toFixed(3));
                        }
                        
                        // イージング設定を倍率で調整
                        var adjustedEasingSettings = this.adjustEasingForCrossProperty(easingSettings, crossPropertyMultiplier);
                        
                        try {
                            var success = false;
                            
                            // 1つだけ選択されている場合：何もしない
                            if (isSingleSelected) {
                                debugInfo.push("Skipped single selected key " + keyIndex + " - no action needed");
                                // success は false のまま、appliedCount には加算しない
                            }
                            // 複数選択の場合
                            else {
                                // 選択された中の最初のキーフレーム：右ハンドル（out）のみ適用
                                if (isFirstSelected && adjustedEasingSettings.outTemporal) {
                                    success = AGraphUtils.applyOutHandleOnly(prop, keyIndex, adjustedEasingSettings.outTemporal);
                                    if (success) {
                                        debugInfo.push("Applied OUT handle to first selected key " + keyIndex);
                                    }
                                }
                                
                                // 選択された中の最後のキーフレーム：左ハンドル（in）のみ適用
                                if (isLastSelected && adjustedEasingSettings.inTemporal) {
                                    success = AGraphUtils.applyInHandleOnly(prop, keyIndex, adjustedEasingSettings.inTemporal);
                                    if (success) {
                                        debugInfo.push("Applied IN handle to last selected key " + keyIndex);
                                    }
                                }
                                
                                // 中間のキーフレーム（最初でも最後でもない）：両方適用
                                if (!isFirstSelected && !isLastSelected) {
                                    success = AGraphUtils.applyBothHandles(prop, keyIndex, adjustedEasingSettings);
                                    if (success) {
                                        debugInfo.push("Applied both handles to middle selected key " + keyIndex);
                                    }
                                }
                            }
                            
                            if (success) {
                                appliedCount++;
                            }
                            
                        } catch (e) {
                            debugInfo.push("Error applying to key " + keyIndex + ": " + e.toString());
                        }
                    }
                }
            }
        }
        
        return {
            success: true,
            appliedCount: appliedCount,
            message: "Applied selective easing to " + appliedCount + " keyframes",
            debugInfo: debugInfo
        };
        
    } catch (error) {
        return { 
            error: "Failed to apply easing: " + error.toString(),
            debugInfo: ["Fatal error: " + error.toString()]
        };
    }
};

/**
 * 多次元プロパティ対応の新しいイージング適用関数
 */
AGraphUtils.createEaseArray = function(property, speed, influence) {
    try {
        var valueDimensions = 1;
        
        // Spatialプロパティ（位置）のTemporalハンドルは常に1次元
        var isSpatialProperty = (property.propertyValueType === PropertyValueType.TwoD_SPATIAL || 
                                property.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
        
        if (!isSpatialProperty) {
            // Spatial以外のプロパティ（スケール、回転など）は次元判定
            try {
                var numKeys = property.numKeys;
                if (numKeys > 0) {
                    var keyValue = property.keyValue(1);
                    if (keyValue && keyValue.length) {
                        valueDimensions = keyValue.length;
                    }
                }
            } catch (e) {
                valueDimensions = 1;
            }
        }
        
        var newEase = [];
        
        // 次元数に応じて配列を作成
        for (var i = 0; i < valueDimensions; i++) {
            var actualSpeed = speed;
            newEase.push(new KeyframeEase(actualSpeed, Math.max(0.1, influence)));
        }
        
        return newEase;
    } catch (error) {
        // エラー時はデフォルト値を返す（1次元）
        var safeSpeed = (speed !== undefined && speed !== null) ? speed : 100;
        var safeInfluence = (influence !== undefined && influence !== null) ? influence : 33;
        return [new KeyframeEase(safeSpeed, Math.max(0.1, safeInfluence))];
    }
};

/**
 * プロパティタイプに応じた値差分を計算
 * commit 5b893eaのロジックを汎用化
 */
AGraphUtils.calculateDeltaY = function(val1, val2, propertyValueType) {
    var isSpatial = (propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                     propertyValueType === PropertyValueType.ThreeD_SPATIAL);
    
    if (isSpatial) {
        // Spatialプロパティ: ベクトルの長さを計算
        var sum = 0;
        for (var d = 0; d < val1.length; d++) {
            var delta = val2[d] - val1[d];
            sum += delta * delta;
        }
        return Math.sqrt(sum);
    } else if (Array.isArray(val1)) {
        // 多次元非Spatialプロパティ: X軸（value[0]）のみ使用
        return Math.abs(val2[0] - val1[0]);
    } else {
        // 1次元プロパティ
        return Math.abs(val2 - val1);
    }
};

/**
 * 符号補正を適用（非Spatialプロパティで値が減少する場合は速度を反転）
 * commit 5b893eaのロジックを汎用化
 */
/**
 * 符号補正（単純な符号反転のみ）
 * 呼び出し側で降下判定を行い、必要な場合のみこの関数を呼ぶ
 */
AGraphUtils.applySignCorrection = function(speed) {
    return -speed;
};

AGraphUtils.createMultiDimensionalEase = function(property, keyIndex, speedValues, influenceValues, valueType) {
    try {
        var newEase = [];
        
        // プロパティタイプによる分岐処理
        if (valueType === PropertyValueType.TwoD_SPATIAL || valueType === PropertyValueType.ThreeD_SPATIAL || valueType === 6413) {
            // 空間的プロパティ（位置）：単一の値で全次元に適用
            var speed = (speedValues[0] !== undefined && speedValues[0] !== null) ? speedValues[0] : 100;
            var influence = (influenceValues[0] !== undefined && influenceValues[0] !== null) ? influenceValues[0] : 33;
            newEase.push(new KeyframeEase(speed, Math.max(0.1, influence)));
        } else if (valueType === PropertyValueType.TwoD) {
            // 2次元プロパティ（スケールなど）
            if (speedValues.length === 1) {
                // 単一値の場合、両次元に同じ値を適用
                var speed = (speedValues[0] !== undefined && speedValues[0] !== null) ? speedValues[0] : 100;
                var influence = (influenceValues[0] !== undefined && influenceValues[0] !== null) ? influenceValues[0] : 33;
                newEase.push(new KeyframeEase(speed, Math.max(0.1, influence)));
                newEase.push(new KeyframeEase(speed, Math.max(0.1, influence)));
            } else {
                // 次元別に値がある場合
                for (var i = 0; i < 2; i++) {
                    var speed = (speedValues[i] !== undefined && speedValues[i] !== null) ? speedValues[i] : 
                                (speedValues[0] !== undefined && speedValues[0] !== null) ? speedValues[0] : 100;
                    var influence = (influenceValues[i] !== undefined && influenceValues[i] !== null) ? influenceValues[i] : 
                                    (influenceValues[0] !== undefined && influenceValues[0] !== null) ? influenceValues[0] : 33;
                    newEase.push(new KeyframeEase(speed, Math.max(0.1, influence)));
                }
            }
        } else if (valueType === PropertyValueType.ThreeD) {
            // 3次元プロパティ
            if (speedValues.length === 1) {
                // 単一値の場合、全次元に同じ値を適用
                var speed = (speedValues[0] !== undefined && speedValues[0] !== null) ? speedValues[0] : 100;
                var influence = (influenceValues[0] !== undefined && influenceValues[0] !== null) ? influenceValues[0] : 33;
                for (var i = 0; i < 3; i++) {
                    newEase.push(new KeyframeEase(speed, Math.max(0.1, influence)));
                }
            } else {
                // 次元別に値がある場合
                for (var i = 0; i < 3; i++) {
                    var speed = (speedValues[i] !== undefined && speedValues[i] !== null) ? speedValues[i] : 
                                (speedValues[0] !== undefined && speedValues[0] !== null) ? speedValues[0] : 100;
                    var influence = (influenceValues[i] !== undefined && influenceValues[i] !== null) ? influenceValues[i] : 
                                    (influenceValues[0] !== undefined && influenceValues[0] !== null) ? influenceValues[0] : 33;
                    newEase.push(new KeyframeEase(speed, Math.max(0.1, influence)));
                }
            }
        } else {
            // 1次元プロパティ（回転、透明度など）
            var speed = (speedValues[0] !== undefined && speedValues[0] !== null) ? speedValues[0] : 100;
            var influence = (influenceValues[0] !== undefined && influenceValues[0] !== null) ? influenceValues[0] : 33;
            newEase.push(new KeyframeEase(speed, Math.max(0.1, influence)));
        }
        
        return newEase;
    } catch (e) {
        // エラー時は既存のイージングを返す
        return property.keyInTemporalEase(keyIndex);
    }
};

/**
 * 右ハンドル（out）のみ適用
 */
AGraphUtils.applyOutHandleOnly = function(property, keyIndex, outSettings) {
    try {
        var currentInEase = property.keyInTemporalEase(keyIndex);
        var currentOutEase = property.keyOutTemporalEase(keyIndex);
        
        var valueDimensions = 1;
        try {
            var keyValue = property.valueAtKey(keyIndex);
            if (keyValue && keyValue.length) {
                valueDimensions = keyValue.length;
            }
        } catch (e) {
            valueDimensions = 1;
        }
        
        var inEaseArray = [];
        var outEaseArray = [];
        
        for (var i = 0; i < valueDimensions; i++) {
            // IN は既存値を保持
            var inEase = (currentInEase && currentInEase[i]) ? 
                new KeyframeEase(currentInEase[i].speed, currentInEase[i].influence) : 
                new KeyframeEase(0, 33.33);
            
            // OUT は新しい値を適用（JavaScriptで計算済みの実際の速度値をそのまま使用）
            var actualSpeed = outSettings.speed;  // 変換なしで直接使用
            var outEase = new KeyframeEase(actualSpeed, outSettings.influence);
            
            inEaseArray.push(inEase);
            outEaseArray.push(outEase);
        }
        
        property.setTemporalEaseAtKey(keyIndex, inEaseArray, outEaseArray);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * 左ハンドル（in）のみ適用
 */
AGraphUtils.applyInHandleOnly = function(property, keyIndex, inSettings) {
    try {
        var currentInEase = property.keyInTemporalEase(keyIndex);
        var currentOutEase = property.keyOutTemporalEase(keyIndex);
        
        var valueDimensions = 1;
        try {
            var keyValue = property.valueAtKey(keyIndex);
            if (keyValue && keyValue.length) {
                valueDimensions = keyValue.length;
            }
        } catch (e) {
            valueDimensions = 1;
        }
        
        var inEaseArray = [];
        var outEaseArray = [];
        
        for (var i = 0; i < valueDimensions; i++) {
            // IN は新しい値を適用（JavaScriptで計算済みの実際の速度値をそのまま使用）
            var actualSpeed = inSettings.speed;  // 変換なしで直接使用
            var inEase = new KeyframeEase(actualSpeed, inSettings.influence);
            
            // OUT は既存値を保持
            var outEase = (currentOutEase && currentOutEase[i]) ? 
                new KeyframeEase(currentOutEase[i].speed, currentOutEase[i].influence) : 
                new KeyframeEase(0, 33.33);
            
            inEaseArray.push(inEase);
            outEaseArray.push(outEase);
        }
        
        property.setTemporalEaseAtKey(keyIndex, inEaseArray, outEaseArray);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * 両方のハンドルを適用
 */
AGraphUtils.applyBothHandles = function(property, keyIndex, easingSettings) {
    try {
        var valueDimensions = 1;
        try {
            var keyValue = property.valueAtKey(keyIndex);
            if (keyValue && keyValue.length) {
                valueDimensions = keyValue.length;
            }
        } catch (e) {
            valueDimensions = 1;
        }
        
        var inEaseArray = [];
        var outEaseArray = [];
        
        for (var i = 0; i < valueDimensions; i++) {
            var inEase = easingSettings.inTemporal ? 
                new KeyframeEase(
                    easingSettings.inTemporal.speed,  // 変換なしで直接使用
                    easingSettings.inTemporal.influence
                ) :
                new KeyframeEase(0, 33.33);
                
            var outEase = easingSettings.outTemporal ? 
                new KeyframeEase(
                    easingSettings.outTemporal.speed,  // 変換なしで直接使用
                    easingSettings.outTemporal.influence
                ) :
                new KeyframeEase(0, 33.33);
            
            inEaseArray.push(inEase);
            outEaseArray.push(outEase);
        }
        
        property.setTemporalEaseAtKey(keyIndex, inEaseArray, outEaseArray);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * キーフレームのイージングを更新
 */
AGraphUtils.updateKeyframeEasing = function(layerIndex, propertyName, keyIndex, easingType, speed, influence) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ error: "No active composition found" });
        }

        if (layerIndex < 1 || layerIndex > comp.numLayers) {
            return JSON.stringify({ error: "Invalid layer index: " + layerIndex });
        }

        var layer = comp.layer(layerIndex);
        var property = null;

        // プロパティを取得
        try {
            if (propertyName.indexOf('.') > -1) {
                var parts = propertyName.split('.');
                property = layer;
                for (var i = 0; i < parts.length; i++) {
                    property = property.property(parts[i]);
                }
            } else {
                property = layer.property(propertyName);
            }
        } catch (propError) {
            return JSON.stringify({ error: "Property not found: " + propertyName });
        }

        if (!property || !property.numKeys || keyIndex > property.numKeys) {
            return JSON.stringify({ error: "Invalid keyframe index: " + keyIndex });
        }

        // 新しいKeyframeEaseオブジェクトを作成
        var newEase = new KeyframeEase(speed, influence);

        // イージングタイプに応じて適用
        if (easingType === 'out') {
            // アウトハンドルを更新
            var currentInEase = property.keyInTemporalEase(keyIndex);
            var inEaseArray = [];
            
            // 既存のinEaseを保持
            for (var i = 0; i < currentInEase.length; i++) {
                inEaseArray.push(currentInEase[i]);
            }
            
            // outEaseを新しい値で設定
            var outEaseArray = [];
            for (var i = 0; i < property.valueAtKey(keyIndex).length || 1; i++) {
                outEaseArray.push(newEase);
            }
            
            property.setTemporalEaseAtKey(keyIndex, inEaseArray, outEaseArray);
            
        } else if (easingType === 'in') {
            // インハンドルを更新
            var currentOutEase = property.keyOutTemporalEase(keyIndex);
            var outEaseArray = [];
            
            // 既存のoutEaseを保持
            for (var i = 0; i < currentOutEase.length; i++) {
                outEaseArray.push(currentOutEase[i]);
            }
            
            // inEaseを新しい値で設定
            var inEaseArray = [];
            for (var i = 0; i < property.valueAtKey(keyIndex).length || 1; i++) {
                inEaseArray.push(newEase);
            }
            
            property.setTemporalEaseAtKey(keyIndex, inEaseArray, outEaseArray);
        }

        return JSON.stringify({ 
            success: true, 
            message: "Easing updated successfully",
            layerIndex: layerIndex,
            propertyName: propertyName,
            keyIndex: keyIndex,
            easingType: easingType,
            speed: speed,
            influence: influence
        });

    } catch (error) {
        return JSON.stringify({ error: "Failed to update easing: " + error.toString() });
    }
};

/**
 * 正規化された速度値を実際のキーフレームの値変化率に応じた速度に変換
 */
AGraphUtils.convertNormalizedSpeedToActual = function(property, keyIndex, normalizedSpeed) {
    try {
        // 隣接するキーフレームとの値変化率を計算
        var currentTime = property.keyTime(keyIndex);
        var currentValue = property.keyValue(keyIndex);
        
        // 配列値の場合は最初の要素を使用
        if (currentValue && currentValue.length) {
            currentValue = currentValue[0];
        }
        
        var valueChangeRate = 1.0; // デフォルトは1単位/秒
        
        // 常に同じ方向で計算：現在のキーフレームから次のキーフレームへの変化を基準
        if (keyIndex < property.numKeys) {
            try {
                var nextTime = property.keyTime(keyIndex + 1);
                var nextValue = property.keyValue(keyIndex + 1);
                if (nextValue && nextValue.length) {
                    nextValue = nextValue[0];
                }
                var timeDiff = nextTime - currentTime;
                var valueDiff = nextValue - currentValue;
                if (timeDiff > 0) {
                    valueChangeRate = valueDiff / timeDiff;  // 符号を保持
                }
            } catch (e) {
                // 次のキーフレーム取得に失敗した場合は前のキーフレームを使用
                if (keyIndex > 1) {
                    try {
                        var prevTime = property.keyTime(keyIndex - 1);
                        var prevValue = property.keyValue(keyIndex - 1);
                        if (prevValue && prevValue.length) {
                            prevValue = prevValue[0];
                        }
                        var timeDiff = currentTime - prevTime;
                        var valueDiff = currentValue - prevValue;
                        if (timeDiff > 0) {
                            valueChangeRate = valueDiff / timeDiff;  // 符号を保持
                        }
                    } catch (e2) {
                        // どちらも失敗した場合はデフォルト値を使用
                    }
                }
            }
        } else if (keyIndex > 1) {
            // 最後のキーフレームの場合は前のキーフレームを使用
            try {
                var prevTime = property.keyTime(keyIndex - 1);
                var prevValue = property.keyValue(keyIndex - 1);
                if (prevValue && prevValue.length) {
                    prevValue = prevValue[0];
                }
                var timeDiff = currentTime - prevTime;
                var valueDiff = currentValue - prevValue;
                if (timeDiff > 0) {
                    valueChangeRate = valueDiff / timeDiff;  // 符号を保持
                }
            } catch (e) {
                // 前のキーフレーム取得に失敗した場合はデフォルト値を使用
            }
        }
        
        // 正規化速度値を実際の速度値に変換
        // 読み取り時のロジック: normalizedSlope = speed / actualValueChangeRate
        // 適用時のロジック: speed = normalizedSlope * actualValueChangeRate
        return normalizedSpeed * valueChangeRate;
        
    } catch (error) {
        // エラーが発生した場合はそのまま返す
        return normalizedSpeed;
    }
};

// ========================================
// N点グラフ対応：共通ユーティリティ関数
// ========================================

/**
 * グラフ上の点（0-1正規化）を実際のキーフレーム座標に変換
 * @param {Object} graphPoint - {time: 0-1, value: 0-1}
 * @param {Object} startKf - 始点キーフレーム {time, value}
 * @param {Object} endKf - 終点キーフレーム {time, value}
 * @return {Object} {time, value} 実座標
 */
AGraphUtils.scaleGraphPointToActual = function(graphPoint, startKf, endKf) {
    var actualTime = startKf.time + (endKf.time - startKf.time) * graphPoint.time;
    
    var actualValue;
    if (Array.isArray(startKf.value) && Array.isArray(endKf.value)) {
        // 多次元プロパティ（位置、スケール等）
        actualValue = [];
        var dimensions = Math.min(startKf.value.length, endKf.value.length);
        for (var d = 0; d < dimensions; d++) {
            actualValue[d] = startKf.value[d] + (endKf.value[d] - startKf.value[d]) * graphPoint.value;
        }
    } else {
        // 1次元プロパティ
        var startVal = Array.isArray(startKf.value) ? startKf.value[0] : startKf.value;
        var endVal = Array.isArray(endKf.value) ? endKf.value[0] : endKf.value;
        actualValue = startVal + (endVal - startVal) * graphPoint.value;
    }
    
    return {
        time: actualTime,
        value: actualValue
    };
};

/**
 * プロパティに中点キーフレームを1つ挿入
 * @param {Property} prop - After Effectsプロパティ
 * @param {Number} time - 挿入時刻
 * @param {Number|Array} value - 挿入値
 * @param {Array} debugInfo - デバッグ情報配列
 * @return {Number} 挿入されたキーフレームのインデックス
 */
AGraphUtils.insertMiddleKeyframe = function(prop, time, value, debugInfo) {
    var newKeyIndex = prop.addKey(time);
    
    // OneDプロパティ（次元分割された位置など）は1次元として扱う
    var isOneDProperty = (prop.propertyValueType === PropertyValueType.OneD);
    
    if (Array.isArray(value) && !isOneDProperty) {
        // 多次元プロパティ
        var currentValue = prop.keyValue(newKeyIndex);
        if (Array.isArray(currentValue)) {
            var newValue = [];
            for (var d = 0; d < Math.min(currentValue.length, value.length); d++) {
                newValue[d] = value[d];
            }
            prop.setValueAtKey(newKeyIndex, newValue);
            if (debugInfo) {
                debugInfo.push("  Inserted middle keyframe at time " + time.toFixed(3) + ", value: " + JSON.stringify(newValue));
            }
        }
    } else {
        // 1次元プロパティ
        var valueToSet = Array.isArray(value) ? value[0] : value;
        prop.setValueAtKey(newKeyIndex, valueToSet);
        if (debugInfo) {
            debugInfo.push("  Inserted middle keyframe at time " + time.toFixed(3) + ", value: " + valueToSet);
        }
    }
    
    // 補間タイプをベジエに設定
    prop.setInterpolationTypeAtKey(newKeyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    
    return newKeyIndex;
};

/**
 * 1つの区間（隣接2キーフレーム間）にハンドルを設定
 * @param {Property} prop - プロパティ
 * @param {Number} startIdx - 区間開始キーフレームインデックス
 * @param {Number} endIdx - 区間終了キーフレームインデックス
 * @param {Object} segmentEasing - {outTemporal, inTemporal}
 * @param {Number} speedMultiplier - speed倍率
 * @param {Array} debugInfo - デバッグ情報配列
 */
AGraphUtils.applySegmentHandles = function(prop, startIdx, endIdx, segmentEasing, speedMultiplier, debugInfo) {
    var startValue = prop.keyValue(startIdx);
    var endValue = prop.keyValue(endIdx);
    
    var isSpatialProperty = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || 
                            prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
    
    // 区間の実際の変化方向を計算（符号判定用）
    var segmentActualChange = 0;
    if (Array.isArray(startValue)) {
        segmentActualChange = endValue[0] - startValue[0];
    } else {
        segmentActualChange = endValue - startValue;
    }
    
    // OUT handle（区間開始点の右ハンドル）
    if (segmentEasing.outTemporal) {
        var correctedSpeedOut = (segmentEasing.outTemporal.speed / 100) * speedMultiplier;
        
        // 位置以外で、実際の変化が負の場合は符号を反転
        if (!isSpatialProperty && segmentActualChange < 0) {
            correctedSpeedOut = -correctedSpeedOut;
        }
        
        var startOutEase = this.createEaseArray(prop, correctedSpeedOut, segmentEasing.outTemporal.influence);
        var startInEase = prop.keyInTemporalEase(startIdx);
        prop.setTemporalEaseAtKey(startIdx, startInEase, startOutEase);
        
        if (debugInfo) {
            debugInfo.push("  Segment " + startIdx + "→" + endIdx + " OUT: speed=" + correctedSpeedOut.toFixed(3));
        }
    }
    
    // IN handle（区間終了点の左ハンドル）
    if (segmentEasing.inTemporal) {
        var correctedSpeedIn = (segmentEasing.inTemporal.speed / 100) * speedMultiplier;
        
        // 位置以外で、実際の変化が負の場合は符号を反転
        if (!isSpatialProperty && segmentActualChange < 0) {
            correctedSpeedIn = -correctedSpeedIn;
        }
        
        var endInEase = this.createEaseArray(prop, correctedSpeedIn, segmentEasing.inTemporal.influence);
        var endOutEase = prop.keyOutTemporalEase(endIdx);
        prop.setTemporalEaseAtKey(endIdx, endInEase, endOutEase);
        
        if (debugInfo) {
            debugInfo.push("  Segment " + startIdx + "→" + endIdx + " IN: speed=" + correctedSpeedIn.toFixed(3));
        }
    }
};

/**
 * N点グラフを1つの区間（選択された2キーフレーム間）に適用
 * @param {Property} prop - プロパティ
 * @param {Object} startKf - 始点キーフレーム情報
 * @param {Object} endKf - 終点キーフレーム情報
 * @param {Object} graphData - グラフデータ {keyframes: [...], normalization: {...}}
 * @param {Array} debugInfo - デバッグ情報配列
 * @return {Boolean} 成功/失敗
 */
AGraphUtils.applyGraphToSegment = function(prop, startKf, endKf, graphData, debugInfo) {
    try {
        debugInfo.push("=== applyGraphToSegment START ===");
        debugInfo.push("Property: " + prop.name);
        debugInfo.push("Graph keyframes count: " + graphData.keyframes.length);
        debugInfo.push("Start time: " + startKf.time.toFixed(3) + ", value: " + JSON.stringify(startKf.value));
        debugInfo.push("End time: " + endKf.time.toFixed(3) + ", value: " + JSON.stringify(endKf.value));
        
        // 始点・終点のインデックスを探す
        var startKeyIndex = -1;
        var endKeyIndex = -1;
        
        for (var keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
            var keyTime = prop.keyTime(keyIndex);
            if (Math.abs(keyTime - startKf.time) < 0.001) {
                startKeyIndex = keyIndex;
            }
            if (Math.abs(keyTime - endKf.time) < 0.001) {
                endKeyIndex = keyIndex;
            }
        }
        
        if (startKeyIndex === -1 || endKeyIndex === -1) {
            if (debugInfo) {
                debugInfo.push("ERROR: Start or end keyframe not found");
            }
            return false;
        }
        
        if (debugInfo) {
            debugInfo.push("Found keyframes: start=" + startKeyIndex + ", end=" + endKeyIndex);
        }
        
        // グラフの中点（keyframes[1..N-2]）を実座標に変換して生成
        var middleKeyIndices = [];
        var middlePointCount = graphData.keyframes.length - 2;
        
        if (debugInfo) {
            debugInfo.push("Middle points to generate: " + middlePointCount);
        }
        
        for (var i = 1; i < graphData.keyframes.length - 1; i++) {
            var graphPoint = graphData.keyframes[i];
            var actualPoint = this.scaleGraphPointToActual(graphPoint, startKf, endKf);
            
            var newIdx = this.insertMiddleKeyframe(prop, actualPoint.time, actualPoint.value, debugInfo);
            middleKeyIndices.push(newIdx);
        }
        
        // 中点挿入後、キーフレームインデックスが変わるため再取得
        startKeyIndex = -1;
        endKeyIndex = -1;
        for (var keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
            var keyTime = prop.keyTime(keyIndex);
            if (Math.abs(keyTime - startKf.time) < 0.001) {
                startKeyIndex = keyIndex;
            }
            if (Math.abs(keyTime - endKf.time) < 0.001) {
                endKeyIndex = keyIndex;
            }
        }
        
        // 全てのキーフレームを時間順に取得
        var allKeyIndices = [startKeyIndex];
        for (var m = 0; m < middleKeyIndices.length; m++) {
            allKeyIndices.push(middleKeyIndices[m]);
        }
        allKeyIndices.push(endKeyIndex);
        
        // 時間順にソート
        allKeyIndices.sort(function(a, b) {
            return prop.keyTime(a) - prop.keyTime(b);
        });
        
        if (debugInfo) {
            debugInfo.push("All keyframe indices (sorted): " + allKeyIndices.join(", "));
            debugInfo.push("Applying handles to " + (allKeyIndices.length - 1) + " segments");
        }
        
        // 各区間にハンドルを適用
        for (var segIdx = 0; segIdx < allKeyIndices.length - 1; segIdx++) {
            var segStartIdx = allKeyIndices[segIdx];
            var segEndIdx = allKeyIndices[segIdx + 1];
            
            // グラフの対応する区間のeasing設定を取得
            var segmentEasing = {
                outTemporal: graphData.keyframes[segIdx].easing.outTemporal,
                inTemporal: graphData.keyframes[segIdx + 1].easing.inTemporal
            };
            
            // speed倍率を計算
            // グラフは0-1正規化空間のspeed値を持っているため、
            // 実際の値範囲での倍率を計算する必要がある
            var segStartTime = prop.keyTime(segStartIdx);
            var segEndTime = prop.keyTime(segEndIdx);
            var timeRange = Math.abs(segEndTime - segStartTime);
            
            // グラフの正規化時間範囲（0-1）
            var graphTimeStart = graphData.keyframes[segIdx].time;
            var graphTimeEnd = graphData.keyframes[segIdx + 1].time;
            var graphTimeRange = Math.abs(graphTimeEnd - graphTimeStart);
            
            // グラフの正規化値範囲（0-1）
            var graphValueStart = graphData.keyframes[segIdx].value;
            var graphValueEnd = graphData.keyframes[segIdx + 1].value;
            var graphValueRange = Math.abs(graphValueEnd - graphValueStart);
            
            // 実際の値範囲（区間全体）
            var actualValueRange = Math.abs(endKf.value - startKf.value);
            
            // speed倍率 = (実際の値変化 / 実際の時間変化) / (正規化値変化 / 正規化時間変化)
            // = (actualValueRange / timeRange) / (graphValueRange / graphTimeRange)
            var speedMultiplier = 0;
            if (timeRange > 0 && graphTimeRange > 0 && graphValueRange > 0) {
                speedMultiplier = (actualValueRange / timeRange) / (graphValueRange / graphTimeRange);
            }
            
            this.applySegmentHandles(prop, segStartIdx, segEndIdx, segmentEasing, speedMultiplier, debugInfo);
        }
        
        if (debugInfo) {
            debugInfo.push("=== applyGraphToSegment SUCCESS ===");
        }
        
        return true;
        
    } catch (error) {
        if (debugInfo) {
            debugInfo.push("=== applyGraphToSegment ERROR ===");
            debugInfo.push("Error: " + error.toString());
        }
        return false;
    }
};

/**
 * N点グラフを選択されたキーフレームペアに適用（統合版）
 * @param {String} applyDataJson - JSON文字列 {graphData, pairs: [{propName, startTime, endTime, startValue, endValue}]}
 * @return {String} JSON形式の結果
 */
function aGraphApplyGraph(applyDataJson) {
    try {
        var debugInfo = [];
        debugInfo.push("=== aGraphApplyGraph START ===");
        debugInfo.push("Received JSON length: " + applyDataJson.length);
        
        var applyData = JSON.parse(applyDataJson);
        var graphData = applyData.graphData;
        var pairs = applyData.pairs;
        
        debugInfo.push("Graph keyframes count: " + graphData.keyframes.length);
        debugInfo.push("Pairs to apply: " + pairs.length);
        debugInfo.push("First pair: " + JSON.stringify(pairs[0]));
        
        // グラフデータの詳細をログ
        for (var i = 0; i < graphData.keyframes.length; i++) {
            var gkf = graphData.keyframes[i];
            debugInfo.push("Graph KF[" + i + "]: time=" + gkf.time.toFixed(3) + ", value=" + gkf.value.toFixed(3));
        }
        
        var comp = app.project.activeItem;
        
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ error: "No active composition" });
        }
        
        var selectedProperties = comp.selectedProperties;
        if (selectedProperties.length === 0) {
            return JSON.stringify({ error: "No properties selected" });
        }
        
        app.beginUndoGroup("Apply Accel Curve Graph");
        
        var processedCount = 0;
        var errorCount = 0;
        
        // 各ペアに対して処理
        for (var pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
            var pair = pairs[pairIdx];
            debugInfo.push("--- Processing pair " + pairIdx + " ---");
            debugInfo.push("Property: " + pair.propName);
            debugInfo.push("Time range: " + pair.startTime + " → " + pair.endTime);
            
            // プロパティを検索
            var targetProp = null;
            for (var i = 0; i < selectedProperties.length; i++) {
                var prop = selectedProperties[i];
                if (prop.propertyType === PropertyType.PROPERTY && 
                    prop.canSetExpression && 
                    prop.name === pair.propName) {
                    targetProp = prop;
                    break;
                }
            }
            
            if (!targetProp) {
                debugInfo.push("ERROR: Property not found: " + pair.propName);
                errorCount++;
                continue;
            }
            
            // キーフレーム情報を構築
            var startKf = {
                time: pair.startTime,
                value: pair.startValue
            };
            var endKf = {
                time: pair.endTime,
                value: pair.endValue
            };
            
            // グラフを適用
            var result = AGraphUtils.applyGraphToSegment(targetProp, startKf, endKf, graphData, debugInfo);
            
            if (result) {
                processedCount++;
                debugInfo.push("✓ Successfully applied to pair " + pairIdx);
            } else {
                errorCount++;
                debugInfo.push("✗ Failed to apply to pair " + pairIdx);
            }
        }
        
        app.endUndoGroup();
        
        debugInfo.push("=== aGraphApplyGraph END ===");
        debugInfo.push("Processed: " + processedCount + ", Errors: " + errorCount);
        
        return JSON.stringify({
            success: true,
            processedCount: processedCount,
            errorCount: errorCount,
            debugInfo: debugInfo
        });
        
    } catch (error) {
        app.endUndoGroup();
        return JSON.stringify({ 
            error: "aGraphApplyGraph failed: " + error.toString(),
            line: error.line
        });
    }
}

/**
 * Apply easing to multiple keyframe segments
 */
function aGraphApplyMultipleSegments(segmentsDataJson) {
    alert("【デバッグ】aGraphApplyMultipleSegments 関数開始");
    
    try {
        $.writeln("Received JSON: " + segmentsDataJson);
        var segmentsData = JSON.parse(segmentsDataJson);
        $.writeln("Parsed segments count: " + segmentsData.segments.length);
        
        // デバッグ: 受信した設定を表示
        var debugInfo = "【受信した設定】\n";
        for (var k = 0; k < segmentsData.segments.length; k++) {
            var seg = segmentsData.segments[k];
            debugInfo += "Seg" + k + ": LayerID=" + seg.layerId + "/" + seg.propertyName + 
                         " KF" + (seg.keyIndices[0]+1) + "-" + (seg.keyIndices[1]+1) + "\n";
        }
        alert(debugInfo);
        
        // 全ての区間設定をログ出力
        for (var k = 0; k < segmentsData.segments.length; k++) {
            var seg = segmentsData.segments[k];
            $.writeln("Segment " + k + " (" + seg.segment + "):");
            $.writeln("  - layerId: " + seg.layerId);
            $.writeln("  - propertyName: " + seg.propertyName);
            $.writeln("  - keyIndex1: " + seg.keyIndex1 + ", keyIndex2: " + seg.keyIndex2);
            if (seg.outTemporal) {
                $.writeln("  - outTemporal speed: " + seg.outTemporal.speed + ", influence: " + seg.outTemporal.influence);
            }
            if (seg.inTemporal) {
                $.writeln("  - inTemporal speed: " + seg.inTemporal.speed + ", influence: " + seg.inTemporal.influence);
            }
        }
        
        var comp = app.project.activeItem;
        
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ error: "No active composition" });
        }

        var selectedProperties = comp.selectedProperties;
        if (selectedProperties.length === 0) {
            return JSON.stringify({ error: "No properties selected. Please select keyframes in the timeline." });
        }
        
        var appliedCount = 0;
        var appliedSegments = [];
        var debugMatchInfo = "【マッチング結果】\n";
        
        app.beginUndoGroup("AGraph: Apply Multiple Segments");
        
        // 各選択されたプロパティを処理
        for (var i = 0; i < selectedProperties.length; i++) {
            var prop = selectedProperties[i];
            
            // プロパティの所属レイヤーIDとプロパティ名を取得
            var propName = prop.name;
            var layerId = 0;
            var layerName = "";
            try {
                // プロパティグループを上に遡ってレイヤーを探す
                var depth = 1;
                while (prop.propertyGroup(depth)) {
                    var group = prop.propertyGroup(depth);
                    
                    // indexプロパティを持ち、nameプロパティを持つものをレイヤーとみなす
                    if (group.index !== undefined && group.name !== undefined && depth >= 2) {
                        layerId = group.index;
                        layerName = group.name;
                        break;
                    }
                    depth++;
                }
            } catch (e) {
                $.writeln("Warning: Could not get layer for property: " + propName);
            }
            
            $.writeln("Processing property: LayerID=" + layerId + " (" + layerName + ") / " + propName);
            debugMatchInfo += "\nプロパティ: LayerID=" + layerId + "/" + propName + "\n";
            
            // キーフレームを持つプロパティかチェック
            if (prop.numKeys && prop.numKeys > 0) {
                var selectedKeys = prop.selectedKeys;
                
                if (selectedKeys && selectedKeys.length >= 2) {
                    // 連続するキーフレームペアに対してイージングを適用
                    for (var j = 0; j < selectedKeys.length - 1; j++) {
                        var keyIndex1 = selectedKeys[j];
                        var keyIndex2 = selectedKeys[j + 1];
                        
                        // 連続性チェック：キーフレームインデックスが連続しているか
                        var isConsecutive = (keyIndex2 === keyIndex1 + 1);
                        
                        if (isConsecutive) {
                            // このプロパティと区間にマッチする設定を探す
                            var segmentSettings = null;
                            debugMatchInfo += "  KF" + (keyIndex1+1) + "-" + (keyIndex2+1) + ": ";
                            
                            for (var k = 0; k < segmentsData.segments.length; k++) {
                                var seg = segmentsData.segments[k];
                                if (seg.propertyName === propName && 
                                    seg.layerId === layerId &&
                                    seg.keyIndices[0] === keyIndex1 &&
                                    seg.keyIndices[1] === keyIndex2) {
                                    segmentSettings = seg;
                                    $.writeln("MATCH FOUND: segment " + k + " for LayerID=" + layerId + "/" + propName + " KF" + (keyIndex1+1) + "-" + (keyIndex2+1));
                                    debugMatchInfo += "✅ 一致(Seg" + k + ")\n";
                                    break;
                                }
                            }
                            
                            if (!segmentSettings) {
                                debugMatchInfo += "❌ 一致なし\n";
                            }
                            
                            if (segmentSettings) {
                                // Out handle（最初のキーフレーム）
                                if (segmentSettings.outTemporal) {
                                    var currentInEase = prop.keyInTemporalEase(keyIndex1);
                                    var newOutEase = AGraphUtils.createMultiDimensionalEase(
                                        prop, keyIndex1, 
                                        [segmentSettings.outTemporal.speed], 
                                        [segmentSettings.outTemporal.influence], 
                                        prop.propertyValueType
                                    );
                                    prop.setTemporalEaseAtKey(keyIndex1, currentInEase, newOutEase);
                                    $.writeln("Applied outTemporal: speed=" + segmentSettings.outTemporal.speed + ", influence=" + segmentSettings.outTemporal.influence);
                                }
                                
                                // In handle（2番目のキーフレーム）
                                if (segmentSettings.inTemporal) {
                                    var currentOutEase = prop.keyOutTemporalEase(keyIndex2);
                                    var newInEase = AGraphUtils.createMultiDimensionalEase(
                                        prop, keyIndex2, 
                                        [segmentSettings.inTemporal.speed], 
                                        [segmentSettings.inTemporal.influence], 
                                        prop.propertyValueType
                                    );
                                    prop.setTemporalEaseAtKey(keyIndex2, newInEase, currentOutEase);
                                    $.writeln("Applied inTemporal: speed=" + segmentSettings.inTemporal.speed + ", influence=" + segmentSettings.inTemporal.influence);
                                }
                                
                                appliedCount++;
                                appliedSegments.push("LayerID=" + layerId + "/" + propName + " KF" + (keyIndex1 + 1) + "-" + (keyIndex2 + 1));
                            } else {
                                $.writeln("WARNING: No matching segment settings found for LayerID=" + layerId + "/" + propName + " KF" + (keyIndex1+1) + "-" + (keyIndex2+1));
                            }
                        } else {
                            $.writeln("Skipping non-consecutive segment: LayerID=" + layerId + "/" + propName + " KF" + (keyIndex1 + 1) + "-" + (keyIndex2 + 1));
                        }
                    }
                }
            }
        }
        
        app.endUndoGroup();
        
        // デバッグ情報を表示
        var finalDebugInfo = debugMatchInfo + "\n\n適用数: " + appliedCount + "/" + segmentsData.segments.length;
        alert(finalDebugInfo);
        
        return JSON.stringify({
            success: true,
            appliedCount: appliedCount,
            appliedSegments: appliedSegments,
            message: "Applied easing to " + appliedCount + " segments"
        });
        
    } catch (error) {
        if (app.project) {
            app.endUndoGroup();
        }
        return JSON.stringify({ error: "Apply failed: " + error.toString() });
    }
}

/**
 * クロスプロパティ分析
 */
AGraphUtils.analyzeCrossProperty = function(selectedProperties) {
    var propertyData = [];
    var maxChangeRate = 0;
    
    for (var i = 0; i < selectedProperties.length; i++) {
        var prop = selectedProperties[i];
        if (prop.selectedKeys && prop.selectedKeys.length >= 2) {
            // 最初と最後の選択キーフレームで変化率を計算
            var firstKey = prop.selectedKeys[0];
            var lastKey = prop.selectedKeys[prop.selectedKeys.length - 1];
            
            var value1 = prop.keyValue(firstKey);
            var value2 = prop.keyValue(lastKey);
            var time1 = prop.keyTime(firstKey);
            var time2 = prop.keyTime(lastKey);
            
            var valueChange = this.calculateValueChange(value1, value2, prop.propertyValueType);
            var timeDiff = time2 - time1;
            var changeRate = timeDiff > 0 ? valueChange / timeDiff : 0;
            
            if (changeRate > maxChangeRate) {
                maxChangeRate = changeRate;
            }
            
            propertyData.push({
                property: prop,
                changeRate: changeRate
            });
        }
    }
    
    // 相対倍率を計算
    for (var i = 0; i < propertyData.length; i++) {
        propertyData[i].relativeRatio = maxChangeRate > 0 ? propertyData[i].changeRate / maxChangeRate : 1.0;
    }
    
    return {
        propertyCount: propertyData.length,
        propertyData: propertyData,
        maxChangeRate: maxChangeRate
    };
};

/**
 * クロスプロパティ倍率の取得
 */
AGraphUtils.getCrossPropertyMultiplier = function(property, crossPropertyData) {
    for (var i = 0; i < crossPropertyData.propertyData.length; i++) {
        var data = crossPropertyData.propertyData[i];
        if (data.property === property) {
            return data.relativeRatio;
        }
    }
    return 1.0;
};

/**
 * クロスプロパティ用のイージング設定調整
 */
AGraphUtils.adjustEasingForCrossProperty = function(easingSettings, multiplier) {
    var adjusted = {};
    
    // 元の設定をコピー
    for (var key in easingSettings) {
        adjusted[key] = easingSettings[key];
    }
    
    // influence値を倍率で調整（ただし100を超えないように）
    if (easingSettings.inTemporal) {
        adjusted.inTemporal = {
            speed: easingSettings.inTemporal.speed,
            influence: Math.min(100, easingSettings.inTemporal.influence * multiplier)
        };
    }
    
    if (easingSettings.outTemporal) {
        adjusted.outTemporal = {
            speed: easingSettings.outTemporal.speed,
            influence: Math.min(100, easingSettings.outTemporal.influence * multiplier)
        };
    }
    
    if (easingSettings.influence !== undefined) {
        adjusted.influence = Math.min(100, easingSettings.influence * multiplier);
    }
    
    return adjusted;
};

/**
 * 汎用変化量計算
 */
AGraphUtils.calculateValueChange = function(value1, value2, propertyType) {
    if (typeof value1 === 'number' && typeof value2 === 'number') {
        return Math.abs(value2 - value1);
    }
    
    if (value1.length && value2.length) {
        // 空間的プロパティ（Position等）
        if (propertyType === 6413 || 
            propertyType === PropertyValueType.TwoD_SPATIAL || 
            propertyType === PropertyValueType.ThreeD_SPATIAL) {
            var sumSquares = 0;
            var minLength = Math.min(value1.length, value2.length);
            for (var i = 0; i < minLength; i++) {
                var diff = value2[i] - value1[i];
                sumSquares += diff * diff;
            }
            return Math.sqrt(sumSquares);
        } else {
            // 非空間的多次元プロパティ（Scale等）
            var totalChange = 0;
            var minLength = Math.min(value1.length, value2.length);
            for (var i = 0; i < minLength; i++) {
                totalChange += Math.abs(value2[i] - value1[i]);
            }
            return totalChange;
        }
    }
    
    return 0;
};

/**
 * Apply 3-point mode easing
 */
function aGraphApply3PointMode(dataJson) {
    try {
        var data = JSON.parse(dataJson);
        var keyframes = data.keyframes; // 3つのキーフレーム
        var segment1Easing = data.segment1Easing; // 第1区間のイージング
        var segment2Easing = data.segment2Easing; // 第2区間のイージング
        
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ error: "No active composition" });
        }

        var selectedProperties = comp.selectedProperties;
        if (selectedProperties.length === 0) {
            return JSON.stringify({ error: "No properties selected" });
        }
        
        app.beginUndoGroup("AGraph: Apply 3-Point Mode");
        
        var appliedCount = 0;
        var allSelectionInfo = []; // 全プロパティの選択情報を保存
        
        // 各プロパティに対して3点適用を実行
        for (var i = 0; i < selectedProperties.length; i++) {
            var prop = selectedProperties[i];
            
            if (prop.numKeys && prop.numKeys > 0) {
                var selectedKeys = prop.selectedKeys;
                
                if (selectedKeys && selectedKeys.length === 3) {
                    // 元の選択情報を保存
                    var originalSelection = {
                        propertyIndex: i,
                        selectedKeys: selectedKeys.slice()
                    };
                    
                    // 選択された3つのキーフレームを時間順にソート
                    var keyIndices = selectedKeys.slice().sort(function(a, b) {
                        return prop.keyTime(a) - prop.keyTime(b);
                    });
                    
                    var startKeyIndex = keyIndices[0];
                    var middleKeyIndex = keyIndices[1];
                    var endKeyIndex = keyIndices[2];
                    
                    // 中間キーフレームの時間と値を更新（JavaScriptで編集された内容を反映）
                    var updatedMiddleKf = keyframes[1]; // JavaScriptから送られた更新済み中間キーフレーム
                    
                    // 値を更新
                    prop.setValueAtKey(middleKeyIndex, updatedMiddleKf.value);
                    
                    // 時間を更新する場合の選択を保持した処理
                    var originalTime = prop.keyTime(middleKeyIndex);
                    var needsTimeChange = Math.abs(updatedMiddleKf.time - originalTime) > 0.001;
                    
                    if (needsTimeChange) {
                        // 元のキーフレームの情報を保存
                        var originalInEase = prop.keyInTemporalEase(middleKeyIndex);
                        var originalOutEase = prop.keyOutTemporalEase(middleKeyIndex);
                        var originalInterpolationType = prop.keyInInterpolationType(middleKeyIndex);
                        var originalOutInterpolationType = prop.keyOutInterpolationType(middleKeyIndex);
                        
                        // 他のキーフレームのインデックスと時間を保存
                        var otherKeys = [];
                        for (var k = 0; k < selectedKeys.length; k++) {
                            if (selectedKeys[k] !== middleKeyIndex) {
                                otherKeys.push({
                                    index: selectedKeys[k],
                                    time: prop.keyTime(selectedKeys[k])
                                });
                            }
                        }
                        
                        // 新しい時間位置にキーフレームを作成
                        prop.setValueAtTime(updatedMiddleKf.time, updatedMiddleKf.value);
                        var newMiddleIndex = prop.nearestKeyIndex(updatedMiddleKf.time);
                        
                        // 元のキーフレームを削除
                        prop.removeKey(middleKeyIndex);
                        
                        // 削除により他のキーフレームのインデックスが変わるので再計算
                        var newStartIndex = -1;
                        var newEndIndex = -1;
                        
                        for (var k = 0; k < otherKeys.length; k++) {
                            var keyIdx = prop.nearestKeyIndex(otherKeys[k].time);
                            if (Math.abs(prop.keyTime(keyIdx) - otherKeys[k].time) < 0.001) {
                                if (otherKeys[k].time < updatedMiddleKf.time) {
                                    newStartIndex = keyIdx;
                                } else {
                                    newEndIndex = keyIdx;
                                }
                            }
                        }
                        
                        // 新しいキーフレームのインデックスを再取得
                        middleKeyIndex = prop.nearestKeyIndex(updatedMiddleKf.time);
                        startKeyIndex = newStartIndex;
                        endKeyIndex = newEndIndex;
                        
                        // イージング情報を復元
                        try {
                            prop.setTemporalEaseAtKey(middleKeyIndex, originalInEase, originalOutEase);
                            prop.setInterpolationTypeAtKey(middleKeyIndex, originalInterpolationType, originalOutInterpolationType);
                        } catch (e) {
                            $.writeln("Warning: Could not restore easing: " + e.toString());
                        }
                        
                        $.writeln("Keyframe moved from " + originalTime + " to " + updatedMiddleKf.time + " (new index: " + middleKeyIndex + ")");
                    }
                    
                    // ハンドルイージング適用は一旦スキップ（選択解除問題を回避するため）
                    // TODO: 後でハンドル適用を実装
                    
                    // 選択情報を保存（後で復元用）
                    originalSelection.finalKeys = [startKeyIndex, middleKeyIndex, endKeyIndex];
                    allSelectionInfo.push(originalSelection);
                    
                    appliedCount++;
                }
            }
        }
        
        app.endUndoGroup();
        
        // 選択復元を試行（複数の方法で）
        var selectionRestored = false;
        
        // 方法1: 直接選択復元
        for (var s = 0; s < allSelectionInfo.length; s++) {
            var selInfo = allSelectionInfo[s];
            var prop = selectedProperties[selInfo.propertyIndex];
            
            try {
                // 選択をクリアしてから再設定
                prop.selectedKeys = [];
                prop.selectedKeys = selInfo.finalKeys;
                selectionRestored = true;
                
                // デバッグ情報
                $.writeln("Selection restored for property " + selInfo.propertyIndex + ": keys " + selInfo.finalKeys.join(","));
                break;
            } catch (e1) {
                try {
                    // 方法2: 個別に選択追加
                    var newSelection = [];
                    for (var k = 0; k < selInfo.finalKeys.length; k++) {
                        var keyIdx = selInfo.finalKeys[k];
                        if (keyIdx > 0 && keyIdx <= prop.numKeys) {
                            newSelection.push(keyIdx);
                        }
                    }
                    prop.selectedKeys = newSelection;
                    selectionRestored = true;
                    $.writeln("Alternative selection method worked: " + newSelection.join(","));
                    break;
                } catch (e2) {
                    $.writeln("Selection restoration failed for property " + selInfo.propertyIndex + ": " + e2.toString());
                }
            }
        }
        
        var selectionStatus = selectionRestored ? "Selection restored" : "Selection may be lost";
        
        return JSON.stringify({
            success: true,
            appliedCount: appliedCount,
            message: "3-point mode applied with middle keyframe position updated. " + selectionStatus + ".",
            selectionRestored: selectionRestored
        });
        
    } catch (error) {
        if (app.project) {
            app.endUndoGroup();
        }
        return JSON.stringify({ error: "3-Point apply failed: " + error.toString() });
    }
}

/**
 * 3点ハンドルのみ適用（位置変更なし、選択維持）
 */
function aGraphApply3PointHandleOnly(dataJson) {
    try {
        var data = JSON.parse(dataJson);
        var keyframes = data.keyframes; // 3つのキーフレーム（位置変更なし）
        var segment1Easing = data.segment1Easing; // 第1区間のイージング
        var segment2Easing = data.segment2Easing; // 第2区間のイージング
        
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ error: "No active composition" });
        }

        var selectedProperties = comp.selectedProperties;
        if (selectedProperties.length === 0) {
            return JSON.stringify({ error: "No properties selected" });
        }
        
        app.beginUndoGroup("AGraph: Apply 3-Point Handle Only");
        
        var appliedCount = 0;
        
        // 各プロパティに対してハンドル適用を実行
        for (var i = 0; i < selectedProperties.length; i++) {
            var prop = selectedProperties[i];
            
            if (prop.numKeys && prop.numKeys > 0) {
                var selectedKeys = prop.selectedKeys;
                
                if (selectedKeys && selectedKeys.length === 3) {
                    // 選択された3つのキーフレームを時間順にソート
                    var keyIndices = selectedKeys.slice().sort(function(a, b) {
                        return prop.keyTime(a) - prop.keyTime(b);
                    });
                    
                    var startKeyIndex = keyIndices[0];
                    var middleKeyIndex = keyIndices[1];
                    var endKeyIndex = keyIndices[2];
                    
                    // ハンドルのみ更新（位置は変更しない）
                    // 第1区間 (KF0 → KF1)
                    if (segment1Easing.outTemporal) {
                        var seg1OutSpeed = segment1Easing.outTemporal.speed;
                        // 符号補正判定
                        if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && 
                            prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) {
                            var val0 = prop.keyValue(startKeyIndex);
                            var val1 = prop.keyValue(middleKeyIndex);
                            var val0Scalar = Array.isArray(val0) ? val0[0] : val0;
                            var val1Scalar = Array.isArray(val1) ? val1[0] : val1;
                            if (val1Scalar < val0Scalar) {
                                seg1OutSpeed = -seg1OutSpeed;
                            }
                        }
                        var startOutEase = AGraphUtils.createEaseArray(prop, 
                            seg1OutSpeed,
                            segment1Easing.outTemporal.influence
                        );
                        prop.setTemporalEaseAtKey(startKeyIndex, prop.keyInTemporalEase(startKeyIndex), startOutEase);
                    }
                    
                    if (segment1Easing.inTemporal) {
                        var seg1InSpeed = segment1Easing.inTemporal.speed;
                        if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && 
                            prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) {
                            var val0 = prop.keyValue(startKeyIndex);
                            var val1 = prop.keyValue(middleKeyIndex);
                            var val0Scalar = Array.isArray(val0) ? val0[0] : val0;
                            var val1Scalar = Array.isArray(val1) ? val1[0] : val1;
                            if (val1Scalar < val0Scalar) {
                                seg1InSpeed = -seg1InSpeed;
                            }
                        }
                        var middleInEase = AGraphUtils.createEaseArray(prop,
                            seg1InSpeed,
                            segment1Easing.inTemporal.influence
                        );
                        prop.setTemporalEaseAtKey(middleKeyIndex, middleInEase, prop.keyOutTemporalEase(middleKeyIndex));
                    }
                    
                    // 第2区間 (KF1 → KF2)
                    if (segment2Easing.outTemporal) {
                        var seg2OutSpeed = segment2Easing.outTemporal.speed;
                        if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && 
                            prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) {
                            var val1 = prop.keyValue(middleKeyIndex);
                            var val2 = prop.keyValue(endKeyIndex);
                            var val1Scalar = Array.isArray(val1) ? val1[0] : val1;
                            var val2Scalar = Array.isArray(val2) ? val2[0] : val2;
                            if (val2Scalar < val1Scalar) {
                                seg2OutSpeed = -seg2OutSpeed;
                            }
                        }
                        var middleOutEase = AGraphUtils.createEaseArray(prop,
                            seg2OutSpeed,
                            segment2Easing.outTemporal.influence
                        );
                        prop.setTemporalEaseAtKey(middleKeyIndex, prop.keyInTemporalEase(middleKeyIndex), middleOutEase);
                    }
                    
                    if (segment2Easing.inTemporal) {
                        var endInEase = AGraphUtils.createEaseArray(prop,
                            segment2Easing.inTemporal.speed,
                            segment2Easing.inTemporal.influence
                        );
                        prop.setTemporalEaseAtKey(endKeyIndex, endInEase, prop.keyOutTemporalEase(endKeyIndex));
                    }
                    
                    appliedCount++;
                }
            }
        }
        
        app.endUndoGroup();
        
        return JSON.stringify({
            success: true,
            appliedCount: appliedCount,
            message: "3-point handle adjustments applied. Selection preserved.",
            selectionRestored: true // ハンドルのみ変更なので選択は常に維持
        });
        
    } catch (error) {
        if (app.project) {
            app.endUndoGroup();
        }
        return JSON.stringify({ error: "3-Point handle apply failed: " + error.toString() });
    }
}

/**
 * N点カーブを直接適用（選択数 = グラフ点数）
 */
/**
 * 2点選択時の中点自動生成
 */
function aGraphApply2PointWithMiddle(dataJson) {
    try {
        var data = JSON.parse(dataJson);
        var originalKeyframes = data.originalKeyframes; // 元の2つのキーフレーム
        var generatedMiddleKeyframe = data.generatedMiddleKeyframe; // 生成する中点
        var segment1Easing = data.segment1Easing; // 第1区間のイージング
        var segment2Easing = data.segment2Easing; // 第2区間のイージング
        
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ error: "No active composition" });
        }

        var selectedProperties = comp.selectedProperties;
        if (selectedProperties.length === 0) {
            return JSON.stringify({ error: "No properties selected" });
        }
        
        app.beginUndoGroup("AGraph: Apply 2-Point with Middle Generation");
        
        var appliedCount = 0;
        
        // 各プロパティに対して中点生成を実行
        for (var i = 0; i < selectedProperties.length; i++) {
            var prop = selectedProperties[i];
            
            if (prop.numKeys && prop.numKeys > 0) {
                var selectedKeys = prop.selectedKeys;
                
                if (selectedKeys && selectedKeys.length === 2) {
                    // 選択された2つのキーフレームを時間順にソート
                    var keyIndices = selectedKeys.slice().sort(function(a, b) {
                        return prop.keyTime(a) - prop.keyTime(b);
                    });
                    
                    var startKeyIndex = keyIndices[0];
                    var endKeyIndex = keyIndices[1];
                    
                    // 中点キーフレームを生成（setValueAtTimeのみ使用、削除なし）
                    prop.setValueAtTime(generatedMiddleKeyframe.time, generatedMiddleKeyframe.value);
                    var newMiddleIndex = prop.nearestKeyIndex(generatedMiddleKeyframe.time);
                    
                    // 補間タイプをベジエに設定
                    prop.setInterpolationTypeAtKey(startKeyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    prop.setInterpolationTypeAtKey(newMiddleIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    prop.setInterpolationTypeAtKey(endKeyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    
                    // ハンドル設定を適用
                    debugInfo.push("ハンドル設定開始");
                    
                    // 第1区間 (start → middle)
                    if (segment1Easing.outTemporal) {
                        var seg1OutSpeed = segment1Easing.outTemporal.speed;
                        if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && 
                            prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) {
                            var valStart = prop.keyValue(startKeyIndex);
                            var valMid = prop.keyValue(newMiddleIndex);
                            var valStartScalar = Array.isArray(valStart) ? valStart[0] : valStart;
                            var valMidScalar = Array.isArray(valMid) ? valMid[0] : valMid;
                            if (valMidScalar < valStartScalar) {
                                seg1OutSpeed = -seg1OutSpeed;
                            }
                        }
                        var startOutEase = AGraphUtils.createEaseArray(prop,
                            seg1OutSpeed,
                            segment1Easing.outTemporal.influence
                        );
                        prop.setTemporalEaseAtKey(startKeyIndex, prop.keyInTemporalEase(startKeyIndex), startOutEase);
                        debugInfo.push("第1区間開始ハンドル設定: speed=" + segment1Easing.outTemporal.speed + ", influence=" + segment1Easing.outTemporal.influence);
                    }
                    
                    if (segment1Easing.inTemporal) {
                        var seg1InSpeed = segment1Easing.inTemporal.speed;
                        if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && 
                            prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) {
                            var valStart = prop.keyValue(startKeyIndex);
                            var valMid = prop.keyValue(newMiddleIndex);
                            var valStartScalar = Array.isArray(valStart) ? valStart[0] : valStart;
                            var valMidScalar = Array.isArray(valMid) ? valMid[0] : valMid;
                            if (valMidScalar < valStartScalar) {
                                seg1InSpeed = -seg1InSpeed;
                            }
                        }
                        var middleInEase = AGraphUtils.createEaseArray(prop,
                            seg1InSpeed,
                            segment1Easing.inTemporal.influence
                        );
                        prop.setTemporalEaseAtKey(newMiddleIndex, middleInEase, prop.keyOutTemporalEase(newMiddleIndex));
                        debugInfo.push("第1区間終点ハンドル設定: speed=" + seg1InSpeed + ", influence=" + segment1Easing.inTemporal.influence);
                    }
                    
                    // 第2区間 (middle → end)
                    if (segment2Easing.outTemporal) {
                        var seg2OutSpeed = segment2Easing.outTemporal.speed;
                        if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && 
                            prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) {
                            var valMid = prop.keyValue(newMiddleIndex);
                            var valEnd = prop.keyValue(endKeyIndex);
                            var valMidScalar = Array.isArray(valMid) ? valMid[0] : valMid;
                            var valEndScalar = Array.isArray(valEnd) ? valEnd[0] : valEnd;
                            if (valEndScalar < valMidScalar) {
                                seg2OutSpeed = -seg2OutSpeed;
                            }
                        }
                        var middleOutEase = AGraphUtils.createEaseArray(prop,
                            seg2OutSpeed,
                            segment2Easing.outTemporal.influence
                        );
                        prop.setTemporalEaseAtKey(newMiddleIndex, prop.keyInTemporalEase(newMiddleIndex), middleOutEase);
                        debugInfo.push("第2区間開始ハンドル設定: speed=" + seg2OutSpeed + ", influence=" + segment2Easing.outTemporal.influence);
                    }
                    
                    if (segment2Easing.inTemporal) {
                        var seg2InSpeed = segment2Easing.inTemporal.speed;
                        if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && 
                            prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) {
                            var valMid = prop.keyValue(newMiddleIndex);
                            var valEnd = prop.keyValue(endKeyIndex);
                            var valMidScalar = Array.isArray(valMid) ? valMid[0] : valMid;
                            var valEndScalar = Array.isArray(valEnd) ? valEnd[0] : valEnd;
                            if (valEndScalar < valMidScalar) {
                                seg2InSpeed = -seg2InSpeed;
                            }
                        }
                        var endInEase = AGraphUtils.createEaseArray(prop,
                            seg2InSpeed,
                            segment2Easing.inTemporal.influence
                        );
                        prop.setTemporalEaseAtKey(endKeyIndex, endInEase, prop.keyOutTemporalEase(endKeyIndex));
                        debugInfo.push("第2区間終点ハンドル設定: speed=" + seg2InSpeed + ", influence=" + segment2Easing.inTemporal.influence);
                    }
                    
                    debugInfo.push("ハンドル設定完了");
                    
                    appliedCount++;
                }
            }
        }
        
        app.endUndoGroup();
        
        return JSON.stringify({
            success: true,
            appliedCount: appliedCount,
            message: "2-point mode applied with middle keyframe generated. Selection preserved.",
            selectionRestored: true // 削除なしなので選択は維持される
        });
        
    } catch (error) {
        if (app.project) {
            app.endUndoGroup();
        }
        return JSON.stringify({ error: "2-Point middle generation failed: " + error.toString() });
    }
}

/**
 * 3点モードのグラフを2点のキーフレームに適用（中点自動生成）
 */
function aGraphApply3PointTo2Point(startKeyframe, endKeyframe, middleTime, middleValue, easingSettings) {
    var debugInfo = [];
    try {
        debugInfo.push("=== FUNCTION ENTRY ===");
        debugInfo.push("Arguments received:");
        debugInfo.push("  startKeyframe: " + JSON.stringify(startKeyframe));
        debugInfo.push("  endKeyframe: " + JSON.stringify(endKeyframe));
        debugInfo.push("  middleTime: " + middleTime);
        debugInfo.push("  middleValue: " + JSON.stringify(middleValue));
        debugInfo.push("  easingSettings: " + JSON.stringify(easingSettings));
        
        app.beginUndoGroup("AGraph 3-Point to 2-Point Apply");
        debugInfo.push("Undo group started");
        
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            debugInfo.push("ERROR: No active composition");
            return JSON.stringify({ error: "No active composition found", debug: debugInfo });
        }
        debugInfo.push("Active composition found: " + comp.name);
        
        var selectedProperties = comp.selectedProperties;
        if (selectedProperties.length === 0) {
            debugInfo.push("ERROR: No properties selected");
            return JSON.stringify({ error: "No properties selected. Please select keyframes in the timeline.", debug: debugInfo });
        }
        debugInfo.push("Selected properties count: " + selectedProperties.length);
        
        var appliedCount = 0;
        var totalKeyframes = 0;
        
        // easingSettingsの内容をデバッグ
        debugInfo.push("easingSettings received: " + JSON.stringify(easingSettings));
        
        // 3点モードの区間別easing設定を確認
        var segment1Easing = easingSettings.segment1 || { outTemporal: { speed: 0, influence: 33.33 }, inTemporal: { speed: 0, influence: 33.33 } };
        var segment2Easing = easingSettings.segment2 || { outTemporal: { speed: 0, influence: 33.33 }, inTemporal: { speed: 0, influence: 33.33 } };
        
        debugInfo.push("segment1Easing: " + JSON.stringify(segment1Easing));
        debugInfo.push("segment2Easing: " + JSON.stringify(segment2Easing));
        
        debugInfo.push("Starting property loop with " + selectedProperties.length + " properties");
        
        // 各選択されたプロパティを処理
        for (var i = 0; i < selectedProperties.length; i++) {
            debugInfo.push("Loop iteration " + i + " starting");
            var prop = selectedProperties[i];
            
            debugInfo.push("Processing property: " + (prop.name || "Unknown"));
            
            // JavaScript側から渡されたプロパティ名と一致するかチェック
            if (startKeyframe.propertyName && prop.name !== startKeyframe.propertyName) {
                debugInfo.push("Property name mismatch: " + prop.name + " !== " + startKeyframe.propertyName + ", skipping");
                continue;
            }
            
            if (!prop.numKeys || prop.numKeys === 0) {
                debugInfo.push("No keyframes in property");
                continue;
            }
            
            // 2点モードと同じ：キーフレームが選択されているかチェック
            var selectedKeys = prop.selectedKeys;
            if (!selectedKeys || selectedKeys.length === 0) {
                debugInfo.push("No selected keys in property, skipping");
                continue;
            }
            debugInfo.push("Selected keys in property: " + selectedKeys.length);
            
            // 開始と終了キーフレームのインデックスを探す
            var startKeyIndex = -1;
            var endKeyIndex = -1;
            
            for (var keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
                var keyTime = prop.keyTime(keyIndex);
                
                if (Math.abs(keyTime - startKeyframe.time) < 0.001) {
                    startKeyIndex = keyIndex;
                    debugInfo.push("Found start key at index: " + keyIndex);
                }
                if (Math.abs(keyTime - endKeyframe.time) < 0.001) {
                    endKeyIndex = keyIndex;
                    debugInfo.push("Found end key at index: " + keyIndex);
                }
            }
            
            if (startKeyIndex === -1 || endKeyIndex === -1) {
                debugInfo.push("Start or end keyframe not found in property");
                continue;
            }
            
            // speed倍率計算用：選択された始点と終点の値を取得（中点挿入前）
            var originalStartValue = prop.keyValue(startKeyIndex);
            var originalEndValue = prop.keyValue(endKeyIndex);
            var originalStartTime = prop.keyTime(startKeyIndex);
            var originalEndTime = prop.keyTime(endKeyIndex);
            
            // 中点キーフレームを挿入
            debugInfo.push("Inserting middle keyframe at time: " + middleTime);
            debugInfo.push("middleValue type: " + (Array.isArray(middleValue) ? "Array" : typeof middleValue));
            debugInfo.push("middleValue: " + JSON.stringify(middleValue));
            
            var newKeyIndex = prop.addKey(middleTime);
            debugInfo.push("Middle keyframe inserted at index: " + newKeyIndex);
            
            // 中点の値を設定
            if (Array.isArray(middleValue)) {
                // 位置プロパティなど多次元
                var currentValue = prop.keyValue(newKeyIndex);
                
                if (Array.isArray(currentValue)) {
                    var newValue = [];
                    for (var d = 0; d < Math.min(currentValue.length, middleValue.length); d++) {
                        newValue[d] = middleValue[d];
                    }
                    
                    // 直接配列として設定
                    prop.setValueAtKey(newKeyIndex, newValue);
                    debugInfo.push("Set multi-dimensional value: " + JSON.stringify(newValue));
                }
            } else {
                // 1次元プロパティ
                prop.setValueAtKey(newKeyIndex, middleValue);
                debugInfo.push("Set 1D value: " + middleValue);
            }
            
            // キーフレームインデックスが中点挿入により変更される可能性があるため再取得
            startKeyIndex = -1;
            endKeyIndex = -1;
            
            for (var keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
                var keyTime = prop.keyTime(keyIndex);
                
                if (Math.abs(keyTime - startKeyframe.time) < 0.001) {
                    startKeyIndex = keyIndex;
                }
                if (Math.abs(keyTime - endKeyframe.time) < 0.001) {
                    endKeyIndex = keyIndex;
                }
            }
            
            // 中点のインデックスを取得
            var middleKeyIndex = prop.nearestKeyIndex(middleTime);
            
            // 補間タイプをベジエに設定
            prop.setInterpolationTypeAtKey(startKeyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            prop.setInterpolationTypeAtKey(middleKeyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            prop.setInterpolationTypeAtKey(endKeyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            
            // 3点モードのハンドル設定を適用
            debugInfo.push("Applying 3-point handle settings");
            
            try {
                debugInfo.push("Getting values for handle calculation");
                // 中点生成後の値と時間を取得（ハンドル設定用）
                var startValue = prop.keyValue(startKeyIndex);
                var middleValueActual = prop.keyValue(middleKeyIndex);
                var endValue = prop.keyValue(endKeyIndex);
                
                var startTime = prop.keyTime(startKeyIndex);
                var middleTimeActual = prop.keyTime(middleKeyIndex);
                var endTime = prop.keyTime(endKeyIndex);
                
                debugInfo.push("Times: " + startTime.toFixed(3) + " -> " + middleTimeActual.toFixed(3) + " -> " + endTime.toFixed(3));
                
                // セグメント別のspeed倍率計算（各区間の変化率）
                var deltaY1, deltaY2;
                var timeRange1 = Math.abs(middleTimeActual - startTime);
                var timeRange2 = Math.abs(endTime - middleTimeActual);
                
                // プロパティタイプ別の値差分計算
                if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || 
                    prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
                    // Spatialの場合はベクトル長を計算
                    // 第1区間
                    var deltaVector1 = [];
                    for (var d = 0; d < middleValueActual.length; d++) {
                        deltaVector1.push(middleValueActual[d] - startValue[d]);
                    }
                    var sum1 = 0;
                    for (var d = 0; d < deltaVector1.length; d++) {
                        sum1 += deltaVector1[d] * deltaVector1[d];
                    }
                    deltaY1 = Math.sqrt(sum1);
                    
                    // 第2区間
                    var deltaVector2 = [];
                    for (var d = 0; d < endValue.length; d++) {
                        deltaVector2.push(endValue[d] - middleValueActual[d]);
                    }
                    var sum2 = 0;
                    for (var d = 0; d < deltaVector2.length; d++) {
                        sum2 += deltaVector2[d] * deltaVector2[d];
                    }
                    deltaY2 = Math.sqrt(sum2);
                } else if (Array.isArray(startValue)) {
                    // 多次元（スケール等）: X値(value[0])のみ使用（RealEase準拠）
                    deltaY1 = Math.abs(middleValueActual[0] - startValue[0]);
                    deltaY2 = Math.abs(endValue[0] - middleValueActual[0]);
                } else {
                    // 1次元の場合
                    deltaY1 = Math.abs(middleValueActual - startValue);
                    deltaY2 = Math.abs(endValue - middleValueActual);
                }
                
                debugInfo.push("DeltaY: seg1=" + deltaY1.toFixed(3) + ", seg2=" + deltaY2.toFixed(3));
                
                // 各セグメントの変化率（Analyzeと同じ: 値の変化 / 時間の変化）
                var speedMultiplier1 = timeRange1 > 0 ? deltaY1 / timeRange1 : 0;
                var speedMultiplier2 = timeRange2 > 0 ? deltaY2 / timeRange2 : 0;
                
                debugInfo.push("SpeedMultipliers: seg1=" + speedMultiplier1.toFixed(3) + ", seg2=" + speedMultiplier2.toFixed(3));
                
                // 第1区間 (start → middle)
                debugInfo.push("=== Segment 1 Handles ===");
                if (segment1Easing.outTemporal) {
                    debugInfo.push("Setting start OUT handle");
                    
                    // 符号反転判定：位置プロパティの場合はスキップ
                    var isSpatialProperty = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || 
                                            prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
                    
                    var correctedSpeed1 = (segment1Easing.outTemporal.speed / 100) * speedMultiplier1;
                    debugInfo.push("Original speed: " + segment1Easing.outTemporal.speed + ", multiplier: " + speedMultiplier1.toFixed(3) + ", corrected: " + correctedSpeed1.toFixed(3));
                    
                    // 位置以外で、実際の変化が負の場合は符号を反転
                    if (!isSpatialProperty) {
                        var segment1ActualChange = 0;
                        if (Array.isArray(middleValueActual)) {
                            segment1ActualChange = middleValueActual[0] - startValue[0];
                        } else {
                            segment1ActualChange = middleValueActual - startValue;
                        }
                        
                        // グラフは常に正方向（0→1）なので、実際の変化が負なら反転
                        if (segment1ActualChange < 0) {
                            correctedSpeed1 = -correctedSpeed1;
                            debugInfo.push("Segment1 change is negative, speed flipped to: " + correctedSpeed1.toFixed(3));
                        }
                    }
                    
                    var startOutEase = AGraphUtils.createEaseArray(prop,
                        correctedSpeed1,
                        segment1Easing.outTemporal.influence
                    );
                    
                    debugInfo.push("startOutEase length: " + startOutEase.length + ", prop dimensions: " + (prop.keyValue(startKeyIndex).length || 1));
                    
                    // 両方の配列を渡す（2点モードと同じ方式）
                    var startInEase = prop.keyInTemporalEase(startKeyIndex);
                    debugInfo.push("startInEase length: " + startInEase.length);
                    
                    prop.setTemporalEaseAtKey(startKeyIndex, startInEase, startOutEase);
                    debugInfo.push("Start OUT handle set: speed=" + correctedSpeed1.toFixed(3) + ", influence=" + segment1Easing.outTemporal.influence);
                }
                
                if (segment1Easing.inTemporal) {
                    // 符号反転判定：位置プロパティの場合はスキップ（In handleも同じ区間なので同じ判定）
                    var isSpatialProperty_in = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || 
                                               prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
                    
                    var correctedSpeed2 = (segment1Easing.inTemporal.speed / 100) * speedMultiplier1;
                    
                    if (!isSpatialProperty_in) {
                        var segment1ActualChange_in = 0;
                        if (Array.isArray(middleValueActual)) {
                            segment1ActualChange_in = middleValueActual[0] - startValue[0];
                        } else {
                            segment1ActualChange_in = middleValueActual - startValue;
                        }
                        
                        if (segment1ActualChange_in < 0) {
                            correctedSpeed2 = -correctedSpeed2;
                        }
                    }
                    
                    var middleInEase = AGraphUtils.createEaseArray(prop,
                        correctedSpeed2,
                        segment1Easing.inTemporal.influence
                    );
                    
                    var middleOutEaseOld = prop.keyOutTemporalEase(middleKeyIndex);
                    prop.setTemporalEaseAtKey(middleKeyIndex, middleInEase, middleOutEaseOld);
                    debugInfo.push("第1区間終点ハンドル設定: speed=" + segment1Easing.inTemporal.speed + "→" + correctedSpeed2.toFixed(3) + " (倍率=" + speedMultiplier1.toFixed(3) + "), influence=" + segment1Easing.inTemporal.influence);
                }
                
                // 第2区間 (middle → end)
                if (segment2Easing.outTemporal) {
                    // 符号反転判定：位置プロパティの場合はスキップ
                    var isSpatialProperty2 = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || 
                                             prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
                    
                    var correctedSpeed3 = (segment2Easing.outTemporal.speed / 100) * speedMultiplier2;
                    
                    if (!isSpatialProperty2) {
                        var segment2ActualChange = 0;
                        if (Array.isArray(endValue)) {
                            segment2ActualChange = endValue[0] - middleValueActual[0];
                        } else {
                            segment2ActualChange = endValue - middleValueActual;
                        }
                        
                        // 実際の変化が負なら反転
                        if (segment2ActualChange < 0) {
                            correctedSpeed3 = -correctedSpeed3;
                            debugInfo.push("Segment2 change is negative, speed flipped to: " + correctedSpeed3.toFixed(3));
                        }
                    }
                    
                    var middleOutEase = AGraphUtils.createEaseArray(prop,
                        correctedSpeed3,
                        segment2Easing.outTemporal.influence
                    );
                    
                    var middleInEaseOld = prop.keyInTemporalEase(middleKeyIndex);
                    prop.setTemporalEaseAtKey(middleKeyIndex, middleInEaseOld, middleOutEase);
                    debugInfo.push("第2区間開始ハンドル設定: speed=" + segment2Easing.outTemporal.speed + "→" + correctedSpeed3.toFixed(3) + " (倍率=" + speedMultiplier2.toFixed(3) + "), influence=" + segment2Easing.outTemporal.influence);
                }
                
                if (segment2Easing.inTemporal) {
                    // 符号反転判定：位置プロパティの場合はスキップ（In handleも同じ区間なので同じ判定）
                    var isSpatialProperty2_in = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || 
                                                prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
                    
                    var correctedSpeed4 = (segment2Easing.inTemporal.speed / 100) * speedMultiplier2;
                    
                    if (!isSpatialProperty2_in) {
                        var segment2ActualChange_in = 0;
                        if (Array.isArray(endValue)) {
                            segment2ActualChange_in = endValue[0] - middleValueActual[0];
                        } else {
                            segment2ActualChange_in = endValue - middleValueActual;
                        }
                        
                        if (segment2ActualChange_in < 0) {
                            correctedSpeed4 = -correctedSpeed4;
                        }
                    }
                    
                    var endInEase = AGraphUtils.createEaseArray(prop,
                        correctedSpeed4,
                        segment2Easing.inTemporal.influence
                    );
                    
                    var endOutEase = prop.keyOutTemporalEase(endKeyIndex);
                    prop.setTemporalEaseAtKey(endKeyIndex, endInEase, endOutEase);
                    debugInfo.push("End IN handle set: speed=" + correctedSpeed4.toFixed(3) + ", influence=" + segment2Easing.inTemporal.influence);
                }
                
                debugInfo.push("=== Handle setting completed ===");
                
            } catch (handleError) {
                debugInfo.push("ハンドル設定エラー: " + handleError.toString());
                debugInfo.push("Error line: " + (handleError.line || "unknown"));
            }
            
            appliedCount++;
            totalKeyframes = prop.numKeys;
            debugInfo.push("Property applied successfully. Total keys: " + totalKeyframes);
        }
        
        debugInfo.push("=== LOOP COMPLETED ===");
        debugInfo.push("Applied count: " + appliedCount);
        
        app.endUndoGroup();
        
        debugInfo.push("Undo group ended");
        
        debugInfo.push("About to return result");
        debugInfo.push("Final debugInfo array length: " + debugInfo.length);
        
        var result = {
            success: true,
            appliedCount: appliedCount,
            totalKeyframes: totalKeyframes,
            middleTime: middleTime,
            message: "3-point graph applied to 2 keyframes with middle point generated",
            debug: debugInfo
        };
        
        return JSON.stringify(result);
        
    } catch (error) {
        debugInfo.push("=== FATAL ERROR ===");
        debugInfo.push("Error message: " + error.toString());
        debugInfo.push("Error line: " + (error.line || "unknown"));
        
        if (app.project) {
            app.endUndoGroup();
        }
        return JSON.stringify({ 
            error: "3-Point to 2-Point apply failed: " + error.toString(),
            errorLine: error.line || "unknown",
            debug: debugInfo 
        });
    }
}

/**
 * 3点モードのグラフを2点のキーフレームに適用（中点自動生成）
 * プロパティまたぎOK版の完璧なコード
 */
function aGraphApply3PointTo2Point(dataJson) {
    var debugInfo = [];
    try {
        // 新しいデータ構造に適応: JSON.parseしてデータを取得
        debugInfo.push("=== FUNCTION ENTRY ===");
        debugInfo.push("Arguments received:");
        debugInfo.push("  dataJson: " + dataJson);
        
        var data = JSON.parse(dataJson);
        var startKeyframe = data.startKeyframe;
        var endKeyframe = data.endKeyframe;
        var middleTime = data.middleTime;
        var middleValue = data.middleValue;
        var easingSettings = data.easingSettings;
        
        debugInfo.push("  startKeyframe: " + JSON.stringify(startKeyframe));
        debugInfo.push("  endKeyframe: " + JSON.stringify(endKeyframe));
        debugInfo.push("  middleTime: " + middleTime);
        debugInfo.push("  middleValue: " + JSON.stringify(middleValue));
        debugInfo.push("  easingSettings: " + JSON.stringify(easingSettings));
        
        app.beginUndoGroup("AGraph 3-Point to 2-Point Apply");
        debugInfo.push("Undo group started");
        
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            debugInfo.push("ERROR: No active composition");
            return JSON.stringify({ error: "No active composition found", debug: debugInfo });
        }
        debugInfo.push("Active composition found: " + comp.name);
        
        var selectedProperties = comp.selectedProperties;
        if (selectedProperties.length === 0) {
            debugInfo.push("ERROR: No properties selected");
            return JSON.stringify({ error: "No properties selected. Please select keyframes in the timeline.", debug: debugInfo });
        }
        debugInfo.push("Selected properties count: " + selectedProperties.length);
        
        var appliedCount = 0;
        var totalKeyframes = 0;
        
        // easingSettingsの内容をデバッグ
        debugInfo.push("easingSettings received: " + JSON.stringify(easingSettings));
        
        // 3点モードの区間別easing設定を確認
        var segment1Easing = easingSettings.segment1 || { outTemporal: { speed: 0, influence: 33.33 }, inTemporal: { speed: 0, influence: 33.33 } };
        var segment2Easing = easingSettings.segment2 || { outTemporal: { speed: 0, influence: 33.33 }, inTemporal: { speed: 0, influence: 33.33 } };
        
        debugInfo.push("segment1Easing: " + JSON.stringify(segment1Easing));
        debugInfo.push("segment2Easing: " + JSON.stringify(segment2Easing));
        
        debugInfo.push("Starting property loop with " + selectedProperties.length + " properties");
        
        // 各選択されたプロパティを処理
        for (var i = 0; i < selectedProperties.length; i++) {
            debugInfo.push("Loop iteration " + i + " starting");
            var prop = selectedProperties[i];
            
            debugInfo.push("Processing property: " + (prop.name || "Unknown"));
            
            // JavaScript側から渡されたプロパティ名と一致するかチェック
            if (startKeyframe.propertyName && prop.name !== startKeyframe.propertyName) {
                debugInfo.push("Property name mismatch: " + prop.name + " !== " + startKeyframe.propertyName + ", skipping");
                continue;
            }
            
            if (!prop.numKeys || prop.numKeys === 0) {
                debugInfo.push("No keyframes in property");
                continue;
            }
            
            // 2点モードと同じ：キーフレームが選択されているかチェック
            var selectedKeys = prop.selectedKeys;
            if (!selectedKeys || selectedKeys.length === 0) {
                debugInfo.push("No selected keys in property, skipping");
                continue;
            }
            debugInfo.push("Selected keys in property: " + selectedKeys.length);
            
            // 開始と終了キーフレームのインデックスを探す
            var startKeyIndex = -1;
            var endKeyIndex = -1;
            
            for (var keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
                var keyTime = prop.keyTime(keyIndex);
                
                if (Math.abs(keyTime - startKeyframe.time) < 0.001) {
                    startKeyIndex = keyIndex;
                    debugInfo.push("Found start key at index: " + keyIndex);
                }
                if (Math.abs(keyTime - endKeyframe.time) < 0.001) {
                    endKeyIndex = keyIndex;
                    debugInfo.push("Found end key at index: " + keyIndex);
                }
            }
            
            if (startKeyIndex === -1 || endKeyIndex === -1) {
                debugInfo.push("Start or end keyframe not found in property");
                continue;
            }
            
            // speed倍率計算用：選択された始点と終点の値を取得（中点挿入前）
            var originalStartValue = prop.keyValue(startKeyIndex);
            var originalEndValue = prop.keyValue(endKeyIndex);
            var originalStartTime = prop.keyTime(startKeyIndex);
            var originalEndTime = prop.keyTime(endKeyIndex);
            
            // 中点キーフレームを挿入
            debugInfo.push("Inserting middle keyframe at time: " + middleTime);
            debugInfo.push("middleValue type: " + (Array.isArray(middleValue) ? "Array" : typeof middleValue));
            debugInfo.push("middleValue: " + JSON.stringify(middleValue));
            
            var newKeyIndex = prop.addKey(middleTime);
            debugInfo.push("Middle keyframe inserted at index: " + newKeyIndex);
            
            // 中点の値を設定
            if (Array.isArray(middleValue)) {
                // 位置プロパティなど多次元
                var currentValue = prop.keyValue(newKeyIndex);
                
                if (Array.isArray(currentValue)) {
                    var newValue = [];
                    for (var d = 0; d < Math.min(currentValue.length, middleValue.length); d++) {
                        newValue[d] = middleValue[d];
                    }
                    
                    // 直接配列として設定
                    prop.setValueAtKey(newKeyIndex, newValue);
                    debugInfo.push("Set multi-dimensional value: " + JSON.stringify(newValue));
                }
            } else {
                // 1次元プロパティ
                prop.setValueAtKey(newKeyIndex, middleValue);
                debugInfo.push("Set 1D value: " + middleValue);
            }
            
            // キーフレームインデックスが中点挿入により変更される可能性があるため再取得
            startKeyIndex = -1;
            endKeyIndex = -1;
            
            for (var keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
                var keyTime = prop.keyTime(keyIndex);
                
                if (Math.abs(keyTime - startKeyframe.time) < 0.001) {
                    startKeyIndex = keyIndex;
                }
                if (Math.abs(keyTime - endKeyframe.time) < 0.001) {
                    endKeyIndex = keyIndex;
                }
            }
            
            // 中点のインデックスを取得
            var middleKeyIndex = prop.nearestKeyIndex(middleTime);
            
            // 補間タイプをベジエに設定
            prop.setInterpolationTypeAtKey(startKeyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            prop.setInterpolationTypeAtKey(middleKeyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            prop.setInterpolationTypeAtKey(endKeyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            
            // 3点モードのハンドル設定を適用
            debugInfo.push("Applying 3-point handle settings");
            
            try {
                debugInfo.push("Getting values for handle calculation");
                // 中点生成後の値と時間を取得（ハンドル設定用）
                var startValue = prop.keyValue(startKeyIndex);
                var middleValueActual = prop.keyValue(middleKeyIndex);
                var endValue = prop.keyValue(endKeyIndex);
                
                var startTime = prop.keyTime(startKeyIndex);
                var middleTimeActual = prop.keyTime(middleKeyIndex);
                var endTime = prop.keyTime(endKeyIndex);
                
                debugInfo.push("Times: " + startTime.toFixed(3) + " -> " + middleTimeActual.toFixed(3) + " -> " + endTime.toFixed(3));
                
                // セグメント別のspeed倍率計算（各区間の変化率）
                var deltaY1, deltaY2;
                var timeRange1 = Math.abs(middleTimeActual - startTime);
                var timeRange2 = Math.abs(endTime - middleTimeActual);
                
                // プロパティタイプ別の値差分計算
                if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                    prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
                    // Spatialの場合はベクトル長を計算
                    // 第1区間
                    var deltaVector1 = [];
                    for (var d = 0; d < middleValueActual.length; d++) {
                        deltaVector1.push(middleValueActual[d] - startValue[d]);
                    }
                    var sum1 = 0;
                    for (var d = 0; d < deltaVector1.length; d++) {
                        sum1 += deltaVector1[d] * deltaVector1[d];
                    }
                    deltaY1 = Math.sqrt(sum1);
                    
                    // 第2区間
                    var deltaVector2 = [];
                    for (var d = 0; d < endValue.length; d++) {
                        deltaVector2.push(endValue[d] - middleValueActual[d]);
                    }
                    var sum2 = 0;
                    for (var d = 0; d < deltaVector2.length; d++) {
                        sum2 += deltaVector2[d] * deltaVector2[d];
                    }
                    deltaY2 = Math.sqrt(sum2);
                } else if (Array.isArray(startValue)) {
                    // 多次元（スケール等）: X値(value[0])のみ使用（RealEase準拠）
                    deltaY1 = Math.abs(middleValueActual[0] - startValue[0]);
                    deltaY2 = Math.abs(endValue[0] - middleValueActual[0]);
                } else {
                    // 1次元の場合
                    deltaY1 = Math.abs(middleValueActual - startValue);
                    deltaY2 = Math.abs(endValue - middleValueActual);
                }
                
                debugInfo.push("DeltaY: seg1=" + deltaY1.toFixed(3) + ", seg2=" + deltaY2.toFixed(3));
                
                // 各セグメントの変化率（Analyzeと同じ: 値の変化 / 時間の変化）
                var speedMultiplier1 = timeRange1 > 0 ? deltaY1 / timeRange1 : 0;
                var speedMultiplier2 = timeRange2 > 0 ? deltaY2 / timeRange2 : 0;
                
                debugInfo.push("SpeedMultipliers: seg1=" + speedMultiplier1.toFixed(3) + ", seg2=" + speedMultiplier2.toFixed(3));
                
                // 第1区間 (start → middle)
                debugInfo.push("=== Segment 1 Handles ===");
                if (segment1Easing.outTemporal) {
                    debugInfo.push("Setting start OUT handle");
                    
                    // 符号反転判定：位置プロパティの場合はスキップ
                    var isSpatialProperty = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                                             prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
                    
                    var correctedSpeed1 = (segment1Easing.outTemporal.speed / 100) * speedMultiplier1;
                    debugInfo.push("Original speed: " + segment1Easing.outTemporal.speed + ", multiplier: " + speedMultiplier1.toFixed(3) + ", corrected: " + correctedSpeed1.toFixed(3));
                    
                    // 位置以外で、実際の変化が負の場合は符号を反転
                    if (!isSpatialProperty) {
                        var segment1ActualChange = 0;
                        if (Array.isArray(middleValueActual)) {
                            segment1ActualChange = middleValueActual[0] - startValue[0];
                        } else {
                            segment1ActualChange = middleValueActual - startValue;
                        }
                        
                        // グラフは常に正方向（0→1）なので、実際の変化が負なら反転
                        if (segment1ActualChange < 0) {
                            correctedSpeed1 = -correctedSpeed1;
                            debugInfo.push("Segment1 change is negative, speed flipped to: " + correctedSpeed1.toFixed(3));
                        }
                    }
                    
                    var startOutEase = AGraphUtils.createEaseArray(prop,
                        correctedSpeed1,
                        segment1Easing.outTemporal.influence
                    );
                    
                    debugInfo.push("startOutEase length: " + startOutEase.length + ", prop dimensions: " + (prop.keyValue(startKeyIndex).length || 1));
                    
                    // 両方の配列を渡す（2点モードと同じ方式）
                    var startInEase = prop.keyInTemporalEase(startKeyIndex);
                    debugInfo.push("startInEase length: " + startInEase.length);
                    
                    prop.setTemporalEaseAtKey(startKeyIndex, startInEase, startOutEase);
                    debugInfo.push("Start OUT handle set: speed=" + correctedSpeed1.toFixed(3) + ", influence=" + segment1Easing.outTemporal.influence);
                }
                
                if (segment1Easing.inTemporal) {
                    // 符号反転判定：位置プロパティの場合はスキップ（In handleも同じ区間なので同じ判定）
                    var isSpatialProperty_in = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                                               prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
                    
                    var correctedSpeed2 = (segment1Easing.inTemporal.speed / 100) * speedMultiplier1;
                    
                    if (!isSpatialProperty_in) {
                        var segment1ActualChange_in = 0;
                        if (Array.isArray(middleValueActual)) {
                            segment1ActualChange_in = middleValueActual[0] - startValue[0];
                        } else {
                            segment1ActualChange_in = middleValueActual - startValue;
                        }
                        
                        if (segment1ActualChange_in < 0) {
                            correctedSpeed2 = -correctedSpeed2;
                        }
                    }
                    
                    var middleInEase = AGraphUtils.createEaseArray(prop,
                        correctedSpeed2,
                        segment1Easing.inTemporal.influence
                    );
                    
                    var middleOutEaseOld = prop.keyOutTemporalEase(middleKeyIndex);
                    prop.setTemporalEaseAtKey(middleKeyIndex, middleInEase, middleOutEaseOld);
                    debugInfo.push("第1区間終点ハンドル設定: speed=" + segment1Easing.inTemporal.speed + "→" + correctedSpeed2.toFixed(3) + " (倍率=" + speedMultiplier1.toFixed(3) + "), influence=" + segment1Easing.inTemporal.influence);
                }
                
                // 第2区間 (middle → end)
                if (segment2Easing.outTemporal) {
                    // 符号反転判定：位置プロパティの場合はスキップ
                    var isSpatialProperty2 = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                                             prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
                    
                    var correctedSpeed3 = (segment2Easing.outTemporal.speed / 100) * speedMultiplier2;
                    
                    if (!isSpatialProperty2) {
                        var segment2ActualChange = 0;
                        if (Array.isArray(endValue)) {
                            segment2ActualChange = endValue[0] - middleValueActual[0];
                        } else {
                            segment2ActualChange = endValue - middleValueActual;
                        }
                        
                        // 実際の変化が負なら反転
                        if (segment2ActualChange < 0) {
                            correctedSpeed3 = -correctedSpeed3;
                            debugInfo.push("Segment2 change is negative, speed flipped to: " + correctedSpeed3.toFixed(3));
                        }
                    }
                    
                    var middleOutEase = AGraphUtils.createEaseArray(prop,
                        correctedSpeed3,
                        segment2Easing.outTemporal.influence
                    );
                    
                    var middleInEaseOld = prop.keyInTemporalEase(middleKeyIndex);
                    prop.setTemporalEaseAtKey(middleKeyIndex, middleInEaseOld, middleOutEase);
                    debugInfo.push("第2区間開始ハンドル設定: speed=" + segment2Easing.outTemporal.speed + "→" + correctedSpeed3.toFixed(3) + " (倍率=" + speedMultiplier2.toFixed(3) + "), influence=" + segment2Easing.outTemporal.influence);
                }
                
                if (segment2Easing.inTemporal) {
                    // 符号反転判定：位置プロパティの場合はスキップ（In handleも同じ区間なので同じ判定）
                    var isSpatialProperty2_in = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                                               prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
                    
                    var correctedSpeed4 = (segment2Easing.inTemporal.speed / 100) * speedMultiplier2;
                    
                    if (!isSpatialProperty2_in) {
                        var segment2ActualChange_in = 0;
                        if (Array.isArray(endValue)) {
                            segment2ActualChange_in = endValue[0] - middleValueActual[0];
                        } else {
                            segment2ActualChange_in = endValue - middleValueActual;
                        }
                        
                        if (segment2ActualChange_in < 0) {
                            correctedSpeed4 = -correctedSpeed4;
                        }
                    }
                    
                    var endInEase = AGraphUtils.createEaseArray(prop,
                        correctedSpeed4,
                        segment2Easing.inTemporal.influence
                    );
                    
                    var endOutEase = prop.keyOutTemporalEase(endKeyIndex);
                    prop.setTemporalEaseAtKey(endKeyIndex, endInEase, endOutEase);
                    debugInfo.push("End IN handle set: speed=" + correctedSpeed4.toFixed(3) + ", influence=" + segment2Easing.inTemporal.influence);
                }
                
                debugInfo.push("=== Handle setting completed ===");
                
            } catch (handleError) {
                debugInfo.push("ハンドル設定エラー: " + handleError.toString());
                debugInfo.push("Error line: " + (handleError.line || "unknown"));
            }
            
            appliedCount++;
            totalKeyframes = prop.numKeys;
            debugInfo.push("Property applied successfully. Total keys: " + totalKeyframes);
        }
        
        debugInfo.push("=== LOOP COMPLETED ===");
        debugInfo.push("Applied count: " + appliedCount);
        
        app.endUndoGroup();
        
        debugInfo.push("Undo group ended");
        
        debugInfo.push("About to return result");
        debugInfo.push("Final debugInfo array length: " + debugInfo.length);
        
        var result = {
            success: true,
            appliedCount: appliedCount,
            totalKeyframes: totalKeyframes,
            middleTime: middleTime,
            message: "3-point graph applied to 2 keyframes with middle point generated",
            debug: debugInfo
        };
        
        return JSON.stringify(result);
        
    } catch (error) {
        debugInfo.push("=== FATAL ERROR ===");
        debugInfo.push("Error message: " + error.toString());
        debugInfo.push("Error line: " + (error.line || "unknown"));
        
        if (app.project) {
            app.endUndoGroup();
        }
        return JSON.stringify({ 
            error: "3-Point to 2-Point apply failed: " + error.toString(),
            errorLine: error.line || "unknown",
            debug: debugInfo 
        });
    }
}

/**
 * Base64デコード用ヘルパー関数
 */
function base64Decode(str) {
    var base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var result = '';
    var bits = 0;
    var bitCount = 0;
    
    for (var i = 0; i < str.length; i++) {
        if (str.charAt(i) === '=') break;
        
        var charIndex = base64chars.indexOf(str.charAt(i));
        if (charIndex === -1) continue;
        
        bits = (bits << 6) | charIndex;
        bitCount += 6;
        
        if (bitCount >= 8) {
            bitCount -= 8;
            result += String.fromCharCode((bits >> bitCount) & 0xFF);
            bits &= (1 << bitCount) - 1;
        }
    }
    
    return result;
}

/**
 * URIデコード用ヘルパー関数
 */
function decodeURIComponentCustom(str) {
    var result = '';
    var i = 0;
    
    while (i < str.length) {
        if (str.charAt(i) === '%') {
            var hex = str.substr(i + 1, 2);
            result += String.fromCharCode(parseInt(hex, 16));
            i += 3;
        } else {
            result += str.charAt(i);
            i++;
        }
    }
    
    return result;
}

/**
 * Base64エンコードされたJSONを受け取ってN点カーブを適用（多言語対応版）
 */
function aGraphApplyNPointBase64(encodedJson) {
    try {
        // Base64デコード → URIデコード
        var decodedJson = decodeURIComponentCustom(base64Decode(encodedJson));
        // 既存の関数を呼び出し
        return aGraphApplyNPoint(decodedJson);
    } catch (error) {
        return JSON.stringify({
            success: false,
            error: 'Base64 decode error: ' + error.toString()
        });
    }
}

/**
 * N点カーブを適用（2点選択に対して中点自動生成 + ハンドル適用）
 * gitの「プロパティまたぎOK」の完璧なロジックを使用
 */
function aGraphApplyNPoint(dataJson) {
    var debugInfo = [];
    try {
        $.writeln("=== aGraphApplyNPoint called ===");
        $.writeln("dataJson: " + dataJson);
        
        var data = JSON.parse(dataJson);
        var startTime = data.startTime;             // JavaScript側から渡された開始時間
        var endTime = data.endTime;                 // JavaScript側から渡された終了時間
        var middleKeyframes = data.middleKeyframes; // 配列: N-2個の中点の{time, value}
        var segmentsEasing = data.segmentsEasing;   // 配列: N-1区間のイージング設定
        
        debugInfo.push("━━━ AGraph v4.0 Apply ━━━");
        debugInfo.push("=== aGraphApplyNPoint START ===");
        debugInfo.push("Target range: " + startTime.toFixed(3) + "s → " + endTime.toFixed(3) + "s");
        debugInfo.push("Graph points: " + (middleKeyframes.length + 2) + " (middle: " + middleKeyframes.length + ")");
        debugInfo.push("Segments: " + segmentsEasing.length);
        
        $.writeln("Middle keyframes: " + middleKeyframes.length);
        $.writeln("Segments easing: " + segmentsEasing.length);
        
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            $.writeln("ERROR: No comp");
            return JSON.stringify({ error: "No active composition", debug: debugInfo });
        }

        var selectedProperties = comp.selectedProperties;
        $.writeln("Selected properties count: " + selectedProperties.length);
        
        if (selectedProperties.length === 0) {
            $.writeln("ERROR: No properties selected");
            return JSON.stringify({ error: "No properties selected", debug: debugInfo });
        }
        
        app.beginUndoGroup("AGraph: Apply N-Point");
        
        var appliedCount = 0;
        
        // 各プロパティに対して処理
        for (var i = 0; i < selectedProperties.length; i++) {
            var prop = selectedProperties[i];
            
            debugInfo.push("\n=== Property " + (i + 1) + "/" + selectedProperties.length + ": " + (prop.name || "Unknown") + " ===");
            
            if (!prop.numKeys || prop.numKeys === 0) {
                debugInfo.push("No keyframes in property, skipping");
                continue;
            }
            
            // JavaScript側から渡された時間と一致するキーフレームを探す
            var selectedKeys = prop.selectedKeys;
            debugInfo.push("Selected keys count: " + (selectedKeys ? selectedKeys.length : 0));
            
            var startKeyIndex = -1;
            var endKeyIndex = -1;
            
            for (var keyIndex = 1; keyIndex <= prop.numKeys; keyIndex++) {
                var keyTime = prop.keyTime(keyIndex);
                
                // JavaScript側から渡されたstartTime/endTimeと一致するキーフレームを探す
                if (startKeyIndex === -1 && Math.abs(keyTime - startTime) < 0.001) {
                    startKeyIndex = keyIndex;
                    debugInfo.push("Found start key at index: " + keyIndex + ", time: " + keyTime.toFixed(3));
                }
                
                if (endKeyIndex === -1 && Math.abs(keyTime - endTime) < 0.001) {
                    endKeyIndex = keyIndex;
                    debugInfo.push("Found end key at index: " + keyIndex + ", time: " + keyTime.toFixed(3));
                }
            }
            
            if (startKeyIndex === -1 || endKeyIndex === -1) {
                debugInfo.push("Start or end keyframe not found in property, skipping");
                continue;
            }
            
            // 選択された2つのキーフレームを取得
            var startTime = prop.keyTime(startKeyIndex);
            var endTime = prop.keyTime(endKeyIndex);
            var startValue = prop.keyValue(startKeyIndex);
            var endValue = prop.keyValue(endKeyIndex);
            
            debugInfo.push("【Apply先キーフレーム情報】");
            debugInfo.push("  キーフレーム数: 2個 (選択)");
            debugInfo.push("  開始KF: index=" + startKeyIndex + ", time=" + startTime.toFixed(3) + "s, value=" + JSON.stringify(startValue));
            debugInfo.push("  終了KF: index=" + endKeyIndex + ", time=" + endTime.toFixed(3) + "s, value=" + JSON.stringify(endValue));
            
            var timeRange = endTime - startTime;
            var deltaY = AGraphUtils.calculateDeltaY(startValue, endValue, prop.propertyValueType);
            
            debugInfo.push("  時間変化(timeRange): " + timeRange.toFixed(3) + "s");
            debugInfo.push("  値変化(deltaY/正規化基準): " + deltaY.toFixed(3));
            debugInfo.push("  プロパティタイプ: " + prop.propertyValueType);
            
            // 中点キーフレームを生成（正規化値から各プロパティのstartValue/endValueで実際の値を計算）
            if (middleKeyframes.length > 0) {
                debugInfo.push("\n【生成する中点】 (" + middleKeyframes.length + "個):");
                for (var m = 0; m < middleKeyframes.length; m++) {
                    var middleKf = middleKeyframes[m];
                    
                    // 正規化値から実際の時間と値を計算
                    var actualTime = startTime + (endTime - startTime) * middleKf.normalizedTime;
                    var actualValue;
                    
                    if (Array.isArray(startValue) && Array.isArray(endValue)) {
                        // 多次元値
                        actualValue = [];
                        var dimensions = Math.min(startValue.length, endValue.length);
                        for (var d = 0; d < dimensions; d++) {
                            actualValue[d] = startValue[d] + (endValue[d] - startValue[d]) * middleKf.normalizedValue;
                        }
                    } else {
                        // 1次元値
                        var startScalar = Array.isArray(startValue) ? startValue[0] : startValue;
                        var endScalar = Array.isArray(endValue) ? endValue[0] : endValue;
                        actualValue = startScalar + (endScalar - startScalar) * middleKf.normalizedValue;
                    }
                    
                    debugInfo.push("  中点" + (m + 1) + ":");
                    debugInfo.push("    グラフの正規化値: time=" + middleKf.normalizedTime.toFixed(3) + ", value=" + middleKf.normalizedValue.toFixed(3));
                    debugInfo.push("    このプロパティの実際の値: time=" + actualTime.toFixed(3) + "s, value=" + JSON.stringify(actualValue));
                    
                    var newKeyIndex = prop.addKey(actualTime);
                    prop.setValueAtKey(newKeyIndex, actualValue);
                }
            } else {
                debugInfo.push("\n【中点生成なし】 (2点グラフ)");
            }
            
            // キーフレームインデックスを再取得（中点挿入後）
            var allKeyIndices = [];
            
            // 開始キーフレーム（時間で検索）
            for (var k = 1; k <= prop.numKeys; k++) {
                if (Math.abs(prop.keyTime(k) - startTime) < 0.001) {
                    allKeyIndices.push(k);
                    break;
                }
            }
            
            // 中点キーフレーム（正規化値から計算した時間で検索）
            for (var m = 0; m < middleKeyframes.length; m++) {
                var middleTime = startTime + (endTime - startTime) * middleKeyframes[m].normalizedTime;
                for (var k = 1; k <= prop.numKeys; k++) {
                    if (Math.abs(prop.keyTime(k) - middleTime) < 0.001) {
                        allKeyIndices.push(k);
                        break;
                    }
                }
            }
            
            // 終了キーフレーム（時間で検索）
            for (var k = 1; k <= prop.numKeys; k++) {
                if (Math.abs(prop.keyTime(k) - endTime) < 0.001) {
                    allKeyIndices.push(k);
                    break;
                }
            }
            
            if (allKeyIndices.length !== middleKeyframes.length + 2) {
                debugInfo.push("ERROR: キーフレーム取得失敗 (expected " + (middleKeyframes.length + 2) + ", got " + allKeyIndices.length + ")");
                continue;
            }
            
            // 補間タイプをベジエに設定
            for (var k = 0; k < allKeyIndices.length; k++) {
                prop.setInterpolationTypeAtKey(allKeyIndices[k], KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            }
            
            // 各区間にハンドルを適用（gitの完璧なロジック）
            debugInfo.push("\n【ハンドル適用】 (" + segmentsEasing.length + "区間):");
            for (var seg = 0; seg < segmentsEasing.length; seg++) {
                var idx1 = allKeyIndices[seg];
                var idx2 = allKeyIndices[seg + 1];
                var segEasing = segmentsEasing[seg];
                
                var val1 = prop.keyValue(idx1);
                var val2 = prop.keyValue(idx2);
                var time1 = prop.keyTime(idx1);
                var time2 = prop.keyTime(idx2);
                
                debugInfo.push("  区間" + seg + " (KF" + idx1 + "[" + time1.toFixed(3) + "s] → KF" + idx2 + "[" + time2.toFixed(3) + "s]):");
                
                // このセグメントのspeed倍率を計算（gitの完璧なロジック）
                var segTimeRange = Math.abs(time2 - time1);
                var segDeltaY;
                
                if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                    prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
                    // Spatial: ベクトル長
                    var deltaVector = [];
                    for (var d = 0; d < val2.length; d++) {
                        deltaVector.push(val2[d] - val1[d]);
                    }
                    var sum = 0;
                    for (var d = 0; d < deltaVector.length; d++) {
                        sum += deltaVector[d] * deltaVector[d];
                    }
                    segDeltaY = Math.sqrt(sum);
                } else if (Array.isArray(val1)) {
                    // 多次元（スケール等）: X値のみ
                    segDeltaY = Math.abs(val2[0] - val1[0]);
                } else {
                    // 1次元
                    segDeltaY = Math.abs(val2 - val1);
                }
                
                var speedMultiplier = segTimeRange > 0 ? segDeltaY / segTimeRange : 0;
                debugInfo.push("    区間変化: deltaY=" + segDeltaY.toFixed(3) + ", timeRange=" + segTimeRange.toFixed(3) + "s, multiplier=" + speedMultiplier.toFixed(3));
                
                // OUT handle (区間開始点)
                if (segEasing.outTemporal) {
                    var graphOutSpeed = segEasing.outTemporal.speed;
                    // graphOutSpeedは正規化グラフ基準（×100）なので、/100してspeedMultiplierを掛ける
                    var correctedSpeed = (graphOutSpeed / 100) * speedMultiplier;
                    
                    // 符号反転判定（位置以外）
                    if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && 
                        prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) {
                        var val1Scalar = Array.isArray(val1) ? val1[0] : val1;
                        var val2Scalar = Array.isArray(val2) ? val2[0] : val2;
                        if (val2Scalar < val1Scalar) {
                            correctedSpeed = -correctedSpeed;
                        }
                    }
                    
                    var outEase = AGraphUtils.createEaseArray(prop, correctedSpeed, segEasing.outTemporal.influence);
                    prop.setTemporalEaseAtKey(idx1, prop.keyInTemporalEase(idx1), outEase);
                    debugInfo.push("    OUT: Analyze時speed=" + graphOutSpeed.toFixed(3) + " → Apply後speed=" + correctedSpeed.toFixed(3) + ", influence=" + segEasing.outTemporal.influence.toFixed(3));
                }
                
                // IN handle (区間終点)
                if (segEasing.inTemporal) {
                    var graphInSpeed = segEasing.inTemporal.speed;
                    // graphInSpeedは正規化グラフ基準（×100）なので、/100してspeedMultiplierを掛ける
                    var correctedSpeed = (graphInSpeed / 100) * speedMultiplier;
                    
                    // 符号反転判定（位置以外）
                    if (prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && 
                        prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) {
                        var val1Scalar = Array.isArray(val1) ? val1[0] : val1;
                        var val2Scalar = Array.isArray(val2) ? val2[0] : val2;
                        if (val2Scalar < val1Scalar) {
                            correctedSpeed = -correctedSpeed;
                        }
                    }
                    
                    var inEase = AGraphUtils.createEaseArray(prop, correctedSpeed, segEasing.inTemporal.influence);
                    prop.setTemporalEaseAtKey(idx2, inEase, prop.keyOutTemporalEase(idx2));
                    debugInfo.push("    IN: Analyze時speed=" + graphInSpeed.toFixed(3) + " → Apply後speed=" + correctedSpeed.toFixed(3) + ", influence=" + segEasing.inTemporal.influence.toFixed(3));
                }
            }
            
            appliedCount++;
            debugInfo.push("✓ Property適用完了");
        }
        
        app.endUndoGroup();
        
        debugInfo.push("\n=== COMPLETED ===");
        debugInfo.push("適用プロパティ数: " + appliedCount);
        
        return JSON.stringify({
            success: true,
            appliedCount: appliedCount,
            message: (middleKeyframes.length + 2) + "-point applied to " + appliedCount + " property(ies)",
            debug: debugInfo
        });
        
    } catch (error) {
        if (app.project) {
            app.endUndoGroup();
        }
        debugInfo.push("=== ERROR ===");
        debugInfo.push(error.toString());
        return JSON.stringify({ 
            error: "Apply failed: " + error.toString(),
            debug: debugInfo 
        });
    }
}

/**
 * プリセットファイルを読み込む
 * @param {string} filePath - ファイルパス
 * @return {string} JSON文字列（成功時）またはエラーオブジェクト
 */
function readPresetFile(filePath) {
    try {
        var file = new File(filePath);
        
        if (!file.exists) {
            return JSON.stringify({ 
                error: 'File not found', 
                shouldCreate: true,
                path: filePath 
            });
        }
        
        file.encoding = 'UTF-8';
        if (!file.open('r')) {
            alert('AGraph Error:\n\nプリセットファイルを開けません。\n\nパス: ' + filePath + '\n\n対処法: After Effectsを管理者権限で起動してください。');
            return JSON.stringify({ 
                error: 'Cannot open file for reading',
                path: filePath 
            });
        }
        
        var content = file.read();
        file.close();
        
        return JSON.stringify({
            success: true,
            content: content
        });
    } catch (e) {
        alert('AGraph Error:\n\nファイル読み込みエラー\n\n' + e.toString() + '\n\nパス: ' + filePath);
        return JSON.stringify({ 
            error: e.toString(),
            path: filePath 
        });
    }
}

/**
 * 設定を保存
 * @param {string} key - 設定キー
 * @param {string} value - 設定値
 * @return {string} 結果のJSONオブジェクト
 */
function savePreference(key, value) {
    try {
        // ExtendScriptはスラッシュ(/)を推奨（クロスプラットフォーム）
        var userDataPath = Folder.userData.fsName.replace(/\\/g, '/');
        var settingsFolder = new Folder(userDataPath + '/AGraph');
        
        if (!settingsFolder.exists) {
            if (!settingsFolder.create()) {
                alert('AGraph Error:\n\n設定フォルダを作成できません。\n\n' + settingsFolder.fsName + '\n\n対処法: このフォルダに書き込み権限があるか確認してください。');
                return JSON.stringify({ error: 'Cannot create settings folder' });
            }
        }
        
        var file = new File(settingsFolder.fsName.replace(/\\/g, '/') + '/' + key + '.txt');
        file.encoding = 'UTF-8';
        
        if (!file.open('w')) {
            return JSON.stringify({ error: 'Cannot open file for writing' });
        }
        
        file.write(value);
        file.close();
        
        return JSON.stringify({ success: true, key: key, value: value });
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

/**
 * 設定を読み込み
 * @param {string} key - 設定キー
 * @return {string} 結果のJSONオブジェクト
 */
function loadPreference(key) {
    try {
        // ExtendScriptはスラッシュ(/)を推奨（クロスプラットフォーム）
        var userDataPath = Folder.userData.fsName.replace(/\\/g, '/');
        var file = new File(userDataPath + '/AGraph/' + key + '.txt');
        
        if (!file.exists) {
            return JSON.stringify({ success: true, value: null });
        }
        
        file.encoding = 'UTF-8';
        if (!file.open('r')) {
            return JSON.stringify({ error: 'Cannot open file for reading' });
        }
        
        var content = file.read();
        file.close();
        
        return JSON.stringify({ success: true, value: content });
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

/**
 * プリセットファイルに書き込む
 * @param {string} filePath - ファイルパス
 * @param {string} jsonString - 書き込むJSON文字列
 * @return {string} 結果のJSONオブジェクト
 */
function writePresetFile(filePath, jsonString) {
    try {
        var file = new File(filePath);
        var folder = new Folder(file.parent.fsName);
        
        // フォルダが存在しない場合は作成
        if (!folder.exists) {
            if (!folder.create()) {
                alert('AGraph Error:\n\nプリセットフォルダを作成できません。\n\n' + folder.fsName + '\n\n対処法: このフォルダに書き込み権限があるか確認してください。');
                return JSON.stringify({ 
                    error: 'Cannot create directory',
                    path: folder.fsName 
                });
            }
        }
        
        file.encoding = 'UTF-8';
        if (!file.open('w')) {
            alert('AGraph Error:\n\nプリセットファイルを作成できません。\n\n' + filePath + '\n\n対処法: After Effectsを管理者権限で起動してください。');
            return JSON.stringify({ 
                error: 'Cannot open file for writing',
                path: filePath 
            });
        }
        
        file.write(jsonString);
        file.close();
        
        return JSON.stringify({
            success: true,
            path: filePath,
            size: jsonString.length
        });
    } catch (e) {
        alert('AGraph Error:\n\nファイル書き込みエラー\n\n' + e.toString() + '\n\nパス: ' + filePath);
        return JSON.stringify({ 
            error: e.toString(),
            path: filePath 
        });
    }
}

/**
 * Write preset file from object (stringify on ExtendScript side)
 * オブジェクトからプリセットファイルを書き込み（ExtendScript側でJSON化）
 */
function writePresetFileFromObject(filePath, dataObject) {
    try {
        // ExtendScript側でJSON.stringify()を実行
        var jsonString = JSON.stringify(dataObject, null, 2);
        return writePresetFile(filePath, jsonString);
    } catch (e) {
        return JSON.stringify({ 
            error: 'JSON stringify failed: ' + e.toString(),
            path: filePath 
        });
    }
}

/**
 * Create default preset file with 24 presets from ext/default_presets.json
 * ext/default_presets.jsonから24個のデフォルトプリセットでファイルを作成
 */
function createDefaultPresetFile(filePath) {
    try {
        // ExtendScript実行ファイルのパスを取得
        var scriptFile = new File($.fileName);
        var extFolder = scriptFile.parent;
        var defaultPresetsFile = new File(extFolder.fsName + '/default_presets.json');
        
        if (!defaultPresetsFile.exists) {
            return JSON.stringify({ 
                error: 'default_presets.json not found',
                path: defaultPresetsFile.fsName 
            });
        }
        
        // default_presets.jsonを読み込み
        defaultPresetsFile.encoding = 'UTF-8';
        if (!defaultPresetsFile.open('r')) {
            return JSON.stringify({ 
                error: 'Cannot open default_presets.json',
                path: defaultPresetsFile.fsName 
            });
        }
        
        var presetsJsonStr = defaultPresetsFile.read();
        defaultPresetsFile.close();
        
        var defaultPresets = JSON.parse(presetsJsonStr);
        
        var defaultData = {
            version: "1.0",
            lastOpenedGroup: "default",
            groups: [
                { id: "default", name: "Default", locked: true },
                { id: "user1", name: "User 1", locked: false }
            ],
            presets: defaultPresets
        };
        
        return writePresetFileFromObject(filePath, defaultData);
    } catch (e) {
        return JSON.stringify({ 
            error: 'Failed to create default preset file: ' + e.toString(),
            path: filePath 
        });
    }
}

/**
 * ファイル保存ダイアログを表示してJSONを保存
 */
function saveFileDialog(defaultFileName, jsonString) {
    try {
        var file = File.saveDialog("Save Presets As", defaultFileName);
        
        if (!file) {
            return JSON.stringify({ cancelled: true });
        }
        
        // .json拡張子を確認・追加
        if (!file.name.match(/\.json$/i)) {
            file = new File(file.fsName + ".json");
        }
        
        file.encoding = 'UTF-8';
        if (!file.open('w')) {
            return JSON.stringify({ 
                error: 'Cannot open file for writing',
                path: file.fsName 
            });
        }
        
        file.write(jsonString);
        file.close();
        
        return JSON.stringify({
            success: true,
            path: file.fsName,
            size: jsonString.length
        });
    } catch (e) {
        return JSON.stringify({ 
            error: e.toString()
        });
    }
}

// ============================================================
// G2連続性の最適化（キーフレームBの加速度連続化）
// ============================================================

/**
 * キーフレームにおける加速度（d²v/dt²）を計算する。
 *
 * AEの3次ベジェカーブモデル:
 *   区間 [keyA, keyB] に対し、パラメータ τ∈[0,1] で
 *   時間 X(τ) と値 Y(τ) を3次ベジェで表し、
 *     d²v/dt² = [Y''·X' - Y'·X''] / (X')³
 *   を τ=0（out方向）または τ=1（in方向）で評価する。
 *
 * 制御点の構成（区間オフセット座標、P0=(0,0)）:
 *   P1 = (Δt·outInf/100,  outSpeed·Δt·outInf/100)
 *   P2 = (Δt·(1-inInf/100),  Δv - inSpeed·Δt·inInf/100)
 *   P3 = (Δt, Δv)
 *
 * 1次元プロパティ（回転・不透明度・分離X位置など）を前提。
 *
 * @param {Property} prop       - 1次元プロパティ
 * @param {number}   keyIndex   - キーフレームインデックス（1-based）
 * @param {string}   direction  - "in"（左から到着）または "out"（右へ出発）
 * @returns {number} 加速度 d²v/dt²（端点で計算不能な場合は 0）
 */
function getAccelerationAtKey(prop, keyIndex, direction) {
    // --- 区間の制御点を構築するヘルパー ---
    // startIdx → endIdx 区間の4制御点を返す
    function buildControlPoints(startIdx, endIdx) {
        var t_A = prop.keyTime(startIdx);
        var t_B = prop.keyTime(endIdx);
        var v_A = prop.keyValue(startIdx);
        var v_B = prop.keyValue(endIdx);

        var dt = t_B - t_A;
        var dv = v_B - v_A;

        var outEase = prop.keyOutTemporalEase(startIdx);
        var inEase  = prop.keyInTemporalEase(endIdx);

        var outSpeed = outEase[0].speed;
        var outInf   = outEase[0].influence;
        var inSpeed  = inEase[0].speed;
        var inInf    = inEase[0].influence;

        // P0 = (0, 0)
        var P1x = dt * outInf / 100;
        var P1y = outSpeed * P1x;               // = outSpeed * dt * outInf / 100
        var P2x = dt * (1 - inInf / 100);
        var P2y = dv - inSpeed * dt * inInf / 100;
        var P3x = dt;
        var P3y = dv;

        return { P1x: P1x, P1y: P1y, P2x: P2x, P2y: P2y, P3x: P3x, P3y: P3y };
    }

    if (direction === "in") {
        // 前区間 (keyIndex-1 → keyIndex) の τ=1 における加速度
        if (keyIndex <= 1) return 0;

        var cp = buildControlPoints(keyIndex - 1, keyIndex);

        // 1次・2次導関数 at τ=1
        var dX  = 3 * (cp.P3x - cp.P2x);               // dX/dτ
        var dY  = 3 * (cp.P3y - cp.P2y);               // dY/dτ
        var d2X = 6 * (cp.P3x - 2 * cp.P2x + cp.P1x); // d²X/dτ²
        var d2Y = 6 * (cp.P3y - 2 * cp.P2y + cp.P1y); // d²Y/dτ²

        if (Math.abs(dX) < 1e-12) return 0;
        return (d2Y * dX - dY * d2X) / (dX * dX * dX);

    } else {
        // 次区間 (keyIndex → keyIndex+1) の τ=0 における加速度
        if (keyIndex >= prop.numKeys) return 0;

        var cp = buildControlPoints(keyIndex, keyIndex + 1);

        // 1次・2次導関数 at τ=0
        var dX  = 3 * cp.P1x;                           // dX/dτ
        var dY  = 3 * cp.P1y;                           // dY/dτ
        var d2X = 6 * (cp.P2x - 2 * cp.P1x);           // d²X/dτ²
        var d2Y = 6 * (cp.P2y - 2 * cp.P1y);           // d²Y/dτ²

        if (Math.abs(dX) < 1e-12) return 0;
        return (d2Y * dX - dY * d2X) / (dX * dX * dX);
    }
}

/**
 * G2連続化：easeIn.speed と easeOut.speed を独立に調整し、
 * 制御点の移動量（形状変化）を最小化する a_target を選ぶ。
 *
 * ★ 核心的知見: influence 固定なら加速度は speed の1次関数。
 *   a_in(s)  = slope_in  * s + const   (in側)
 *   a_out(s) = slope_out * s + const   (out側)
 *   よって二分探索不要。2点評価から傾きを求め、直接解ける。
 *
 * アルゴリズム:
 *   1. 傾き slope_in, slope_out をプローブして求める（計4回のAE呼び出し）
 *   2. a_target 候補を orig_a_in〜orig_a_out + マージンで N 分割
 *   3. 各 a_target に対し speed を直接計算（線形解、反復なし）
 *   4. 符号制約: 元の speed と同符号を保つ（ハンドル反転禁止）
 *   5. コスト最小の a_target を採用
 *
 * @param {Property} prop       - 1次元プロパティ
 * @param {number}   keyIndex   - 最適化対象のキーフレームインデックス（B）
 * @param {object}   [options]
 * @param {number}   [options.numTargets=200]  - a_target の分割数
 * @param {number}   [options.tolerance=0.01]  - 加速度の許容誤差
 * @returns {object} { success, easeInSpeed, easeOutSpeed, ... }
 */
AGraphUtils.calculateOptimalG2Speed = function(prop, keyIndex, options) {
    var NUM_TARGETS = (options && options.numTargets != null) ? options.numTargets : 200;
    var TOL         = (options && options.tolerance != null) ? options.tolerance : 0.01;

    var origInSpeed, origOutSpeed, origInInfluence, origOutInfluence;

    try {
        var origIn  = prop.keyInTemporalEase(keyIndex);
        var origOut = prop.keyOutTemporalEase(keyIndex);
        origInSpeed      = origIn[0].speed;
        origOutSpeed     = origOut[0].speed;
        origInInfluence  = origIn[0].influence;
        origOutInfluence = origOut[0].influence;

        // 元の加速度を取得
        var orig_a_in  = getAccelerationAtKey(prop, keyIndex, "in");
        var orig_a_out = getAccelerationAtKey(prop, keyIndex, "out");

        // 既にG2連続？
        if (Math.abs(orig_a_in - orig_a_out) < TOL) {
            return {
                success: true,
                keyTime: prop.keyTime(keyIndex),
                easeInSpeed: origInSpeed,
                easeOutSpeed: origOutSpeed,
                origInSpeed: origInSpeed,
                origOutSpeed: origOutSpeed,
                easeInInfluence: origInInfluence,
                easeOutInfluence: origOutInfluence,
                a_target: orig_a_in,
                a_in_before: orig_a_in,
                a_out_before: orig_a_out,
                a_in: orig_a_in,
                a_out: orig_a_out,
                cost: 0,
                residual: Math.abs(orig_a_in - orig_a_out),
                slope_in: 0,
                slope_out: 0
            };
        }

        var dt_prev = (keyIndex > 1) ? (prop.keyTime(keyIndex) - prop.keyTime(keyIndex - 1)) : 1;
        var dt_next = (keyIndex < prop.numKeys) ? (prop.keyTime(keyIndex + 1) - prop.keyTime(keyIndex)) : 1;

        // ── 傾きを求める: a(speed) は speed の1次関数 ──
        // プローブ1: inSpeed を +1 して a_in の変化量を見る
        prop.setTemporalEaseAtKey(keyIndex,
            [new KeyframeEase(origInSpeed + 1, origInInfluence)],
            [new KeyframeEase(origOutSpeed, origOutInfluence)]);
        var a_in_probe = getAccelerationAtKey(prop, keyIndex, "in");
        var slope_in = a_in_probe - orig_a_in;  // d(a_in)/d(inSpeed)

        // プローブ2: outSpeed を +1 して a_out の変化量を見る
        prop.setTemporalEaseAtKey(keyIndex,
            [new KeyframeEase(origInSpeed, origInInfluence)],
            [new KeyframeEase(origOutSpeed + 1, origOutInfluence)]);
        var a_out_probe = getAccelerationAtKey(prop, keyIndex, "out");
        var slope_out = a_out_probe - orig_a_out;  // d(a_out)/d(outSpeed)

        // 元に戻す
        prop.setTemporalEaseAtKey(keyIndex,
            [new KeyframeEase(origInSpeed, origInInfluence)],
            [new KeyframeEase(origOutSpeed, origOutInfluence)]);

        // 傾きがどちらも0なら最適化不能
        if (Math.abs(slope_in) < 1e-15 && Math.abs(slope_out) < 1e-15) {
            return { success: false, error: "Speed has no effect on acceleration" };
        }

        // ── a_target の探索範囲 ──
        var a_lo = Math.min(orig_a_in, orig_a_out);
        var a_hi = Math.max(orig_a_in, orig_a_out);
        var gap = a_hi - a_lo;
        var a_margin = Math.max(gap * 0.5, 1);
        a_lo -= a_margin;
        a_hi += a_margin;

        // ── 各 a_target で speed を線形解き + コスト最小を選択 ──
        var bestCost     = Infinity;
        var bestInSpeed  = origInSpeed;
        var bestOutSpeed = origOutSpeed;
        var bestTarget   = (orig_a_in + orig_a_out) / 2;

        for (var n = 0; n <= NUM_TARGETS; n++) {
            var a_target = a_lo + (a_hi - a_lo) * n / NUM_TARGETS;

            // 線形解: newSpeed = origSpeed + (a_target - orig_a) / slope
            var newInSpeed, newOutSpeed;

            if (Math.abs(slope_in) > 1e-15) {
                newInSpeed = origInSpeed + (a_target - orig_a_in) / slope_in;
            } else {
                if (Math.abs(a_target - orig_a_in) > TOL) continue;
                newInSpeed = origInSpeed;
            }

            if (Math.abs(slope_out) > 1e-15) {
                newOutSpeed = origOutSpeed + (a_target - orig_a_out) / slope_out;
            } else {
                if (Math.abs(a_target - orig_a_out) > TOL) continue;
                newOutSpeed = origOutSpeed;
            }

            // ★ 符号制約: 元の speed と同符号を保つ（ハンドル反転禁止）
            if (origInSpeed > 0 && newInSpeed <= 0) continue;
            if (origInSpeed < 0 && newInSpeed >= 0) continue;
            if (origOutSpeed > 0 && newOutSpeed <= 0) continue;
            if (origOutSpeed < 0 && newOutSpeed >= 0) continue;

            // コスト = 制御点の移動量
            var costIn  = Math.abs(newInSpeed - origInSpeed) * dt_prev * origInInfluence / 100;
            var costOut = Math.abs(newOutSpeed - origOutSpeed) * dt_next * origOutInfluence / 100;
            var cost = costIn + costOut;

            if (cost < bestCost) {
                bestCost     = cost;
                bestInSpeed  = newInSpeed;
                bestOutSpeed = newOutSpeed;
                bestTarget   = a_target;
            }
        }

        // ★ 最適値を適用（AEキーフレームを直接変更）
        prop.setTemporalEaseAtKey(keyIndex,
            [new KeyframeEase(bestInSpeed, origInInfluence)],
            [new KeyframeEase(bestOutSpeed, origOutInfluence)]);
        var a_in_final  = getAccelerationAtKey(prop, keyIndex, "in");
        var a_out_final = getAccelerationAtKey(prop, keyIndex, "out");

        return {
            success: true,
            keyTime: prop.keyTime(keyIndex),
            easeInSpeed: bestInSpeed,
            easeOutSpeed: bestOutSpeed,
            origInSpeed: origInSpeed,
            origOutSpeed: origOutSpeed,
            easeInInfluence: origInInfluence,
            easeOutInfluence: origOutInfluence,
            a_target: bestTarget,
            a_in_before: orig_a_in,
            a_out_before: orig_a_out,
            a_in: a_in_final,
            a_out: a_out_final,
            cost: bestCost,
            residual: Math.abs(a_in_final - a_out_final),
            slope_in: slope_in,
            slope_out: slope_out
        };

    } catch (e) {
        try {
            prop.setTemporalEaseAtKey(keyIndex,
                [new KeyframeEase(origInSpeed, origInInfluence)],
                [new KeyframeEase(origOutSpeed, origOutInfluence)]);
        } catch (ignore) {}

        return {
            success: false,
            error: e.toString()
        };
    }
};

/**
 * G2連続性最適化のエントリポイント（main.jsから呼び出される）
 * 選択されたキーフレームのうち、端点を除く中間キーの加速度を連続化する。
 */
function aGraphOptimizeG2() {
    try {
        app.beginUndoGroup('AGraph G2 Continuity');

        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            app.endUndoGroup();
            return JSON.stringify({ error: 'No active composition' });
        }

        var selectedProps = comp.selectedProperties;
        if (!selectedProps || selectedProps.length === 0) {
            return JSON.stringify({ error: 'No properties selected' });
        }

        var results = [];

        for (var p = 0; p < selectedProps.length; p++) {
            var prop = selectedProps[p];
            if (!prop.canVaryOverTime || prop.numKeys < 3) continue;

            // 選択されたキーフレームのインデックスを収集
            var selectedKeys = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                if (prop.keySelected(k)) {
                    selectedKeys.push(k);
                }
            }
            if (selectedKeys.length < 3) continue;

            // 端点を除く中間キーすべてに最適速度を計算して適用
            for (var i = 1; i < selectedKeys.length - 1; i++) {
                var keyIdx = selectedKeys[i];
                var result = AGraphUtils.calculateOptimalG2Speed(prop, keyIdx);
                result.keyIndex = keyIdx;
                results.push(result);
            }
        }

        app.endUndoGroup();

        if (results.length === 0) {
            return JSON.stringify({ error: 'Select 3+ keyframes on a property (middle keys will be optimized)' });
        }

        return JSON.stringify({ success: true, results: results });
    } catch (e) {
        try { app.endUndoGroup(); } catch (ignore) {}
        return JSON.stringify({ error: e.toString() });
    }
}

/**
 * ファイル選択ダイアログを表示してJSONを読み込み
 */
function openFileDialog() {
    try {
        var file = File.openDialog("Select Preset File", "*.json");
        
        if (!file) {
            return JSON.stringify({ cancelled: true });
        }
        
        file.encoding = 'UTF-8';
        if (!file.open('r')) {
            return JSON.stringify({ 
                error: 'Cannot open file for reading',
                path: file.fsName 
            });
        }
        
        var content = file.read();
        file.close();
        
        return JSON.stringify({
            success: true,
            path: file.fsName,
            content: content
        });
    } catch (e) {
        return JSON.stringify({ 
            error: e.toString()
        });
    }
}

