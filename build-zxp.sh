#!/bin/bash

# AGraph ZXP ビルドスクリプト

EXTENSION_NAME="AGraph"
VERSION="1.0.0"
CERT_PASSWORD="agraph2024"
CERT_FILE="./certificate.p12"
OUTPUT_DIR="./dist"

echo "🔨 AGraph ZXP ビルド開始..."

# 出力ディレクトリ作成
mkdir -p "$OUTPUT_DIR"

# 証明書がない場合は作成
if [ ! -f "$CERT_FILE" ]; then
    echo "📜 自己署名証明書を作成中..."
    ./ZXPSignCmd -selfSignedCert JP Tokyo "Grape Design" AGraph "$CERT_PASSWORD" "$CERT_FILE"
    echo "✅ 証明書を作成しました"
fi

# 一時ディレクトリを作成
TEMP_DIR="./temp_build"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR/AGraph"

# 必要なファイルをコピー（不要なファイルを除外）
echo "📦 ファイルをコピー中..."
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='dist' \
          --exclude='temp_build' \
          --exclude='*.sh' \
          --exclude='ZXPSignCmd' \
          --exclude='certificate.p12' \
          --exclude='*.md' \
          --exclude='_archive' \
          ./ "$TEMP_DIR/AGraph/"

# ZXPファイルを作成
echo "🔐 ZXPファイルに署名中..."
OUTPUT_FILE="$OUTPUT_DIR/${EXTENSION_NAME}_v${VERSION}.zxp"
./ZXPSignCmd -sign "$TEMP_DIR/AGraph" "$OUTPUT_FILE" "$CERT_FILE" "$CERT_PASSWORD" -tsa http://timestamp.digicert.com

# 一時ディレクトリを削除
rm -rf "$TEMP_DIR"

if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ ZXPファイルを作成しました: $OUTPUT_FILE"
    echo "📊 ファイルサイズ: $(du -h "$OUTPUT_FILE" | cut -f1)"
    echo ""
    echo "インストール方法:"
    echo "1. ZXP Installerをダウンロード: https://aescripts.com/learn/zxp-installer/"
    echo "2. $OUTPUT_FILE をZXP Installerにドラッグ&ドロップ"
else
    echo "❌ ZXPファイルの作成に失敗しました"
    exit 1
fi
