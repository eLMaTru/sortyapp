// Credit conversion
export const CREDITS_PER_USDC = 100;

// Demo wallet
export const DEMO_INITIAL_CREDITS = 10000;

// Deposit limits (defaults, overridable via env)
export const MIN_DEPOSIT_CREDITS = 1000;   // $10
export const MAX_DAILY_DEPOSIT_CREDITS = 30000; // $300/day

// Withdrawal
export const MIN_WITHDRAWAL_CREDITS = 1000; // $10
export const WITHDRAWAL_FEE_PERCENT = 1;

// Draw
export const DRAW_FEE_PERCENT = 10;
export const COUNTDOWN_SECONDS = 5;

// Chat
export const CHAT_MAX_MESSAGES_PER_USER = 5;
export const CHAT_COOLDOWN_SECONDS = 5;
export const CHAT_MAX_LENGTH = 140;
export const CHAT_TTL_AFTER_COMPLETED_MINUTES = 5;

// Manual deposit limits
export const MIN_DEPOSIT_USDC = 5;
export const MAX_DEPOSIT_USDC = 100;
export const MAX_DAILY_DEPOSIT_USDC = 300;
export const DEPOSIT_EXPIRY_HOURS = 48;

// Deposit method info (dummy data for now)
export const DEPOSIT_METHODS = [
  {
    method: 'BINANCE' as const,
    label: 'Binance (USDC/USDT)',
    instructions: 'Send USDC or USDT to the following Binance Pay ID: 123456789. Include the deposit code in the memo.',
    fields: ['Transaction ID'],
  },
  {
    method: 'ZELLE' as const,
    label: 'Zelle (USA)',
    instructions: 'Send payment via Zelle to: payments@sortyapp.com. Include the deposit code in the note.',
    fields: ['Confirmation number'],
  },
  {
    method: 'BANK_RD' as const,
    label: 'Transferencia Bancaria (RD)',
    instructions: 'Transferir a Banco Popular, Cuenta: 123-456789-0, a nombre de SORTYAPP SRL. Incluir el código de depósito en la descripción.',
    fields: ['Número de referencia'],
  },
] as const;

// Referral
export const REFERRAL_BONUS_CREDITS = 500; // $5

// Draw template definitions for MVP
export const MVP_TEMPLATES = [
  { slots: 5, entryDollars: 1, requiresDeposit: true },
  { slots: 5, entryDollars: 5, requiresDeposit: false },
  { slots: 5, entryDollars: 10, requiresDeposit: false },
  { slots: 5, entryDollars: 25, requiresDeposit: false },
  { slots: 10, entryDollars: 1, requiresDeposit: true },
  { slots: 10, entryDollars: 5, requiresDeposit: false },
  { slots: 10, entryDollars: 10, requiresDeposit: false },
  { slots: 10, entryDollars: 25, requiresDeposit: false },
] as const;

// Table name helpers
export const tableNames = (prefix: string) => ({
  users: `${prefix}-users`,
  draws: `${prefix}-draws`,
  transactions: `${prefix}-transactions`,
  withdrawals: `${prefix}-withdrawals`,
  templates: `${prefix}-templates`,
  dailyDeposits: `${prefix}-daily-deposits`,
  chatMessages: `${prefix}-chat-messages`,
  cache: `${prefix}-cache`,
  depositRequests: `${prefix}-deposit-requests`,
});
