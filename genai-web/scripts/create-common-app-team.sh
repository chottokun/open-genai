#!/bin/bash

# 共通アプリチームをDynamoDBに作成するスクリプト
#
# 使い方:
#   ./scripts/create-common-app-team.sh <parameter.tsのenvキー>
#
# 引数:
#   parameter.tsのenvキー (必須) - CDKのenv (例: -dev, -stg, -prd)
#
# 前提条件:
#   - AWS CLIがインストール・設定済みであること
#   - jq がインストール済みであること
#   - 対象環境のCloudFormationスタックがデプロイ済みであること

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "使い方: $0 <parameter.tsのenvキー>"
    echo "例: $0 -dev"
    echo "parameter.tsのenvキーは \`'-dev': devParams,\` となっていたら、キー値（例では \`-dev\`）を指定してください"
    exit 1
fi

COMMON_TEAM_ID="00000000-0000-0000-0000-000000000000"
COMMON_TEAM_NAME="共通アプリ"
CREATED_DATE=$(date +%s%3N)

env=$1
echo "env: $env"

STACK_NAME="GenerativeAiUseCasesStack${env}"
echo "スタック名: $STACK_NAME"

# CloudFormation Outputs からテーブル名を取得
echo "DynamoDBテーブル名を取得中..."
stack_output=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --output json 2>&1) || {
    echo "エラー: スタック '$STACK_NAME' の情報取得に失敗しました。"
    echo "AWS認証情報とスタック名を確認してください。"
    exit 1
}

TABLE_NAME=$(echo "$stack_output" | jq -r '.Stacks[0].Outputs[] | select(.OutputKey=="InvokeExAppTableName") | .OutputValue')

if [ -z "$TABLE_NAME" ] || [ "$TABLE_NAME" = "null" ]; then
    echo "エラー: DynamoDBテーブル名が取得できませんでした。"
    echo "スタック '$STACK_NAME' に 'InvokeExAppTableName' の出力が存在するか確認してください。"
    exit 1
fi

echo "テーブル名: $TABLE_NAME"

# 既存アイテムの確認
echo "既存の共通アプリチームを確認中..."
existing_item=$(aws dynamodb get-item \
    --table-name "$TABLE_NAME" \
    --key "{\"pk\": {\"S\": \"team#${COMMON_TEAM_ID}\"}, \"sk\": {\"S\": \"team\"}}" \
    --output json 2>&1) || {
    echo "エラー: DynamoDBへのアクセスに失敗しました。"
    exit 1
}

if echo "$existing_item" | jq -e '.Item' > /dev/null 2>&1; then
    echo "共通アプリチームは既に存在します。処理をスキップします。"
    exit 0
fi

# アイテムの作成
echo "共通アプリチームを作成中..."
aws dynamodb put-item \
    --table-name "$TABLE_NAME" \
    --item "{
        \"pk\": {\"S\": \"team#${COMMON_TEAM_ID}\"},
        \"sk\": {\"S\": \"team\"},
        \"createdDate\": {\"S\": \"${CREATED_DATE}\"},
        \"teamName\": {\"S\": \"${COMMON_TEAM_NAME}\"},
        \"updatedDate\": {\"S\": \"\"}
    }" \
    --condition-expression "attribute_not_exists(pk)" 2>&1 || {
    echo "エラー: 共通アプリチームの作成に失敗しました。"
    exit 1
}

echo "共通アプリチームの作成が完了しました。"
echo "  チームID: $COMMON_TEAM_ID"
echo "  チーム名: $COMMON_TEAM_NAME"
echo ""
echo "源内Webアプリの [チーム管理] 画面で「共通アプリ」チームが表示されることを確認してください。"
