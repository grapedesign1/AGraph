/**
 * 符号判定の検証
 * 各キーフレームペアで符号判定が正しく行われているかをテスト
 */

// ============================================
// 現在の符号判定ロジック（ExtendScript）
// ============================================

function currentSignCorrection(val1, val2, speed) {
    // 位置以外で、実際の変化が負の場合は符号を反転
    if (val2 < val1) {
        return -speed;
    }
    return speed;
}

// ============================================
// テストケース定義
// ============================================

const testCases = [
    // ======== カテゴリA: 単一ペア（常に正しい） ========
    {
        id: 'A1',
        description: '正変化1組、グラフも正変化基準',
        analyzeSource: {start: 0, end: 100},
        applyTarget: {start: 0, end: 100},
        graphSpeed: 50,  // 正変化を前提としたspeed
        expectedSpeed: 50,  // 適用後も正
        expectedCorrect: true
    },
    {
        id: 'A2',
        description: '負変化1組、グラフも負変化基準',
        analyzeSource: {start: 100, end: 0},
        applyTarget: {start: 100, end: 0},
        graphSpeed: 50,  // グラフ作成時に既に負補正済み
        expectedSpeed: -50,  // 適用時にさらに反転
        expectedCorrect: true
    },
    
    // ======== カテゴリB: 2組以上、符号統一 ========
    {
        id: 'B1',
        description: '正変化2組、範囲異なる',
        analyzeSource: {start: 0, end: 100},
        applyTargets: [
            {start: 0, end: 50, expectedSpeed: 50},
            {start: 0, end: 100, expectedSpeed: 50}
        ],
        graphSpeed: 50,
        expectedCorrect: true
    },
    {
        id: 'B2',
        description: '負変化2組、範囲異なる',
        analyzeSource: {start: 100, end: 0},
        applyTargets: [
            {start: 50, end: 0, expectedSpeed: -50},
            {start: 100, end: 0, expectedSpeed: -50}
        ],
        graphSpeed: 50,
        expectedCorrect: true
    },
    
    // ======== カテゴリC: 2組以上、符号混在（バグケース） ========
    {
        id: 'C1',
        description: '符号混在：グラフ=正、適用=負 ★主要バグ',
        analyzeSource: {start: 0, end: 100},
        applyTargets: [
            {start: 0, end: 100, expectedSpeed: 50, note: 'グラフ作成元（正変化）'},
            {start: 100, end: 0, expectedSpeed: 50, note: '符号が逆（負変化）★ここで50であるべきだが、現在の実装では-50になる'}
        ],
        graphSpeed: 50,  // 正変化を前提
        expectedCorrect: false
    },
    {
        id: 'C2',
        description: '符号混在：グラフ=負、適用=正',
        analyzeSource: {start: 100, end: 0},
        applyTargets: [
            {start: 100, end: 0, expectedSpeed: -50, note: 'グラフ作成元（負変化）'},
            {start: 0, end: 100, expectedSpeed: -50, note: '符号が逆（正変化）★ここで-50であるべきだが、現在の実装では50になる'}
        ],
        graphSpeed: 50,  // 負変化時のグラフは正の値で保存される
        expectedCorrect: false
    },
    {
        id: 'C3',
        description: '符号混在：3組、混在',
        analyzeSource: {start: 0, end: 100},
        applyTargets: [
            {start: 0, end: 50, expectedSpeed: 50, note: '正変化'},
            {start: 100, end: 0, expectedSpeed: 50, note: '負変化 ★バグ'},
            {start: 0, end: 70, expectedSpeed: 50, note: '正変化'}
        ],
        graphSpeed: 50,
        expectedCorrect: false
    },
    {
        id: 'C4',
        description: '符号混在：範囲が大きく異なる',
        analyzeSource: {start: 0, end: 100},
        applyTargets: [
            {start: 0, end: 10, expectedSpeed: 50, note: '正変化、小範囲'},
            {start: 200, end: 50, expectedSpeed: 50, note: '負変化、大範囲 ★バグ'}
        ],
        graphSpeed: 50,
        expectedCorrect: false
    },
    {
        id: 'C5',
        description: '符号混在：負の範囲',
        analyzeSource: {start: -100, end: 0},
        applyTargets: [
            {start: -100, end: 0, expectedSpeed: 50, note: '正変化'},
            {start: 0, end: -50, expectedSpeed: 50, note: '負変化 ★バグ'}
        ],
        graphSpeed: 50,
        expectedCorrect: false
    },
    {
        id: 'C6',
        description: '符号混在：開始値が同じ',
        analyzeSource: {start: 50, end: 100},
        applyTargets: [
            {start: 50, end: 100, expectedSpeed: 50, note: '正変化'},
            {start: 50, end: 0, expectedSpeed: 50, note: '負変化 ★バグ'}
        ],
        graphSpeed: 50,
        expectedCorrect: false
    },
    {
        id: 'C7',
        description: '符号混在：中点が複数',
        analyzeSource: {start: 0, end: 100},
        applyTargets: [
            {start: 0, end: 100, expectedSpeed: 50, note: '正変化'},
            {start: 100, end: 0, expectedSpeed: 50, note: '負変化 ★バグ'}
        ],
        graphSpeed: 50,
        middlePoints: 3,
        expectedCorrect: false
    }
];

