import { CreateTableCommand, DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { config } from '../lib/config';
import { tables } from '../lib/dynamo';

const client = new DynamoDBClient({
  region: config.aws.region,
  ...(config.aws.dynamoEndpoint && {
    endpoint: config.aws.dynamoEndpoint,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  }),
});

const tableDefs = [
  {
    TableName: tables.users,
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' as const }],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'email', AttributeType: 'S' as const },
      { AttributeName: 'username', AttributeType: 'S' as const },
      { AttributeName: 'referralCode', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' as const }],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'username-index',
        KeySchema: [{ AttributeName: 'username', KeyType: 'HASH' as const }],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'referralCode-index',
        KeySchema: [{ AttributeName: 'referralCode', KeyType: 'HASH' as const }],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: tables.draws,
    KeySchema: [{ AttributeName: 'drawId', KeyType: 'HASH' as const }],
    AttributeDefinitions: [
      { AttributeName: 'drawId', AttributeType: 'S' as const },
      { AttributeName: 'mode', AttributeType: 'S' as const },
      { AttributeName: 'status', AttributeType: 'S' as const },
      { AttributeName: 'templateId', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'modeStatus-index',
        KeySchema: [
          { AttributeName: 'mode', KeyType: 'HASH' as const },
          { AttributeName: 'status', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'templateMode-index',
        KeySchema: [
          { AttributeName: 'templateId', KeyType: 'HASH' as const },
          { AttributeName: 'mode', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: tables.transactions,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' as const },
      { AttributeName: 'transactionId', KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'transactionId', AttributeType: 'S' as const },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: tables.withdrawals,
    KeySchema: [{ AttributeName: 'withdrawalId', KeyType: 'HASH' as const }],
    AttributeDefinitions: [
      { AttributeName: 'withdrawalId', AttributeType: 'S' as const },
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'status', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-index',
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' as const }],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'status-index',
        KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' as const }],
        Projection: { ProjectionType: 'ALL' as const },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: tables.templates,
    KeySchema: [{ AttributeName: 'templateId', KeyType: 'HASH' as const }],
    AttributeDefinitions: [
      { AttributeName: 'templateId', AttributeType: 'S' as const },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: tables.dailyDeposits,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' as const },
      { AttributeName: 'date', KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'date', AttributeType: 'S' as const },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
];

async function createTables() {
  const existing = await client.send(new ListTablesCommand({}));
  const existingNames = new Set(existing.TableNames || []);

  for (const def of tableDefs) {
    if (existingNames.has(def.TableName)) {
      console.log(`[SKIP] Table ${def.TableName} already exists`);
      continue;
    }
    await client.send(new CreateTableCommand(def));
    console.log(`[CREATED] Table ${def.TableName}`);
  }

  console.log('\nAll tables ready.');
}

createTables().catch((err) => {
  console.error('Failed to create tables:', err);
  process.exit(1);
});
