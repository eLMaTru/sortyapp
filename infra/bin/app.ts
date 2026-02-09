#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack';
import { MessagingStack } from '../lib/messaging-stack';
import { ApiStack } from '../lib/api-stack';
// import { WebStack } from '../lib/web-stack'; // Enable when static export is configured

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') || 'dev';
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const prefix = `${stage}-sortyapp`;

const database = new DatabaseStack(app, `${prefix}-database`, { env, stage, prefix });
const messaging = new MessagingStack(app, `${prefix}-messaging`, { env, stage, prefix });
new ApiStack(app, `${prefix}-api`, {
  env,
  stage,
  prefix,
  tables: database.tables,
  queues: messaging.queues,
  eventBus: messaging.eventBus,
});
// Uncomment when web static export is ready:
// new WebStack(app, `${prefix}-web`, { env, stage, prefix, apiUrl: api.apiUrl });
