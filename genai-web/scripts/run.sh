#!/bin/sh

if [ "$#" -ne 1 ]; then
  echo "第一引数にローカルで実行したいCDKの環境変数名を入れてください。例: -ipDev"
  exit 1
fi

echo ローカル実行環境名: ${1}

export npm_config_env=${1}

npm run web:devw