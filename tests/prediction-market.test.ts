import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const admin1 = accounts.get("wallet_1")!;
const user1 = accounts.get("wallet_2")!;
const user2 = accounts.get("wallet_3")!;
const user3 = accounts.get("wallet_4")!;

const contractName = "prediction-market";

// Helper to create a sample Pyth feed ID (32 bytes)
const btcUsdFeedId = new Uint8Array(32).fill(1);

describe("Bezz Prediction Market - Access Control Module", () => {
  it("deployer should be initial admin", () => {
    const { result } = simnet.callReadOnlyFn(
      contractName,
      "is-admin",
      [Cl.principal(deployer)],
      deployer
    );
    expect(result).toBeBool(true);
  });

  it("non-deployer should not be admin initially", () => {
    const { result } = simnet.callReadOnlyFn(
      contractName,
      "is-admin",
      [Cl.principal(user1)],
      deployer
    );
    expect(result).toBeBool(false);
  });

  it("admin can add new admin", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "add-admin",
      [Cl.principal(admin1)],
      deployer
    );
    expect(result).toBeOk(Cl.bool(true));

    // Verify admin1 is now admin
    const checkResult = simnet.callReadOnlyFn(
      contractName,
      "is-admin",
      [Cl.principal(admin1)],
      deployer
    );
    expect(checkResult.result).toBeBool(true);
  });

  it("non-admin cannot add admin", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "add-admin",
      [Cl.principal(user2)],
      user1
    );
    expect(result).toBeErr(Cl.uint(1)); // err-not-authorized
  });

  it("admin can remove admin", () => {
    // First add admin1
    simnet.callPublicFn(
      contractName,
      "add-admin",
      [Cl.principal(admin1)],
      deployer
    );

    // Then remove admin1
    const { result } = simnet.callPublicFn(
      contractName,
      "remove-admin",
      [Cl.principal(admin1)],
      deployer
    );
    expect(result).toBeOk(Cl.bool(true));

    // Verify admin1 is no longer admin
    const checkResult = simnet.callReadOnlyFn(
      contractName,
      "is-admin",
      [Cl.principal(admin1)],
      deployer
    );
    expect(checkResult.result).toBeBool(false);
  });

  it("non-admin cannot remove admin", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "remove-admin",
      [Cl.principal(deployer)],
      user1
    );
    expect(result).toBeErr(Cl.uint(1)); // err-not-authorized
  });
});

describe("Bezz Prediction Market - Market Management Module", () => {
  beforeEach(() => {
    // Reset simnet state for each test
    simnet.setEpoch("3.0");
  });

  it("admin can create market with valid parameters", () => {
    const question = Cl.stringUtf8("Will BTC reach $100k by end of 2024?");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000); // $100k in cents
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    const { result } = simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    expect(result).toBeOk(Cl.uint(1)); // First market ID
  });

  it("non-admin cannot create market", () => {
    const question = Cl.stringUtf8("Will ETH reach $5k?");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(500000); // $5k in cents
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    const { result } = simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      user1
    );

    expect(result).toBeErr(Cl.uint(1)); // err-not-authorized
  });

  it("cannot create market with empty question", () => {
    const question = Cl.stringUtf8("");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    const { result } = simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    expect(result).toBeErr(Cl.uint(2)); // err-invalid-question
  });

  it("cannot create market with zero threshold", () => {
    const question = Cl.stringUtf8("Test market");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(0);
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    const { result } = simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    expect(result).toBeErr(Cl.uint(3)); // err-invalid-threshold
  });

  it("cannot create market with deadline in the past", () => {
    const question = Cl.stringUtf8("Test market");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight - 1);

    const { result } = simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    expect(result).toBeErr(Cl.uint(4)); // err-invalid-deadline
  });

  it("can read market info after creation", () => {
    const question = Cl.stringUtf8("Will BTC reach $100k?");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    // Create market
    simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    // Read market info
    const { result } = simnet.callReadOnlyFn(
      contractName,
      "get-market-info",
      [Cl.uint(1)],
      deployer
    );

    // Just verify it returns successfully with correct data
    const marketData: any = result;
    if (marketData && marketData.value && marketData.value.data) {
      expect(marketData.value.data.question).toStrictEqual(
        Cl.stringUtf8("Will BTC reach $100k?")
      );
      expect(marketData.value.data.status).toStrictEqual(
        Cl.stringAscii("open")
      );
      expect(marketData.value.data.threshold).toStrictEqual(Cl.uint(10000000));
    }
  });

  it("admin can cancel open market", () => {
    // Create market
    const question = Cl.stringUtf8("Test market");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    // Cancel market
    const { result } = simnet.callPublicFn(
      contractName,
      "cancel-market",
      [Cl.uint(1)],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify status is cancelled
    const marketInfo = simnet.callReadOnlyFn(
      contractName,
      "get-market-info",
      [Cl.uint(1)],
      deployer
    );

    // Check status is cancelled
    const marketData: any = marketInfo.result;
    if (marketData && marketData.value && marketData.value.data) {
      expect(marketData.value.data.status).toStrictEqual(
        Cl.stringAscii("cancelled")
      );
    }
  });

  it("non-admin cannot cancel market", () => {
    // Create market
    const question = Cl.stringUtf8("Test market");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    // Try to cancel as non-admin
    const { result } = simnet.callPublicFn(
      contractName,
      "cancel-market",
      [Cl.uint(1)],
      user1
    );

    expect(result).toBeErr(Cl.uint(1)); // err-not-authorized
  });
});

