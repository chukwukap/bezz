# Clarity Best Practices & Design Patterns

## Overview

This guide covers best practices for writing production-ready Clarity smart contracts for the Stacks blockchain, with specific focus on prediction market implementation. Clarity's unique design (decidability, non-Turing complete, no reentrancy) requires different patterns than Solidity, but offers significant security advantages.

---

## Core Principles

### 1. **Decidability**

Clarity is decidable, meaning you can determine what a program will do without running it. This eliminates entire classes of bugs.

**Benefits**:

- No infinite loops
- Predictable gas costs
- Static analysis is complete (not heuristic)
- Contract behavior can be formally verified

**Practical Impact**:

- You cannot write `while` loops - use `map`, `fold`, or `filter` instead
- Recursion depth is limited
- All state changes are explicit

**Example**:

```clarity
;; ❌ BAD: Cannot do this in Clarity
(define-public (forever)
  (ok (forever)))  ;; Would cause infinite recursion

;; ✅ GOOD: Bounded operations
(define-public (sum-list (numbers (list 100 uint)))
  (ok (fold + numbers u0)))  ;; Processes list with known max size
```

---

### 2. **No Reentrancy**

Clarity prevents reentrancy attacks by design. Contract calls cannot call back into the original contract in the same transaction.

**Example** (this is impossible in Clarity):

```clarity
;; This pattern is IMPOSSIBLE in Clarity (would be vulnerable in Solidity)
(define-public (withdraw-funds)
  (let ((balance (get-balance tx-sender)))
    ;; In Solidity, malicious contract could call withdraw-funds again here
    ;; In Clarity, this is prevented by design
    (try! (stx-transfer? balance tx-sender contract))
    (ok true)))
```

**Best Practice**: You can safely transfer funds before updating state without reentrancy risk.

---

### 3. **Explicit State Management**

All state changes must be explicit. There are no hidden side effects.

**Maps vs Data Vars**:

```clarity
;; Use data-var for single global values
(define-data-var total-users uint u0)

;; Use maps for keyed data structures
(define-map user-balances principal uint)
```

---

## Naming Conventions

### Kebab-Case

Use kebab-case for all identifiers:

```clarity
;; ✅ GOOD
(define-public (place-bet (...)))
(define-map user-bets ...)
(define-constant err-not-authorized u1)

;; ❌ BAD
(define-public (placeBet (...)))  ;; camelCase
(define-map UserBets ...)         ;; PascalCase
```

---

### Descriptive Names

Be verbose and clear:

```clarity
;; ✅ GOOD
(define-constant err-market-not-found u10)
(define-constant err-insufficient-balance u15)

;; ❌ BAD
(define-constant e1 u10)
(define-constant err u15)
```

---

### Error Constants

Prefix error constants with `err-`:

```clarity
(define-constant err-not-authorized u1)
(define-constant err-market-not-found u10)
(define-constant err-deadline-passed u13)
```

---

## Function Design Patterns

### Public vs Read-Only

**`define-public`**: Changes state, costs gas, returns `(response T E)`

```clarity
(define-public (place-bet (market-id uint) (side bool) (amount uint))
  (begin
    ;; Validation
    (asserts! (> amount u0) (err err-invalid-amount))
    ;; State changes
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (map-set user-bets {market-id: market-id, user: tx-sender} {...})
    (ok true)))
```

**`define-read-only`**: No state changes, free to call, pure computation

```clarity
(define-read-only (get-market-info (market-id uint))
  (match (map-get? markets market-id)
    market (ok market)
    (err err-market-not-found)))
```

**Best Practice**: Extract all computation logic into read-only functions. This:

- Makes logic testable independently
- Allows frontend to preview results without gas costs
- Improves code clarity

---

### Response Types

Always use `(response ok-type err-type)` for public functions:

```clarity
;; ✅ GOOD: Clear error handling
(define-public (create-market ...)
  (response uint uint))  ;; Returns market-id or error code

;; ❌ BAD: No error handling
(define-public (create-market ...)
  uint)  ;; Cannot signal errors
```

---

### Validation Pattern

Use `asserts!` for input validation at the start of functions:

