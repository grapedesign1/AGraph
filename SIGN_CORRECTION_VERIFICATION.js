/**
 * 符号補正の修正検証シミュレーション
 * 
 * 検証対象：
 * - 修正前：第2区間INハンドルに符号判定なし
 * - 修正後：第2区間INハンドルに符号判定あり
 */

// ========================================
// JavaScript側のロジック（main.js）
// ========================================

function calculateSegmentDifferences_JS(kf1, kf2, isPosition) {
    const timeDiff = kf2.time - kf1.time;
    let valueDiff;
    
    if (isPosition) {
        // 位置プロパティ：ベクトル距離（常に正）
        if (Array.isArray(kf1.value) && Array.isArray(kf2.value)) {
            let sum = 0;
            for (let i = 0; i < kf1.value.length; i++) {
                const diff = kf2.value[i] - kf1.value[i];
                sum += diff * diff;
            }
            valueDiff = Math.sqrt(sum);
        } else {
            valueDiff = Math.abs(kf2.value - kf1.value);
        }
    } else {
        // 非位置プロパティ：符号付き差分
        const value1 = Array.isArray(kf1.value) ? kf1.value[0] : kf1.value;
        const value2 = Array.isArray(kf2.value) ? kf2.value[0] : kf2.value;
        valueDiff = value2 - value1;  // 符号を保持
    }
    
    return { valueDiff, timeDiff };
}

function normalizeSpeedForSegment_JS(speed, segmentValueDiff, segmentTimeDiff) {
    if (segmentTimeDiff === 0) return speed;
    
    const segmentRate = segmentValueDiff / segmentTimeDiff;
    if (segmentRate === 0) return speed;
    
    const normalizedSpeed = speed / segmentRate;
    const correctedSpeed = normalizedSpeed * 100;
    
    return correctedSpeed;
}

// ========================================
// ExtendScript側のロジック（extendscript.jsx）
// ========================================

function applySignCorrection_ExtendScript_BEFORE(speed, val1, val2, isPosition) {
    // 修正前：第2区間INハンドルには符号判定なし
    // この関数は呼ばれない（実装されていなかった）
    return speed;
}

function applySignCorrection_ExtendScript_AFTER(speed, val1, val2, isPosition) {
    // 修正後：全てのハンドルで符号判定
    if (isPosition) {
        return speed;  // 位置プロパティは符号判定なし
    }
    
    const val1Scalar = Array.isArray(val1) ? val1[0] : val1;
    const val2Scalar = Array.isArray(val2) ? val2[0] : val2;
    
    if (val2Scalar < val1Scalar) {
        return -speed;  // 下降時は符号反転
    }
    return speed;
}

// ========================================
// テストケース生成
// ========================================

