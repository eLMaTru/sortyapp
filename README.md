# SORTYAPP - Credits-Based Draw Rooms Platform (v0.1 MVP)

A web-first platform for credit-based draw rooms with DEMO and REAL modes. Built with Next.js, Express/Lambda, DynamoDB, and AWS CDK.

## Architecture

```
sortyapp/
├── packages/shared/     # Shared types, schemas, constants, utilities
├── apps/api/            # Express API (runs locally + Lambda-deployable)
├── apps/web/            # Next.js web app (static export)
└── infra/               # AWS CDK infrastructure
```

## Tech Stack

- **Frontend**: Next.js 14 (static export), React 18, Tailwind CSS
- **Backend**: Express.js + serverless-http (Lambda-compatible)
- **Database**: DynamoDB (local for dev, AWS for production)
- **Infrastructure**: AWS CDK (API Gateway, Lambda, DynamoDB, SQS, EventBridge, S3, CloudFront)
- **Auth**: JWT + bcrypt (stored in DynamoDB)

## Prerequisites

- Node.js 18+
- Docker (for DynamoDB Local)
- AWS CLI + CDK CLI (for deployment)

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET to a random string
```

### 3. Start DynamoDB Local

```bash
docker run -d -p 8000:8000 amazon/dynamodb-local
```

### 4. Build the shared package

```bash
npm run build:shared
```

### 5. Create tables and seed data

```bash
npm run create-tables
npm run seed
```

This creates:
- **Admin user**: `admin@sortyapp.com` / `admin1234`
- **Test user**: `user@sortyapp.com` / `user1234`
- All MVP draw templates (5 & 10 slots, $1/$5/$10/$25 entries)
- Initial open draws for each template in both DEMO and REAL modes

### 6. Start the development servers

```bash
# Start both API and Web concurrently
npm run dev

# Or start them separately:
npm run dev:api   # API on http://localhost:4000
npm run dev:web   # Web on http://localhost:3000
```

## Product Features

### Credits System
- **1 USDC = 100 credits**
- **DEMO wallet**: 10,000 credits on registration (not rechargeable/withdrawable)
- **REAL wallet**: Recharge via simulated deposit (admin action in v0.1)

### Draw Rooms
- Templates: 5 or 10 slots, $1/$5/$10/$25 entry
- Flow: OPEN → FULL → COUNTDOWN (15s) → RUNNING → COMPLETED
- Auto-creates new room when one fills up
- **Commit-reveal fairness**: SHA256(serverSeed + publicSeed) published at fill, seeds revealed after completion

### Withdrawals
- Real credits only, minimum $10
- 1% fee (covers network costs)
- Statuses: PENDING → SENT (admin approves with txHash)

### Referrals
- Each user gets a referral code
- $5 bonus (500 credits) when referred user makes first real deposit

### Admin Panel
- View all users and balances
- Simulate deposits to any user's REAL wallet
- Approve pending withdrawals (enter txHash)
- View and manage draw templates
- Ensure open draws exist for all templates

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | - | Register new user |
| POST | /api/auth/login | - | Login |
| GET | /api/auth/me | User | Get current user |
| PUT | /api/auth/wallet-address | User | Update wallet address |
| GET | /api/draws?mode=DEMO&status=OPEN | - | List draws |
| GET | /api/draws/:id | - | Get draw details |
| POST | /api/draws/join | User | Join a draw |
| GET | /api/draws/templates | - | List templates |
| GET | /api/wallet/transactions | User | Transaction history |
| POST | /api/wallet/withdraw | User | Request withdrawal |
| GET | /api/wallet/withdrawals | User | User's withdrawals |
| GET | /api/admin/users | Admin | List all users |
| POST | /api/admin/simulate-deposit | Admin | Simulate USDC deposit |
| GET | /api/admin/withdrawals | Admin | List pending withdrawals |
| POST | /api/admin/withdrawals/approve | Admin | Approve withdrawal |
| POST | /api/admin/ensure-open-draws | Admin | Ensure rooms exist |
| POST | /api/webhooks/transak | - | Transak webhook (placeholder) |

## AWS Deployment

### 1. Build everything

```bash
npm run build
```

### 2. Deploy with CDK

```bash
cd infra
npx cdk bootstrap  # First time only
npx cdk deploy --all --context stage=dev
```

### Stacks deployed:
- **Database**: DynamoDB tables with GSIs
- **Messaging**: SQS queues (email, tx verification) + EventBridge
- **API**: API Gateway + Lambda
- **Web**: S3 + CloudFront

### Environment-specific deployment:

```bash
npx cdk deploy --all --context stage=prod
```

## Future Integrations (v0.2+)

### Transak
- Webhook endpoint exists at `/api/webhooks/transak`
- Worker skeleton for Polygon tx verification
- Secrets Manager placeholder for API keys
- Flow: Transak webhook → SQS → verify on-chain → credit REAL wallet

### Email (SES)
- Email service currently logs to console
- SQS queue provisioned and ready
- Wire up SES sender Lambda when domain is verified

## DynamoDB Tables

| Table | PK | SK | GSIs |
|-------|----|----|------|
| users | userId | - | email, username, referralCode |
| draws | drawId | - | modeStatus, templateMode |
| transactions | userId | transactionId | - |
| withdrawals | withdrawalId | - | userId, status |
| templates | templateId | - | - |
| daily-deposits | userId | date | - |
