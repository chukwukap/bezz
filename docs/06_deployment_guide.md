# Deployment Guide: Stacks Testnet & Mainnet

## Prerequisites

- **Node.js**: v20 or higher
- **Clarinet**: v2.0+ installed (`brew install clarinet` on macOS)
- **Stacks CLI**: For generating keys (`npm install -g @stacks/cli`)
- **Wallet**: Hiro Wallet or Xverse with testnet/mainnet STX

---

## Part 1: Local Development Setup

### 1.1 Install Clarinet

```bash
# macOS
brew install clarinet

# Verify installation
clarinet --version
# Output: clarinet 2.x.x
```

---

### 1.2 Initialize Project

```bash
cd crypto-prediction-market
clarinet new contracts
cd contracts
```

This creates:

```
contracts/
├── Clarinet.toml
├── settings/
│   └── Devnet.toml
├── contracts/
└── tests/
```

---

### 1.3 Configure Clarinet.toml

```toml
[project]
name = "prediction-market"
description = "Curated crypto price prediction market on Stacks"
authors = ["Your Name <you@example.com>"]
telemetry = false

[[project.requirements]]
contract_id = "SP2T5JKWWP3FYYX4JRG2SB8N7PEQN3YQRQV2QSZHH.pyth-oracle-v4"

[contracts.prediction-market]
path = "contracts/prediction-market.clar"
clarity_version = 2
epoch = 2.4
```

---

### 1.4 Run Local Devnet

```bash
# Start local Stacks blockchain
clarinet integrate

# Access Devnet console
# http://localhost:8080 - Clarinet Console
# http://localhost:3999 - Stacks API
```

---

## Part 2: Testnet Deployment

### 2.1 Generate Deployment Keys

```bash
# Generate new wallet
stx make_keychain -t

# Output:
# {
#   "mnemonic": "your 24 word phrase...",
#   "keyInfo": {
#     "privateKey": "your_private_key_hex",
#     "address": "ST...",
#     "btcAddress": "...",
#     "wif": "...",
#     "index": 0
#   }
# }
```

**Save these securely!** Store in `.env` file (add to `.gitignore`):

```bash
# .env
TESTNET_PRIVATE_KEY=your_private_key_hex
TESTNET_ADDRESS=ST...
MAINNET_PRIVATE_KEY=  # Leave empty for now
MAINNET_ADDRESS=
```

---

### 2.2 Get Testnet STX

Visit the faucet:

- **Hiro Faucet**: https://explorer.hiro.so/sandbox/faucet?chain=testnet

Request 10,000 STX to your testnet address (ST...).

Verify balance:

```bash
curl "https://api.testnet.hiro.so/v2/accounts/ST...?proof=0"
```

---

### 2.3 Deploy to Testnet

Create deployment script:

```bash
# scripts/deploy-testnet.sh
#!/bin/bash

NETWORK="testnet"
CONTRACT_NAME="prediction-market"
CONTRACT_FILE="contracts/prediction-market.clar"

echo "Deploying $CONTRACT_NAME to $NETWORK..."

stx deploy_contract \
  $CONTRACT_FILE \
  $CONTRACT_NAME \
  100000 \
  0 \
  $TESTNET_PRIVATE_KEY \
  --network $NETWORK

echo "Deployment complete!"
echo "Contract Address: $TESTNET_ADDRESS.$CONTRACT_NAME"
```

Run deployment:

```bash
chmod +x scripts/deploy-testnet.sh
./scripts/deploy-testnet.sh
```

**Alternatively**, use Clarinet:

```bash
# Add testnet config to settings/Testnet.toml
clarinet deployments generate --testnet

# Deploy
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

---

### 2.4 Verify Deployment

Check on Stacks Explorer:

- https://explorer.hiro.so/?chain=testnet
- Search for your contract: `ST....prediction-market`

Or via API:

```bash
curl "https://api.testnet.hiro.so/v2/contracts/interface/ST.../prediction-market"
```

---

### 2.5 Initialize Contract

Call initialization functions:

```bash
# Add yourself as admin (if not auto-set)
stx call_contract \
  $TESTNET_ADDRESS \
  prediction-market \
  add-admin \
  "(principal '$TESTNET_ADDRESS)" \
  $TESTNET_PRIVATE_KEY \
  --network testnet
```

---

## Part 3: Mainnet Deployment

### 3.1 Prepare Mainnet Wallet

**Option A**: Use existing wallet

- Export private key from Hiro Wallet or Xverse

**Option B**: Generate new wallet

```bash
stx make_keychain  # No -t flag for mainnet
```

**Fund wallet** with STX for deployment costs:

- Contract deployment: ~0.5-1 STX
- Initial transactions: 1-2 STX
- **Total recommended**: 5 STX

---

### 3.2 Production Checklist

Before deploying to mainnet:

- [ ] All tests passing (`clarinet test`)
- [ ] External security audit completed
- [ ] Bug bounty program launched
- [ ] Admin multi-sig configured (if applicable)
- [ ] Oracle feeds verified (Pyth mainnet)
- [ ] Frontend and backend deployed to production
- [ ] Monitoring tools set up (Sentry, Datadog)
- [ ] Incident response plan documented
- [ ] Legal review completed (if applicable)

---

### 3.3 Deploy to Mainnet

**CRITICAL**: Test everything on testnet first!

```bash
# scripts/deploy-mainnet.sh
#!/bin/bash

