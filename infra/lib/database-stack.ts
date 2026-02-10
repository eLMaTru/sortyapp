import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  stage: string;
  prefix: string;
}

export interface Tables {
  users: dynamodb.Table;
  draws: dynamodb.Table;
  transactions: dynamodb.Table;
  withdrawals: dynamodb.Table;
  templates: dynamodb.Table;
  dailyDeposits: dynamodb.Table;
  chatMessages: dynamodb.Table;
  cache: dynamodb.Table;
}

export class DatabaseStack extends cdk.Stack {
  public readonly tables: Tables;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const removalPolicy = props.stage === 'prod'
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    const billing = props.stage === 'prod'
      ? dynamodb.BillingMode.PAY_PER_REQUEST
      : dynamodb.BillingMode.PAY_PER_REQUEST;

    // Users
    const users = new dynamodb.Table(this, 'Users', {
      tableName: `${props.prefix}-users`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: billing,
      removalPolicy,
    });
    users.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });
    users.addGlobalSecondaryIndex({
      indexName: 'username-index',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
    });
    users.addGlobalSecondaryIndex({
      indexName: 'referralCode-index',
      partitionKey: { name: 'referralCode', type: dynamodb.AttributeType.STRING },
    });

    // Draws
    const draws = new dynamodb.Table(this, 'Draws', {
      tableName: `${props.prefix}-draws`,
      partitionKey: { name: 'drawId', type: dynamodb.AttributeType.STRING },
      billingMode: billing,
      removalPolicy,
    });
    draws.addGlobalSecondaryIndex({
      indexName: 'modeStatus-index',
      partitionKey: { name: 'mode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    });
    draws.addGlobalSecondaryIndex({
      indexName: 'templateMode-index',
      partitionKey: { name: 'templateId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'mode', type: dynamodb.AttributeType.STRING },
    });

    // Transactions
    const transactions = new dynamodb.Table(this, 'Transactions', {
      tableName: `${props.prefix}-transactions`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'transactionId', type: dynamodb.AttributeType.STRING },
      billingMode: billing,
      removalPolicy,
    });

    // Withdrawals
    const withdrawals = new dynamodb.Table(this, 'Withdrawals', {
      tableName: `${props.prefix}-withdrawals`,
      partitionKey: { name: 'withdrawalId', type: dynamodb.AttributeType.STRING },
      billingMode: billing,
      removalPolicy,
    });
    withdrawals.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });
    withdrawals.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    });

    // Templates
    const templates = new dynamodb.Table(this, 'Templates', {
      tableName: `${props.prefix}-templates`,
      partitionKey: { name: 'templateId', type: dynamodb.AttributeType.STRING },
      billingMode: billing,
      removalPolicy,
    });

    // Daily Deposits
    const dailyDeposits = new dynamodb.Table(this, 'DailyDeposits', {
      tableName: `${props.prefix}-daily-deposits`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      billingMode: billing,
      removalPolicy,
    });

    // Chat Messages (TTL-enabled for auto-cleanup)
    const chatMessages = new dynamodb.Table(this, 'ChatMessages', {
      tableName: `${props.prefix}-chat-messages`,
      partitionKey: { name: 'drawId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: billing,
      removalPolicy,
      timeToLiveAttribute: 'expiresAt',
    });

    // Cache table (pre-computed rankings, metrics, etc.)
    const cache = new dynamodb.Table(this, 'Cache', {
      tableName: `${props.prefix}-cache`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: billing,
      removalPolicy,
      timeToLiveAttribute: 'expiresAt',
    });

    this.tables = { users, draws, transactions, withdrawals, templates, dailyDeposits, chatMessages, cache };
  }
}
