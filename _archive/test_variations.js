// AccelCurve影響範囲調整アルゴリズムのバリエーション
// 100回検証用のアルゴリズム候補

const variations = [
    // バリエーション1: 線形調整
    {
        name: "Linear",
        formula: "normalizedInfluence * timeRatio"
    },
    
    // バリエーション2: 最小保証距離
    {
        name: "MinGuarantee", 
        formula: "normalizedInfluence * (0.2 + timeRatio * 0.6)"
    },
    
    // バリエーション3: 非線形（スムーズステップ）
    {
        name: "SmoothStep",
        formula: "normalizedInfluence * (0.3 + smoothRatio * 0.5)"
    },
    
    // バリエーション4: 平方根調整
    {
        name: "SquareRoot",
        formula: "normalizedInfluence * Math.sqrt(timeRatio) * 0.8"
    },
    
    // バリエーション5: ログ調整
    {
        name: "Logarithmic", 
        formula: "normalizedInfluence * (0.4 + Math.log(timeRatio + 0.1) * 0.2)"
    },
    
    // バリエーション6: 指数調整
    {
        name: "Exponential",
        formula: "normalizedInfluence * (1 - Math.exp(-timeRatio * 2)) * 0.7"
    },
    
    // バリエーション7: 双曲線調整
    {
        name: "Hyperbolic",
        formula: "normalizedInfluence * Math.tanh(timeRatio * 2) * 0.8"
    },
    
    // バリエーション8: 段階的調整
    {
        name: "Stepped",
        formula: "normalizedInfluence * (timeRatio < 0.3 ? 0.3 : timeRatio < 0.7 ? 0.6 : 0.9)"
    }
];

// 検証パラメータ
const testCases = [
    { middleTime: 0.1, description: "中点が始点寄り" },
    { middleTime: 0.2, description: "中点が始点寄り（中程度）" },
    { middleTime: 0.3, description: "中点が始点寄り（軽度）" },
    { middleTime: 0.5, description: "中点が中央" },
    { middleTime: 0.7, description: "中点が終点寄り（軽度）" },
    { middleTime: 0.8, description: "中点が終点寄り（中程度）" },
    { middleTime: 0.9, description: "中点が終点寄り" }
];

console.log("AccelCurve 100回検証テストバリエーション準備完了");