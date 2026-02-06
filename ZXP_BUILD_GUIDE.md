# ZXP ビルドガイド

## 概要

このドキュメントは、AccelCurve拡張機能をZXPファイルとしてパッケージ化する方法を説明します。ZXPファイルは、Adobe Creative Cloud拡張機能の標準的な配布形式です。

## ZXPファイルとは

- **ZXP (ZXP Package)**: Adobe CEP (Common Extensibility Platform) 拡張機能のパッケージ形式
- 署名された圧縮アーカイブで、拡張機能のすべてのファイルを含む
- ZXP Installerなどのツールでインストール可能
- Mac/Windows両対応

## 前提条件

### 1. Node.js環境

```bash
# Node.jsがインストールされていることを確認
node --version
npm --version
```

### 2. 必要なnpmパッケージ

`package.json`には以下が含まれています：

```json
{
  "dependencies": {
    "zxp-sign-cmd": "^2.0.0"
  }
}
```

インストール：
```bash
npm install
```

これにより、`node_modules/zxp-provider/bin/`にZXPSignCmdバイナリがインストールされます。

## ファイル構成

### ビルドスクリプト: `build-zxp.js`

```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const VERSION = '1.0.0';
const EXTENSION_NAME = 'AccelCurve';
const OUTPUT_DIR = './dist';
const CERT_PASSWORD = 'accelcurve2024';
const CERT_FILE = './certificate.p12';

const ZXP_CMD = path.join(__dirname, 'node_modules/zxp-provider/bin/4.1.1/osx/ZXPSignCmd');
```

### 重要なポイント

1. **ZXPSignCmdのパス**: `node_modules/zxp-provider`から取得
2. **証明書**: 自己署名証明書を自動生成（初回のみ）
3. **出力先**: `./dist/AccelCurve_v{VERSION}.zxp`

## ビルド手順

### 基本的なビルド

```bash
node build-zxp.js
```

### 出力例

```
🔨 AccelCurve ZXP ビルド開始...
🔐 ZXPファイルに署名中...
Signed successfully
✅ ZXPファイルを作成しました: dist/AccelCurve_v1.0.0.zxp
📊 ファイルサイズ: 43.16 MB
```

### 生成されるファイル

- `dist/AccelCurve_v1.0.0.zxp` - インストール可能なZXPファイル
- `certificate.p12` - 自己署名証明書（初回のみ生成）

## Windows/Mac対応

### ファイルパスの互換性

拡張機能のコードでは、プラットフォーム非依存のパス取得を使用：

```javascript
// ext/main.js
function getPresetFilePath() {
    if (presetFilePath) return presetFilePath;
    
    // SystemPath.MY_DOCUMENTS = ユーザーの書類フォルダ
    // Mac: ~/Documents
    // Windows: C:\Users\[username]\Documents
    const documentsPath = csInterface.getSystemPath(SystemPath.MY_DOCUMENTS);
    presetFilePath = documentsPath + '/gd_AccelCurve/gd_AccelCurve_Preset.json';
    
    return presetFilePath;
}
```

### ExtendScriptのFileオブジェクト

ExtendScript (`extendscript.jsx`) では、`File`オブジェクトがパス区切り文字を自動変換：

```javascript
// ext/extendscript.jsx
function readPresetFile(filePath) {
    var file = new File(filePath);  // Mac/Windowsで自動的にパス変換
    if (!file.exists) {
        return JSON.stringify({ error: 'File not found' });
    }
    file.open('r');
    var content = file.read();
    file.close();
    return JSON.stringify({ success: true, content: content });
}
```

## .gitignore設定

ビルド成果物と証明書を除外：

```
dist/
certificate.p12
ZXPSignCmd.zip
node_modules/
```

## インストール方法

### エンドユーザー向け

1. ZXP Installerをダウンロード: https://aescripts.com/learn/zxp-installer/
2. `dist/AccelCurve_v1.0.0.zxp`をZXP Installerにドラッグ&ドロップ
3. Adobe After Effectsを再起動
4. Window > Extensions > AccelCurveで起動

### 開発者向け（ローカルインストール）

```bash
./install.sh
```

これにより、開発中のファイルが直接CEP拡張機能フォルダにコピーされます：
- Mac: `~/Library/Application Support/Adobe/CEP/extensions/AccelCurve/`

## トラブルシューティング

### ZXPSignCmdが見つからない

**問題**: `node_modules/zxp-provider`が存在しない

**解決策**:
```bash
npm install
```

### 証明書エラー

**問題**: 証明書の作成に失敗

**解決策**:
```bash
rm certificate.p12
node build-zxp.js  # 証明書を再生成
```

### ファイルサイズが大きすぎる

**問題**: ZXPファイルが40MB以上

**原因**: 
- 開発用ファイル（.md, _archiveなど）が含まれている
- node_modulesが含まれている

**解決策**: `build-zxp.js`で除外設定を確認
現在のビルドは拡張機能フォルダ全体を署名するため、不要なファイルは事前に削除するか、除外リストを作成

### Mac Apple Silicon (M1/M2) での実行

`build-zxp.js`では`arch -x86_64`を使用してRosetta 2経由で実行：

```javascript
execSync(`arch -x86_64 "${ZXP_CMD}" -sign ...`);
```

Intel Macでは`arch -x86_64`は不要ですが、害もありません。

## 参考リンク

- [Adobe CEP Resources](https://github.com/Adobe-CEP/CEP-Resources)
- [zxp-sign-cmd npm package](https://www.npmjs.com/package/zxp-sign-cmd)
- [ZXP Installer](https://aescripts.com/learn/zxp-installer/)

## バージョン履歴

### v1.0.0 (2025-12-29)
- 初回リリース
- プリセットグループをdefaultに統合
- 24個のプリセットを含む
- Mac/Windows対応確認済み
