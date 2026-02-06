// Speed正規化の理論検証

/*
現在の実装:
normalizedSpeed = speed / (segmentValueDiff / segmentTimeDiff)

理論的な意味:
- speed = After Effectsの速度値（実際の単位/秒）
- segmentValueDiff / segmentTimeDiff = その区間の実際の変化率（単位/秒）
- normalizedSpeed = 相対的な倍率

問題の可能性:
1. 逆の計算が必要？
   normalizedSpeed = speed * (segmentValueDiff / segmentTimeDiff)

2. 異なる単位系？
   グラフの0-1空間での速度 vs 実際の単位での速度

3. 時間スケールの問題？
   After Effectsの内部時間単位 vs 表示時間単位

検証すべきポイント:
- グラフでの速度値の単位は何か？
- After Effectsでの速度値の単位は何か？
- 正規化の方向は正しいか？

期待される結果:
- 等速直線運動なら normalizedSpeed ≈ 1.0
- 2倍速なら normalizedSpeed ≈ 2.0
- 半分速なら normalizedSpeed ≈ 0.5

現在の結果（小さすぎる）:
- 0.764 → 0.790 (わずかな増加)
- これは正規化が不適切な可能性を示唆
*/

console.log("Speed正規化の理論検証が必要です");