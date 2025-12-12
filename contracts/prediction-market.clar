;; ================================================================================
;; CRYPTO PREDICTION MARKET - STACKS L2
;; ================================================================================
;; A curated, trustless prediction market for crypto asset prices
;; Uses Pyth Network oracles for verifiable price resolution
;; Modular architecture with separated concerns for maintainability
;; ================================================================================

;; ================================================================================
;; CONSTANTS
;; ================================================================================

;; Error codes
(define-constant err-not-authorized (err u1))
(define-constant err-invalid-question (err u2))
(define-constant err-invalid-threshold (err u3))
(define-constant err-invalid-deadline (err u4))
(define-constant err-market-not-found (err u10))
(define-constant err-market-already-finalized (err u11))
(define-constant err-market-not-open (err u12))
(define-constant err-deadline-passed (err u13))
(define-constant err-invalid-amount (err u14))
(define-constant err-insufficient-balance (err u15))
(define-constant err-deadline-not-reached (err u16))
(define-constant err-already-resolved (err u17))
(define-constant err-oracle-unavailable (err u18))
(define-constant err-not-resolved (err u19))
(define-constant err-not-winner (err u20))
(define-constant err-already-claimed (err u21))
(define-constant err-payout-error (err u22))
(define-constant err-stale-price (err u23))

;; Configuration
(define-constant min-bet-amount u1000000) ;; 1 STX minimum bet
(define-constant max-question-length u500)
(define-constant max-price-age u60) ;; 60 seconds for oracle price staleness

;; ================================================================================
;; DATA VARIABLES
;; ================================================================================

(define-data-var market-count uint u0)
(define-data-var protocol-fee-bps uint u200) ;; 200 basis points = 2%
(define-data-var fee-treasury uint u0)

;; ================================================================================
;; DATA MAPS
;; ================================================================================

;;  Module 1: Market Management - Market State Storage
(define-map markets
  uint ;; market-id
  {
    question: (string-utf8 500),
    asset: (buff 32),           ;; Pyth feed ID (32 bytes)
    threshold: uint,             ;; Price threshold in cents
    deadline: uint,              ;; Block height deadline
    created-at: uint,            ;; Block height when created
    status: (string-ascii 20),   ;; "open", "resolved", "cancelled"
    winning-side: (optional bool), ;; true = YES, false = NO
    final-price: (optional uint),
    creator: principal
  }
)

;; Module 2: Betting Engine - Bet Totals by Market
(define-map market-totals
  uint ;; market-id
  {
    yes-total: uint,
    no-total: uint
  }
)

;; Module 2: Betting Engine - Individual User Bets
(define-map user-bets
  { market-id: uint, user: principal }
  {
    yes-amount: uint,
    no-amount: uint,
    claimed: bool
  }
)

;; Module 5: Access Control - Admin Registry
(define-map admins principal bool)

;; Initialize contract deployer as first admin
(map-set admins tx-sender true)

;; ================================================================================
;; MODULE 5: ACCESS CONTROL
;; ================================================================================

(define-read-only (is-admin (user principal))
  (default-to false (map-get? admins user)))

(define-public (add-admin (new-admin principal))
  (begin
    (asserts! (is-admin tx-sender) err-not-authorized)
    (ok (map-set admins new-admin true))))

(define-public (remove-admin (admin principal))
  (begin
    (asserts! (is-admin tx-sender) err-not-authorized)
    (ok (map-set admins admin false))))

;; ================================================================================
;; MODULE 1: MARKET MANAGEMENT
;; ================================================================================

(define-public (create-market
    (question (string-utf8 500))
    (asset (buff 32))
    (threshold uint)
    (deadline uint))
  (let (
    (new-market-id (+ (var-get market-count) u1))
  )
    ;; Validate permissions
    (asserts! (is-admin tx-sender) err-not-authorized)
    
    ;; Validate inputs
    (asserts! (> (len question) u0) err-invalid-question)
    (asserts! (<= (len question) max-question-length) err-invalid-question)
    (asserts! (> threshold u0) err-invalid-threshold)
    (asserts! (> deadline block-height) err-invalid-deadline)
    
    ;; Create market
    (map-set markets new-market-id {
      question: question,
      asset: asset,
      threshold: threshold,
      deadline: deadline,
      created-at: block-height,
      status: "open",
      winning-side: none,
      final-price: none,
      creator: tx-sender
    })
    
    ;; Initialize totals
    (map-set market-totals new-market-id {
      yes-total: u0,
      no-total: u0
    })
    
    ;; Update counter
    (var-set market-count new-market-id)
    
    ;; Emit event
    (print {
      event: "market-created",
      market-id: new-market-id,
      question: question,
      threshold: threshold,
      deadline: deadline,
      creator: tx-sender
    })
    
    (ok new-market-id)))