```clarity
(define-public (place-bet (market-id uint) (side bool) (amount uint))
  (let (
    (market (unwrap! (map-get? markets market-id) (err err-market-not-found)))
  )
    ;; Validate inputs first
    (asserts! (> amount u0) (err err-invalid-amount))
    (asserts! (is-eq (get status market) "open") (err err-market-not-open))
    (asserts! (< block-height (get deadline market)) (err err-deadline-passed))

    ;; Then perform state changes
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    ;; ...
    (ok true)))
```

**Pattern**:

1. Unwrap/validate all inputs
2. Assert all preconditions
3. Perform state changes
4. Return success

---

### Try! and Unwrap! Pattern

Use `try!` to propagate errors from called functions:

```clarity
(define-public (claim-winnings (market-id uint))
  (let ((payout (unwrap! (calculate-payout market-id tx-sender) (err err-payout-error))))
    ;; If transfer fails, entire function fails and returns the error
    (try! (as-contract (stx-transfer? payout tx-sender)))
    (ok payout)))
```

Use `unwrap!` with custom error for extracting optionals:

```clarity
(let ((market (unwrap! (map-get? markets market-id) (err err-market-not-found))))
  ;; Use market here
  ...)
```

---

## Access Control Patterns

### Admin Map Pattern

```clarity
(define-map admins principal bool)

;; Initialize contract deployer as admin
(map-set admins tx-sender true)

;; Helper function
(define-read-only (is-admin (user principal))
  (default-to false (map-get? admins user)))

;; Guard public functions
(define-public (create-market ...)
  (begin
    (asserts! (is-admin tx-sender) (err err-not-authorized))
    ;; Admin logic
    (ok true)))
```

---

### Multi-Sig Pattern (Future Enhancement)

```clarity
(define-map pending-actions
  uint
  {
    action-type: (string-ascii 20),
    data: (buff 1024),
    approvals: (list 10 principal),
    required: uint,
    executed: bool
  })

(define-public (approve-action (action-id uint))
  (let ((action (unwrap! (map-get? pending-actions action-id) (err u404))))
    (asserts! (is-admin tx-sender) (err err-not-authorized))
    ;; Add approval logic
    (ok true)))
```

---

## Data Structure Patterns

### Composite Keys

Use tuples for composite map keys:

```clarity
(define-map user-bets
  { market-id: uint, user: principal }
  { yes-amount: uint, no-amount: uint, claimed: bool })

;; Access:
(map-get? user-bets {market-id: u1, user: tx-sender})
```

---

### Tuple Destructuring

Use `let` to destructure tuples:

```clarity
(let (
  (market (unwrap! (map-get? markets market-id) (err err-market-not-found)))
  (question (get question market))
  (deadline (get deadline market))
  (status (get status market))
)
  ;; Use extracted values
  ...)
```

---

### Default Values

Use `default-to` for optional values:

```clarity
(define-read-only (get-user-yes-bet (market-id uint) (user principal))
  (get yes-amount
    (default-to {yes-amount: u0, no-amount: u0, claimed: false}
      (map-get? user-bets {market-id: market-id, user: user}))))
```

---

## Math and Precision

### Fixed-Point Arithmetic

Clarity has no floating-point. Use fixed-point math:

```clarity
;; Store prices in cents: 6000000 = $60,000.00
(define-constant precision u100)

;; Calculate percentage (e.g., 2% fee)
(define-read-only (apply-fee (amount uint))
  (let ((fee-bps u200))  ;; 200 basis points = 2%
    (/ (* amount fee-bps) u10000)))

;; Example: 10 STX with 2% fee
;; (apply-fee u10000000) => u200000 (0.2 STX)
```

---

### Safe Division

Always check for division by zero:

```clarity
(define-read-only (calculate-odds (yes-total uint) (no-total uint))
  (if (is-eq (+ yes-total no-total) u0)
    u0  ;; No bets yet
    (/ (* yes-total u10000) (+ yes-total no-total))))
```

---

### Payout Formula

