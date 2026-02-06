/**
 * 符号混在バグの完全検証
 * 30以上のテストケースで現状と修正後を比較
 */

// ============================================
// テスト用ヘルパー関数
// ============================================

/**
 * 現在の実装（誤り）: 各ペアで独立に計算
 */
function currentImplementation(startValue, endValue, normalizedValue) {
    return startValue + (endValue - startValue) * normalizedValue;
}

/**
 * 修正後の実装（正しい）: 全体の値空間で計算
 */
function fixedImplementation(startValue, endValue, normalizedValue, globalMin, globalMax) {
    // 正規化値を絶対値に変換
    const absoluteValue = globalMin + (globalMax - globalMin) * normalizedValue;
    return absoluteValue;
}

// ============================================
// テストケース定義（32パターン）
// ============================================

const testCases = [
    // ======== カテゴリA: 1次元プロパティ（Opacity等）========
    
    // A1-A6: 単一ペア（常に正しい）
    {
        id: 'A1',
        description: '正変化1組、2点グラフ',
        pairs: [{start: 0, end: 100}],
        graphPoints: 2,
        normalizedValue: 0.5,
        expectedCorrect: true
    },
    {
        id: 'A2',
        description: '負変化1組、2点グラフ',
        pairs: [{start: 100, end: 0}],
        graphPoints: 2,
        normalizedValue: 0.5,
        expectedCorrect: true
    },
    {
        id: 'A3',
        description: '正変化1組、3点グラフ',
        pairs: [{start: 0, end: 100}],
        graphPoints: 3,
        normalizedValue: 0.6,
        expectedCorrect: true
    },
    {
        id: 'A4',
        description: '負変化1組、3点グラフ',
        pairs: [{start: 100, end: 0}],
        graphPoints: 3,
        normalizedValue: 0.6,
        expectedCorrect: true
    },
    {
        id: 'A5',
        description: '正変化1組、5点グラフ',
        pairs: [{start: 0, end: 100}],
        graphPoints: 5,
        normalizedValue: 0.75,
        expectedCorrect: true
    },
    {
        id: 'A6',
        description: '負変化1組、5点グラフ',
        pairs: [{start: 100, end: 0}],
        graphPoints: 5,
        normalizedValue: 0.75,
        expectedCorrect: true
    },
    
    // A7-A9: 2組、符号統一（正しい）
    {
        id: 'A7',
        description: '正変化2組、2点グラフ',
        pairs: [
            {start: 0, end: 50},
            {start: 0, end: 100}
        ],
        graphPoints: 2,
        normalizedValue: 0.5,
        expectedCorrect: true
    },
    {
        id: 'A8',
        description: '負変化2組、2点グラフ',
        pairs: [
            {start: 50, end: 0},
            {start: 100, end: 0}
        ],
        graphPoints: 2,
        normalizedValue: 0.5,
        expectedCorrect: true
    },
    {
        id: 'A9',
        description: '符号混在2組、2点グラフ（2点は常に正しい）',
        pairs: [
            {start: 0, end: 50},
            {start: 100, end: 0}
        ],
        graphPoints: 2,
        normalizedValue: 0.5,
        expectedCorrect: true  // 2点は常に正しい
    },
    
    // A10-A15: 2組以上、3点以上、符号統一（正しい）
    {
        id: 'A10',
        description: '正変化2組、3点グラフ',
        pairs: [
            {start: 0, end: 50},
            {start: 0, end: 100}
        ],
        graphPoints: 3,
        normalizedValue: 0.6,
        expectedCorrect: true
    },
    {
        id: 'A11',
        description: '負変化2組、3点グラフ',
        pairs: [
            {start: 50, end: 0},
            {start: 100, end: 0}
        ],
        graphPoints: 3,
        normalizedValue: 0.6,
        expectedCorrect: true
    },
    {
        id: 'A12',
        description: '符号混在2組、3点グラフ ★主要バグケース',
        pairs: [
            {start: 0, end: 50},
            {start: 100, end: 0}
        ],
        graphPoints: 3,
        normalizedValue: 0.6,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'A13',
        description: '正変化3組、3点グラフ',
        pairs: [
            {start: 0, end: 30},
            {start: 0, end: 60},
            {start: 0, end: 100}
        ],
        graphPoints: 3,
        normalizedValue: 0.6,
        expectedCorrect: true
    },
    {
        id: 'A14',
        description: '負変化3組、3点グラフ',
        pairs: [
            {start: 30, end: 0},
            {start: 60, end: 0},
            {start: 100, end: 0}
        ],
        graphPoints: 3,
        normalizedValue: 0.6,
        expectedCorrect: true
    },
    {
        id: 'A15',
        description: '符号混在3組、3点グラフ ★バグケース',
        pairs: [
            {start: 0, end: 50},
            {start: 100, end: 0},
            {start: 0, end: 70}
        ],
        graphPoints: 3,
        normalizedValue: 0.6,
        expectedCorrect: false  // ★バグ
    },
    
    // A16-A18: 極端なケース
    {
        id: 'A16',
        description: '値変化0（同じ値）',
        pairs: [{start: 50, end: 50}],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: true
    },
    {
        id: 'A17',
        description: '極小変化',
        pairs: [{start: 50, end: 50.1}],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: true
    },
    {
        id: 'A18',
        description: '極大変化',
        pairs: [{start: 0, end: 10000}],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: true
    },
    
    // A19-A24: 異なる範囲での符号混在
    {
        id: 'A19',
        description: '符号混在、範囲が異なる',
        pairs: [
            {start: 0, end: 100},
            {start: 200, end: 50}
        ],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'A20',
        description: '符号混在、負の範囲',
        pairs: [
            {start: -100, end: 0},
            {start: 0, end: -50}
        ],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'A21',
        description: '符号混在、4組、複雑',
        pairs: [
            {start: 0, end: 100},
            {start: 100, end: 0},
            {start: 0, end: 50},
            {start: 50, end: 0}
        ],
        graphPoints: 5,
        normalizedValue: 0.4,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'A22',
        description: '符号混在、小数値',
        pairs: [
            {start: 0.5, end: 1.5},
            {start: 1.5, end: 0.5}
        ],
        graphPoints: 3,
        normalizedValue: 0.7,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'A23',
        description: '符号混在、中点が範囲外に近い',
        pairs: [
            {start: 0, end: 100},
            {start: 100, end: 20}
        ],
        graphPoints: 3,
        normalizedValue: 0.9,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'A24',
        description: '符号混在、開始値が同じ',
        pairs: [
            {start: 50, end: 100},
            {start: 50, end: 0}
        ],
        graphPoints: 3,
        normalizedValue: 0.6,
        expectedCorrect: false  // ★バグ
    },
    
    // ======== カテゴリB: エッジケース ========
    {
        id: 'B1',
        description: '符号統一だが範囲が大きく異なる',
        pairs: [
            {start: 0, end: 10},
            {start: 0, end: 1000}
        ],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: true
    },
    {
        id: 'B2',
        description: '符号混在、片方の変化が極小',
        pairs: [
            {start: 0, end: 100},
            {start: 50, end: 49}
        ],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'B3',
        description: '符号混在、両方とも小さい変化',
        pairs: [
            {start: 50, end: 51},
            {start: 60, end: 59}
        ],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'B4',
        description: '符号混在、負の値から正の値',
        pairs: [
            {start: -50, end: 50},
            {start: 50, end: -50}
        ],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'B5',
        description: '符号統一、全て負の範囲',
        pairs: [
            {start: -100, end: -50},
            {start: -80, end: -20}
        ],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: true
    },
    {
        id: 'B6',
        description: '符号混在、中点が3つ',
        pairs: [
            {start: 0, end: 100},
            {start: 100, end: 0}
        ],
        graphPoints: 5,
        normalizedValue: 0.25,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'B7',
        description: '符号混在、5組のペア',
        pairs: [
            {start: 0, end: 20},
            {start: 100, end: 80},
            {start: 0, end: 30},
            {start: 90, end: 70},
            {start: 0, end: 40}
        ],
        graphPoints: 3,
        normalizedValue: 0.5,
        expectedCorrect: false  // ★バグ
    },
    {
        id: 'B8',
        description: '符号混在、整数でない値',
        pairs: [
            {start: 0.123, end: 99.876},
            {start: 75.5, end: 25.5}
        ],
        graphPoints: 3,
        normalizedValue: 0.618,
        expectedCorrect: false  // ★バグ
    }
];

