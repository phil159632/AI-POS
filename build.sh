#!/bin/bash

# 1. 強制啟用 Corepack
echo "Step 1: Enabling Corepack..."
corepack enable

# 2. 使用 Corepack 和 package.json 中指定的 pnpm 版本來安裝依賴
echo "Step 2: Installing dependencies with the correct pnpm version..."
pnpm install

# 3. 執行構建命令
echo "Step 3: Building the project..."
pnpm build
