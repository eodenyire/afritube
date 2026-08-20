import { describe, expect, it } from "vitest";
import {
  calculateEarnings,
  creatorAdShareCents,
  creatorSuperChatCents,
  formatCents,
  impressionRevenueCents,
  isAdEligible,
} from "@/lib/earnings";

describe("ad revenue maths", () => {
  it("derives per-impression revenue from CPM", () => {
    expect(impressionRevenueCents(5000)).toBe(5); // $50 CPM -> 5c per view
    expect(impressionRevenueCents(1000)).toBe(1);
    expect(impressionRevenueCents(100)).toBe(1); // floors at 1c
  });

  it("pays the creator 55% of ad revenue", () => {
    expect(creatorAdShareCents(100)).toBe(55);
    expect(creatorAdShareCents(5)).toBe(3); // rounds
  });
});

describe("super chat maths", () => {
  it("pays the creator 70% of the tip", () => {
    expect(creatorSuperChatCents(5)).toBe(350);
    expect(creatorSuperChatCents(19.99)).toBe(1399);
    expect(creatorSuperChatCents(0)).toBe(0);
  });
});

describe("combined earnings", () => {
  it("adds ad share and super chat share", () => {
    const result = calculateEarnings({
      impressions: 1000,
      cpmCents: 5000,
      superChatsUsd: [5, 10, 100],
    });
    expect(result.adEarningsCents).toBe(3000); // 1000 * round(5 * 0.55)
    expect(result.superChatCents).toBe(8050); // (500 + 1000 + 10000) * 0.7
    expect(result.totalCents).toBe(11050);
    expect(formatCents(result.totalCents)).toBe("$110.50");
  });

  it("handles a creator with no activity", () => {
    expect(calculateEarnings({ impressions: 0, cpmCents: 4000, superChatsUsd: [] })).toEqual({
      adEarningsCents: 0,
      superChatCents: 0,
      totalCents: 0,
    });
  });
});

describe("ad eligibility rules", () => {
  const base = {
    isMonetized: true,
    isOwner: false,
    isShort: false,
    durationSeconds: 900,
    adType: "pre_roll" as const,
  };

  it("serves pre-rolls on long-form videos of monetized creators", () => {
    expect(isAdEligible(base)).toBe(true);
  });

  it("never serves ads for non-monetized creators", () => {
    expect(isAdEligible({ ...base, isMonetized: false })).toBe(false);
  });

  it("never serves ads to the creator on their own video", () => {
    expect(isAdEligible({ ...base, isOwner: true })).toBe(false);
  });

  it("skips Shorts and sub-60s videos", () => {
    expect(isAdEligible({ ...base, isShort: true })).toBe(false);
    expect(isAdEligible({ ...base, durationSeconds: 45 })).toBe(false);
  });

  it("only allows mid-rolls past 8 minutes", () => {
    expect(isAdEligible({ ...base, adType: "mid_roll", durationSeconds: 300 })).toBe(false);
    expect(isAdEligible({ ...base, adType: "mid_roll", durationSeconds: 600 })).toBe(true);
  });
});