```clarity
(define-read-only (calculate-payout (market-id uint) (user principal))
  (let (
    (market (unwrap! (map-get? markets market-id) (err err-market-not-found)))
    (user-bet (unwrap! (map-get? user-bets {market-id: market-id, user: user}) (err u404)))
    (totals (unwrap! (map-get? market-totals market-id) (err u404)))
    (winning-side (unwrap! (get winning-side market) (err err-not-resolved)))

    (user-winning-bet (if winning-side (get yes-amount user-bet) (get no-amount user-bet)))
    (total-winning-bets (if winning-side (get yes-total totals) (get no-total totals)))
    (total-losing-bets (if winning-side (get no-total totals) (get yes-total totals)))
  )
    ;; Return 0 if user didn't win
    (if (is-eq user-winning-bet u0)
      (ok u0)
      ;; Calculate: user_bet + (user_bet / total_winners) * total_losers
      (let (
        (proportional-winnings (if (> total-winning-bets u0)
          (/ (* user-winning-bet total-losing-bets) total-winning-bets)
          u0))
        (gross-payout (+ user-winning-bet proportional-winnings))
        (fee (/ (* gross-payout (var-get protocol-fee-bps)) u10000))
      )
        (ok (- gross-payout fee))))))
```

---

## Transaction Patterns

### STX Transfers

Use `stx-transfer?` for sending STX:

```clarity
;; Transfer from user to contract
(try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

;; Transfer from contract to user (requires as-contract)
(try! (as-contract (stx-transfer? amount contract-principal user)))
```

**Note**: `(as-contract tx-sender)` gives you the contract's principal.

---

### SIP-010 Token Transfers

```clarity
;; Define token trait (from SIP-010 standard)
(use-trait sip010-token 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-public (place-bet-with-token
    (market-id uint)
    (side bool)
    (amount uint)
    (token <sip010-token>))
  (begin
    ;; Validate...
    ;; Transfer token from user to contract
    (try! (contract-call? token transfer amount tx-sender (as-contract tx-sender) none))
    ;; Update state...
    (ok true)))
```

---

## Event Emission (Print)

Use `print` to emit events for off-chain indexing:

```clarity
(define-public (place-bet (market-id uint) (side bool) (amount uint))
  (begin
    ;; ... validation and state changes

    ;; Emit event
    (print {
      event: "bet-placed",
      market-id: market-id,
      user: tx-sender,
      side: side,
      amount: amount,
      block-height: block-height
    })

    (ok true)))
```

**Best Practice**: Emit events for all significant state changes:

- `market-created`
- `bet-placed`
- `market-resolved`
- `winnings-claimed`
- `market-cancelled`

---

## Testing Best Practices

### Use Clarinet

```bash
# Run all tests
clarinet test

# Run specific test file
clarinet test tests/market_test.ts

# Check contract
clarinet check
```

---

### Test Structure

```typescript
// tests/market_test.ts
import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v1.5.4/index.ts";
import { assertEquals } from "https://deno.land/std@0.170.0/testing/asserts.ts";

Clarinet.test({
  name: "Can create market as admin",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get("deployer")!;
    const block = chain.mineBlock([
      Tx.contractCall(
        "prediction-market",
        "create-market",
        [
          types.utf8("Will BTC reach $60k?"),
          types.principal("SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.btc-feed"),
          types.uint(6000000),
          types.uint(1000),
        ],
        admin.address
      ),
    ]);

    assertEquals(block.receipts[0].result, "(ok u1)");
    block.receipts[0].events.expectPrintEvent("prediction-market", {
      event: "market-created",
      "market-id": types.uint(1),
    });
  },
});
```

---

### Test Edge Cases

```typescript
Clarinet.test({
  name: "Cannot bet after deadline",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get("deployer")!;
    const user = accounts.get("wallet_1")!;

    // Create market with deadline at block 100
    let block = chain.mineBlock([
      Tx.contractCall(
        "prediction-market",
        "create-market",
        [
          types.utf8("Test"),
          types.principal("SP..."),
          types.uint(100),
          types.uint(100),
        ],
        admin.address
      ),
    ]);

    // Advance past deadline
    chain.mineEmptyBlockUntil(101);

    // Try to bet (should fail)
    block = chain.mineBlock([
      Tx.contractCall(
        "prediction-market",
        "place-bet",
        [types.uint(1), types.bool(true), types.uint(1000000)],
        user.address
      ),
    ]);

    assertEquals(block.receipts[0].result, "(err u13)"); // err-deadline-passed
  },
});
```