(define-public (cancel-market (market-id uint))
  (let (
    (market (unwrap! (map-get? markets market-id) err-market-not-found))
  )
    ;; Validate permissions
    (asserts! (is-admin tx-sender) err-not-authorized)
    
    ;; Validate market status
    (asserts! (is-eq (get status market) "open") err-market-already-finalized)
    
    ;; Update status
    (map-set markets market-id (merge market { status: "cancelled" }))
    
    ;; Emit event
    (print {
      event: "market-cancelled",
      market-id: market-id,
      admin: tx-sender
    })
    
    (ok true)))

(define-read-only (get-market-info (market-id uint))
  (match (map-get? markets market-id)
    market (let ((totals (unwrap! (map-get? market-totals market-id) err-market-not-found)))
      (ok {
        question: (get question market),
        asset: (get asset market),
        threshold: (get threshold market),
        deadline: (get deadline market),
        created-at: (get created-at market),
        status: (get status market),
        winning-side: (get winning-side market),
        final-price: (get final-price market),
        yes-total: (get yes-total totals),
        no-total: (get no-total totals)
      }))
    err-market-not-found))

;; ================================================================================
;; MODULE 2: BETTING ENGINE
;; ================================================================================

(define-public (place-bet
    (market-id uint)
    (side bool) ;; true = YES, false = NO
    (amount uint))
  (let (
    (market (unwrap! (map-get? markets market-id) err-market-not-found))
    (totals (unwrap! (map-get? market-totals market-id) err-market-not-found))
    (current-bets (default-to 
      { yes-amount: u0, no-amount: u0, claimed: false }
      (map-get? user-bets { market-id: market-id, user: tx-sender })))
  )
    ;; Validate market status
    (asserts! (is-eq (get status market) "open") err-market-not-open)
    (asserts! (< block-height (get deadline market)) err-deadline-passed)
    
    ;; Validate bet amount
    (asserts! (>= amount min-bet-amount) err-invalid-amount)
    
    ;; Transfer STX from user to contract
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    ;; Update user bets
    (if side
      ;; Betting on YES
      (map-set user-bets { market-id: market-id, user: tx-sender }
        (merge current-bets { yes-amount: (+ (get yes-amount current-bets) amount) }))
      ;; Betting on NO
      (map-set user-bets { market-id: market-id, user: tx-sender }
        (merge current-bets { no-amount: (+ (get no-amount current-bets) amount) })))
    
    ;; Update market totals
    (if side
      (map-set market-totals market-id
        (merge totals { yes-total: (+ (get yes-total totals) amount) }))
      (map-set market-totals market-id
        (merge totals { no-total: (+ (get no-total totals) amount) })))
    
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

(define-read-only (get-user-bets (market-id uint) (user principal))
  (ok (default-to
    { yes-amount: u0, no-amount: u0, claimed: false }
    (map-get? user-bets { market-id: market-id, user: user }))))

;; ================================================================================
;; MODULE 3: ORACLE RESOLUTION
;; ================================================================================

;; Note: In production, this would call the Pyth oracle contract
;; For Phase 1, we'll implement a simplified version that will be enhanced later
(define-public (resolve-market (market-id uint) (final-price uint))
  (let (
    (market (unwrap! (map-get? markets market-id) err-market-not-found))
  )
    ;; Validate market status
    (asserts! (is-eq (get status market) "open") err-market-not-open)
    (asserts! (>= block-height (get deadline market)) err-deadline-not-reached)
    
    ;; TODO: In Phase 2, add Pyth oracle integration here
    ;; (contract-call? .pyth-oracle-v4 get-price (get asset market))
    
    ;; Determine winning side
    (let ((winning-side (>= final-price (get threshold market))))
      ;; Update market
      (map-set markets market-id (merge market {
        status: "resolved",
        winning-side: (some winning-side),
        final-price: (some final-price)
      }))
      
      ;; Emit event
      (print {
        event: "market-resolved",
        market-id: market-id,
        winning-side: winning-side,
        final-price: final-price,
        threshold: (get threshold market)
      })
      
      (ok winning-side))))

;; Admin override for oracle failures
(define-public (override-resolution
    (market-id uint)
    (winning-side bool)
    (final-price uint))
  (let (
    (market (unwrap! (map-get? markets market-id) err-market-not-found))
  )
    ;; Validate permissions
    (asserts! (is-admin tx-sender) err-not-authorized)
    (asserts! (is-eq (get status market) "open") err-already-resolved)
    
    ;; Update market
    (map-set markets market-id (merge market {
      status: "resolved",
      winning-side: (some winning-side),
      final-price: (some final-price)
    }))
    
    ;; Emit event
    (print {
      event: "admin-override",
      market-id: market-id,
      winning-side: winning-side,
      final-price: final-price,
      admin: tx-sender
    })
    
    (ok true)))

;; ================================================================================
;; MODULE 4: PAYOUT DISTRIBUTION
;; ================================================================================

(define-read-only (calculate-payout (market-id uint) (user principal))
  (let (
    (market (unwrap! (map-get? markets market-id) err-market-not-found))
    (user-bet (unwrap! (map-get? user-bets { market-id: market-id, user: user }) err-not-winner))
    (totals (unwrap! (map-get? market-totals market-id) err-market-not-found))
    (winning-side (unwrap! (get winning-side market) err-not-resolved))
    (user-winning-bet (if winning-side (get yes-amount user-bet) (get no-amount user-bet)))
    (total-winning-bets (if winning-side (get yes-total totals) (get no-total totals)))
    (total-losing-bets (if winning-side (get no-total totals) (get yes-total totals)))
  )
    ;; Return 0 if user didn't win
    (if (is-eq user-winning-bet u0)
      (ok u0)
      ;; Calculate payout
      (let (
        (proportional-winnings (if (> total-winning-bets u0)
          (/ (* user-winning-bet total-losing-bets) total-winning-bets)
          u0))
        (gross-payout (+ user-winning-bet proportional-winnings))
        (fee (/ (* gross-payout (var-get protocol-fee-bps)) u10000))
      )
        (ok (- gross-payout fee))))))

(define-public (claim-winnings (market-id uint))
  (let (
    (market (unwrap! (map-get? markets market-id) err-market-not-found))
    (user-bet (unwrap! (map-get? user-bets { market-id: market-id, user: tx-sender }) err-not-winner))
    (payout (unwrap! (calculate-payout market-id tx-sender) err-payout-error))
  )
    ;; Validate market is resolved
    (asserts! (is-eq (get status market) "resolved") err-not-resolved)
    
    ;; Validate user hasn't claimed
    (asserts! (not (get claimed user-bet)) err-already-claimed)
    
    ;; Validate payout > 0
    (asserts! (> payout u0) err-not-winner)
    
    ;; Transfer payout
    (try! (as-contract (stx-transfer? payout tx-sender (contract-caller))))
    
    ;; Update claimed status
    (map-set user-bets { market-id: market-id, user: tx-sender }
      (merge user-bet { claimed: true }))
    
    ;; Emit event
    (print {
      event: "winnings-claimed",
      market-id: market-id,
      user: tx-sender,
      amount: payout
    })
    
    (ok payout)))

(define-public (claim-refund (market-id uint))
  (let (
    (market (unwrap! (map-get? markets market-id) err-market-not-found))
    (user-bet (unwrap! (map-get? user-bets { market-id: market-id, user: tx-sender }) err-not-winner))
    (refund-amount (+ (get yes-amount user-bet) (get no-amount user-bet)))
  )
    ;; Validate market is cancelled
    (asserts! (is-eq (get status market) "cancelled") err-market-not-open)
    
    ;; Validate user hasn't claimed
    (asserts! (not (get claimed user-bet)) err-already-claimed)
    
    ;; Validate refund > 0
    (asserts! (> refund-amount u0) err-not-winner)
    
    ;; Transfer refund (no fees)
    (try! (as-contract (stx-transfer? refund-amount tx-sender (contract-caller))))
    
    ;; Update claimed status
    (map-set user-bets { market-id: market-id, user: tx-sender }
      (merge user-bet { claimed: true }))
    
    ;; Emit event
    (print {
      event: "refund-claimed",
      market-id: market-id,
      user: tx-sender,
      amount: refund-amount
    })
    
    (ok refund-amount)))
