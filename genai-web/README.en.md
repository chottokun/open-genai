[日本語](README.md) | English

# GENAI Web (AI Interface)

## Overview

GENAI is a generative AI utilization platform developed and operated by the Digital Agency of Japan. It provides an environment in which government employees can quickly, securely, and easily use generative AI applications tailored to their work.

This project is based on the open-source [Generative AI Use Cases (GenU)](https://github.com/aws-samples/generative-ai-use-cases) by Amazon Web Services (AWS), with the following modifications and additional features:

- Team management feature
- AI application management feature
- Ability to add and run generative AI applications built as external microservices
- Application of the [Digital Agency Design System](https://design.digital.go.jp/)
- Accessibility testing conducted by the in-house accessibility team
  - Some accessibility issues remain in the parameter adjustment feature shown after image generation on the image generation page
  - Other pages may also have remaining accessibility issues
- Addition of features required for operations (monitoring, etc.) and substantial changes to the codebase

Note that development is being carried out independently from GenU, and the feature set differs from GenU.

For detailed background and concept, please refer to the [Government AI: Introduction to the Concept of Project "GENAI" - Digital Agency note article](https://digital-gov.note.jp/n/ndc07326b7491) (in Japanese).

## Documentation

### Setup

> Note: Currently, the documentation is only available in Japanese. We are planning to provide English documentation in the near future. Please refer to the Japanese documentation for now.

Please follow the steps in order.

- [Prerequisites](./docs/事前準備.md)
- [Deployment Guide](./docs/デプロイ手順.md)
- [Account Registration](./docs/アカウント登録.md)
- [System Administrator Setup Guide](./docs/システム管理者設定手順.md)
- [Common Application Team Registration](./docs/共通アプリチームの登録.md)

### AI Applications

- [Types of AI Applications](./docs/AIアプリの種類.md)
- [AI Application Registration Guide](./docs/AIアプリ登録手順書.md)
- [AI Application Development Guide](./docs/AIアプリ開発ガイド.md)
- [AI Application API Specification](./docs/AIアプリAPI仕様.md)

### Operations

- [Logging Configuration](./docs/ログ設定.md)
- [CI/CD Configuration](./docs/CI-CD設定.md)
- [Custom Domain Configuration](./docs/カスタムドメイン設定.md)

### Authentication

- [SAML Authentication Guide](./docs/SAML認証手順.md)

### Development

- [Local Development Environment](./docs/ローカル開発環境.md)

### Reference

- [Team Management Permissions Table](./docs/チーム管理権限表.md)
- [Architecture](./docs/アーキテクチャ.md)

## Issue / Pull Request Policy

This repository accepts issue reports only for critical problems that affect the stable operation of services. We do not accept pull requests.

### Issues

#### What to report

- Bugs that cause data loss or corruption
- Failures that make the service unavailable
- Issues related to violations of laws or regulations (e.g., unintended exposure of personal information)
- Critical accessibility barriers (cases where specific users are completely unable to use the service, judged against criteria equivalent to JIS X 8341-3:2016 conformance level AA)

#### What not to report

Please refrain from reporting the following as issues.  
Issues that do not match the template may be closed.

- Requests or proposals for new features
- Minor display glitches or typos
- Performance improvement proposals
- Comments on coding style
- Questions or usage inquiries

### Response policy

- Issues will be addressed based on internal priority assessment
- We cannot guarantee that all issues will be addressed
- We do not provide individual responses to inquiries about issue status
- For issues deemed critical, we will provide status updates on the issue page when possible

## Vulnerability Reporting

To report security vulnerabilities, please visit https://github.com/digital-go-jp/genai-web/security.

## Community Guidelines

This repository (source code and documentation) is created and published by the Digital Agency, Government of Japan.  
As a public resource, it is openly available to all members of the OSS community. Therefore, the following actions are prohibited:

- Actions that support or exclude specific ideologies, organizations, or companies
- Political, religious, or discriminatory statements
- Handling personal information or sensitive information in the repository
- Disclosing vulnerability details to third parties without prior reporting and approval from the Digital Agency when security vulnerabilities are discovered
- Modifying the source code for the purpose of attacking other systems

## Related Links

- [Government AI: Introduction to the Concept of Project "GENAI" - Digital Agency note article](https://digital-gov.note.jp/n/ndc07326b7491) (in Japanese)

## License

- Software: Licensed under the [MIT License](LICENSE).
  - Some Lambda and CDK files created through the AWS Prototyping Program are subject to the [Amazon Software License (ASL)](https://aws.amazon.com/asl/).
  - See [ASL対象ファイル.md](./docs/ASL対象ファイル.md) for the list of applicable files.
- Documentation: Licensed under the [Creative Commons Attribution 4.0 International License](LICENSE-CC-BY) (CC BY 4.0).
