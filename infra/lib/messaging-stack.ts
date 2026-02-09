import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

interface MessagingStackProps extends cdk.StackProps {
  stage: string;
  prefix: string;
}

export interface Queues {
  emailQueue: sqs.Queue;
  txVerificationQueue: sqs.Queue;
}

export class MessagingStack extends cdk.Stack {
  public readonly queues: Queues;
  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: MessagingStackProps) {
    super(scope, id, props);

    // Email notification queue
    const emailDLQ = new sqs.Queue(this, 'EmailDLQ', {
      queueName: `${props.prefix}-email-dlq`,
      retentionPeriod: cdk.Duration.days(14),
    });
    const emailQueue = new sqs.Queue(this, 'EmailQueue', {
      queueName: `${props.prefix}-email-queue`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: { queue: emailDLQ, maxReceiveCount: 3 },
    });

    // Transaction verification queue (for future Transak integration)
    const txDLQ = new sqs.Queue(this, 'TxVerificationDLQ', {
      queueName: `${props.prefix}-tx-verification-dlq`,
      retentionPeriod: cdk.Duration.days(14),
    });
    const txVerificationQueue = new sqs.Queue(this, 'TxVerificationQueue', {
      queueName: `${props.prefix}-tx-verification-queue`,
      visibilityTimeout: cdk.Duration.seconds(120),
      deadLetterQueue: { queue: txDLQ, maxReceiveCount: 3 },
    });

    // EventBridge for draw countdown scheduling
    this.eventBus = new events.EventBus(this, 'DrawEventBus', {
      eventBusName: `${props.prefix}-draw-events`,
    });

    this.queues = { emailQueue, txVerificationQueue };
  }
}
