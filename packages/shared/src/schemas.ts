import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric and underscores only'),
  password: z.string().min(8).max(128),
  referralCode: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Wallet ──────────────────────────────────────────────────────────────────
/** Validates a Polygon/EVM wallet address: 0x + 40 hex characters */
const evmAddressRegex = /^0x[0-9a-fA-F]{40}$/;

export const SimulateDepositSchema = z.object({
  userId: z.string().uuid(),
  amountCredits: z.number().int().positive(),
});

export const WithdrawalRequestSchema = z.object({
  method: z.enum(['POLYGON', 'BINANCE', 'PAYPAL', 'BANK_POPULAR', 'BANK_BHD']),
  amountCredits: z.number().int().positive(),
  walletAddress: z.string().optional(),
  binancePayId: z.string().optional(),
  paypalEmail: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
}).superRefine((data, ctx) => {
  switch (data.method) {
    case 'POLYGON':
      if (!data.walletAddress || !evmAddressRegex.test(data.walletAddress)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid Polygon wallet address (must be 0x + 40 hex characters)', path: ['walletAddress'] });
      }
      break;
    case 'BINANCE':
      if (!data.binancePayId?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Binance Pay ID is required', path: ['binancePayId'] });
      }
      break;
    case 'PAYPAL':
      if (!data.paypalEmail?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PayPal email is required', path: ['paypalEmail'] });
      }
      break;
    case 'BANK_POPULAR':
    case 'BANK_BHD':
      if (!data.accountNumber?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Account number is required', path: ['accountNumber'] });
      }
      if (!data.accountHolder?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Account holder name is required', path: ['accountHolder'] });
      }
      break;
  }
});

export const ApproveWithdrawalSchema = z.object({
  withdrawalId: z.string().uuid(),
  txHash: z.string().min(10),
});

// ─── Draws ───────────────────────────────────────────────────────────────────
export const JoinDrawSchema = z.object({
  drawId: z.string().uuid(),
});

export const CreateTemplateSchema = z.object({
  slots: z.number().int().min(2).max(100),
  entryDollars: z.number().positive(),
  requiresDeposit: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export const UpdateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  enabled: z.boolean().optional(),
  requiresDeposit: z.boolean().optional(),
});

// ─── Webhook (Transak placeholder) ──────────────────────────────────────────
export const TransakWebhookSchema = z.object({
  webhookData: z.object({
    id: z.string(),
    status: z.string(),
    cryptoAmount: z.number().optional(),
    walletAddress: z.string().optional(),
    transactionHash: z.string().optional(),
    network: z.string().optional(),
  }),
});

// ─── Chat ───────────────────────────────────────────────────────────────────
export const SendChatMessageSchema = z.object({
  content: z.string().min(1).max(140),
});

// ─── Deposit Requests (Manual Recharge) ─────────────────────────────────────
export const CreateDepositRequestSchema = z.object({
  method: z.enum(['BINANCE', 'PAYPAL', 'BANK_POPULAR', 'BANK_BHD']),
  amountUSDC: z.number().min(5).max(100),
  reference: z.string().max(200).optional(),
  code: z.string().max(20).optional(),
});

export const ReviewDepositRequestSchema = z.object({
  depositRequestId: z.string().uuid(),
  action: z.enum(['APPROVE', 'REJECT']),
  adminNote: z.string().max(500).optional(),
});

// ─── Query params ────────────────────────────────────────────────────────────
export const ListDrawsQuerySchema = z.object({
  mode: z.enum(['DEMO', 'REAL']),
  status: z.enum(['OPEN', 'FULL', 'COUNTDOWN', 'RUNNING', 'COMPLETED']).optional(),
});

export const UpdateWalletAddressSchema = z.object({
  walletAddress: z.string().regex(evmAddressRegex, 'Invalid Polygon wallet address (must be 0x + 40 hex characters)'),
});
