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

// Deposit method info
export const DEPOSIT_METHODS = [
  {
    method: 'BINANCE' as const,
    label: 'Binance Pay (USDC/USDT)',
    instructions: 'Envía USDC o USDT al siguiente Binance Pay ID. Incluye tu código de depósito en el memo/nota del pago.',
    fields: ['Transaction ID'],
    currency: 'USD' as const,
    binancePayId: '15121965',
    binanceUser: 'sortyapp-72e82',
  },
  {
    method: 'PAYPAL' as const,
    label: 'PayPal',
    instructions: 'Envía el pago a la cuenta de PayPal. Incluye tu código de depósito en la nota del pago.',
    fields: ['Transaction ID'],
    currency: 'USD' as const,
    paypalEmail: 'elmatru@hotmail.es',
  },
  {
    method: 'BANK_POPULAR' as const,
    label: 'Banco Popular (RD)',
    instructions: 'Transferir a la cuenta de ahorro del Banco Popular. Incluir el código de depósito en la descripción.',
    fields: ['Número de referencia'],
    currency: 'DOP' as const,
    accountNumber: '804042893',
    accountType: 'Cuenta de Ahorro',
    bankName: 'Banco Popular Dominicano',
  },
  {
    method: 'BANK_BHD' as const,
    label: 'Banco BHD (RD)',
    instructions: 'Transferir a la cuenta de ahorro del Banco BHD. Incluir el código de depósito en la descripción.',
    fields: ['Número de referencia'],
    currency: 'DOP' as const,
    accountNumber: '11947210013',
    accountType: 'Cuenta de Ahorro',
    bankName: 'Banco BHD',
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
