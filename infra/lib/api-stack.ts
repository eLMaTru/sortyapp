import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
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

    // ─── Secrets ──────────────────────────────────────────────────────────────
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

    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: `${props.prefix}/jwt-secret`,
      description: 'JWT signing secret',
      generateSecretString: { excludePunctuation: true, passwordLength: 64 },
    });

    // ─── Shared environment variables ─────────────────────────────────────────
    const sharedEnv: Record<string, string> = {
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
    };

    // ─── Lambda helper ────────────────────────────────────────────────────────
    const handlersDir = path.join(__dirname, '../../apps/api/src/handlers');

    const createFn = (id: string, entry: string): lambdaNode.NodejsFunction => {
      return new lambdaNode.NodejsFunction(this, id, {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(handlersDir, entry),
        handler: 'handler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: ['@aws-sdk/*'],
          forceDockerBundling: false,
        },
        environment: sharedEnv,
      });
    };

    // ─── 5 Domain-specific Lambda functions ───────────────────────────────────
    const authFn = createFn('AuthHandler', 'auth.handler.ts');
    const drawsFn = createFn('DrawsHandler', 'draws.handler.ts');
    const walletFn = createFn('WalletHandler', 'wallet.handler.ts');
    const adminFn = createFn('AdminHandler', 'admin.handler.ts');
    const webhooksFn = createFn('WebhooksHandler', 'webhooks.handler.ts');

    // ─── Sweeper Lambda (EventBridge: finalize stuck COUNTDOWN draws) ─────────
    const sweeperFn = createFn('SweeperHandler', 'sweeper.handler.ts');

    new events.Rule(this, 'SweeperSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      targets: [new targets.LambdaFunction(sweeperFn)],
    });

    // ─── Per-Lambda DynamoDB permissions (least privilege) ────────────────────
    const grantRW = (fn: lambdaNode.NodejsFunction, tables: dynamodb.Table[]) => {
      tables.forEach((t) => t.grantReadWriteData(fn));
    };

    grantRW(authFn, [props.tables.users, props.tables.transactions]);
    grantRW(drawsFn, [props.tables.draws, props.tables.templates, props.tables.users, props.tables.transactions, props.tables.chatMessages]);
    grantRW(walletFn, [props.tables.users, props.tables.transactions, props.tables.withdrawals, props.tables.dailyDeposits]);
    grantRW(adminFn, Object.values(props.tables) as dynamodb.Table[]);
    grantRW(webhooksFn, [props.tables.users, props.tables.transactions]);
    grantRW(sweeperFn, [props.tables.draws, props.tables.templates, props.tables.users, props.tables.transactions]);

    // ─── SQS permissions ──────────────────────────────────────────────────────
    props.queues.emailQueue.grantSendMessages(drawsFn);
    props.queues.emailQueue.grantSendMessages(adminFn);
    props.queues.txVerificationQueue.grantSendMessages(webhooksFn);

    // ─── Secrets Manager permissions ──────────────────────────────────────────
    [authFn, drawsFn, walletFn, adminFn].forEach((fn) => jwtSecret.grantRead(fn));
    transakSecret.grantRead(webhooksFn);

    // ─── API Gateway ──────────────────────────────────────────────────────────
    const api = new apigateway.RestApi(this, 'SortyAppApi', {
      restApiName: `${props.prefix}-api`,
      deployOptions: { stageName: props.stage },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const authIntegration = new apigateway.LambdaIntegration(authFn);
    const drawsIntegration = new apigateway.LambdaIntegration(drawsFn);
    const walletIntegration = new apigateway.LambdaIntegration(walletFn);
    const adminIntegration = new apigateway.LambdaIntegration(adminFn);
    const webhooksIntegration = new apigateway.LambdaIntegration(webhooksFn);

    // /api
    const apiResource = api.root.addResource('api');

    // /api/health → auth-fn
    const healthResource = apiResource.addResource('health');
    healthResource.addMethod('GET', authIntegration);

    // /api/auth/{proxy+} → auth-fn
    const authResource = apiResource.addResource('auth');
    authResource.addProxy({ defaultIntegration: authIntegration, anyMethod: true });

    // /api/draws → GET draws-fn (root route lists draws)
    // /api/draws/{proxy+} → draws-fn (templates, :drawId, join)
    const drawsResource = apiResource.addResource('draws');
    drawsResource.addMethod('GET', drawsIntegration);
    drawsResource.addProxy({ defaultIntegration: drawsIntegration, anyMethod: true });

    // /api/wallet/{proxy+} → wallet-fn
    const walletResource = apiResource.addResource('wallet');
    walletResource.addProxy({ defaultIntegration: walletIntegration, anyMethod: true });

    // /api/admin/{proxy+} → admin-fn
    const adminResource = apiResource.addResource('admin');
    adminResource.addProxy({ defaultIntegration: adminIntegration, anyMethod: true });

    // /api/webhooks/{proxy+} → webhooks-fn
    const webhooksResource = apiResource.addResource('webhooks');
    webhooksResource.addProxy({ defaultIntegration: webhooksIntegration, anyMethod: true });

    this.apiUrl = api.url;

    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url });
  }
}
