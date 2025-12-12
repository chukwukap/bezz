# Crypto Prediction Market on Stacks L2

A **trustless, curated crypto-price prediction market** built on Stacks L2, leveraging Bitcoin security and Pyth Network oracles for accurate price resolution.

## 🎯 Overview

This project implements a fully decentralized prediction market where users can bet on crypto asset prices (e.g., "Will BTC be above $60k on Jan 31?"). The system combines:

- **On-chain Clarity smart contracts** for trustless escrow and settlement
- **Pyth Network oracles** for verifiable, real-time price feeds
- **Off-chain backend** for event indexing, order matching, and UI data
- **Modern frontend** (Next.js) with seamless wallet integration

**Key Features**:

- ✅ Admin-curated markets (quality control)
- ✅ Automatic resolution via Pyth oracle
- ✅ Transparent payouts (proportional share of losing pool)
- ✅ Low fees on Stacks L2 (~$0.01 per bet)
- ✅ Real-time odds and bet updates
- ✅ Bitcoin-secured settlement

---

## 📁 Project Structure

```
crypto-prediction-market/
├── docs/                          # Comprehensive documentation
│   ├── 00_architecture_overview.md    # System architecture and data flows
│   ├── 01_implementation_plan.md      # Phased development plan
│   ├── 02_smart_contract_specification.md  # Contract interfaces and logic
│   ├── 03_backend_api_specification.md     # REST & WebSocket API
│   ├── 04_clarity_best_practices.md        # Clarity coding patterns
│   ├── 05_pyth_oracle_integration.md       # Oracle integration guide
│   └── 06_deployment_guide.md              # Testnet/Mainnet deployment
├── contracts/                     # Clarity smart contracts (to be created)
│   ├── prediction-market.clar
│   ├── access-control.clar
│   └── tests/
├── backend/                       # Node.js/TypeScript backend (to be created)
│   ├── src/
│   │   ├── api/
│   │   ├── indexer/
│   │   ├── oracle/
│   │   └── scheduler/
│   ├── prisma/
│   └── package.json
├── frontend/                      # Next.js 14 frontend (to be created)
│   ├── app/
│   ├── components/
│   └── package.json
└── README.md                      # This file
```

---

## 📚 Documentation

All technical documentation is in the `docs/` folder:

| Document                                                                      | Description                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [00_architecture_overview.md](docs/00_architecture_overview.md)               | High-level system design, components, and data flows         |
| [01_implementation_plan.md](docs/01_implementation_plan.md)                   | 7-phase development roadmap with timelines                   |
| [02_smart_contract_specification.md](docs/02_smart_contract_specification.md) | Detailed contract interfaces, data structures, and functions |
| [03_backend_api_specification.md](docs/03_backend_api_specification.md)       | REST and WebSocket API endpoints                             |
| [04_clarity_best_practices.md](docs/04_clarity_best_practices.md)             | Clarity language patterns and security guidelines            |
| [05_pyth_oracle_integration.md](docs/05_pyth_oracle_integration.md)           | Step-by-step oracle integration                              |
| [06_deployment_guide.md](docs/06_deployment_guide.md)                         | Deployment instructions for testnet and mainnet              |

**Start Here**: Read [00_architecture_overview.md](docs/00_architecture_overview.md) for a system tour.

---

## 🛠️ Tech Stack

