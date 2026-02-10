import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  User,
  DrawTemplate,
  DEMO_INITIAL_CREDITS,
  CREDITS_PER_USDC,
  DRAW_FEE_PERCENT,
  MVP_TEMPLATES,
  generateReferralCode,
} from '@sortyapp/shared';
import { ddb, tables } from '../lib/dynamo';
import { drawService } from '../services/draw.service';

async function seed() {
  console.log('Seeding database...\n');

  // ─── Create admin user ─────────────────────────────────────────────────
  const adminId = uuid();
  const now = new Date().toISOString();
  const admin: User = {
    userId: adminId,
    email: 'admin@sortyapp.com',
    username: 'admin',
    passwordHash: await bcrypt.hash('admin1234', 10),
    role: 'ADMIN',
    referralCode: generateReferralCode('admin'),
    firstRealDeposit: false,
    demoBalance: DEMO_INITIAL_CREDITS,
    realBalance: 100000, // Give admin 1000 USDC worth of credits
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: tables.users, Item: admin }));
  console.log(`[USER] Admin created: ${admin.email} / admin1234`);

  // ─── Create test user ──────────────────────────────────────────────────
  const testId = uuid();
  const testUser: User = {
    userId: testId,
    email: 'user@sortyapp.com',
    username: 'testuser',
    passwordHash: await bcrypt.hash('user1234', 10),
    role: 'USER',
    referralCode: generateReferralCode('testuser'),
    firstRealDeposit: true,
    demoBalance: DEMO_INITIAL_CREDITS,
    realBalance: 50000, // 500 USDC
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: tables.users, Item: testUser }));
  console.log(`[USER] Test user created: ${testUser.email} / user1234`);

  // ─── Create draw templates ─────────────────────────────────────────────
  for (const tpl of MVP_TEMPLATES) {
    const template: DrawTemplate = {
      templateId: uuid(),
      slots: tpl.slots,
      entryDollars: tpl.entryDollars,
      entryCredits: tpl.entryDollars * CREDITS_PER_USDC,
      feePercent: DRAW_FEE_PERCENT,
      enabled: true,
      requiresDeposit: tpl.requiresDeposit,
      createdAt: now,
    };

    await ddb.send(new PutCommand({ TableName: tables.templates, Item: template }));
    console.log(`[TEMPLATE] ${template.slots} slots / $${template.entryDollars} entry (requires deposit: ${template.requiresDeposit})`);
  }

  // ─── Create initial open draws for each template ───────────────────────
  await drawService.ensureOpenDraws();
  console.log('\n[DRAWS] Initial open draws created for all templates');

  console.log('\nSeed complete!');
  console.log(`\nAdmin login: admin@sortyapp.com / admin1234`);
  console.log(`Test login:  user@sortyapp.com / user1234`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
