#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getParams } from '../parameter';
import { createStacks } from '../lib/create-stacks';

const app = new cdk.App();
const params = getParams(app);
// Tag all resources with environment name for cost allocation
cdk.Tags.of(app).add('Environment', params.appEnv ?? 'default');
createStacks(app, params);
