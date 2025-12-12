# Backend API Specification

## Overview

The backend serves as the bridge between the on-chain Clarity contracts and the frontend UI. It provides:

- Event indexing from the Stacks blockchain
- RESTful API for market data, bets, and user information
- Real-time WebSocket feeds for live updates
- Admin interface for market management
- Oracle price fetching and resolution triggering

**Tech Stack**:

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js or Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain Indexing**: Stacks API (Hiro) or Chainhook
- **Real-time**: WebSocket (Socket.io or WS)
- **Authentication**: JWT for admin endpoints
- **Deployment**: Docker + Railway/Vercel/AWS

---

## Base Configuration

**Base URL**: `https://api.predictionmarket.app`

**Response Format**: All responses are JSON

**Standard Response Structure**:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-31T12:00:00Z"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": {
    "code": "MARKET_NOT_FOUND",
    "message": "Market with ID 123 does not exist"
  },
  "timestamp": "2025-01-31T12:00:00Z"
}
```

---

## Authentication

### Admin Endpoints

Admin endpoints require a JWT bearer token:

```
Authorization: Bearer <jwt_token>
```

**Login Endpoint**:

```http
POST /api/admin/auth/login
Content-Type: application/json

{
  "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
  "signature": "...",
  "message": "Sign in to Prediction Market Admin - Nonce: 12345"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

---

## Market Endpoints

### `GET /api/markets`

**Description**: List all markets with optional filters

**Query Parameters**:

- `status` (optional): Filter by status (`open`, `resolved`, `cancelled`)
- `asset` (optional): Filter by asset principal
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page
- `sort` (default: `created_at`): Sort field (`created_at`, `deadline`, `volume`)
- `order` (default: `desc`): Sort order (`asc`, `desc`)

**Example Request**:

```http
GET /api/markets?status=open&limit=10&sort=deadline&order=asc
```

**Response**:

```json
{
  "success": true,
  "data": {
    "markets": [
      {
        "id": 1,
        "question": "Will BTC be above $60,000 on Jan 31, 2025?",
        "asset": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.btc-usd-feed",
        "threshold": 6000000,
        "deadline": 150000,
        "deadlineDate": "2025-01-31T23:59:59Z",
        "status": "open",
        "yesTotal": "15000000",
        "noTotal": "10000000",
        "yesOdds": 0.6,
        "noOdds": 0.4,
        "totalVolume": "25000000",
        "bettorCount": 42,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

---

### `GET /api/markets/:id`

**Description**: Get detailed information for a specific market

**Path Parameters**:

- `id`: Market ID

**Response**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "question": "Will BTC be above $60,000 on Jan 31, 2025?",
    "asset": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.btc-usd-feed",
    "assetName": "BTC/USD",
    "threshold": 6000000,
    "thresholdFormatted": "$60,000.00",
    "deadline": 150000,
    "deadlineDate": "2025-01-31T23:59:59Z",
    "status": "open",
    "yesTotal": "15000000",
    "noTotal": "10000000",
    "yesOdds": 0.6,
    "noOdds": 0.4,
    "totalVolume": "25000000",
    "bettorCount": 42,
    "winningSide": null,
    "finalPrice": null,
    "createdAt": "2025-01-15T10:00:00Z",
    "resolvedAt": null,
    "creator": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"
  }
}
```

**Error Codes**:

- `404`: `MARKET_NOT_FOUND`

---

### `GET /api/markets/:id/stats`

**Description**: Get statistics and analytics for a market

**Response**:

```json
{
  "success": true,
  "data": {
    "marketId": 1,
    "volume": {
      "total": "25000000",
      "yes": "15000000",
      "no": "10000000"
    },
    "odds": {
      "yes": 0.6,
      "no": 0.4,
      "impliedProbability": 0.6
    },
    "participants": {
      "total": 42,
      "yesCount": 28,
      "noCount": 14
    },
    "volumeHistory": [
      {
        "timestamp": "2025-01-15T12:00:00Z",
        "yesTotal": "5000000",
        "noTotal": "2000000"
      },
      {
        "timestamp": "2025-01-16T12:00:00Z",
        "yesTotal": "10000000",
        "noTotal": "6000000"
      }
    ],
    "oddsHistory": [
      { "timestamp": "2025-01-15T12:00:00Z", "yesOdds": 0.71, "noOdds": 0.29 },
      { "timestamp": "2025-01-16T12:00:00Z", "yesOdds": 0.63, "noOdds": 0.37 }
    ]
  }
}
```

---

### `POST /api/markets` 🔒

**Description**: Create a new market (admin only)

**Authentication**: Required (JWT)

**Request Body**:

```json
{
  "question": "Will ETH be above $3,000 on Feb 15, 2025?",
  "asset": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.eth-usd-feed",
  "threshold": 300000,
  "deadline": "2025-02-15T23:59:59Z"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "marketId": 47,
    "txId": "0x1234567890abcdef...",
    "status": "pending"
  }
}
```

**Error Codes**:

- `401`: `UNAUTHORIZED` (not admin)
- `400`: `INVALID_QUESTION` (empty or too long)
- `400`: `INVALID_DEADLINE` (in the past)

---

### `POST /api/markets/:id/cancel` 🔒

**Description**: Cancel a market (admin only)

**Authentication**: Required (JWT)

**Response**:

```json
{
  "success": true,
  "data": {
    "marketId": 5,
    "txId": "0xabcdef1234567890...",
    "status": "cancelling"
  }
}
```

---

## Betting Endpoints

### `GET /api/markets/:id/bets`

**Description**: Get all bets for a specific market

**Query Parameters**:

- `page`, `limit`: Pagination
- `side` (optional): Filter by side (`yes`, `no`)
- `minAmount` (optional): Minimum bet amount

**Response**:

```json
{
  "success": true,
  "data": {
    "bets": [
      {
        "id": "bet_12345",
        "marketId": 1,
        "user": "SP1ABC...",
        "side": "yes",
        "amount": "5000000",
        "amountFormatted": "5 STX",
        "txId": "0x9876...",
        "timestamp": "2025-01-20T14:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### `GET /api/bets/:txId`

**Description**: Get bet details by transaction ID

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "bet_12345",
    "marketId": 1,
    "user": "SP1ABC...",
    "side": "yes",
    "amount": "5000000",
    "txId": "0x9876...",
    "status": "confirmed",
    "timestamp": "2025-01-20T14:30:00Z"
  }
}
```

---

## User Endpoints

### `GET /api/users/:address`

**Description**: Get user profile and statistics

**Response**:

```json
{
  "success": true,
  "data": {
    "address": "SP1ABC...",
    "totalBets": 15,
    "totalWagered": "50000000",
    "totalWon": "65000000",
    "winRate": 0.67,
    "activeMarkets": 5,
    "marketIds": [1, 3, 7, 12, 18]
  }
}
```

---

### `GET /api/users/:address/bets`

**Description**: Get all bets placed by a user

**Query Parameters**:

- `status` (optional): Filter by market status
- `page`, `limit`: Pagination

**Response**:

```json
{
  "success": true,
  "data": {
    "bets": [
      {
        "marketId": 1,
        "marketQuestion": "Will BTC be above $60,000 on Jan 31, 2025?",
        "yesBet": "5000000",
        "noBet": "0",
        "status": "open",
        "canClaim": false
      }
    ],
    "pagination": { ... }
  }
}
```

---

### `GET /api/users/:address/claimable`

**Description**: Get all markets where user can claim winnings

**Response**:

```json
{
  "success": true,
  "data": {
    "claimable": [
      {
        "marketId": 3,
        "marketQuestion": "Will ETH be above $2,500 by Dec 31?",
        "betSide": "yes",
        "betAmount": "10000000",
        "winningsAmount": "18500000",
        "claimed": false
      }
    ],
    "totalClaimable": "18500000"
  }
}
```

---

## Oracle Endpoints

### `GET /api/oracle/price/:asset`

**Description**: Get latest oracle price for an asset

**Path Parameters**:

- `asset`: Asset feed principal or identifier (e.g., `btc-usd`)

**Response**:

```json
{
  "success": true,
  "data": {
    "asset": "BTC/USD",
    "price": 6250000,
    "priceFormatted": "$62,500.00",
    "timestamp": "2025-01-31T12:34:56Z",
    "source": "pyth",
    "confidence": 99500,
    "expo": -2
  }
}
```

---

### `GET /api/oracle/status`

**Description**: Get oracle health status

**Response**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "lastUpdate": "2025-01-31T12:34:56Z",
    "feeds": [
      {
        "asset": "BTC/USD",
        "status": "active",
        "lastPrice": 6250000,
        "lastUpdate": "2025-01-31T12:34:56Z"
      }
    ]
  }
}
```

---

## Admin Endpoints

### `GET /api/admin/markets` 🔒

**Description**: List all markets with admin controls

**Authentication**: Required

**Response**: Same as `/api/markets` but includes additional admin fields:

```json
{
  "markets": [
    {
      "id": 1,
      // ... standard fields
      "canCancel": true,
      "canResolve": false,
      "canOverride": false
    }
  ]
}
```

---

### `POST /api/admin/markets/:id/resolve` 🔒

**Description**: Manually trigger market resolution (if automatic resolution failed)

**Authentication**: Required

**Response**:

```json
{
  "success": true,
  "data": {
    "marketId": 5,
    "txId": "0xdef...",
    "status": "resolving"
  }
}
```

---

### `POST /api/admin/markets/:id/override` 🔒

**Description**: Override market resolution (emergency only)

**Request Body**:

```json
{
  "winningSide": true, // true = YES, false = NO
  "reason": "Oracle outage - price confirmed via backup source"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "marketId": 5,
    "txId": "0xabc...",
    "winningSide": true,
    "reason": "Oracle outage - price confirmed via backup source"
  }
}
```

---

### `GET /api/admin/fees` 🔒

**Description**: Get protocol fee analytics

**Response**:

```json
{
  "success": true,
  "data": {
    "totalCollected": "5000000",
    "treasuryBalance": "5000000",
    "feesByMarket": [{ "marketId": 1, "fees": "200000" }]
  }
}
```

---

## WebSocket API

**Connection**: `wss://api.predictionmarket.app/ws`