function generateTestCases() {
    const cases = [];
    let caseId = 1;
    
    // グラフの正規化速度（常に正の値、0-1空間での速度）
    const graphSpeeds = [0.5, 1.0, 2.0];
    
    // ========================================
    // カテゴリ1: 2点カーブ（参考：これは別関数なので影響なし）
    // ========================================
    
    // ========================================
    // カテゴリ2: 3点カーブ - 1組（単一プロパティ）
    // ========================================
    
    // 2-1: プラス変化のみ（0→50→100）
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/1組/プラス変化',
            propertyType: 'Scale',
            isPosition: false,
            keyframes: [
                { time: 0, value: 0 },
                { time: 1, value: 50 },
                { time: 2, value: 100 }
            ],
            graphSpeed: speed,
            expectedCorrect: true  // 常に正しい
        });
    }
    
    // 2-2: マイナス変化のみ（100→50→0）
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/1組/マイナス変化',
            propertyType: 'Opacity',
            isPosition: false,
            keyframes: [
                { time: 0, value: 100 },
                { time: 1, value: 50 },
                { time: 2, value: 0 }
            ],
            graphSpeed: speed,
            expectedCorrect: true  // 常に正しい
        });
    }
    
    // 2-3: 符号混在（0→100→50）
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/1組/符号混在(上昇→下降)',
            propertyType: 'Rotation',
            isPosition: false,
            keyframes: [
                { time: 0, value: 0 },
                { time: 1, value: 100 },
                { time: 2, value: 50 }
            ],
            graphSpeed: speed,
            expectedCorrect: true  // 常に正しい
        });
    }
    
    // 2-4: 符号混在（100→0→50）
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/1組/符号混在(下降→上昇)',
            propertyType: 'Scale',
            isPosition: false,
            keyframes: [
                { time: 0, value: 100 },
                { time: 1, value: 0 },
                { time: 2, value: 50 }
            ],
            graphSpeed: speed,
            expectedCorrect: true  // 常に正しい
        });
    }
    
    // ========================================
    // カテゴリ3: 3点カーブ - 2組以上、同じ符号
    // ========================================
    
    // 3-1: 両方プラス変化
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/2組/両方プラス/同一プロパティ',
            properties: [
                {
                    name: 'Scale-A',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 0 },
                        { time: 1, value: 50 },
                        { time: 2, value: 100 }
                    ]
                },
                {
                    name: 'Scale-B',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 0 },
                        { time: 1, value: 30 },
                        { time: 2, value: 60 }
                    ]
                }
            ],
            graphSpeed: speed,
            expectedCorrect: true  // 常に正しい
        });
    }
    
    // 3-2: 両方マイナス変化
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/2組/両方マイナス/同一プロパティ',
            properties: [
                {
                    name: 'Opacity-A',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 100 },
                        { time: 1, value: 50 },
                        { time: 2, value: 0 }
                    ]
                },
                {
                    name: 'Opacity-B',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 80 },
                        { time: 1, value: 40 },
                        { time: 2, value: 0 }
                    ]
                }
            ],
            graphSpeed: speed,
            expectedCorrect: true  // 常に正しい
        });
    }
    
    // ========================================
    // カテゴリ4: 3点カーブ - 符号混在、同一プロパティ
    // ========================================
    
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/2組/符号混在/同一プロパティ',
            properties: [
                {
                    name: 'Scale-A',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 0 },
                        { time: 1, value: 100 },
                        { time: 2, value: 50 }
                    ]
                },
                {
                    name: 'Scale-B',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 20 },
                        { time: 1, value: 80 },
                        { time: 2, value: 40 }
                    ]
                }
            ],
            graphSpeed: speed,
            expectedCorrect: true  // 常に正しい
        });
    }
    
    // ========================================
    // カテゴリ5: 3点カーブ - 符号混在、異なるプロパティ（修正対象）
    // ========================================
    
    // 5-1: Property A: 上昇→下降, Property B: 下降→下降
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/2組/符号混在/異なるプロパティ/A上昇下降_B下降下降',
            properties: [
                {
                    name: 'Scale',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 0 },
                        { time: 1, value: 100 },
                        { time: 2, value: 50 }
                    ]
                },
                {
                    name: 'Opacity',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 100 },
                        { time: 1, value: 60 },
                        { time: 2, value: 20 }
                    ]
                }
            ],
            graphSpeed: speed,
            expectedCorrect: false,  // 修正前は誤り
            fixTarget: true  // 修正の対象
        });
    }
    
    // 5-2: Property A: 下降→上昇, Property B: 上昇→上昇
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/2組/符号混在/異なるプロパティ/A下降上昇_B上昇上昇',
            properties: [
                {
                    name: 'Rotation',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 180 },
                        { time: 1, value: 0 },
                        { time: 2, value: 90 }
                    ]
                },
                {
                    name: 'Scale',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 50 },
                        { time: 1, value: 75 },
                        { time: 2, value: 100 }
                    ]
                }
            ],
            graphSpeed: speed,
            expectedCorrect: false,
            fixTarget: true
        });
    }
    
    // 5-3: 3つのプロパティで複雑な符号混在
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/3組/符号混在/異なるプロパティ/複雑',
            properties: [
                {
                    name: 'Scale',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 0 },
                        { time: 1, value: 100 },
                        { time: 2, value: 50 }
                    ]
                },
                {
                    name: 'Opacity',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 100 },
                        { time: 1, value: 50 },
                        { time: 2, value: 0 }
                    ]
                },
                {
                    name: 'Rotation',
                    isPosition: false,
                    keyframes: [
                        { time: 0, value: 0 },
                        { time: 1, value: 0 },
                        { time: 2, value: 180 }
                    ]
                }
            ],
            graphSpeed: speed,
            expectedCorrect: false,
            fixTarget: true
        });
    }
    
    // ========================================
    // カテゴリ6: 位置プロパティ（参考：符号判定対象外）
    // ========================================
    
    for (const speed of graphSpeeds) {
        cases.push({
            id: caseId++,
            category: '3点カーブ/位置プロパティ/参考',
            properties: [
                {
                    name: 'Position',
                    isPosition: true,
                    keyframes: [
                        { time: 0, value: [0, 0] },
                        { time: 1, value: [100, 100] },
                        { time: 2, value: [50, 150] }
                    ]
                }
            ],
            graphSpeed: speed,
            expectedCorrect: true,  // 位置は常に正しい（符号判定なし）
            isReference: true
        });
    }
    
    return cases;
}

