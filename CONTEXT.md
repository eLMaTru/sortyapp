# SORTYAPP - Project Context

> This file serves as a comprehensive context guide for AI assistants and developers.
> It documents all decisions, architecture, file structure, and progress made on this project.

## 1. What is SORTYAPP?

A **credits-based draw rooms platform** where users join rooms, pay an entry fee (in credits), and one user is randomly selected as winner via a spinner wheel. The draw uses a **commit-reveal** fairness model (SHA256).

### Business Model
- **1 USDC = 100 credits**
- **DEMO mode**: Free 10,000 credits, no real money involved
- **REAL mode**: Requires actual deposit (future: via Transak + Polygon USDC)
- **App fee**: 10% of each draw's pool
- **Withdrawal fee**: 1% of withdrawal amount
- **Referral bonus**: $5 (500 credits) for both referrer and referee on first REAL deposit
- **MVP templates**: 5 or 10 slots, $1/$5/$10/$25 entry

### Draw Flow
1. `OPEN` - Room accepts participants
2. `FULL` - All slots filled (transitions instantly)
3. `COUNTDOWN` - 15-second countdown begins
4. `RUNNING` - Spinner is animating
5. `COMPLETED` - Winner selected, credits distributed, seeds revealed

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Shared | TypeScript types, Zod schemas, utilities (`packages/shared`) |
| API | Express.js wrapped with `serverless-http` for AWS Lambda |
| Web | Next.js 14 (App Router) with Tailwind CSS |
| Database | DynamoDB (6 tables, PAY_PER_REQUEST) |
| Infra | AWS CDK (TypeScript) |
| Auth | JWT + bcrypt (not Cognito) |
| Queue | SQS (email + tx verification) |
| Events | EventBridge |

## 3. Monorepo Structure