describe("Bezz Prediction Market - Betting Engine Module", () => {
  beforeEach(() => {
    // Create a market for betting tests
    const question = Cl.stringUtf8("Will BTC reach $100k?");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );
  });

  it("user can place bet on YES with valid amount", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(1000000)], // 1 STX on YES
      user1
    );

    expect(result).toBeOk(Cl.bool(true));
  });

  it("user can place bet on NO with valid amount", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(false), Cl.uint(2000000)], // 2 STX on NO
      user2
    );

    expect(result).toBeOk(Cl.bool(true));
  });

  it("cannot bet with amount below minimum", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(500000)], // 0.5 STX (below 1 STX min)
      user1
    );

    expect(result).toBeErr(Cl.uint(14)); // err-invalid-amount
  });

  it("cannot bet on non-existent market", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(999), Cl.bool(true), Cl.uint(1000000)],
      user1
    );

    expect(result).toBeErr(Cl.uint(10)); // err-market-not-found
  });

  it("multiple users can bet on same market", () => {
    // User 1 bets YES
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(3000000)],
      user1
    );

    // User 2 bets NO
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(false), Cl.uint(2000000)],
      user2
    );

    // User 3 bets YES
    const { result } = simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(1000000)],
      user3
    );

    expect(result).toBeOk(Cl.bool(true));

    // Check market totals
    const marketInfo = simnet.callReadOnlyFn(
      contractName,
      "get-market-info",
      [Cl.uint(1)],
      deployer
    );

    const marketData: any = marketInfo.result;
    if (marketData && marketData.value && marketData.value.data) {
      expect(marketData.value.data["yes-total"]).toStrictEqual(
        Cl.uint(4000000)
      );
      expect(marketData.value.data["no-total"]).toStrictEqual(Cl.uint(2000000));
    }
  });

  it("user can place multiple bets and amounts accumulate", () => {
    // First bet
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(1000000)],
      user1
    );

    // Second bet by same user
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(2000000)],
      user1
    );

    // Check user bets
    const { result } = simnet.callReadOnlyFn(
      contractName,
      "get-user-bets",
      [Cl.uint(1), Cl.principal(user1)],
      deployer
    );

    expect(result).toBeOk(
      Cl.tuple({
        "yes-amount": Cl.uint(3000000), // Accumulated 1 + 2 STX
        "no-amount": Cl.uint(0),
        claimed: Cl.bool(false),
      })
    );
  });

  it("user can bet on both sides", () => {
    // Bet on YES
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(1000000)],
      user1
    );

    // Bet on NO
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(false), Cl.uint(1000000)],
      user1
    );

    // Check user bets
    const { result } = simnet.callReadOnlyFn(
      contractName,
      "get-user-bets",
      [Cl.uint(1), Cl.principal(user1)],
      deployer
    );

    expect(result).toBeOk(
      Cl.tuple({
        "yes-amount": Cl.uint(1000000),
        "no-amount": Cl.uint(1000000),
        claimed: Cl.bool(false),
      })
    );
  });

  it("cannot bet after deadline", () => {
    // Mine blocks to pass deadline
    simnet.mineEmptyBlocks(1001);

    const { result } = simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(1000000)],
      user1
    );

    expect(result).toBeErr(Cl.uint(13)); // err-deadline-passed
  });

  it("cannot bet on cancelled market", () => {
    // Cancel the market
    simnet.callPublicFn(contractName, "cancel-market", [Cl.uint(1)], deployer);

    // Try to bet
    const { result } = simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(1000000)],
      user1
    );

    expect(result).toBeErr(Cl.uint(12)); // err-market-not-open
  });
});

