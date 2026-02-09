import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { tableNames } from '@sortyapp/shared';
import { config } from './config';

const client = new DynamoDBClient({
  region: config.aws.region,
  ...(config.aws.dynamoEndpoint && {
    endpoint: config.aws.dynamoEndpoint,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  }),
});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const tables = tableNames(config.tablePrefix);