// ============================================
// 符号判定の詳細検証
// ============================================

console.log('='.repeat(80));
console.log('符号判定の詳細検証');
console.log('='.repeat(80));

let totalTests = 0;
let correctTests = 0;
let incorrectTests = 0;

testCases.forEach(tc => {
    console.log(`\n[${tc.id}] ${tc.description}`);
    console.log('-'.repeat(80));
    
    if (tc.applyTargets) {
        // 複数ターゲット
        console.log(`グラフ作成元: ${tc.analyzeSource.start} → ${tc.analyzeSource.end}`);
        console.log(`グラフのspeed値: ${tc.graphSpeed}`);
        console.log(`\n適用先:`);
        
        let allCorrect = true;
        
        tc.applyTargets.forEach((target, idx) => {
            const correctedSpeed = currentSignCorrection(target.start, target.end, tc.graphSpeed);
            const isCorrect = correctedSpeed === target.expectedSpeed;
            
            console.log(`  ターゲット${idx + 1}: ${target.start} → ${target.end}`);
            console.log(`    期待されるspeed: ${target.expectedSpeed}`);
            console.log(`    現在の実装のspeed: ${correctedSpeed}`);
            console.log(`    判定: ${isCorrect ? '✓' : '✗'}`);
            if (target.note) {
                console.log(`    Note: ${target.note}`);
            }
            
            // 符号判定の詳細
            const signCorrection = target.end < target.start ? '反転' : 'そのまま';
            console.log(`    符号判定: val2(${target.end}) ${target.end < target.start ? '<' : '>='} val1(${target.start}) → ${signCorrection}`);
            
            if (!isCorrect) {
                allCorrect = false;
                const diff = correctedSpeed - target.expectedSpeed;
                console.log(`    ⚠️  誤差: ${diff > 0 ? '+' : ''}${diff}`);
                
                // 問題の原因分析
                if (Math.abs(correctedSpeed) === Math.abs(target.expectedSpeed) && 
                    Math.sign(correctedSpeed) !== Math.sign(target.expectedSpeed)) {
                    console.log(`    📊 原因: 符号が逆（絶対値は正しい）`);
                }
            }
        });
        
        totalTests++;
        if (tc.expectedCorrect && allCorrect) {
            console.log(`\n  結果: 正しい ✓`);
            correctTests++;
        } else if (!tc.expectedCorrect && !allCorrect) {
            console.log(`\n  結果: バグケースとして正しく検出 ✓`);
            incorrectTests++;
        } else if (tc.expectedCorrect && !allCorrect) {
            console.log(`\n  結果: 予期しないエラー ⚠️`);
        } else {
            console.log(`\n  結果: バグケースなのに正しく動作 ⚠️`);
        }
    } else {
        // 単一ターゲット
        const target = tc.applyTarget;
        const correctedSpeed = currentSignCorrection(target.start, target.end, tc.graphSpeed);
        const isCorrect = correctedSpeed === tc.expectedSpeed;
        
        console.log(`グラフ作成: ${tc.analyzeSource.start} → ${tc.analyzeSource.end}`);
        console.log(`適用先: ${target.start} → ${target.end}`);
        console.log(`グラフのspeed: ${tc.graphSpeed}`);
        console.log(`期待されるspeed: ${tc.expectedSpeed}`);
        console.log(`現在の実装のspeed: ${correctedSpeed}`);
        console.log(`符号判定: val2(${target.end}) ${target.end < target.start ? '<' : '>='} val1(${target.start}) → ${target.end < target.start ? '反転' : 'そのまま'}`);
        
        totalTests++;
        if (isCorrect) {
            console.log(`\n結果: 正しい ✓`);
            correctTests++;
        } else {
            console.log(`\n結果: 誤り ✗`);
            incorrectTests++;
        }
    }
});

// ============================================
// サマリーと分析
// ============================================

console.log('\n' + '='.repeat(80));
console.log('テスト結果サマリー');
console.log('='.repeat(80));
console.log(`総テスト数: ${totalTests}`);
console.log(`正しく動作: ${correctTests}`);
console.log(`バグケース検出: ${incorrectTests}`);

console.log('\n' + '='.repeat(80));
console.log('問題の分析');
console.log('='.repeat(80));

console.log(`
【現在の符号判定ロジックの問題点】

ExtendScript側のコード:
  if (val2 < val1) {
      correctedSpeed = -correctedSpeed;
  }

この判定は「各区間の符号」のみを見ています。

問題：
  - グラフ作成時の基準プロパティの符号情報が失われている
  - 適用先プロパティの符号が異なる場合、誤った補正が行われる

具体例：
  グラフ作成: Opacity 0→100 (正変化、speed=50)
  適用先1: Opacity 0→100 (正変化) → val2>=val1 → speed=50 ✓
  適用先2: Opacity 100→0 (負変化) → val2<val1 → speed=-50 ✗
  
  適用先2では、グラフの speed=50 をそのまま使うべきだが、
  区間の符号判定で反転されてしまう。

【修正方針】
  各ペアに対して、「グラフ作成時の基準符号」を記録し、
  適用時にその情報を使って正しく補正する必要がある。
`);