// ========================================
// シミュレーション実行
// ========================================

function runSimulation(testCase) {
    const results = {
        testCase: testCase,
        properties: []
    };
    
    // 単一プロパティの場合
    if (testCase.keyframes) {
        const prop = {
            name: testCase.propertyType,
            isPosition: testCase.isPosition,
            keyframes: testCase.keyframes
        };
        const propResult = simulateProperty(prop, testCase.graphSpeed);
        results.properties.push(propResult);
    }
    // 複数プロパティの場合
    else if (testCase.properties) {
        for (const prop of testCase.properties) {
            const propResult = simulateProperty(prop, testCase.graphSpeed);
            results.properties.push(propResult);
        }
    }
    
    return results;
}

function simulateProperty(prop, graphSpeed) {
    const kf = prop.keyframes;
    
    // 区間1: KF0 → KF1
    const seg1 = calculateSegmentDifferences_JS(kf[0], kf[1], prop.isPosition);
    const seg1_speed_js = normalizeSpeedForSegment_JS(graphSpeed, seg1.valueDiff, seg1.timeDiff);
    
    // 区間2: KF1 → KF2
    const seg2 = calculateSegmentDifferences_JS(kf[1], kf[2], prop.isPosition);
    const seg2_speed_js = normalizeSpeedForSegment_JS(graphSpeed, seg2.valueDiff, seg2.timeDiff);
    
    // ExtendScript側での処理（第2区間INハンドル）
    const seg2_in_before = applySignCorrection_ExtendScript_BEFORE(
        seg2_speed_js, kf[1].value, kf[2].value, prop.isPosition
    );
    const seg2_in_after = applySignCorrection_ExtendScript_AFTER(
        seg2_speed_js, kf[1].value, kf[2].value, prop.isPosition
    );
    
    // ExtendScript側での処理（その他のハンドル：参考）
    const seg1_out_after = applySignCorrection_ExtendScript_AFTER(
        seg1_speed_js, kf[0].value, kf[1].value, prop.isPosition
    );
    const seg1_in_after = applySignCorrection_ExtendScript_AFTER(
        seg1_speed_js, kf[0].value, kf[1].value, prop.isPosition
    );
    const seg2_out_after = applySignCorrection_ExtendScript_AFTER(
        seg2_speed_js, kf[1].value, kf[2].value, prop.isPosition
    );
    
    return {
        propertyName: prop.name,
        isPosition: prop.isPosition,
        segment1: {
            valueDiff: seg1.valueDiff,
            timeDiff: seg1.timeDiff,
            speedFromJS: seg1_speed_js,
            outHandle_after: seg1_out_after,
            inHandle_after: seg1_in_after
        },
        segment2: {
            valueDiff: seg2.valueDiff,
            timeDiff: seg2.timeDiff,
            speedFromJS: seg2_speed_js,
            outHandle_after: seg2_out_after,
            inHandle_before: seg2_in_before,  // 修正前
            inHandle_after: seg2_in_after     // 修正後
        },
        isDescending2: (kf[2].value < kf[1].value) || 
                      (Array.isArray(kf[2].value) && kf[2].value[0] < kf[1].value[0])
    };
}

// ========================================
// 結果検証
// ========================================

function verifyResults(results) {
    const verification = {
        passed: true,
        issues: []
    };
    
    for (const propResult of results.properties) {
        const seg2 = propResult.segment2;
        
        // 位置プロパティはスキップ
        if (propResult.isPosition) {
            continue;
        }
        
        // 修正前後で差があるか確認
        const hasChange = (seg2.inHandle_before !== seg2.inHandle_after);
        
        // 下降区間の場合、修正により符号が反転すべき
        if (propResult.isDescending2 && hasChange) {
            // 修正前と修正後で符号が逆であることを確認
            const signFlipped = (Math.sign(seg2.inHandle_before) !== Math.sign(seg2.inHandle_after));
            
            if (!signFlipped) {
                verification.passed = false;
                verification.issues.push({
                    property: propResult.propertyName,
                    issue: '下降区間で修正前後の符号が変わっていない',
                    before: seg2.inHandle_before,
                    after: seg2.inHandle_after
                });
            }
        }
        
        // 上昇区間の場合、修正前後で変化なしであるべき
        if (!propResult.isDescending2 && hasChange) {
            verification.passed = false;
            verification.issues.push({
                property: propResult.propertyName,
                issue: '上昇区間で修正により値が変わった',
                before: seg2.inHandle_before,
                after: seg2.inHandle_after
            });
        }
    }
    
    return verification;
}

