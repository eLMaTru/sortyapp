// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = 'USER' | 'ADMIN';
export type WalletMode = 'DEMO' | 'REAL';

export interface User {
  userId: string;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  referralCode: string;
  referredBy?: string;
  firstRealDeposit: boolean;
  demoBalance: number;
  realBalance: number;
  walletAddress?: string; // Polygon address for withdrawals
  savedPaymentDetails?: Record<string, WithdrawalPaymentDetails>;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  referralCode: string;
  demoBalance: number;
  realBalance: number;
  walletAddress?: string;
  savedPaymentDetails?: Record<string, WithdrawalPaymentDetails>;
  createdAt: string;
}

// ─── Transactions ────────────────────────────────────────────────────────────
export type TransactionType =
  | 'DEMO_GRANT'
  | 'DEPOSIT'
  | 'DRAW_ENTRY'
  | 'DRAW_WIN'
  | 'DRAW_FEE'
  | 'DRAW_REFUND'
  | 'WITHDRAWAL'
  | 'WITHDRAWAL_FEE'
  | 'REFERRAL_BONUS';

export interface Transaction {
  transactionId: string;
  userId: string;
  walletMode: WalletMode;
  type: TransactionType;
  amount: number; // positive = credit, negative = debit
  balanceAfter: number;
  referenceId?: string; // drawId, withdrawalId, etc.
  description: string;
  createdAt: string;
}

// ─── Draws ───────────────────────────────────────────────────────────────────
export type DrawStatus = 'OPEN' | 'FULL' | 'COUNTDOWN' | 'RUNNING' | 'COMPLETED' | 'EXPIRED';

export interface Draw {
  drawId: string;
  templateId: string;
  totalSlots: number;
  entryCredits: number;
  entryDollars: number;
  feePercent: number;
  mode: WalletMode;
  status: DrawStatus;
  participants: string[]; // userIds
  participantUsernames: Record<string, string>;
  filledSlots: number;
  pool: number;
  fee: number;
  prize: number;
  winnerId?: string;
  winnerUsername?: string;
  serverSeed?: string;
  publicSeed?: string;
  commitHash?: string;
  revealedServerSeed?: string;
  contractSnapshot?: DrawContract;
  countdownEndsAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrawContract {
  drawId: string;
  templateId: string;
  totalSlots: number;
  entryCredits: number;
  feePercent: number;
  mode: WalletMode;
  participants: string[];
  participantUsernames: Record<string, string>;
  pool: number;
  fee: number;
  prize: number;
  commitHash: string;
  publicSeed: string;
  revealedServerSeed: string;
  winnerId: string;
  winnerUsername: string;
  createdAt: string;
  completedAt: string;
}

// ─── Draw Templates ──────────────────────────────────────────────────────────
export interface DrawTemplate {
  templateId: string;
  slots: number;
  entryDollars: number;
  entryCredits: number;
  feePercent: number;
  enabled: boolean;
  requiresDeposit: boolean; // $1 rooms require prior real deposit
  createdAt: string;
}

// ─── Withdrawals ─────────────────────────────────────────────────────────────
export type WithdrawalStatus = 'PENDING' | 'SENT' | 'COMPLETED';
export type WithdrawalMethod = 'POLYGON' | 'BINANCE' | 'PAYPAL' | 'BANK_POPULAR' | 'BANK_BHD';

export interface WithdrawalPaymentDetails {
  binancePayId?: string;
  paypalEmail?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export interface Withdrawal {
  withdrawalId: string;
  userId: string;
  method: WithdrawalMethod;
  amountCredits: number;
  amountUSDC: number;
  feeUSDC: number;
  netUSDC: number;
  status: WithdrawalStatus;
  txHash?: string;
  walletAddress?: string;       // for POLYGON method
  paymentDetails?: WithdrawalPaymentDetails; // for non-POLYGON methods
  createdAt: string;
  updatedAt: string;
}

// ─── Daily Deposit Tracking ──────────────────────────────────────────────────
export interface DailyDeposit {
  userId: string;
  date: string; // YYYY-MM-DD
  totalCredits: number;
}

// ─── Chat Messages ──────────────────────────────────────────────────────────
export interface ChatMessage {
  drawId: string;
  messageId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  expiresAt: number; // TTL epoch seconds
}

// ─── Rankings ───────────────────────────────────────────────────────────────
export interface RankingEntry {
  userId: string;
  username: string;
  wins: number;
  participations: number;
  winRate: number; // percentage
  totalWinnings: number; // credits
}

// ─── Admin Metrics ──────────────────────────────────────────────────────────
export interface AdminMetrics {
  mode?: WalletMode;
  totalUsers: number;
  totalDrawsCompleted: number;
  totalDrawsOpen: number;
  totalSCSpent: number;
  totalFeeSC: number;
  totalWithdrawalsPending: number;
  totalWithdrawalsSent: number;
  recentDraws: number; // last 24h
  recentUsers: number; // last 24h
}

// ─── Deposit Requests (Manual Recharge) ─────────────────────────────────────
export type DepositMethod = 'BINANCE' | 'PAYPAL' | 'BANK_POPULAR' | 'BANK_BHD';
export type DepositRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface DepositMethodInfo {
  method: DepositMethod;
  label: string;
  instructions: string;
  fields: string[]; // what user should provide as reference
  currency?: 'USD' | 'DOP'; // DOP = Dominican Peso, needs exchange rate
}

export interface DepositRequest {
  depositRequestId: string;
  userId: string;
  username: string;
  method: DepositMethod;
  amountUSDC: number;
  amountCredits: number;
  code: string;           // unique code e.g. DEP-A3F2 for payment memo
  reference?: string;     // user-provided: tx hash, confirmation #, etc.
  status: DepositRequestStatus;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

// ─── API Response Envelope ───────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: UserPublic;
}
