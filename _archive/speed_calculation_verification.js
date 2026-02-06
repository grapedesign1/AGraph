// Speed計算の正確性検証スクリプト
// After Effects speed = 実際の単位/秒

console.log("=== Speed計算検証 ===");

// テストケース1: 単次元プロパティ（回転）
// 2秒間で90度変化するケース
function testCase1() {
    console.log("\n--- テストケース1: 回転プロパティ ---");
    
    const kf1 = { time: 0, value: 0 };      // 0秒で0度
    const kf2 = { time: 2, value: 90 };     // 2秒で90度
    
    const segmentValueDiff = kf2.value - kf1.value;  // 90度
    const segmentTimeDiff = kf2.time - kf1.time;     // 2秒
    
    console.log(`区間: ${kf1.value}° → ${kf2.value}° (${segmentTimeDiff}秒)`);
    console.log(`valueDiff: ${segmentValueDiff}°, timeDiff: ${segmentTimeDiff}秒`);
    
    // After Effectsのspeed値が45°/秒だった場合
    const afterEffectsSpeed = 45;  // 45度/秒
    console.log(`After Effects speed: ${afterEffectsSpeed}°/秒`);
    
    // 正規化計算: speed / (valueDiff / timeDiff)
    const segmentRate = segmentValueDiff / segmentTimeDiff;  // 45度/秒
    const normalizedSpeed = afterEffectsSpeed / segmentRate;  // 45 / 45 = 1
    
    console.log(`セグメント変化率: ${segmentRate}°/秒`);
    console.log(`正規化後speed: ${normalizedSpeed}`);
    console.log(`検証: 1.0なら一定速度、1.0以外なら加速/減速`);
}

// テストケース2: 2次元プロパティ（位置）
function testCase2() {
    console.log("\n--- テストケース2: 位置プロパティ ---");
    
    const kf1 = { time: 0, value: [0, 0] };     // 0秒で(0,0)
    const kf2 = { time: 1, value: [100, 0] };   // 1秒で(100,0)
    
    // ベクトル距離計算
    const diffVector = [kf2.value[0] - kf1.value[0], kf2.value[1] - kf1.value[1]];
    const segmentValueDiff = Math.sqrt(diffVector[0] * diffVector[0] + diffVector[1] * diffVector[1]);
    const segmentTimeDiff = kf2.time - kf1.time;
    
    console.log(`区間: (${kf1.value}) → (${kf2.value}) (${segmentTimeDiff}秒)`);
    console.log(`距離: ${segmentValueDiff}px, 時間: ${segmentTimeDiff}秒`);
    
    // After Effectsのspeed値が200px/秒だった場合（2倍速）
    const afterEffectsSpeed = 200;  // 200px/秒
    console.log(`After Effects speed: ${afterEffectsSpeed}px/秒`);
    
    const segmentRate = segmentValueDiff / segmentTimeDiff;  // 100px/秒
    const normalizedSpeed = afterEffectsSpeed / segmentRate;  // 200 / 100 = 2
    
    console.log(`セグメント変化率: ${segmentRate}px/秒`);
    console.log(`正規化後speed: ${normalizedSpeed}`);
    console.log(`検証: 2.0なら2倍速、0.5なら半分速`);
}

// テストケース3: 負の変化（逆方向）
function testCase3() {
    console.log("\n--- テストケース3: 負の変化 ---");
    
    const kf1 = { time: 0, value: 100 };    // 0秒で100
    const kf2 = { time: 1, value: 50 };     // 1秒で50
    
    const segmentValueDiff = kf2.value - kf1.value;  // -50（負の値）
    const segmentTimeDiff = kf2.time - kf1.time;     // 1秒
    
    console.log(`区間: ${kf1.value} → ${kf2.value} (${segmentTimeDiff}秒)`);
    console.log(`valueDiff: ${segmentValueDiff}, timeDiff: ${segmentTimeDiff}秒`);
    
    // After Effectsのspeed値が-100/秒だった場合（2倍速で逆方向）
    const afterEffectsSpeed = -100;  // -100/秒
    console.log(`After Effects speed: ${afterEffectsSpeed}/秒`);
    
    const segmentRate = segmentValueDiff / segmentTimeDiff;  // -50/秒
    const normalizedSpeed = afterEffectsSpeed / segmentRate;  // -100 / -50 = 2
    
    console.log(`セグメント変化率: ${segmentRate}/秒`);
    console.log(`正規化後speed: ${normalizedSpeed}`);
    console.log(`検証: 符号は相殺されて、倍率のみが残る`);
}

// テストケース4: 3点→2点変換での複雑なケース
function testCase4() {
    console.log("\n--- テストケース4: 3点→2点変換 ---");
    
    // 元の3点キーフレーム
    const kf0 = { time: 0, value: 0 };      // 0秒で0
    const kf1 = { time: 1, value: 30 };     // 1秒で30（中間点）
    const kf2 = { time: 3, value: 60 };     // 3秒で60
    
    // 区間1: KF0 → KF1
    const seg1ValueDiff = kf1.value - kf0.value;  // 30
    const seg1TimeDiff = kf1.time - kf0.time;     // 1秒
    const seg1Rate = seg1ValueDiff / seg1TimeDiff;  // 30/秒
    
    // 区間2: KF1 → KF2
    const seg2ValueDiff = kf2.value - kf1.value;  // 30
    const seg2TimeDiff = kf2.time - kf1.time;     // 2秒
    const seg2Rate = seg2ValueDiff / seg2TimeDiff;  // 15/秒
    
    console.log(`区間1: ${seg1ValueDiff} in ${seg1TimeDiff}秒 = ${seg1Rate}/秒`);
    console.log(`区間2: ${seg2ValueDiff} in ${seg2TimeDiff}秒 = ${seg2Rate}/秒`);
    
    // 各区間でAfter Effectsのspeed値が異なる場合
    const seg1Speed = 60;  // 区間1で60/秒（2倍速）
    const seg2Speed = 7.5; // 区間2で7.5/秒（半分速）
    
    const norm1 = seg1Speed / seg1Rate;  // 60 / 30 = 2
    const norm2 = seg2Speed / seg2Rate;  // 7.5 / 15 = 0.5
    
    console.log(`区間1 正規化: ${seg1Speed} / ${seg1Rate} = ${norm1}`);
    console.log(`区間2 正規化: ${seg2Speed} / ${seg2Rate} = ${norm2}`);
    console.log(`結果: 区間1は2倍速、区間2は半分速`);
}

// 実行
testCase1();
testCase2();
testCase3();
testCase4();

console.log("\n=== 検証完了 ===");
console.log("正規化計算 = speed / (valueDiff / timeDiff)");
console.log("結果が1.0なら一定速度、1.0以外なら加速/減速");