// ベジェ曲線の微分検算
// 2点キーフレーム：イーズイン・イーズアウト（influence 33.33%）

const x0 = 0, x1 = 0.333, x2 = 0.667, x3 = 1;
const y0 = 0, y1 = 0, y2 = 1, y3 = 1;

console.log("=== ベジェ曲線の微分検算 ===");
console.log("制御点: X=[0, 0.333, 0.667, 1], Y=[0, 0, 1, 1]");
console.log("");
console.log("tau  | t(時間) | d2Y/dtau2 | dX/dtau | 加速度d2Y/dt2");
console.log("-----|---------|-----------|---------|---------------");

const results = [];

for (let j = 0; j <= 10; j++) {
    const tau = j / 10;
    const oneMinusTau = 1 - tau;
    
    // X(τ) - 時間座標
    const X_tau = Math.pow(oneMinusTau,3) * x0 + 3*Math.pow(oneMinusTau,2)*tau * x1 + 
                  3*oneMinusTau*Math.pow(tau,2) * x2 + Math.pow(tau,3) * x3;
    
    // dX/dτ
    const dX_dtau = 3*Math.pow(oneMinusTau,2) * (x1-x0) + 6*oneMinusTau*tau * (x2-x1) + 
                    3*Math.pow(tau,2) * (x3-x2);
    
    // d²X/dτ²
    const d2X_dtau2 = 6*oneMinusTau*(x2-2*x1+x0) + 6*tau*(x3-2*x2+x1);
    
    // dY/dτ
    const dY_dtau = 3*Math.pow(oneMinusTau,2) * (y1-y0) + 6*oneMinusTau*tau * (y2-y1) + 
                    3*Math.pow(tau,2) * (y3-y2);
    
    // d²Y/dτ²
    const d2Y_dtau2 = 6*oneMinusTau*(y2-2*y1+y0) + 6*tau*(y3-2*y2+y1);
    
    // 加速度 d²Y/dt² = [d²Y/dτ² · dX/dτ - dY/dτ · d²X/dτ²] / (dX/dτ)³
    const numerator = d2Y_dtau2 * dX_dtau - dY_dtau * d2X_dtau2;
    const denominator = Math.pow(dX_dtau, 3);
    const accel = numerator / denominator;
    
    results.push({ tau, t: X_tau, accel });
    
    console.log(
        tau.toFixed(1).padStart(4) + " | " + 
        X_tau.toFixed(3).padStart(7) + " | " + 
        d2Y_dtau2.toFixed(3).padStart(9) + " | " + 
        dX_dtau.toFixed(4).padStart(7) + " | " + 
        accel.toFixed(4).padStart(13)
    );
}

console.log("");
console.log("=== 分析 ===");
console.log("d2Y/dtau2 は τ に対して直線: 6(1-τ) - 6τ = 6 - 12τ");
console.log("");

// t に対する直線性をチェック
console.log("t に対する加速度の変化:");
for (let i = 1; i < results.length - 1; i++) {
    const slope1 = (results[i].accel - results[i-1].accel) / (results[i].t - results[i-1].t);
    const slope2 = (results[i+1].accel - results[i].accel) / (results[i+1].t - results[i].t);
    console.log(`  t=${results[i].t.toFixed(3)}: 傾き(前)=${slope1.toFixed(2)}, 傾き(後)=${slope2.toFixed(2)}`);
}

console.log("");
console.log("=== 結論 ===");
console.log("加速度が t に対して直線なら、傾きは一定のはず。");
console.log("しかし、X(τ) が非線形なため、t に対しては厳密には直線にならない。");
console.log("");
console.log("ただし、傾きの変化は小さいので、ほぼ直線に見える。");