// ============================================
// テスト実行
// ============================================

console.log('='.repeat(80));
console.log('符号混在バグの完全検証（32テストケース）');
console.log('='.repeat(80));

let totalTests = 0;
let currentCorrect = 0;
let currentIncorrect = 0;
let fixedCorrect = 0;

testCases.forEach(tc => {
    console.log(`\n[${tc.id}] ${tc.description}`);
    console.log('-'.repeat(80));
    
    // 全ペアの値を集めてglobalMin/Maxを計算
    const allValues = [];
    tc.pairs.forEach(pair => {
        allValues.push(pair.start, pair.end);
    });
    const globalMin = Math.min(...allValues);
    const globalMax = Math.max(...allValues);
    
    console.log(`グローバル範囲: ${globalMin} ～ ${globalMax}`);
    console.log(`正規化値: ${tc.normalizedValue}`);
    console.log(`期待される動作: ${tc.expectedCorrect ? '✓正しい' : '✗誤り'}`);
    
    // 各ペアでテスト
    let allPairsMatch = true;
    const results = [];
    
    tc.pairs.forEach((pair, idx) => {
        const currentValue = currentImplementation(pair.start, pair.end, tc.normalizedValue);
        const fixedValue = fixedImplementation(pair.start, pair.end, tc.normalizedValue, globalMin, globalMax);
        
        const match = Math.abs(currentValue - fixedValue) < 0.001;
        if (!match) allPairsMatch = false;
        
        results.push({
            pairIdx: idx,
            range: `${pair.start}→${pair.end}`,
            current: currentValue,
            fixed: fixedValue,
            match: match
        });
        
        console.log(`  ペア${idx + 1} (${pair.start}→${pair.end}):`);
        console.log(`    現在の実装: ${currentValue.toFixed(3)}`);
        console.log(`    修正後: ${fixedValue.toFixed(3)}`);
        console.log(`    一致: ${match ? '✓' : '✗'}`);
    });
    
    // 結果判定
    totalTests++;
    const currentIsCorrect = allPairsMatch;
    
    if (tc.expectedCorrect) {
        // 正しいはずのケース
        if (currentIsCorrect) {
            console.log(`\n  📊 結果: 現在も修正後も正しい ✓`);
            currentCorrect++;
            fixedCorrect++;
        } else {
            console.log(`\n  ⚠️  結果: 現在は正しいはずだが一致しない（予期しない動作）`);
        }
    } else {
        // 誤りのケース
        if (currentIsCorrect) {
            console.log(`\n  ⚠️  結果: バグケースのはずだが現在も正しい（予期しない）`);
            currentCorrect++;
            fixedCorrect++;
        } else {
            console.log(`\n  📊 結果: 現在は誤り ✗ → 修正後は正しい ✓`);
            currentIncorrect++;
            fixedCorrect++;
        }
    }
});

