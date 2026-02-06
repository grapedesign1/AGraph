#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const VERSION = '1.0.0';
const EXTENSION_NAME = 'AGraph';
const OUTPUT_DIR = path.join(__dirname, 'dist');
const TEMP_DIR = path.join(__dirname, 'temp_zxp_build');
const CERT_PASSWORD = 'agraph2024';
const CERT_FILE = path.join(__dirname, 'certificate.p12');

const ZXP_CMD = path.join(__dirname, 'node_modules/zxp-provider/bin/4.1.1/osx/ZXPSignCmd');

console.log('🔨 AGraph ZXP ビルド開始...');

// 出力ディレクトリ作成
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 一時ディレクトリをクリーンアップ
if (fs.existsSync(TEMP_DIR)) {
    execSync(`rm -rf "${TEMP_DIR}"`, { stdio: 'inherit' });
}
fs.mkdirSync(TEMP_DIR, { recursive: true });

const outputPath = path.join(OUTPUT_DIR, `${EXTENSION_NAME}_v${VERSION}.zxp`);

try {
    // 必要なファイルだけをコピー
    console.log('📦 必要なファイルをコピー中...');
    const filesToCopy = ['CSXS', 'ext', 'html'];
    
    for (const item of filesToCopy) {
        const src = path.join(__dirname, item);
        const dest = path.join(TEMP_DIR, item);
        if (fs.existsSync(src)) {
            execSync(`cp -R "${src}" "${dest}"`, { stdio: 'inherit' });
        }
    }
    
    console.log(`✅ コピー完了: ${filesToCopy.join(', ')}`);

    // プレースホルダー置換のため、aesp.umd.jsをルートにもコピー
    const aespSource = path.join(__dirname, 'ext', 'aesp.umd.js');
    const aespRootDest = path.join(TEMP_DIR, 'aesp.umd.js');
    if (fs.existsSync(aespSource)) {
        fs.copyFileSync(aespSource, aespRootDest);
    }

    // プレースホルダー置換
    console.log('📝 プレースホルダーを置換中...');
    const replacePlaceholdersSource = path.join(__dirname, 'replace-placeholders.js');
    const runScriptSource = path.join(__dirname, 'run-placeholder-replacement.js');
    const replacePlaceholdersDest = path.join(TEMP_DIR, 'replace-placeholders.js');
    const runScriptDest = path.join(TEMP_DIR, 'run-placeholder-replacement.js');
    
    if (fs.existsSync(replacePlaceholdersSource) && fs.existsSync(runScriptSource)) {
        // Copy both scripts to TEMP_DIR
        fs.copyFileSync(replacePlaceholdersSource, replacePlaceholdersDest);
        fs.copyFileSync(runScriptSource, runScriptDest);
        
        // Execute wrapper script with TEMP_DIR as argument
        execSync(`node "${runScriptDest}" "${TEMP_DIR}"`, { stdio: 'inherit' });
        
        // Copy replaced file back to ext/
        if (fs.existsSync(aespRootDest)) {
            fs.copyFileSync(aespRootDest, path.join(TEMP_DIR, 'ext', 'aesp.umd.js'));
            fs.unlinkSync(aespRootDest); // Remove from root
        }
        
        // Remove build scripts from TEMP_DIR (should not be in ZXP)
        if (fs.existsSync(replacePlaceholdersDest)) fs.unlinkSync(replacePlaceholdersDest);
        if (fs.existsSync(runScriptDest)) fs.unlinkSync(runScriptDest);
        
        console.log('✅ プレースホルダー置換完了');
    } else {
        console.warn('⚠️  replace-placeholders.js または run-placeholder-replacement.js が見つかりません');
    }

    // 証明書がない場合は作成
    if (!fs.existsSync(CERT_FILE)) {
        console.log('📜 自己署名証明書を作成中...');
        execSync(`arch -x86_64 "${ZXP_CMD}" -selfSignedCert JP Tokyo "Grape Design" AGraph "${CERT_PASSWORD}" "${CERT_FILE}"`, {
            stdio: 'inherit'
        });
        console.log('✅ 証明書を作成しました');
    }

    // ZXPファイルを作成
    console.log('🔐 ZXPファイルに署名中...');
    execSync(`arch -x86_64 "${ZXP_CMD}" -sign "${TEMP_DIR}" "${outputPath}" "${CERT_FILE}" "${CERT_PASSWORD}"`, {
        stdio: 'inherit'
    });

    // 一時ディレクトリをクリーンアップ
    execSync(`rm -rf "${TEMP_DIR}"`, { stdio: 'inherit' });

    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ ZXPファイルを作成しました: ${outputPath}`);
    console.log(`📊 ファイルサイズ: ${sizeMB} MB`);
    console.log('');
    console.log('インストール方法:');
    console.log('1. ZXP Installerをダウンロード: https://aescripts.com/learn/zxp-installer/');
    console.log(`2. ${outputPath} をZXP Installerにドラッグ&ドロップ`);
} catch (err) {
    console.error('❌ ZXPファイルの作成に失敗しました:', err.message);
    // エラー時も一時ディレクトリをクリーンアップ
    if (fs.existsSync(TEMP_DIR)) {
        execSync(`rm -rf "${TEMP_DIR}"`);
    }
    process.exit(1);
}
