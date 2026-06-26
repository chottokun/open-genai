import { describe, expect, test } from 'vitest';
import { stackInputSchema } from '../lib/stack-input';

describe('StackInput databaseRemovalPolicy', () => {
  const baseParams = {
    account: '123456789012',
    region: 'ap-northeast-1',
    env: '-test',
    appEnv: 'test',
    allowedSignUpEmailDomains: null,
    allowedIpV4AddressRanges: null,
    allowedIpV6AddressRanges: null,
  };

  test('accepts DESTROY value', () => {
    const input = {
      ...baseParams,
      databaseRemovalPolicy: 'DESTROY',
    };
    const result = stackInputSchema.parse(input);
    expect(result.databaseRemovalPolicy).toBe('DESTROY');
  });

  test('accepts RETAIN value', () => {
    const input = {
      ...baseParams,
      databaseRemovalPolicy: 'RETAIN',
    };
    const result = stackInputSchema.parse(input);
    expect(result.databaseRemovalPolicy).toBe('RETAIN');
  });

  test('rejects invalid value', () => {
    const input = {
      ...baseParams,
      databaseRemovalPolicy: 'DELETE', // Invalid value
    };
    expect(() => stackInputSchema.parse(input)).toThrow();
  });

  test('applies default DESTROY when not specified', () => {
    const input = {
      ...baseParams,
      // databaseRemovalPolicy is omitted
    };
    const result = stackInputSchema.parse(input);
    expect(result.databaseRemovalPolicy).toBe('DESTROY');
  });
});

describe('StackInput SAML validation', () => {
  const baseParams = {
    account: '123456789012',
    region: 'ap-northeast-1',
    env: '-test',
    appEnv: 'test',
    allowedSignUpEmailDomains: null,
    allowedIpV4AddressRanges: null,
    allowedIpV6AddressRanges: null,
  };

  test('rejects samlAuthEnabled=true without primaryProviderName', () => {
    const input = {
      ...baseParams,
      samlAuthEnabled: true,
    };
    expect(() => stackInputSchema.parse(input)).toThrow(
      'samlCognitoFederatedIdentityPrimaryProviderName is required when samlAuthEnabled is true',
    );
  });

  test('rejects samlAuthEnabled=true with empty string primaryProviderName', () => {
    const input = {
      ...baseParams,
      samlAuthEnabled: true,
      samlCognitoFederatedIdentityPrimaryProviderName: '',
    };
    expect(() => stackInputSchema.parse(input)).toThrow(
      'samlCognitoFederatedIdentityPrimaryProviderName is required when samlAuthEnabled is true',
    );
  });

  test('accepts samlAuthEnabled=true with primaryProviderName', () => {
    const input = {
      ...baseParams,
      samlAuthEnabled: true,
      samlCognitoFederatedIdentityPrimaryProviderName: 'EntraID',
    };
    const result = stackInputSchema.parse(input);
    expect(result.samlAuthEnabled).toBe(true);
    expect(result.samlCognitoFederatedIdentityPrimaryProviderName).toBe('EntraID');
  });

  test('accepts samlAuthEnabled=false without primaryProviderName', () => {
    const input = {
      ...baseParams,
      samlAuthEnabled: false,
    };
    const result = stackInputSchema.parse(input);
    expect(result.samlAuthEnabled).toBe(false);
  });
});
