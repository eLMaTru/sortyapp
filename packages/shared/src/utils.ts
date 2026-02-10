import { createHash, randomBytes } from 'crypto';
import { CREDITS_PER_USDC } from './constants';

export function creditsToUSDC(credits: number): number {
  return Number((credits / CREDITS_PER_USDC).toFixed(2));
}

export function usdcToCredits(usdc: number): number {
  return Math.round(usdc * CREDITS_PER_USDC);
}

export function generateReferralCode(username: string): string {
  const suffix = randomBytes(2).toString('hex').toUpperCase();
  return `${username}-${suffix}`;
}

export function generateSeed(): string {
  return randomBytes(32).toString('hex');
}

export function computeCommitHash(serverSeed: string, publicSeed: string): string {
  return createHash('sha256').update(serverSeed + publicSeed).digest('hex');
}

export function selectWinnerIndex(serverSeed: string, publicSeed: string, drawId: string, totalParticipants: number): number {
  const hash = createHash('sha256').update(serverSeed + publicSeed + drawId).digest('hex');
  const value = parseInt(hash.substring(0, 8), 16);
  return value % totalParticipants;
}

export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function toPublicUser(user: {
  userId: string;
  email: string;
  username: string;
  role: string;
  referralCode: string;
  demoBalance: number;
  realBalance: number;
  walletAddress?: string;
  createdAt: string;
}) {
  return {
    userId: user.userId,
    email: user.email,
    username: user.username,
    role: user.role,
    referralCode: user.referralCode,
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt,
  };
}