```
sortyapp/
├── packages/shared/         # Shared types, schemas, constants, utils
│   └── src/
│       ├── types.ts         # User, Draw, Transaction, Withdrawal, etc.
│       ├── constants.ts     # CREDITS_PER_USDC, tableNames(), MVP_TEMPLATES
│       ├── schemas.ts       # Zod validation schemas
│       └── utils.ts         # creditsToUSDC, generateSeed, computeCommitHash, etc.
│
├── apps/api/                # Express API (runs locally + Lambda)
│   └── src/
│       ├── lib/
│       │   ├── config.ts    # dotenv config loader
│       │   └── dynamo.ts    # DynamoDB client + table names
│       ├── middleware/
│       │   ├── auth.middleware.ts   # JWT verify, requireRole
│       │   └── error.middleware.ts  # AppError class, error handler
│       ├── services/
│       │   ├── user.service.ts      # register, login, signToken
│       │   ├── wallet.service.ts    # creditBalance, debitBalance, simulateDeposit, withdraw
│       │   ├── draw.service.ts      # template CRUD, draw lifecycle, joinDraw, finalizeDraw
│       │   └── email.service.ts     # Console-logged mock emails
│       ├── routes/
│       │   ├── auth.ts      # /api/auth/*
│       │   ├── draws.ts     # /api/draws/*
│       │   ├── wallet.ts    # /api/wallet/*
│       │   ├── admin.ts     # /api/admin/*
│       │   └── webhooks.ts  # /api/webhooks/transak (placeholder)
│       ├── scripts/
│       │   ├── create-tables.ts  # Creates 6 DynamoDB tables with GSIs
│       │   └── seed.ts           # Seeds admin, test user, 8 templates, initial draws
│       ├── index.ts         # Express app setup
│       └── lambda.ts        # serverless-http wrapper
│
├── apps/web/                # Next.js 14 frontend
│   └── src/
│       ├── lib/
│       │   ├── api.ts       # API client with auth header injection
│       │   └── i18n.ts      # Translation strings (Spanish/English)
│       ├── contexts/
│       │   ├── AuthContext.tsx     # Auth state, login, register, logout
│       │   ├── ModeContext.tsx     # DEMO/REAL mode toggle
│       │   ├── ThemeContext.tsx    # Dark/Light mode toggle (localStorage)
│       │   └── LanguageContext.tsx # Spanish/English i18n
│       ├── components/
│       │   ├── Navbar.tsx         # Nav with mode toggle, theme toggle, lang toggle
│       │   ├── RoomCard.tsx       # Room listing card
│       │   ├── RoomDetail.tsx     # Full room page (client component)
│       │   ├── SpinWheel.tsx      # Canvas-based wheel with brand colors
│       │   └── ConfirmModal.tsx   # Confirmation dialog
│       └── app/
│           ├── layout.tsx         # Root layout (ThemeProvider > LanguageProvider > AuthProvider > ModeProvider)
│           ├── globals.css        # Tailwind + dark mode body styles
│           ├── page.tsx           # Landing page
│           ├── login/page.tsx     # Login form
│           ├── register/page.tsx  # Register form (Suspense wrapped)
│           ├── dashboard/page.tsx # Balance, referral, transactions
│           ├── rooms/page.tsx     # Room listing with filters
│           ├── rooms/[id]/page.tsx # Server page wrapper for RoomDetail
│           ├── wallet/page.tsx    # Balances, withdrawal, transactions, referral
│           └── admin/page.tsx     # Admin: users, deposits, withdrawals, templates, draws
│
├── infra/                   # AWS CDK infrastructure
│   ├── bin/app.ts           # CDK app entry: creates Database, Messaging, Api stacks
│   └── lib/
│       ├── database-stack.ts   # 6 DynamoDB tables with GSIs
│       ├── messaging-stack.ts  # SQS queues (email + tx) + EventBridge
│       ├── api-stack.ts        # Lambda (NodejsFunction + esbuild), API Gateway, Secrets
│       └── web-stack.ts        # S3 + CloudFront (exists but not wired up)
│
├── imagenes-a/              # Reference design images (gitignored)
├── .env                     # Local dev environment (gitignored)
├── .env.example             # Template for .env
├── .gitignore               # Ignores node_modules, dist, .next, cdk.out, .env, imagenes-a, .claude
├── CONTEXT.md               # THIS FILE - comprehensive project context
└── README.md                # Project overview
```

## 4. AWS Infrastructure (CDK Deployed)

### Account
- **Account ID**: 189296887710
- **Region**: us-east-1
- **AWS Profile**: `sortyapp`
- **CDK Bootstrap**: Completed

### Stacks (all deployed successfully)
1. **dev-sortyapp-database** - 6 DynamoDB tables
2. **dev-sortyapp-messaging** - SQS queues + EventBridge
3. **dev-sortyapp-api** - Lambda + API Gateway
4. **dev-sortyapp-web** - S3 + CloudFront (static site)

### Live URLs
```
Web:  https://d1g6ucfnv1fy2e.cloudfront.net
API:  https://oxurm4wr9d.execute-api.us-east-1.amazonaws.com/dev/
```

### DynamoDB Tables (prefix: `dev-sortyapp`)
- `dev-sortyapp-users` (PK: userId, GSI: email, username, referralCode)
- `dev-sortyapp-draws` (PK: drawId, GSI: mode+status)
- `dev-sortyapp-transactions` (PK: transactionId, GSI: userId)
- `dev-sortyapp-withdrawals` (PK: withdrawalId, GSI: userId, status)
- `dev-sortyapp-templates` (PK: templateId)
- `dev-sortyapp-daily-deposits` (PK: compositeKey)

### SQS Queues
- `dev-sortyapp-email-queue` (+ DLQ)
- `dev-sortyapp-tx-verification-queue` (+ DLQ)

### Secrets Manager
- `dev-sortyapp/jwt-secret` (auto-generated 64-char string)
- `dev-sortyapp/transak` (placeholder)

## 5. Design System (from reference images)

