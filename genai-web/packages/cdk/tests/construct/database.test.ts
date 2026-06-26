import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, test } from 'vitest';
import { Database } from '../../lib/construct/database';

describe('Database Construct', () => {
  test('removalPolicy=DESTROY applied correctly', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const key = new kms.Key(stack, 'Key');

    new Database(stack, 'Database', {
      encryptionKey: key,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const template = Template.fromStack(stack);
    const tables = template.findResources('AWS::DynamoDB::Table');
    const tableLogicalIds = Object.keys(tables);

    expect(tableLogicalIds.length).toBeGreaterThan(0);

    // Check that the table has DeletionPolicy set to Delete
    const tableResource = template.toJSON().Resources[tableLogicalIds[0]];
    expect(tableResource.DeletionPolicy).toBe('Delete');
  });

  test('removalPolicy=RETAIN applied correctly', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const key = new kms.Key(stack, 'Key');

    new Database(stack, 'Database', {
      encryptionKey: key,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const template = Template.fromStack(stack);
    const tables = template.findResources('AWS::DynamoDB::Table');
    const tableLogicalIds = Object.keys(tables);

    expect(tableLogicalIds.length).toBeGreaterThan(0);

    // Check that the table has DeletionPolicy set to Retain
    const tableResource = template.toJSON().Resources[tableLogicalIds[0]];
    expect(tableResource.DeletionPolicy).toBe('Retain');
  });

  test('default removalPolicy=DESTROY when not specified', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const key = new kms.Key(stack, 'Key');

    // Do not specify removalPolicy (should default to DESTROY)
    new Database(stack, 'Database', {
      encryptionKey: key,
    });

    const template = Template.fromStack(stack);
    const tables = template.findResources('AWS::DynamoDB::Table');
    const tableLogicalIds = Object.keys(tables);

    expect(tableLogicalIds.length).toBeGreaterThan(0);

    // Check that the table has DeletionPolicy set to Delete (default)
    const tableResource = template.toJSON().Resources[tableLogicalIds[0]];
    expect(tableResource.DeletionPolicy).toBe('Delete');
  });

  test('DatabaseProps interface accepts optional removalPolicy', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const key = new kms.Key(stack, 'Key');

    // Test that the interface accepts optional removalPolicy
    const propsWithPolicy = {
      encryptionKey: key,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    };

    const propsWithoutPolicy = {
      encryptionKey: key,
    };

    // Both should compile and create Database instances without errors
    new Database(stack, 'DatabaseWithPolicy', propsWithPolicy);
    new Database(stack, 'DatabaseWithoutPolicy', propsWithoutPolicy);

    const template = Template.fromStack(stack);
    const tables = template.findResources('AWS::DynamoDB::Table');

    // Verify both tables were created
    expect(Object.keys(tables).length).toBe(2);
  });
});