| Layer               | Technology                                           |
| ------------------- | ---------------------------------------------------- |
| **Blockchain**      | Stacks L2 (Bitcoin-secured)                          |
| **Smart Contracts** | Clarity (decidable, no reentrancy)                   |
| **Oracle**          | Pyth Network (400+ real-time price feeds)            |
| **Backend**         | Node.js + TypeScript + Express + Prisma              |
| **Database**        | PostgreSQL                                           |
| **Frontend**        | Next.js 14 + React + Stacks.js                       |
| **Styling**         | Vanilla CSS (custom design system)                   |
| **Testing**         | Clarinet (Clarity), Jest (Backend), Playwright (E2E) |
| **Deployment**      | Vercel (Frontend), Railway (Backend)                 |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Clarinet** 2.0+ ([installation guide](https://docs.hiro.so/clarinet))
- **PostgreSQL** 15+
- **Stacks Wallet** (Hiro or Xverse)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/crypto-prediction-market.git
cd crypto-prediction-market
```

### 2. Install Dependencies

_Note: Contract, backend, and frontend folders will be created during Phase 1 of development._

```bash
# Once contracts are created:
cd contracts
clarinet check

# Once backend is created:
cd backend
npm install

# Once frontend is created:
cd frontend
npm install
```

### 3. Run Locally

```bash
# Start Clarinet devnet (contracts)
cd contracts
clarinet integrate

# Start backend (in separate terminal)
cd backend
npm run dev

# Start frontend (in separate terminal)
cd frontend
npm run dev
```

Access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Clarinet Console**: http://localhost:8080

---

## 📖 Getting Started (For Developers)

### Phase 1: Smart Contract Development

Follow [01_implementation_plan.md](docs/01_implementation_plan.md) → Phase 1.

**Key Steps**:

1. Initialize Clarinet project
2. Implement modular contracts (Market, Betting, Oracle, Payout, Access Control)
3. Write comprehensive tests
4. Deploy to local devnet

**Reference**: [02_smart_contract_specification.md](docs/02_smart_contract_specification.md)

---

### Phase 2: Oracle Integration

Follow [05_pyth_oracle_integration.md](docs/05_pyth_oracle_integration.md).

**Key Steps**:

1. Set up Pyth Hermes API client
2. Fetch price VAAs off-chain
3. Submit price updates on-chain
4. Implement automatic market resolution

---

### Phase 3: Backend Development

Follow [03_backend_api_specification.md](docs/03_backend_api_specification.md).

**Key Steps**:

1. Set up PostgreSQL + Prisma
2. Implement blockchain event indexer
3. Build REST API (markets, bets, users)
4. Add WebSocket for real-time updates
5. Create oracle scheduler

---

### Phase 4: Frontend Development

**Key Steps**:

1. Initialize Next.js 14 project
2. Integrate Stacks.js wallet connection
3. Build market browsing and betting UI
4. Implement real-time odds display
5. Create admin dashboard

**Design Guidelines**: Premium UI with vibrant colors, glassmorphism, and micro-animations.

---

## 🎨 Architecture Highlights

### Modular Smart Contract Design

```clarity
;; Module 1: Market Management
(define-public (create-market (question ...) (threshold ...) (deadline ...)))
(define-public (cancel-market (market-id uint)))

;; Module 2: Betting Engine
(define-public (place-bet (market-id uint) (side bool) (amount uint)))

;; Module 3: Oracle Resolution
(define-public (resolve-market (market-id uint)))

;; Module 4: Payout Distribution
(define-public (claim-winnings (market-id uint)))
(define-read-only (calculate-payout (market-id uint) (user principal)))

;; Module 5: Access Control
(define-map admins principal bool)
```

**Payout Formula**:

```
user_payout = user_bet + (user_bet / total_winning_bets) * total_losing_bets - protocol_fee
```

---

### Hybrid Architecture (Scalability)

```
┌─────────────────┐
│  Off-Chain      │  ← Order matching, data aggregation
│  (Low latency)  │
└────────┬────────┘
         │ Batch settlement
         ▼
┌─────────────────┐
│  On-Chain       │  ← Escrow, oracle resolution, payouts
│  (Trust-minimal)│
└─────────────────┘
```

This achieves **1000x throughput** vs. pure on-chain (similar to Polymarket).

---

## 🔐 Security

- **Clarity's decidability**: No infinite loops, predictable gas costs
- **No reentrancy**: Enforced by language design
- **Access control**: Admin-only market creation and overrides
- **Oracle security**: Pyth VAAs (cryptographically signed), staleness checks
- **Audit-ready**: Comprehensive test suite, external audit planned

**Security Checklist**: See [04_clarity_best_practices.md](docs/04_clarity_best_practices.md)

---

## 📊 Roadmap

| Phase                                 | Timeline  | Status     |
| ------------------------------------- | --------- | ---------- |
| **Phase 1**: Smart Contracts          | 4-5 weeks | 📝 Planned |
| **Phase 2**: Oracle Integration       | 1 week    | 📝 Planned |
| **Phase 3**: Backend Development      | 3-4 weeks | 📝 Planned |
| **Phase 4**: Frontend Development     | 3-4 weeks | 📝 Planned |
| **Phase 5**: Testing & Security Audit | 2-3 weeks | 📝 Planned |
| **Phase 6**: Testnet Deployment       | 1 week    | 📝 Planned |
| **Phase 7**: Mainnet Launch           | 1 week    | 📝 Planned |

**Total Estimated Time**: 14-19 weeks

**Future Enhancements** (v2):

- Order matching engine (limit orders)
- Platform governance token
- Multi-asset markets (correlations, spreads)
- Mobile app (React Native)

---

## 🧪 Testing

```bash
# Smart contracts
cd contracts
clarinet test

# Backend
cd backend
npm test

# E2E tests
cd frontend
npm run test:e2e
```

**Test Coverage Goals**:

- Smart contracts: 95%+
- Backend: 80%+
- E2E: Critical user flows

---

## 📦 Deployment

### Testnet

```bash
# Deploy contracts
cd contracts
clarinet deployments apply -p deployments/default.testnet-plan.yaml

# Deploy backend
cd backend
railway up

# Deploy frontend
cd frontend
vercel --prod
```

### Mainnet

Follow [06_deployment_guide.md](docs/06_deployment_guide.md) for production checklist.

**Production Checklist**:

- [ ] Security audit completed
- [ ] Bug bounty launched
- [ ] Multi-sig admin configured
- [ ] Monitoring tools set up
- [ ] Legal review (if applicable)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Read the documentation (especially [00_architecture_overview.md](docs/00_architecture_overview.md))
2. Follow [Clarity best practices](docs/04_clarity_best_practices.md)
3. Write tests for new features
4. Submit PRs with clear descriptions

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🔗 Resources

- **Stacks Documentation**: https://docs.stacks.co/
- **Clarity Language Book**: https://book.clarity-lang.org/
- **Pyth Network**: https://docs.pyth.network/
- **Stacks Explorer**: https://explorer.hiro.so/

---

## 💬 Community

- **Discord**: [Join our server](#)
- **Twitter**: [@YourProject](#)
- **Email**: dev@yourproject.com

---

**Built with ❤️ on Stacks L2 | Secured by Bitcoin ₿**