### Brand Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #0066FF | Nav, primary buttons, links |
| Room Red | #FF3333 | Game room buttons, participate button |
| Success Green | #00CC00 | Add funds, success states |
| Accent Orange | #FFA500 | Wheel segment, accents |
| Accent Gold | #FFCC00 | Winner highlight, admin link |
| Accent Purple | #5555FF | Wheel segment, special buttons |
| Accent Teal | #00CCCC | Wheel segment, secondary accents |
| Demo Purple | #8B5CF6 | Demo mode indicators |
| Real Green | #10B981 | Real mode indicators |

### Theme
- **Light mode**: Background `#F5F5F0`, cards `#FFFFFF`
- **Dark mode**: Background `#1A1A1A`, cards `#2A2A2A`
- Toggle via ThemeContext (persisted in localStorage)

### Spinner Wheel
- 4 primary colors: Blue, Red, Green, Orange (matching logo quadrants)
- White center circle with blue `$` sign
- Red triangle pointer at top
- Canvas-based rendering with animation

## 6. i18n (Internationalization)

- **Default language**: Spanish (es)
- **Second language**: English (en)
- **Implementation**: Custom lightweight context + translation map
- **Persistence**: localStorage (`sortyapp-locale`)
- **Toggle**: Button in Navbar showing `EN` or `ES`
- **Files**:
  - `apps/web/src/lib/i18n.ts` - All translation strings
  - `apps/web/src/contexts/LanguageContext.tsx` - React context + hook

## 7. Key Technical Decisions & Fixes

1. **`composite: true`** in `packages/shared/tsconfig.json` - Required for TypeScript project references
2. **`as jwt.SignOptions`** cast - jsonwebtoken v9+ branded `StringValue` type
3. **Suspense boundary** for `useSearchParams()` - Next.js 14 App Router requirement
4. **No `output: 'export'`** - Dynamic `[id]` routes are incompatible with static export
5. **DynamoDB `#mode` alias** - `mode` is a reserved keyword, requires expression attribute name
6. **`NodejsFunction`** with `forceDockerBundling: false` - Uses esbuild locally (no Docker needed)
7. **ALL infrastructure via CDK** - No manual AWS CLI resource creation
8. **`JWT_SECRET`** passed from Secrets Manager → Lambda env var (via `unsafeUnwrap()`)

## 8. Credentials (Development)

### Seed Users
- **Admin**: `admin@sortyapp.com` / `admin1234`
- **Test User**: `user@sortyapp.com` / `user1234`

### Local Dev
- API: `http://localhost:4000/api`
- Web: `http://localhost:3000`
- JWT Secret (local): `s0rty4pp-mvp-jwt-s3cr3t-k3y-2024-d3v`

## 9. GitHub Repository
- **URL**: https://github.com/eLMaTru/sortyapp.git
- **Branch**: `main`

## 10. What's Done
- [x] Full monorepo scaffolding (65+ files)
- [x] Shared types, schemas, constants, utilities
- [x] Express API with all routes + services
- [x] Next.js 14 frontend with all pages + components
- [x] CDK infrastructure (3 stacks deployed)
- [x] Database seeded (admin, test user, 8 templates, initial draws)
- [x] Deployed API Gateway verified working
- [x] Brand colors from reference images applied
- [x] Dark/Light mode (ThemeContext + Tailwind `dark:` classes)
- [x] Spanish/English i18n (LanguageContext + translation map)
- [x] Spinner wheel with brand colors + $ center
- [x] Pushed to GitHub

## 11. What's Pending / Future
- [ ] Transak integration (webhook → SQS → verify Polygon tx → credit wallet)
- [ ] WebStack deployment (S3 + CloudFront for Next.js)
- [ ] Real email sending via SES (currently console-logged mock)
- [ ] WebSocket or SSE for real-time room updates
- [ ] Mobile-responsive polish
- [ ] Rate limiting
- [ ] Audit logging
- [ ] Private rooms feature (visible in reference images)
- [ ] Game history page