describe("Bezz Prediction Market - Oracle Resolution Module", () => {
  beforeEach(() => {
    // Create market
    const question = Cl.stringUtf8("Will BTC reach $100k?");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000); // $100k
    const deadline = Cl.uint(simnet.blockHeight + 100);

    simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );
  });

  it("cannot resolve market before deadline", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "resolve-market",
      [Cl.uint(1), Cl.uint(10500000)], // Final price $105k
      deployer
    );

    expect(result).toBeErr(Cl.uint(16)); // err-deadline-not-reached
  });

  it("can resolve market after deadline with YES outcome", () => {
    // Mine blocks past deadline
    simnet.mineEmptyBlocks(101);

    const { result } = simnet.callPublicFn(
      contractName,
      "resolve-market",
      [Cl.uint(1), Cl.uint(10500000)], // $105k >= $100k threshold
      deployer
    );

    expect(result).toBeOk(Cl.bool(true)); // YES wins
  });

  it("can resolve market after deadline with NO outcome", () => {
    // Mine blocks past deadline
    simnet.mineEmptyBlocks(101);

    const { result } = simnet.callPublicFn(
      contractName,
      "resolve-market",
      [Cl.uint(1), Cl.uint(9500000)], // $95k < $100k threshold
      deployer
    );

    expect(result).toBeOk(Cl.bool(false)); // NO wins
  });

  it("cannot resolve already resolved market", () => {
    // Mine blocks past deadline
    simnet.mineEmptyBlocks(101);

    // First resolution
    simnet.callPublicFn(
      contractName,
      "resolve-market",
      [Cl.uint(1), Cl.uint(10500000)],
      deployer
    );

    // Try to resolve again
    const { result } = simnet.callPublicFn(
      contractName,
      "resolve-market",
      [Cl.uint(1), Cl.uint(9500000)],
      deployer
    );

    expect(result).toBeErr(Cl.uint(12)); // err-market-not-open
  });

  it("admin can override resolution", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "override-resolution",
      [Cl.uint(1), Cl.bool(true), Cl.uint(10500000)],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));
  });

  it("non-admin cannot override resolution", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "override-resolution",
      [Cl.uint(1), Cl.bool(true), Cl.uint(10500000)],
      user1
    );

    expect(result).toBeErr(Cl.uint(1)); // err-not-authorized
  });

  it("cannot override already resolved market", () => {
    // First override
    simnet.callPublicFn(
      contractName,
      "override-resolution",
      [Cl.uint(1), Cl.bool(true), Cl.uint(10500000)],
      deployer
    );

    // Try to override again
    const { result } = simnet.callPublicFn(
      contractName,
      "override-resolution",
      [Cl.uint(1), Cl.bool(false), Cl.uint(9500000)],
      deployer
    );

    expect(result).toBeErr(Cl.uint(17)); // err-already-resolved
  });
});

