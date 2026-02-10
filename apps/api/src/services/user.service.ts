import { GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import {
  User,
  UserPublic,
  LoginResponse,
  DEMO_INITIAL_CREDITS,
  generateReferralCode,
  toPublicUser,
} from '@sortyapp/shared';
import { ddb, tables } from '../lib/dynamo';
import { config } from '../lib/config';
import { AppError } from '../middleware/error.middleware';
import { walletService } from './wallet.service';

class UserService {
  async register(email: string, username: string, password: string, referralCode?: string): Promise<LoginResponse> {
    // Check email uniqueness
    const existing = await this.findByEmail(email);
    if (existing) throw new AppError(409, 'Email already registered');

    // Check username uniqueness
    const existingUsername = await this.findByUsername(username);
    if (existingUsername) throw new AppError(409, 'Username already taken');

    // Validate referral code if provided
    let referrer: User | undefined;
    if (referralCode) {
      referrer = await this.findByReferralCode(referralCode);
      if (!referrer) throw new AppError(400, 'Invalid referral code');
    }

    const userId = uuid();
    const now = new Date().toISOString();

    const user: User = {
      userId,
      email: email.toLowerCase().trim(),
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'USER',
      referralCode: generateReferralCode(username),
      referredBy: referrer?.userId,
      firstRealDeposit: false,
      demoBalance: DEMO_INITIAL_CREDITS,
      realBalance: 0,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({
      TableName: tables.users,
      Item: user,
      ConditionExpression: 'attribute_not_exists(userId)',
    }));

    // Record demo grant transaction
    await walletService.recordTransaction({
      userId,
      walletMode: 'DEMO',
      type: 'DEMO_GRANT',
      amount: DEMO_INITIAL_CREDITS,
      balanceAfter: DEMO_INITIAL_CREDITS,
      description: 'Initial demo credits',
    });

    const token = this.signToken(user);
    return { token, user: toPublicUser(user) as UserPublic };
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.findByEmail(email.toLowerCase().trim());
    if (!user) throw new AppError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    const token = this.signToken(user);
    return { token, user: toPublicUser(user) as UserPublic };
  }

  async getById(userId: string): Promise<User | undefined> {
    const result = await ddb.send(new GetCommand({
      TableName: tables.users,
      Key: { userId },
    }));
    return result.Item as User | undefined;
  }

  async getPublicById(userId: string): Promise<UserPublic> {
    const user = await this.getById(userId);
    if (!user) throw new AppError(404, 'User not found');
    return toPublicUser(user) as UserPublic;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.users,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }));
    return result.Items?.[0] as User | undefined;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.users,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: { ':username': username },
      Limit: 1,
    }));
    return result.Items?.[0] as User | undefined;
  }

  async findByReferralCode(code: string): Promise<User | undefined> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.users,
      IndexName: 'referralCode-index',
      KeyConditionExpression: 'referralCode = :code',
      ExpressionAttributeValues: { ':code': code },
      Limit: 1,
    }));
    return result.Items?.[0] as User | undefined;
  }

  async listAll(): Promise<UserPublic[]> {
    const result = await ddb.send(new ScanCommand({ TableName: tables.users }));
    return (result.Items || []).map((u) => toPublicUser(u as User) as UserPublic);
  }

  async updateWalletAddress(userId: string, walletAddress: string): Promise<void> {
    await ddb.send(new UpdateCommand({
      TableName: tables.users,
      Key: { userId },
      UpdateExpression: 'SET walletAddress = :addr, updatedAt = :now',
      ExpressionAttributeValues: { ':addr': walletAddress, ':now': new Date().toISOString() },
    }));
  }

  private signToken(user: User): string {
    const payload = { userId: user.userId, email: user.email, role: user.role };
    // Cast needed: @types/jsonwebtoken uses branded StringValue type
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
  }
}

export const userService = new UserService();
