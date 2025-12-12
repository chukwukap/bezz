# Implementation Plan: Crypto Prediction Market on Stacks L2

## Overview

This implementation plan breaks down the development of a curated crypto-price prediction market on Stacks L2 into concrete, actionable phases. The system combines on-chain trustlessness (Clarity smart contracts) with off-chain services for scalability and user experience.

---

## Phase 1: Smart Contract Development (Foundation)

### 1.1 Project Setup & Environment

**Duration**: 1-2 days

- [ ] Initialize Clarinet project
- [ ] Configure development environment (Clarinet, Node.js, Stacks CLI)
- [ ] Set up Git repository structure
- [ ] Create `.clarinet` configuration for local testing
- [ ] Set up CI/CD pipeline for contract testing

**Deliverables**: Working Clarinet environment with basic project structure

---

### 1.2 Core Contract Modules

#### Module 1: Market (Event) Management

**Duration**: 3-4 days

**Files**: `contracts/market-manager.clar`

- [ ] Define `MarketInfo` data structure (question, asset, threshold, deadline, status)
- [ ] Implement `market-count` counter and `markets` map
- [ ] Create `create-market` function (admin-only)
  - [ ] Validate parameters (question length, threshold > 0, deadline in future)
  - [ ] Auto-increment market ID
  - [ ] Initialize market with `Open` status
  - [ ] Emit market-created event
- [ ] Create `cancel-market` function (admin-only)
  - [ ] Check market exists and is not resolved
  - [ ] Transition status to `Cancelled`
  - [ ] Emit market-cancelled event
- [ ] Implement `get-market-info` read-only function
- [ ] Add market status enum (Open, Resolved, Cancelled)

**Tests**: Market creation, cancellation, status transitions, access control

---

#### Module 2: Betting Engine

**Duration**: 4-5 days

**Files**: `contracts/betting-engine.clar`

- [ ] Define `user-bets` map: `(market-id, principal) → {yes: uint, no: uint, claimed: bool}`
- [ ] Define `market-totals` map: `market-id → {yes-total: uint, no-total: uint}`
- [ ] Implement `place-bet` function
  - [ ] Validate market is `Open` and before deadline
  - [ ] Accept STX transfer (using `stx-transfer?`)
  - [ ] Update `user-bets` for the user
  - [ ] Update `market-totals` for the market
  - [ ] Emit bet-placed event
- [ ] Add support for SIP-010 token bets (in addition to STX)
  - [ ] Accept token principal parameter
  - [ ] Use `contract-call?` to transfer tokens
- [ ] Implement `get-user-bets` read-only function
- [ ] Add minimum bet validation

**Tests**: Bet placement (STX and tokens), total tracking, edge cases (zero bets, market closed)

---

#### Module 3: Oracle Integration (Pyth)

**Duration**: 5-6 days

**Files**: `contracts/oracle-resolver.clar`

- [ ] Research Pyth integration on Stacks (`pyth-oracle-v4` contract)
- [ ] Define asset-to-feed-id mapping (BTC/USD, ETH/USD, etc.)
- [ ] Implement `resolve-market` function
  - [ ] Check deadline has passed
  - [ ] Call Pyth contract to get latest price for market's asset
  - [ ] Compare price to threshold (YES if price >= threshold, NO otherwise)
  - [ ] Update market status to `Resolved`
  - [ ] Record winning side
  - [ ] Emit market-resolved event
- [ ] Add price staleness checks (Pyth timestamp validation)
- [ ] Implement fallback oracle mechanism (manual admin override)
- [ ] Create `get-current-price` read-only helper

**Tests**: Price fetching, resolution logic, staleness checks, edge cases (oracle failure)

---

#### Module 4: Payout Distribution

**Duration**: 3-4 days

**Files**: `contracts/payout-distributor.clar`

