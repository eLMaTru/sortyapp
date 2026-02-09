import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { Tables } from './database-stack';
import { Queues } from './messaging-stack';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  stage: string;
  prefix: string;
  tables: Tables;
  queues: Queues;
  eventBus: events.EventBus;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Secrets Manager placeholder for future Transak keys
    const transakSecret = new secretsmanager.Secret(this, 'TransakSecret', {
      secretName: `${props.prefix}/transak`,
      description: 'Transak API keys and webhook secret (placeholder)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          apiKey: 'placeholder',
          webhookSecret: 'placeholder',
          walletAddress: 'placeholder',
        }),
        generateStringKey: 'dummy',
      },
    });

    // JWT Secret
    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: `${props.prefix}/jwt-secret`,
      description: 'JWT signing secret',
      generateSecretString: { excludePunctuation: true, passwordLength: 64 },
    });

    // Lambda function using NodejsFunction (auto-bundles with esbuild)
    const apiHandler = new lambdaNode.NodejsFunction(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../../apps/api/src/lambda.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
      },
      environment: {
        NODE_ENV: 'lambda',
        STAGE: props.stage,
        TABLE_PREFIX: props.prefix,
        JWT_SECRET: jwtSecret.secretValue.unsafeUnwrap(),
        SES_FROM_EMAIL: 'noreply@sortyapp.com',
        EMAIL_QUEUE_URL: props.queues.emailQueue.queueUrl,
        TX_VERIFICATION_QUEUE_URL: props.queues.txVerificationQueue.queueUrl,
        REFERRAL_BONUS_CREDITS: '500',
        MIN_DEPOSIT_CREDITS: '1000',
        MAX_DAILY_DEPOSIT_CREDITS: '30000',
        MIN_WITHDRAWAL_CREDITS: '1000',
        WITHDRAWAL_FEE_PERCENT: '1',
      },
    });

    // Grant DynamoDB access
    Object.values(props.tables).forEach((table) => {
      table.grantReadWriteData(apiHandler);
    });

    // Grant SQS access
    props.queues.emailQueue.grantSendMessages(apiHandler);
    props.queues.txVerificationQueue.grantSendMessages(apiHandler);

    // Grant Secrets Manager read
    transakSecret.grantRead(apiHandler);
    jwtSecret.grantRead(apiHandler);

    // API Gateway
    const api = new apigateway.RestApi(this, 'SortyAppApi', {
      restApiName: `${props.prefix}-api`,
      deployOptions: { stageName: props.stage },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Proxy all requests to Lambda
    api.root.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(apiHandler),
      anyMethod: true,
    });

    this.apiUrl = api.url;

    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url });
  }
}
