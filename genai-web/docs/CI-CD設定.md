# CI/CD設定

サンプル用の CI/CD ファイルを以下のリンクに配置しています。  
必要に応じて内容を変更し `.github/workflows` ディレクトリに配置してご利用ください。

- [packages/web用のワークフローファイル](../.github/genai-ci-web.yaml.example)
- [packages/cdk用のワークフローファイル](../.github/genai-ci-cdk.yaml.example)
- [デプロイ用のワークフローファイル](../.github/genai-deploy.yaml.example)
    - ワークフロー内に詳細な説明を記載していますので、内容をご確認ください

## 推奨事項

### GitHub Actions

- GitHub Actions の利用においては `SHA pinning` の有効化を推奨します
    - `pinning` のために、`pinact` 等のツールの利用を推奨します

### パッケージ管理

- 環境構築におけるインストール時 `npm ci` の利用を推奨します
- `.npmrc` は `min-release-age`, `ignore-scripts` の設定を入れることを推奨します

※ npm 以外のパッケージ管理ツールを利用する場合も、同様の設定がないか確認してみてください。

### Dependabot

- `cooldown` の設定を入れることを推奨します

※ Dependabot 以外のツールを利用する場合も、同様の設定がないか確認してみてください。