- [ ] Implement `calculate-payout` read-only function
  - [ ] Formula: `user_reward = user_bet + (user_bet / total_winner_bets) * total_loser_bets`
  - [ ] Handle edge cases (no losers, user didn't bet on winning side)
  - [ ] Apply protocol fee (2-3% of winnings)
- [ ] Implement `claim-winnings` function
  - [ ] Check market is `Resolved`
  - [ ] Check user bet on winning side
  - [ ] Check user hasn't already claimed
  - [ ] Calculate payout amount
  - [ ] Transfer STX/tokens to user
  - [ ] Mark user as claimed
  - [ ] Emit winnings-claimed event
- [ ] Implement `claim-refund` function (for cancelled markets)
- [ ] Add protocol fee treasury tracking

**Tests**: Payout calculations, claim logic, double-claim prevention, refunds

---

#### Module 5: Access Control

**Duration**: 2-3 days

**Files**: `contracts/access-control.clar`

- [ ] Define `admins` map: `principal → bool`
- [ ] Initialize contract deployer as first admin
- [ ] Implement `add-admin` function (admin-only)
- [ ] Implement `remove-admin` function (admin-only)
- [ ] Create `is-admin` read-only helper
- [ ] Add `assert-admin` private helper for access checks
- [ ] Optionally: Implement multi-sig requirement for sensitive actions

**Tests**: Admin addition/removal, access control enforcement, multi-sig flows

---

### 1.3 Contract Integration & Testing

**Duration**: 4-5 days

- [ ] Integrate all modules into main contract
- [ ] Write comprehensive unit tests for each module
- [ ] Write integration tests for full workflows
  - [ ] Create market → Place bets → Resolve → Claim winnings
  - [ ] Create market → Cancel → Claim refunds
- [ ] Test with mainnet data simulation (Clarinet simnet)
- [ ] Gas optimization review
- [ ] Security audit checklist review

**Deliverables**: Fully tested, modular Clarity smart contract suite

---

## Phase 2: Oracle Integration (Off-Chain)

### 2.1 Pyth Network Integration

**Duration**: 3-4 days

- [ ] Set up Pyth Hermes API client
- [ ] Implement price feed fetcher service (Node.js/TypeScript)
- [ ] Create function to fetch VAA (Verifiable Action Approval) payloads
- [ ] Implement on-chain price update submission
- [ ] Add price caching and staleness monitoring
- [ ] Create fallback to public APIs (CoinGecko, Binance) if Pyth fails

**Tests**: Price fetching, VAA validation, fallback mechanisms

---

### 2.2 Oracle Scheduler

**Duration**: 2-3 days

- [ ] Create scheduler service to monitor market deadlines
- [ ] Implement automatic resolution trigger
  - [ ] Fetch price from Pyth at deadline
  - [ ] Submit resolution transaction to contract
- [ ] Add retry logic for failed resolutions
- [ ] Implement alert system for oracle failures

**Deliverables**: Automated oracle resolution service

---

## Phase 3: Backend Development

### 3.1 Project Setup

**Duration**: 2 days

- [ ] Initialize Node.js/TypeScript project
- [ ] Set up PostgreSQL database
- [ ] Configure Prisma ORM
- [ ] Set up Express.js or Fastify REST API
- [ ] Configure environment variables
- [ ] Set up logging (Winston/Pino)

---

### 3.2 Database Schema

**Duration**: 2-3 days

- [ ] Design Prisma schema
  - [ ] `Market` model (id, question, asset, threshold, deadline, status, createdAt)
  - [ ] `Bet` model (id, marketId, userId, side, amount, txHash, createdAt)
  - [ ] `User` model (id, address, referralCode, createdAt)
  - [ ] `OraclePrice` model (id, asset, price, timestamp, source)
  - [ ] `PlatformFee` model (id, marketId, amount, collected)
- [ ] Run migrations
- [ ] Seed test data

---

### 3.3 Event Indexer

**Duration**: 4-5 days

- [ ] Set up Stacks blockchain event listener (via Hiro API or Chainhook)
- [ ] Index contract events
  - [ ] `market-created`
  - [ ] `bet-placed`
  - [ ] `market-resolved`
  - [ ] `winnings-claimed`
- [ ] Store indexed data in PostgreSQL
- [ ] Handle blockchain reorganizations
- [ ] Create real-time WebSocket feed for frontend updates

---

### 3.4 API Endpoints

**Duration**: 5-6 days

**Market Endpoints**:

- [ ] `GET /api/markets` - List all markets (with filters: status, asset)
- [ ] `GET /api/markets/:id` - Get market details
- [ ] `GET /api/markets/:id/stats` - Get market statistics (total bets, odds)
- [ ] `POST /api/markets` - Create market (admin-only, triggers contract call)
- [ ] `POST /api/markets/:id/cancel` - Cancel market (admin-only)

**Betting Endpoints**:

- [ ] `GET /api/markets/:id/bets` - Get all bets for a market
- [ ] `GET /api/users/:address/bets` - Get user's bets across all markets
- [ ] `POST /api/bets` - Submit bet (off-chain signature, triggers contract call)

**User Endpoints**:

- [ ] `GET /api/users/:address` - Get user profile
- [ ] `GET /api/users/:address/claimable` - Get claimable winnings

**Oracle Endpoints**:

- [ ] `GET /api/oracle/price/:asset` - Get latest oracle price
- [ ] `GET /api/oracle/status` - Get oracle health status

---

### 3.5 Order Matching Engine (Optional for v2)

**Duration**: 7-10 days

- [ ] Design off-chain order book schema
- [ ] Implement limit order matching logic
- [ ] Create signed message verification (EIP-712 style for Stacks)
- [ ] Batch matched orders for on-chain settlement
- [ ] Add WebSocket API for real-time order book updates

**Note**: This is optional for MVP; can launch with simple pool-based betting first.

---

### 3.6 Admin Dashboard API

**Duration**: 3-4 days

- [ ] `GET /api/admin/markets` - List all markets with admin controls
- [ ] `POST /api/admin/markets/:id/override-resolution` - Manual resolution override
- [ ] `GET /api/admin/fees` - Get collected fees and treasury balance
- [ ] `POST /api/admin/auth` - Admin authentication endpoint
- [ ] Implement JWT-based admin authentication

---

## Phase 4: Frontend Development

### 4.1 Project Setup

**Duration**: 1-2 days

- [ ] Initialize Next.js 14 project (App Router)
- [ ] Configure TailwindCSS or vanilla CSS with modern design system
- [ ] Set up Stacks.js and Connect libraries
- [ ] Configure wallet integration (Hiro Wallet, Xverse)
- [ ] Set up state management (React Context or Zustand)

---

### 4.2 Core Components

**Duration**: 6-8 days

**Market Components**:

- [ ] `MarketCard` - Display market info, odds, countdown
- [ ] `MarketList` - Grid/list of active markets
- [ ] `MarketDetail` - Full market page with betting interface
- [ ] `BettingInterface` - Yes/No buttons, amount input, bet confirmation

**User Components**:

- [ ] `WalletConnect` - Connect wallet button and modal
- [ ] `UserProfile` - Display user's bets and claimable winnings
- [ ] `ClaimWinnings` - Button to claim payouts

**Admin Components**:

- [ ] `AdminDashboard` - Market management interface
- [ ] `CreateMarketForm` - Form to create new markets
- [ ] `MarketControls` - Cancel, override resolution

---

### 4.3 Real-Time Updates

**Duration**: 3-4 days

- [ ] Set up WebSocket client connection to backend
- [ ] Implement real-time market odds updates
- [ ] Add live bet feed for each market
- [ ] Show real-time resolution notifications
- [ ] Add optimistic UI updates for bet placement

---

### 4.4 Design & UX Polish

**Duration**: 4-5 days

- [ ] Implement vibrant, modern design system
  - [ ] Custom color palette (gradients, dark mode)
  - [ ] Modern typography (Google Fonts: Inter, Outfit)
  - [ ] Glassmorphism and subtle animations
- [ ] Add micro-animations (hover effects, transitions)
- [ ] Create loading states and skeletons
- [ ] Implement responsive design (mobile-first)
- [ ] Add error handling and user feedback (toasts, modals)
- [ ] Create empty states and onboarding flow

---

### 4.5 SEO & Performance

**Duration**: 2 days

- [ ] Add meta tags (title, description) for each page
- [ ] Implement Open Graph tags for social sharing
- [ ] Optimize images and assets
- [ ] Add analytics (Vercel Analytics or custom)
- [ ] Implement page loading optimization

**Deliverables**: Production-ready Next.js frontend with premium UX

---

## Phase 5: Testing & Security

### 5.1 Smart Contract Security

**Duration**: 5-7 days

- [ ] Conduct internal security review
- [ ] Test for common vulnerabilities
  - [ ] Access control bypasses
  - [ ] Integer overflow/underflow (Clarity prevents, but verify)
  - [ ] Incorrect state transitions
  - [ ] Oracle manipulation
- [ ] Engage external auditor (e.g., Least Authority, Trail of Bits)
- [ ] Fix identified issues
- [ ] Publish audit report

---

### 5.2 Backend & API Testing

**Duration**: 3-4 days

- [ ] Write unit tests (Jest/Mocha)
- [ ] Write integration tests (Supertest)
- [ ] Test oracle failure scenarios
- [ ] Load testing (simulate high bet volume)
- [ ] Security testing (SQL injection, XSS, CSRF)

---

### 5.3 End-to-End Testing

**Duration**: 4-5 days

- [ ] Set up E2E testing framework (Playwright/Cypress)
- [ ] Test full user flows
  - [ ] Connect wallet → Browse markets → Place bet → Claim winnings
  - [ ] Admin creates market → Users bet → Auto-resolution → Payouts
- [ ] Test error scenarios (insufficient balance, network errors)
- [ ] Test on Stacks testnet

---

## Phase 6: Deployment

### 6.1 Testnet Deployment

**Duration**: 3-4 days

- [ ] Deploy smart contracts to Stacks testnet
- [ ] Deploy backend to staging environment (Vercel, Railway, or AWS)
- [ ] Deploy frontend to staging (Vercel)
- [ ] Configure testnet environment variables
- [ ] Test with testnet STX and oracle feeds
- [ ] Invite beta testers

---

### 6.2 Mainnet Preparation

**Duration**: 2-3 days

- [ ] Finalize contract parameters (fees, limits)
- [ ] Prepare deployment scripts
- [ ] Set up multi-sig wallet for admin functions (optional)
- [ ] Configure mainnet oracle feeds
- [ ] Prepare incident response plan

---

### 6.3 Mainnet Deployment

**Duration**: 2 days

- [ ] Deploy contracts to Stacks mainnet
- [ ] Verify contract deployment
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Configure monitoring and alerting (Sentry, Datadog)
- [ ] Create initial markets

---

## Phase 7: Post-Launch

### 7.1 Monitoring & Operations

- [ ] Set up 24/7 monitoring for oracle price feeds
- [ ] Monitor contract activity and gas usage
- [ ] Track user growth and betting volume
- [ ] Set up analytics dashboard

---

### 7.2 Iteration & Features (v2)

- [ ] Implement order matching engine
- [ ] Add platform governance token
- [ ] Implement fee sharing with liquidity providers
- [ ] Add more oracle integrations (DIA, Chainlink when available)
- [ ] Expand to more assets and event types
- [ ] Mobile app (React Native)

---

## Timeline Summary

| Phase                       | Duration        | Dependencies |
| --------------------------- | --------------- | ------------ |
| Phase 1: Smart Contracts    | 4-5 weeks       | None         |
| Phase 2: Oracle Integration | 1 week          | Phase 1      |
| Phase 3: Backend            | 3-4 weeks       | Phase 1      |
| Phase 4: Frontend           | 3-4 weeks       | Phase 3      |
| Phase 5: Testing & Security | 2-3 weeks       | Phases 1-4   |
| Phase 6: Deployment         | 1-2 weeks       | Phase 5      |
| **Total Estimated Time**    | **14-19 weeks** | -            |

---

## Team Recommendations

- **Smart Contract Developer** (Clarity experience) - 1 person
- **Backend Engineer** (Node.js, blockchain indexing) - 1-2 people
- **Frontend Engineer** (React/Next.js, Web3) - 1-2 people
- **DevOps/Infrastructure** - 1 person (part-time)
- **Security Auditor** - External (1-2 weeks engagement)
- **Product/Design** - 1 person (part-time)

---

## Risk Mitigation

| Risk                | Mitigation                                                     |
| ------------------- | -------------------------------------------------------------- |
| Oracle failure      | Multiple oracle fallbacks, admin override mechanism            |
| Smart contract bugs | Thorough testing, external audit, bug bounty program           |
| Low liquidity       | Seed initial markets, marketing campaign, liquidity incentives |
| Regulatory concerns | Legal review, geographic restrictions if needed                |
| Scalability issues  | Off-chain order matching, batch settlements                    |

---

## Success Metrics

- **Month 1**: 100+ active users, 10+ markets, $10k+ total volume
- **Month 3**: 1,000+ active users, 50+ markets, $100k+ total volume
- **Month 6**: 5,000+ active users, protocol profitability

---

This implementation plan provides a clear roadmap from initial setup to mainnet launch, with concrete deliverables and timelines for each phase.
