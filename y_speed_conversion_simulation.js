// Y値とSpeedの正しい変換式を導出するシミュレーション

// redrawNPointCurveでのハンドルY座標計算（5793行目）
function redrawCalculateHandleY(baseY, segmentHeight, speed, influence) {
    return baseY + (segmentHeight * (speed / 100) * (influence / 100));
}

// 現在のshowNumericInputForHandleでのハンドルY座標計算（6782行目付近）
function applyCalculateHandleY_Current(baseY, speed) {
    return baseY + speed;
}

// テストケース生成（30パターン）
function generateTestCases() {
    const cases = [];
    let id = 1;
    
    // セグメントの設定
    const segments = [
        { name: '右下がり(小)', baseY: 300, endY: 100, height: -200 },  // segmentHeight = -200
        { name: '右下がり(大)', baseY: 350, endY: 50, height: -300 },   // segmentHeight = -300
        { name: '右上がり(小)', baseY: 100, endY: 300, height: 200 },   // segmentHeight = 200
        { name: '右上がり(大)', baseY: 50, endY: 350, height: 300 },    // segmentHeight = 300
        { name: '水平', baseY: 200, endY: 200, height: 0 }
    ];
    
    // Y値のパターン（グラフ座標として想定）
    const yValues = [0, 0.33, 0.5, 0.67, 1.0, 1.5];
    
    // Influence値（X値に相当）
    const influenceValue = 33.33;  // 標準的な値
    
    for (const segment of segments) {
        for (const yVal of yValues) {
            cases.push({
                id: id++,
                segmentName: segment.name,
                baseY: segment.baseY,
                segmentHeight: segment.height,
                yValue: yVal,
                influence: influenceValue
            });
        }
    }
    
    return cases;
}

// シミュレーション実行
function runSimulation() {
    const cases = generateTestCases();
    
    console.log('='.repeat(100));
    console.log('Y値 ↔ Speed 変換式シミュレーション');
    console.log(`総テストケース数: ${cases.length}`);
    console.log('='.repeat(100));
    console.log('');
    
    console.log('目的: redrawでの計算式と整合する変換式を導出');
    console.log('redraw式: handleY = baseY + (segmentHeight * (speed / 100) * (influence / 100))');
    console.log('');
    
    let successCount = 0;
    const proposals = [];
    
    for (const tc of cases) {
        const { baseY, segmentHeight, yValue, influence } = tc;
        
        // 想定されるハンドルY座標（Y値から計算）
        // Y値はセグメント高さに対する比率と仮定
        const targetHandleY = baseY + segmentHeight * yValue;
        
        // 提案1: Speed = Y * 100
        const speed_proposal1 = yValue * 100;
        const handleY_proposal1 = redrawCalculateHandleY(baseY, segmentHeight, speed_proposal1, influence);
        const error1 = Math.abs(handleY_proposal1 - targetHandleY);
        
        // 提案2: Speed = Y * 100 * (100 / influence)
        const speed_proposal2 = yValue * 100 * (100 / influence);
        const handleY_proposal2 = redrawCalculateHandleY(baseY, segmentHeight, speed_proposal2, influence);
        const error2 = Math.abs(handleY_proposal2 - targetHandleY);
        
        // 提案3: Speed = Y * (100 / influence) * 100 (提案2と同じ、書き方を変えただけ)
        // Speed = (Y / (influence/100)) * 100
        
        // 提案4: 実際のCanvas座標差分として使う（現在の実装）
        const speed_proposal4 = segmentHeight * yValue;
        const handleY_proposal4 = applyCalculateHandleY_Current(baseY, speed_proposal4);
        const error4 = Math.abs(handleY_proposal4 - targetHandleY);
        
        proposals.push({
            ...tc,
            targetHandleY,
            proposal1: { speed: speed_proposal1, handleY: handleY_proposal1, error: error1 },
            proposal2: { speed: speed_proposal2, handleY: handleY_proposal2, error: error2 },
            proposal4: { speed: speed_proposal4, handleY: handleY_proposal4, error: error4 }
        });
        
        if (error2 < 0.01) successCount++;
    }
    
    // 結果の分析
    console.log('提案1: Speed = Y * 100');
    const avg_error1 = proposals.reduce((sum, p) => sum + p.proposal1.error, 0) / proposals.length;
    console.log(`  平均誤差: ${avg_error1.toFixed(4)}px`);
    
    console.log('\n提案2: Speed = Y * 100 * (100 / influence)');
    const avg_error2 = proposals.reduce((sum, p) => sum + p.proposal2.error, 0) / proposals.length;
    console.log(`  平均誤差: ${avg_error2.toFixed(4)}px`);
    console.log(`  成功ケース: ${successCount}/${proposals.length}`);
    
    console.log('\n提案4: Speed = segmentHeight * Y (現在の実装との比較)');
    const avg_error4 = proposals.reduce((sum, p) => sum + p.proposal4.error, 0) / proposals.length;
    console.log(`  平均誤差: ${avg_error4.toFixed(4)}px`);
    
    // サンプル表示
    console.log('\n' + '='.repeat(100));
    console.log('サンプルケース（最初の10件）');
    console.log('='.repeat(100));
    
    proposals.slice(0, 10).forEach(p => {
        console.log(`\nID ${p.id}: ${p.segmentName} (segmentHeight=${p.segmentHeight})`);
        console.log(`  入力Y値: ${p.yValue}`);
        console.log(`  目標handleY: ${p.targetHandleY.toFixed(2)}px`);
        console.log(`  提案1 - Speed=${p.proposal1.speed.toFixed(2)}, handleY=${p.proposal1.handleY.toFixed(2)}, 誤差=${p.proposal1.error.toFixed(2)}px`);
        console.log(`  提案2 - Speed=${p.proposal2.speed.toFixed(2)}, handleY=${p.proposal2.handleY.toFixed(2)}, 誤差=${p.proposal2.error.toFixed(2)}px`);
    });
    
    // 結論
    console.log('\n' + '='.repeat(100));
    console.log('結論');
    console.log('='.repeat(100));
    
    if (avg_error2 < 0.01) {
        console.log('✅ 提案2が正解！');
        console.log('\n正しい変換式:');
        console.log('  Y → Speed: Speed = Y * 100 * (100 / influence)');
        console.log('           または: Speed = Y * 10000 / influence');
        console.log('  Speed → Y: Y = Speed * influence / 10000');
        console.log('\n実装例:');
        console.log('  const newSpeed = inputY * 100 * (100 / newInfluence);');
        console.log('  const displayY = easing.speed * easing.influence / 10000;');
    } else if (avg_error4 < 0.01) {
        console.log('✅ 提案4（現在の実装）が正解！');
        console.log('\nただし、この場合redrawとの整合性に問題がある可能性');
    } else {
        console.log('❌ どの提案も十分に正確ではありません。さらなる分析が必要。');
    }
}

// 実行
runSimulation();
