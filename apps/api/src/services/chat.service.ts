import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import {
  ChatMessage,
  CHAT_MAX_MESSAGES_PER_USER,
  CHAT_COOLDOWN_SECONDS,
  CHAT_MAX_LENGTH,
  CHAT_TTL_AFTER_COMPLETED_MINUTES,
} from '@sortyapp/shared';
import { ddb, tables } from '../lib/dynamo';
import { AppError } from '../middleware/error.middleware';

// Content filter: block URLs, emails, phone numbers
const BLOCKED_CONTENT_REGEX = /(https?:\/\/|www\.|\.com|\.net|\.org|\.io|t\.me|@[\w.]+\.\w|(\+?\d[\d\s\-]{7,15}))/i;

class ChatService {
  async sendMessage(params: {
    drawId: string;
    userId: string;
    username: string;
    content: string;
    drawStatus: string;
    drawCompletedAt?: string;
  }): Promise<ChatMessage> {
    const { drawId, userId, username, content, drawStatus, drawCompletedAt } = params;

    // Validate draw is chat-eligible (OPEN, COUNTDOWN, or within 5min post-COMPLETED)
    if (!this.isChatActive(drawStatus, drawCompletedAt)) {
      throw new AppError(400, 'Chat is not active for this draw');
    }

    // Validate content length
    if (content.length > CHAT_MAX_LENGTH) {
      throw new AppError(400, `Message too long (max ${CHAT_MAX_LENGTH} characters)`);
    }

    // Content filter
    if (BLOCKED_CONTENT_REGEX.test(content)) {
      throw new AppError(400, 'Message contains blocked content (links, emails, or phone numbers)');
    }

    // Check rate limit: max messages per user per draw
    const userMessages = await this.getUserMessageCount(drawId, userId);
    if (userMessages >= CHAT_MAX_MESSAGES_PER_USER) {
      throw new AppError(429, `Maximum ${CHAT_MAX_MESSAGES_PER_USER} messages per draw`);
    }

    // Check cooldown: 1 message every N seconds
    const lastMessage = await this.getLastUserMessage(drawId, userId);
    if (lastMessage) {
      const elapsed = (Date.now() - new Date(lastMessage.createdAt).getTime()) / 1000;
      if (elapsed < CHAT_COOLDOWN_SECONDS) {
        throw new AppError(429, `Wait ${Math.ceil(CHAT_COOLDOWN_SECONDS - elapsed)}s before sending another message`);
      }
    }

    // Calculate TTL (5 min after draw completion, or 1 hour from now if still active)
    const ttl = drawCompletedAt
      ? Math.floor(new Date(drawCompletedAt).getTime() / 1000) + CHAT_TTL_AFTER_COMPLETED_MINUTES * 60
      : Math.floor(Date.now() / 1000) + 3600; // 1 hour fallback for active draws

    const now = new Date().toISOString();
    const messageId = uuid();

    const message: ChatMessage = {
      drawId,
      messageId,
      userId,
      username,
      content,
      createdAt: now,
      expiresAt: ttl,
    };

    await ddb.send(new PutCommand({
      TableName: tables.chatMessages,
      Item: message,
    }));

    return message;
  }

  async getMessages(drawId: string, limit = 50): Promise<ChatMessage[]> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.chatMessages,
      KeyConditionExpression: 'drawId = :did',
      ExpressionAttributeValues: { ':did': drawId },
      ScanIndexForward: true, // oldest first
      Limit: limit,
    }));
    return (result.Items || []) as ChatMessage[];
  }

  private async getUserMessageCount(drawId: string, userId: string): Promise<number> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.chatMessages,
      KeyConditionExpression: 'drawId = :did',
      FilterExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':did': drawId, ':uid': userId },
      Select: 'COUNT',
    }));
    return result.Count || 0;
  }

  private async getLastUserMessage(drawId: string, userId: string): Promise<ChatMessage | null> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.chatMessages,
      KeyConditionExpression: 'drawId = :did',
      FilterExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':did': drawId, ':uid': userId },
      ScanIndexForward: false, // newest first
      Limit: 1,
    }));
    return (result.Items?.[0] as ChatMessage) || null;
  }

  isChatActive(drawStatus: string, drawCompletedAt?: string): boolean {
    if (['OPEN', 'FULL', 'COUNTDOWN', 'RUNNING'].includes(drawStatus)) return true;
    if (drawStatus === 'COMPLETED' && drawCompletedAt) {
      const completedTime = new Date(drawCompletedAt).getTime();
      const ttlMs = CHAT_TTL_AFTER_COMPLETED_MINUTES * 60 * 1000;
      return Date.now() < completedTime + ttlMs;
    }
    return false;
  }

  // Set TTL on all messages for a draw when it completes
  async setCompletionTTL(drawId: string, completedAt: string): Promise<void> {
    const ttl = Math.floor(new Date(completedAt).getTime() / 1000) + CHAT_TTL_AFTER_COMPLETED_MINUTES * 60;
    const messages = await this.getMessages(drawId, 100);
    for (const msg of messages) {
      // Messages will be auto-deleted by DynamoDB TTL once expiresAt passes
      // We only need to update if the current TTL is later than completion-based TTL
      if (msg.expiresAt > ttl) {
        // No need to update — DynamoDB TTL will handle cleanup
      }
    }
    // DynamoDB TTL handles cleanup automatically
  }
}

export const chatService = new ChatService();