// ========================================
// レポート生成
// ========================================

function generateReport(allResults) {
    console.log('\n'.repeat(2));
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   符号補正修正の検証レポート');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`総テストケース数: ${allResults.length}`);
    console.log('');
    
    let passCount = 0;
    let failCount = 0;
    let fixedCount = 0;
    
    const categorySummary = {};
    
    for (const result of allResults) {
        const category = result.testCase.category;
        if (!categorySummary[category]) {
            categorySummary[category] = { total: 0, passed: 0, failed: 0, fixed: 0 };
        }
        categorySummary[category].total++;
        
        const verification = verifyResults(result);
        
        if (verification.passed) {
            passCount++;
            categorySummary[category].passed++;
            
            // 修正対象で正しくなったケース
            if (result.testCase.fixTarget) {
                fixedCount++;
                categorySummary[category].fixed++;
            }
        } else {
            failCount++;
            categorySummary[category].failed++;
        }
    }
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  全体サマリー');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`✅ 成功: ${passCount} / ${allResults.length}`);
    console.log(`❌ 失敗: ${failCount} / ${allResults.length}`);
    console.log(`🔧 修正により正しくなったケース: ${fixedCount}`);
    console.log('');
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  カテゴリ別サマリー');
    console.log('───────────────────────────────────────────────────────────────');
    for (const [category, summary] of Object.entries(categorySummary)) {
        const status = summary.failed > 0 ? '❌' : '✅';
        console.log(`${status} ${category}`);
        console.log(`   Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}`);
        if (summary.fixed > 0) {
            console.log(`   🔧 修正で修復: ${summary.fixed}`);
        }
    }
    console.log('');
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  詳細結果（修正対象ケースのみ）');
    console.log('───────────────────────────────────────────────────────────────');
    
    for (const result of allResults) {
        if (!result.testCase.fixTarget) continue;
        
        console.log(`\n[Case ${result.testCase.id}] ${result.testCase.category}`);
        console.log(`  Graph Speed: ${result.testCase.graphSpeed}`);
        
        for (const propResult of result.properties) {
            console.log(`\n  Property: ${propResult.propertyName}`);
            console.log(`    Segment 2 (KF1→KF2):`);
            console.log(`      ValueDiff: ${propResult.segment2.valueDiff.toFixed(3)}`);
            console.log(`      IsDescending: ${propResult.isDescending2 ? 'YES' : 'NO'}`);
            console.log(`      Speed from JS: ${propResult.segment2.speedFromJS.toFixed(6)}`);
            console.log(`      IN Handle (修正前): ${propResult.segment2.inHandle_before.toFixed(6)}`);
            console.log(`      IN Handle (修正後): ${propResult.segment2.inHandle_after.toFixed(6)}`);
            
            const signBefore = Math.sign(propResult.segment2.inHandle_before);
            const signAfter = Math.sign(propResult.segment2.inHandle_after);
            const correctSign = propResult.isDescending2 ? 
                                (signAfter === -signBefore) : 
                                (signAfter === signBefore);
            
            console.log(`      符号判定: ${correctSign ? '✅ 正しい' : '❌ 誤り'}`);
        }
        
        const verification = verifyResults(result);
        if (!verification.passed) {
            console.log(`\n  ⚠️  検証失敗:`);
            for (const issue of verification.issues) {
                console.log(`    - ${issue.issue}`);
                console.log(`      Property: ${issue.property}`);
                console.log(`      Before: ${issue.before}, After: ${issue.after}`);
            }
        }
    }
    
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  検証完了: ${passCount === allResults.length ? '✅ 全テスト成功' : '❌ 一部失敗あり'}`);
    console.log('═══════════════════════════════════════════════════════════════');
}

// ========================================
// メイン実行
// ========================================

console.log('テストケース生成中...');
const testCases = generateTestCases();
console.log(`生成されたテストケース: ${testCases.length}件`);

const allResults = [];
for (const testCase of testCases) {
    const result = runSimulation(testCase);
    allResults.push(result);
}

generateReport(allResults);
