#!/bin/bash

# 指定したユーザーをSystemAdminGroupに追加するスクリプト
#
# 使い方:
#   ./scripts/add-system-admin.sh <parameter.tsのenvキー> <ユーザー名>
#
# 引数:
#   parameter.tsのenvキー (必須) - CDKのenv (例: -dev, -stg, -prd)
#   ユーザー名 (必須) - CognitoユーザープールのUsername (例: user@example.com)
#
# 前提条件:
#   - AWS CLIがインストール・設定済みであること
#   - jq がインストール済みであること
#   - 対象環境のCloudFormationスタックがデプロイ済みであること
#   - 対象ユーザーがCognitoユーザープールに登録済みであること

set -euo pipefail

GROUP_NAME="SystemAdminGroup"

if [ $# -ne 2 ]; then
    echo "使い方: $0 <parameter.tsのenvキー> <ユーザー名>"
    echo "例: $0 -dev user@example.com"
    echo "parameter.tsのenvキーは \`'-dev': devParams,\` となっていたら、キー値（例では \`-dev\`）を指定してください"
    exit 1
fi

env=$1
username=$2

echo "env: $env"
echo "ユーザー名: $username"

STACK_NAME="GenerativeAiUseCasesStack${env}"
echo "スタック名: $STACK_NAME"

# CloudFormation Outputs から UserPoolId を取得
echo "UserPoolIdを取得中..."
stack_output=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --output json 2>&1) || {
    echo "エラー: スタック '$STACK_NAME' の情報取得に失敗しました。"
    echo "AWS認証情報とスタック名を確認してください。"
    exit 1
}

USER_POOL_ID=$(echo "$stack_output" | jq -r '.Stacks[0].Outputs[] | select(.OutputKey=="UserPoolId") | .OutputValue')

if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" = "null" ]; then
    echo "エラー: UserPoolIdが取得できませんでした。"
    echo "スタック '$STACK_NAME' に 'UserPoolId' の出力が存在するか確認してください。"
    exit 1
fi

echo "UserPoolId: $USER_POOL_ID"

# ユーザーの存在確認
echo "ユーザーの存在を確認中..."
aws cognito-idp admin-get-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$username" > /dev/null 2>&1 || {
    echo "エラー: ユーザー '$username' がユーザープールに存在しません。"
    exit 1
}

# グループへの追加
echo "ユーザーを $GROUP_NAME に追加中..."
aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$username" \
    --group-name "$GROUP_NAME" 2>&1 || {
    echo "エラー: グループへの追加に失敗しました。"
    exit 1
}

echo "完了: ユーザー '$username' を $GROUP_NAME に追加しました。"
