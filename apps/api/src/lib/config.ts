import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  stage: process.env.STAGE || 'dev',
  port: parseInt(process.env.API_PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    dynamoEndpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  },

  tablePrefix: process.env.TABLE_PREFIX || 'dev-sortyapp',

  sesFromEmail: process.env.SES_FROM_EMAIL || 'noreply@sortyapp.com',

  referralBonusCredits: parseInt(process.env.REFERRAL_BONUS_CREDITS || '500', 10),
  minDepositCredits: parseInt(process.env.MIN_DEPOSIT_CREDITS || '1000', 10),
  maxDailyDepositCredits: parseInt(process.env.MAX_DAILY_DEPOSIT_CREDITS || '30000', 10),
  minWithdrawalCredits: parseInt(process.env.MIN_WITHDRAWAL_CREDITS || '1000', 10),
  withdrawalFeePercent: parseFloat(process.env.WITHDRAWAL_FEE_PERCENT || '1'),
};
