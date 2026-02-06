// プリセット並び替えロジックのデバッグ

// サンプルデータ
const presetData = {
    presets: [
        { id: 'a1', name: 'Preset A1', group: 'groupA' },
        { id: 'a2', name: 'Preset A2', group: 'groupA' },
        { id: 'a3', name: 'Preset A3', group: 'groupA' },
        { id: 'b1', name: 'Preset B1', group: 'groupB' },
        { id: 'b2', name: 'Preset B2', group: 'groupB' },
        { id: 'd1', name: 'Default 1', group: 'default' },
        { id: 'd2', name: 'Default 2', group: 'default' },
    ]
};

const currentGroup = 'groupA';

console.log('=== 初期状態 ===');
console.log('全プリセット:', presetData.presets.map(p => p.id));
console.log('');

// 現在の実装（問題あり）
function reorderPreset_Current(presetId, newIndex) {
    console.log(`\n=== 現在の実装: ${presetId} を index ${newIndex} に移動 ===`);
    
    const groupPresets = presetData.presets.filter(p => p.group === currentGroup);
    const otherPresets = presetData.presets.filter(p => p.group !== currentGroup);
    
    console.log('groupPresets:', groupPresets.map(p => p.id));
    console.log('otherPresets:', otherPresets.map(p => p.id));
    
    const presetIndex = groupPresets.findIndex(p => p.id === presetId);
    console.log('元のindex:', presetIndex);
    
    const [movedPreset] = groupPresets.splice(presetIndex, 1);
    console.log('移動後のgroupPresets:', groupPresets.map(p => p.id));
    
    const adjustedIndex = newIndex > presetIndex ? newIndex - 1 : newIndex;
    console.log('調整後のindex:', adjustedIndex);
    
    groupPresets.splice(adjustedIndex, 0, movedPreset);
    console.log('挿入後のgroupPresets:', groupPresets.map(p => p.id));
    
    presetData.presets = [...otherPresets, ...groupPresets];
    console.log('最終結果:', presetData.presets.map(p => p.id));
    
    // 問題: otherPresetsが前に来るため、グループ間の順序が崩れる
}

// 修正版
function reorderPreset_Fixed(presetId, newIndex) {
    console.log(`\n=== 修正版: ${presetId} を index ${newIndex} に移動 ===`);
    
    // 全体の配列での実際のインデックスを取得
    const allPresets = presetData.presets;
    const groupPresets = allPresets.filter(p => p.group === currentGroup);
    
    console.log('全プリセット:', allPresets.map(p => p.id));
    console.log('groupPresetsのみ:', groupPresets.map(p => p.id));
    
    // グループ内での元のインデックスと新しいインデックス
    const oldGroupIndex = groupPresets.findIndex(p => p.id === presetId);
    console.log('グループ内の元のindex:', oldGroupIndex);
    console.log('グループ内の新しいindex:', newIndex);
    
    // 全体配列での実際のインデックスを計算
    const oldGlobalIndex = allPresets.findIndex(p => p.id === presetId);
    
    // グループ内のnewIndex番目のプリセットの、全体配列でのインデックスを見つける
    let targetGlobalIndex;
    if (newIndex >= groupPresets.length) {
        // グループの最後
        const lastGroupPreset = groupPresets[groupPresets.length - 1];
        targetGlobalIndex = allPresets.findIndex(p => p.id === lastGroupPreset.id);
    } else {
        targetGlobalIndex = allPresets.findIndex(p => p.id === groupPresets[newIndex].id);
    }
    
    console.log('全体配列での元のindex:', oldGlobalIndex);
    console.log('全体配列での目標index:', targetGlobalIndex);
    
    // 配列から削除
    const [movedPreset] = allPresets.splice(oldGlobalIndex, 1);
    console.log('削除後:', allPresets.map(p => p.id));
    
    // 新しい位置に挿入（削除後のインデックスを調整）
    const adjustedTargetIndex = targetGlobalIndex > oldGlobalIndex ? targetGlobalIndex - 1 : targetGlobalIndex;
    allPresets.splice(adjustedTargetIndex, 0, movedPreset);
    
    console.log('最終結果:', allPresets.map(p => p.id));
    
    presetData.presets = allPresets;
}

// テストケース1: groupA内でa1をindex 2（a3の後）に移動
console.log('\n\n### テストケース1: a1をgroupA内のindex 2に移動 ###');
console.log('期待結果: a2, a3, a1の順番');
const testData1 = JSON.parse(JSON.stringify(presetData));
const currentPresets1 = testData1.presets;
reorderPreset_Current('a1', 2);

// リセット
Object.assign(presetData, JSON.parse(JSON.stringify({ presets: currentPresets1 })));

console.log('\n--- 修正版で再テスト ---');
reorderPreset_Fixed('a1', 2);

// テストケース2: a3をindex 0（先頭）に移動
console.log('\n\n### テストケース2: a3をgroupA内のindex 0に移動 ###');
console.log('期待結果: a3, a1, a2の順番');
Object.assign(presetData, JSON.parse(JSON.stringify({ presets: currentPresets1 })));
reorderPreset_Fixed('a3', 0);

// 問題点の分析
console.log('\n\n=== 問題点の分析 ===');
console.log('1. 現在の実装は、グループ内の順序は変えられるが、');
console.log('   otherPresetsとgroupPresetsを結合する際、');
console.log('   グループ間の元の順序が保持されない');
console.log('');
console.log('2. 修正版は、全体配列内での実際の位置を計算して並び替えるため、');
console.log('   グループ間の順序も保持される');
