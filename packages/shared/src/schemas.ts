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
  amountCredits: z.number().int().positive(),
  walletAddress: z.string().regex(evmAddressRegex, 'Invalid Polygon wallet address (must be 0x + 40 hex characters)'),
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
  method: z.enum(['BINANCE', 'ZELLE', 'BANK_RD']),
  amountUSDC: z.number().min(5).max(100),
  reference: z.string().max(200).optional(),
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