---

## Security Checklist

### ✅ Access Control

- [ ] All admin functions check `is-admin`
- [ ] Contract deployer is initialized as first admin
- [ ] Admin list cannot be emptied

### ✅ Input Validation

- [ ] All amounts checked for `> 0`
- [ ] All deadlines validated (future block heights)
- [ ] String lengths validated (≤ max length)
- [ ] Principals validated (not zero address)

### ✅ State Integrity

- [ ] Market status transitions validated
- [ ] Double-claim prevention (`claimed` flag)
- [ ] Bet placement only allowed when market is `open`
- [ ] Resolution only allowed after deadline

### ✅ Economic Security

- [ ] Payout calculations tested with edge cases
- [ ] Division by zero checks
- [ ] Protocol fee properly deducted
- [ ] Refunds return full stake (no fees)

### ✅ Oracle Security

- [ ] Price staleness checks
- [ ] Fallback mechanism for oracle failures
- [ ] Admin override with justification required

### ✅ Testing

- [ ] All functions have unit tests
- [ ] Edge cases covered (zero amounts, deadlines, etc.)
- [ ] Integration tests for full workflows
- [ ] Gas cost profiling

---

## Gas Optimization

### Minimize Map Reads

```clarity
;; ❌ BAD: Multiple reads of same map
(define-public (example (market-id uint))
  (begin
    (asserts! (is-some (map-get? markets market-id)) (err u404))
    (let ((status (get status (unwrap-panic (map-get? markets market-id)))))
      ;; Two map reads!
      ...)))

;; ✅ GOOD: Single read
(define-public (example (market-id uint))
  (let ((market (unwrap! (map-get? markets market-id) (err u404))))
    (let ((status (get status market)))
      ;; One map read
      ...)))
```

---

### Batch State Changes

```clarity
;; Future enhancement: Allow multiple bets in one transaction
(define-public (place-multiple-bets (bets (list 10 {market-id: uint, side: bool, amount: uint})))
  (ok (map place-bet-internal bets)))
```

---

## Common Pitfalls

### ❌ Forgetting `as-contract`

```clarity
;; ❌ BAD: Transfer will fail (contract can't transfer user's STX)
(define-public (claim-winnings (market-id uint))
  (stx-transfer? payout contract tx-sender))  ;; ERROR!

;; ✅ GOOD: Use as-contract
(define-public (claim-winnings (market-id uint))
  (as-contract (stx-transfer? payout tx-sender (contract-caller))))
```

---

### ❌ Not Handling Optionals

```clarity
;; ❌ BAD: Will panic if market doesn't exist
(let ((market (unwrap-panic (map-get? markets market-id))))
  ...)

;; ✅ GOOD: Return error
(let ((market (unwrap! (map-get? markets market-id) (err err-market-not-found))))
  ...)
```

---

### ❌ Missing Validation

```clarity
;; ❌ BAD: No validation
(define-public (place-bet (market-id uint) (amount uint))
  (stx-transfer? amount tx-sender contract))

;; ✅ GOOD: Comprehensive validation
(define-public (place-bet (market-id uint) (amount uint))
  (let ((market (unwrap! (map-get? markets market-id) (err u404))))
    (asserts! (> amount u0) (err err-invalid-amount))
    (asserts! (is-eq (get status market) "open") (err err-market-closed))
    (asserts! (< block-height (get deadline market)) (err err-deadline-passed))
    (try! (stx-transfer? amount tx-sender contract))
    (ok true)))
```

---

## Resources

- **Official Clarity Book**: https://book.clarity-lang.org/
- **Clarity Reference**: https://docs.stacks.co/clarity/
- **Stacks.js Documentation**: https://stacks.js.org/
- **Clarinet Documentation**: https://github.com/hirosystems/clarinet

---

This guide provides a solid foundation for writing secure, efficient, and maintainable Clarity contracts for your prediction market.