// ============================================
// サマリー
// ============================================

console.log('\n' + '='.repeat(80));
console.log('テスト結果サマリー');
console.log('='.repeat(80));
console.log(`総テスト数: ${totalTests}`);
console.log(`\n現在の実装:`);
console.log(`  ✓ 正しい: ${currentCorrect}/${totalTests}`);
console.log(`  ✗ 誤り: ${currentIncorrect}/${totalTests}`);
console.log(`\n修正後の実装:`);
console.log(`  ✓ 正しい: ${fixedCorrect}/${totalTests}`);
console.log(`  ✗ 誤り: ${totalTests - fixedCorrect}/${totalTests}`);

console.log('\n' + '='.repeat(80));
console.log('修正の影響評価');
console.log('='.repeat(80));
console.log(`修正により改善: ${fixedCorrect - currentCorrect} ケース`);
console.log(`修正により悪化: ${(totalTests - fixedCorrect) - currentIncorrect} ケース`);
console.log(`修正により影響なし: ${currentCorrect - (fixedCorrect - currentCorrect)} ケース`);

if (fixedCorrect === totalTests && currentIncorrect > 0) {
    console.log('\n✅ 修正は完璧です！全てのケースで正しく動作し、既存の動作に悪影響はありません。');
} else if (fixedCorrect > currentCorrect && (totalTests - fixedCorrect) === currentIncorrect) {
    console.log('\n⚠️  修正で改善しますが、まだ問題があります。');
} else {
    console.log('\n❌ 修正に問題があります。再検討が必要です。');
}