NETWORK="mainnet"
CONTRACT_NAME="prediction-market"
CONTRACT_FILE="contracts/prediction-market.clar"

echo "⚠️  DEPLOYING TO MAINNET ⚠️"
echo "Contract: $CONTRACT_NAME"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Deployment cancelled"
  exit 1
fi

stx deploy_contract \
  $CONTRACT_FILE \
  $CONTRACT_NAME \
  500000 \
  0 \
  $MAINNET_PRIVATE_KEY \
  --network mainnet

echo "✅ Deployment complete!"
echo "Contract Address: $MAINNET_ADDRESS.$CONTRACT_NAME"
echo "Explorer: https://explorer.hiro.so/txid/[TX_ID]?chain=mainnet"
```

Run:

```bash
./scripts/deploy-mainnet.sh
```

---

### 3.4 Post-Deployment

1. **Verify contract on explorer**: https://explorer.hiro.so/
2. **Initialize contract**:
   - Add admin(s)
   - Set protocol fee (if configurable)
3. **Create first test market** (with small amounts)
4. **Monitor for 24 hours** before announcing publicly
5. **Publish contract source** for transparency

---

## Part 4: Backend Deployment

### 4.1 Database Setup (Railway/Render)

**Railway**:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add PostgreSQL
railway add postgresql

# Get database URL
railway variables
```

Update `.env`:

```
DATABASE_URL=postgresql://...
```

---

### 4.2 Backend Deployment (Railway)

```yaml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
```

Deploy:

```bash
railway up
```

---

### 4.3 Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

Configure environment variables in Vercel dashboard:

- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_NETWORK`: `testnet` or `mainnet`
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: Your deployed contract

---

## Part 5: Environment Configuration

### Development

```env
NODE_ENV=development
STACKS_NETWORK=devnet
CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.prediction-market
API_URL=http://localhost:3001
DATABASE_URL=postgresql://localhost:5432/prediction_market_dev
```

### Testnet

```env
NODE_ENV=staging
STACKS_NETWORK=testnet
CONTRACT_ADDRESS=ST...prediction-market
API_URL=https://api-staging.yourapp.com
DATABASE_URL=postgresql://...
```

### Mainnet

```env
NODE_ENV=production
STACKS_NETWORK=mainnet
CONTRACT_ADDRESS=SP...prediction-market
API_URL=https://api.yourapp.com
DATABASE_URL=postgresql://...
SENTRY_DSN=https://...
```

---

## Part 6: Monitoring Setup

### 6.1 Contract Monitoring

Use Hiro's Chainhook for real-time events:

```yaml
# chainhook.yaml
name: prediction-market-events
networks:
  - mainnet
contracts:
  - SP....prediction-market
predicates:
  - print-event:
      contains: "event"
actions:
  - http_post:
      url: https://api.yourapp.com/webhooks/chainhook
      authorization: "Bearer YOUR_SECRET"
```

---

### 6.2 Application Monitoring

**Sentry** (Error Tracking):

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

**Datadog** (Metrics):

```typescript
import { StatsD } from "node-dogstatsd";

const statsd = new StatsD();
statsd.increment("market.created");
statsd.histogram("resolution.time", Date.now() - startTime);
```

---

## Part 7: CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Clarinet
        run: |
          curl -sL https://github.com/hirosystems/clarinet/releases/download/v2.0.0/clarinet-linux-x64.tar.gz | tar xz
          sudo mv clarinet /usr/local/bin
      - name: Run tests
        run: clarinet test

  deploy-contracts:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to mainnet
        run: ./scripts/deploy-mainnet.sh
        env:
          MAINNET_PRIVATE_KEY: ${{ secrets.MAINNET_PRIVATE_KEY }}

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway
        run: railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Deployment Costs

| Item                | Testnet           | Mainnet                        |
| ------------------- | ----------------- | ------------------------------ |
| Contract Deployment | Free (faucet STX) | ~0.5-1 STX (~$0.50-$1)         |
| Backend (Railway)   | $5/month          | $20-50/month                   |
| Database (Railway)  | $5/month          | $10-30/month                   |
| Frontend (Vercel)   | Free              | Free (Hobby) / $20/month (Pro) |
| Domain              | -                 | $10-15/year                    |
| **Total (Monthly)** | ~$10              | ~$50-100                       |

---

## Rollback Procedure

1. **Frontend**: Revert to previous Vercel deployment
2. **Backend**: Rollback Railway deployment or redeploy from Git
3. **Smart Contract**: **Cannot be reverted** (immutable)
   - Use admin functions to pause or cancel markets
   - Deploy new contract version if critical bug

---

## Production Checklist

- [ ] Smart contracts audited
- [ ] Deployed to testnet and tested for 1+ week
- [ ] Multi-sig admin setup (if applicable)
- [ ] Backend deployed with auto-scaling
- [ ] Database backups configured (daily)
- [ ] Monitoring dashboards set up
- [ ] Incident response plan documented
- [ ] Domain configured with SSL
- [ ] Legal terms and privacy policy published
- [ ] Community channels set up (Discord, Twitter)

---

This guide provides everything needed to deploy your prediction market from local development to production mainnet.
