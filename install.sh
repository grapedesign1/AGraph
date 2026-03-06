#!/bin/bash
# AGraph Extension Installer
# Source → After Effects CEP Extensions

SOURCE_DIR="$(dirname "$0")"
DEST_DIR="/Users/shintarodanno/Library/Application Support/Adobe/CEP/extensions/com.grapedesign.agraph"

echo "🔄 AGraph Extension をインストール中..."
echo "📂 Source: $SOURCE_DIR"
echo "📂 Destination: $DEST_DIR"
echo ""

# ディレクトリを作成
mkdir -p "$DEST_DIR"

# extフォルダをコピー
rsync -av --delete "$SOURCE_DIR/ext/" "$DEST_DIR/ext/"

# CSXSフォルダをコピー  
rsync -av --delete "$SOURCE_DIR/CSXS/" "$DEST_DIR/CSXS/"

echo ""
echo "✅ インストール完了！"
echo ""
echo "📌 次の手順:"
echo "1. After Effectsを再起動"
echo "2. Window > Extensions > AGraph"
echo ""
