# ASL 対象ファイル

以下のファイルは AWS Prototyping Program により作成されたため、[Amazon Software License](https://aws.amazon.com/jp/asl/) の対象となります。  
ASL が適用されるファイルは AWS 以外ではご利用いただけませんので、ご注意ください。  
ASL の詳細については、[Amazon Software License](https://aws.amazon.com/jp/asl/) を参照してください。

- packages/cdk/lambda/createExApp.ts
- packages/cdk/lambda/deleteExApp.ts
- packages/cdk/lambda/deleteTeam.ts
- packages/cdk/lambda/deleteTeamUser.ts
- packages/cdk/lambda/listExApps.ts
- packages/cdk/lambda/listInvokeExAppHistories.ts
- packages/cdk/lambda/listTeamExApps.ts
- packages/cdk/lambda/listTeams.ts
- packages/cdk/lambda/listTeamUsers.ts
- packages/cdk/lambda/updateExApp.ts
- packages/cdk/lambda/updateTeam.ts
- packages/cdk/lambda/updateTeamUser.ts
- packages/cdk/lambda/repository/exAppRepository.ts
- packages/cdk/lambda/repository/teamRepository.ts
- packages/cdk/lambda/repository/teamUserRepository.ts
- packages/cdk/lib/construct/team-access-control.ts
- packages/cdk/lib/team-access-control-stack.ts

## 独自環境で源内を動かす場合

AWS 環境では、ASL 対象ファイルを含めて実行できます。  
非 AWS 環境では、上記の ASL 対象ファイルをそのまま実行することは、ライセンス上だけでなく技術的にも不可能であるため、該当箇所をご自身の環境に合わせて実装し直す必要があります。  
上記の ASL 対象ファイル以外には MIT ライセンスが適用されるため、改変・再配布・商用利用を行うことができます。