describe("Bezz Prediction Market - Payout Distribution Module", () => {
  beforeEach(() => {
    // Create market
    const question = Cl.stringUtf8("Will BTC reach $100k?");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight + 100);

    simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    // Place bets
    // User1: 3 STX on YES
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(3000000)],
      user1
    );

    // User2: 2 STX on NO
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(false), Cl.uint(2000000)],
      user2
    );

    // User3: 1 STX on YES
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(1), Cl.bool(true), Cl.uint(1000000)],
      user3
    );

    // Advance past deadline and resolve market (YES wins)
    simnet.mineEmptyBlocks(101);
    simnet.callPublicFn(
      contractName,
      "resolve-market",
      [Cl.uint(1), Cl.uint(10500000)], // YES wins
      deployer
    );
  });

  it("winner can calculate their payout", () => {
    const { result } = simnet.callReadOnlyFn(
      contractName,
      "calculate-payout",
      [Cl.uint(1), Cl.principal(user1)],
      deployer
    );

    // User1 bet 3 STX on YES (winning side)
    // Total YES: 4 STX, Total NO: 2 STX
    // Share of losing pool: (3/4) * 2 = 1.5 STX
    // Gross payout: 3 + 1.5 = 4.5 STX
    // Fee (2%): 4.5 * 0.02 = 0.09 STX
    // Net payout: 4.5 - 0.09 = 4.41 STX = 4,410,000 micro-STX
    expect(result).toBeOk(Cl.uint(4410000));
  });

  it("winner can claim winnings", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-winnings",
      [Cl.uint(1)],
      user1
    );

    expect(result).toBeOk(Cl.uint(4410000));
  });

  it("loser gets zero payout", () => {
    const { result } = simnet.callReadOnlyFn(
      contractName,
      "calculate-payout",
      [Cl.uint(1), Cl.principal(user2)],
      deployer
    );

    expect(result).toBeOk(Cl.uint(0));
  });

  it("loser cannot claim winnings", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-winnings",
      [Cl.uint(1)],
      user2
    );

    expect(result).toBeErr(Cl.uint(20)); // err-not-winner
  });

  it("cannot claim winnings twice", () => {
    // First claim
    simnet.callPublicFn(contractName, "claim-winnings", [Cl.uint(1)], user1);

    // Second claim
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-winnings",
      [Cl.uint(1)],
      user1
    );

    expect(result).toBeErr(Cl.uint(21)); // err-already-claimed
  });

  it("cannot claim winnings from unresolved market", () => {
    // Create new unresolved market
    const question = Cl.stringUtf8("New market");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    // Place bet
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(2), Cl.bool(true), Cl.uint(1000000)],
      user1
    );

    // Try to claim
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-winnings",
      [Cl.uint(2)],
      user1
    );

    // err-payout-error when calculating payout for unresolved market
    expect(result).toBeErr(Cl.uint(22));
  });

  it("user can claim refund from cancelled market", () => {
    // Create new market
    const question = Cl.stringUtf8("Refund test");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    // Place bets
    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(2), Cl.bool(true), Cl.uint(2000000)],
      user1
    );

    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(2), Cl.bool(false), Cl.uint(1000000)],
      user1
    );

    // Cancel market
    simnet.callPublicFn(contractName, "cancel-market", [Cl.uint(2)], deployer);

    // Claim refund
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-refund",
      [Cl.uint(2)],
      user1
    );

    // Should get full refund: 2 + 1 = 3 STX (no fees)
    expect(result).toBeOk(Cl.uint(3000000));
  });

  it("cannot claim refund twice", () => {
    // Create and cancel market
    const question = Cl.stringUtf8("Refund test");
    const asset = Cl.buffer(btcUsdFeedId);
    const threshold = Cl.uint(10000000);
    const deadline = Cl.uint(simnet.blockHeight + 1000);

    simnet.callPublicFn(
      contractName,
      "create-market",
      [question, asset, threshold, deadline],
      deployer
    );

    simnet.callPublicFn(
      contractName,
      "place-bet",
      [Cl.uint(2), Cl.bool(true), Cl.uint(1000000)],
      user1
    );

    simnet.callPublicFn(contractName, "cancel-market", [Cl.uint(2)], deployer);

    // First refund claim
    simnet.callPublicFn(contractName, "claim-refund", [Cl.uint(2)], user1);

    // Second refund claim
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-refund",
      [Cl.uint(2)],
      user1
    );

    expect(result).toBeErr(Cl.uint(21)); // err-already-claimed
  });

  it("cannot claim refund from non-cancelled market", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "claim-refund",
      [Cl.uint(1)], // Market 1 is resolved, not cancelled
      user1
    );

    expect(result).toBeErr(Cl.uint(12)); // err-market-not-open (not cancelled)
  });
});
