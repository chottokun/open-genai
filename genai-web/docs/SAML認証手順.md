# SAML認証手順

## 概要

本システムでは、複数の SAML 認証プロバイダー（IdP）を利用したログインが可能です。
プロバイダーは「プライマリプロバイダー」と「追加プロバイダー」の 2 種類に分かれており、アクセスする URL によって使用される IdP が切り替わります。

- プライマリプロバイダー:
  - メインとなる認証プロバイダーです。
  - `login/` から始まらないパス（例: `https://xxxxxx.cloudfront.net/`）でアクセスした場合に使用されます。
- 追加プロバイダー:
  - 特定のユーザーグループ向けに追加された認証プロバイダーです。
  - `https://xxxxxx.cloudfront.net/login/{signinPath}` のように、各プロバイダーに割り当てられた特定のパスでアクセスした場合に使用されます。

## 前提

- SAML認証プロバイダーがCognitoに事前に設定されていること

## 認証プロバイダーの設定

認証プロバイダーは、デプロイ時の環境変数によって設定されます。

- プライマリプロバイダー: `samlCognitoFederatedIdentityPrimaryProviderName`
- 追加プロバイダー: `samlCognitoFederatedIdentityAdditionalProviderNames`

### 設定例

以下に設定例を示します。

```
samlCognitoFederatedIdentityPrimaryProviderName: 'entra-id'
samlCognitoFederatedIdentityAdditionalProviderNames: [
	{
		'providerName': 'admin-team-entra-id',
		'signinPath': 'admin'
	},
	{
		'providerName': 'my-team-entra-id',
		'signinPath': 'myteam'
	},
]
```

この例では、`entra-id` がプライマリプロバイダーとして設定されています。
また、`admin-team-entra-id` と `my-team-entra-id` が追加プロバイダーとして設定されており、それぞれ `admin` と `myteam` という `signinPath` が割り当てられています。

---

## ユーザーの認証フロー

利用する IdP に応じて、ユーザーのアクセス方法が異なります。

### プライマリプロバイダーを利用する場合

1.  アプリケーションのメイン URL（例: `https://xxxxxx.cloudfront.net/`）にアクセスします。
2.  自動的にプライマリプロバイダー（例: `entra-id`）の認証画面にリダイレクトされます。
3.  認証が成功すると、アプリケーションにログインできます。

### 追加プロバイダーを利用する場合

1.  自身に割り当てられた `signinPath` を含む URL にアクセスします。
    - **例1 (`admin` ユーザー):** `https://xxxxxx.cloudfront.net/login/admin`
    - **例2 (`myteam` ユーザー):** `https://xxxxxx.cloudfront.net/login/myteam`
2.  アクセスした URL に対応する追加プロバイダー（例: `admin-team-entra-id`）の認証画面にリダイレクトされます。
3.  認証が成功すると、アプリケーションにログインできます。

**補足:** 既に認証済みのユーザーが上記のログイン用 URL にアクセスした場合、IdP での再認証は行われず、アプリケーションのトップページ (`/`) にリダイレクトされます。

---

## トラブルシューティング

認証時に問題が発生した場合、以下の点を確認してください。

### 「認証プロバイダーが見つかりません」というエラーが表示される

- **原因:**
  アクセスしている URL のパス（`/login/`以降）が、システムに設定されているどの `signinPath` とも一致しないことが原因です。

- **解決策:**
  - URL に誤字がないか確認してください。
  - 管理者から指定された、チーム用の正しいログイン URL を使用してください。

### プライマリプロバイダーの認証画面にリダイレクトされ、認証に失敗する

- **原因:**
  追加プロバイダーを利用するユーザーが、認証情報の有効期限が切れた状態で、ログイン URL 以外のページ（例: アプリの個別ページ）に直接アクセスした場合にこの現象が発生します。

- **解決策:**
  ご自身の IdP に対応したログイン URL（`https://xxxxxx.cloudfront.net/login/{signinPath}`）にアクセスし、再認証を行ってください。再認証後は、各ページへ直接アクセスできるようになります。