### Subscribe to Market Updates

**Client → Server**:

```json
{
  "action": "subscribe",
  "channel": "market",
  "marketId": 1
}
```

**Server → Client** (on new bet):

```json
{
  "channel": "market",
  "marketId": 1,
  "event": "bet_placed",
  "data": {
    "side": "yes",
    "amount": "5000000",
    "yesTotal": "20000000",
    "noTotal": "10000000",
    "yesOdds": 0.67
  }
}
```

**Server → Client** (on resolution):

```json
{
  "channel": "market",
  "marketId": 1,
  "event": "market_resolved",
  "data": {
    "winningSide": true,
    "finalPrice": 6250000
  }
}
```

### Subscribe to All Markets

**Client → Server**:

```json
{
  "action": "subscribe",
  "channel": "markets"
}
```

**Server → Client** (on new market):

```json
{
  "channel": "markets",
  "event": "market_created",
  "data": {
    "id": 48,
    "question": "Will SOL reach $200 by March 2025?"
    // ... market fields
  }
}
```

---

## Database Schema (Prisma)

```prisma
model Market {
  id            Int       @id @default(autoincrement())
  onChainId     Int       @unique
  question      String
  asset         String
  assetName     String
  threshold     BigInt
  deadline      Int
  deadlineDate  DateTime
  status        String    // "open", "resolved", "cancelled"
  winningSide   Boolean?
  finalPrice    BigInt?
  yesTotal      BigInt    @default(0)
  noTotal       BigInt    @default(0)
  creator       String
  createdAt     DateTime  @default(now())
  resolvedAt    DateTime?

  bets          Bet[]

  @@index([status])
  @@index([deadline])
}

model Bet {
  id            String    @id @default(cuid())
  marketId      Int
  market        Market    @relation(fields: [marketId], references: [id])
  userAddress   String
  side          String    // "yes" or "no"
  amount        BigInt
  txHash        String    @unique
  blockHeight   Int
  timestamp     DateTime

  @@index([marketId])
  @@index([userAddress])
}

model OraclePrice {
  id            Int       @id @default(autoincrement())
  asset         String
  price         BigInt
  confidence    Int?
  expo          Int
  timestamp     DateTime
  source        String    // "pyth", "dia", "manual"

  @@index([asset, timestamp])
}

model User {
  address       String    @id
  totalBets     Int       @default(0)
  totalWagered  BigInt    @default(0)
  totalWon      BigInt    @default(0)
  createdAt     DateTime  @default(now())
}
```

---

## Error Codes

| Code                | HTTP Status | Description                            |
| ------------------- | ----------- | -------------------------------------- |
| `MARKET_NOT_FOUND`  | 404         | Market ID doesn't exist                |
| `UNAUTHORIZED`      | 401         | Missing or invalid JWT token           |
| `FORBIDDEN`         | 403         | Insufficient permissions               |
| `INVALID_QUESTION`  | 400         | Question is empty or exceeds 500 chars |
| `INVALID_DEADLINE`  | 400         | Deadline is in the past                |
| `INVALID_THRESHOLD` | 400         | Threshold is zero or negative          |
| `MARKET_NOT_OPEN`   | 400         | Market is not accepting bets           |
| `ORACLE_ERROR`      | 500         | Failed to fetch oracle price           |
| `TX_FAILED`         | 500         | Blockchain transaction failed          |

---

This specification provides a complete foundation for building the backend API with clear contracts for frontend integration.
