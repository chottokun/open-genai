import * as cdk from 'aws-cdk-lib';
import { preprocessContextValues, StackInput, stackInputSchema } from './lib/stack-input';

// CDK Context からパラメータを取得する場合
const getContext = (app: cdk.App): StackInput => {
  const rawContext = app.node.getAllContext();
  // コンテキスト値を適切な型にparseしてからvalidation
  const preprocessedContext = preprocessContextValues(rawContext);
  const params = stackInputSchema.parse(preprocessedContext);
  return params;
};

// デプロイ先環境ごとのパラメータを定義する
const deploy_envs: Record<string, Partial<StackInput>> = {
  // 開発環境のサンプルパラメータ
  // '-dev': {
  //   appEnv: 'dev',
  //   logLevel: 'INFO',
  //   allowedSignUpEmailDomains: ['example.co.jp'],
  //
  //   allowedIpV4AddressRanges: [
  //     '192.168.0.1/32', // 源内Webアプリへのアクセスを許すIPアドレス
  //     '192.168.0.2/32', // 源内Webアプリへのアクセスを許すIPアドレス
  //   ],
  // },
  // 他環境も必要に応じて定義を追加可能
};

// 後方互換性のため、CDK Context > parameter.ts の順でパラメータを取得する
export const getParams = (app: cdk.App): StackInput => {
  // デフォルトでは CDK Context からパラメータを取得する
  const params = getContext(app);

  // env が deploy_envs で定義したものにマッチした場合は、
  // deploy_envs のパラメータを context よりも優先して使用する
  const mergedEnv = {
    ...params,
    ...deploy_envs[params.env],
  };

  // zodでparameterのvalidationを実施
  const parsed_params = stackInputSchema.parse(mergedEnv);

  return parsed_params;
};
