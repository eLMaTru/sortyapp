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
export type DrawStatus = 'OPEN' | 'FULL' | 'COUNTDOWN' | 'RUNNING' | 'COMPLETED';

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

export interface Withdrawal {
  withdrawalId: string;
  userId: string;
  amountCredits: number;
  amountUSDC: number;
  feeUSDC: number;
  netUSDC: number;
  status: WithdrawalStatus;
  txHash?: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Daily Deposit Tracking ──────────────────────────────────────────────────
export interface DailyDeposit {
  userId: string;
  date: string; // YYYY-MM-DD
  totalCredits: number;
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
