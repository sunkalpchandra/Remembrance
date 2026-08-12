import { describe, expect, it } from "vitest";
import { timeAgo } from "./relative-time";

const secondsAgo = (s: number) => new Date(Date.now() - s * 1000);

describe("timeAgo", () => {
  it("treats anything under 45s as just now", () => {
    expect(timeAgo(secondsAgo(0))).toBe("just now");
    expect(timeAgo(secondsAgo(44))).toBe("just now");
  });

  it("formats minutes, hours, days, weeks", () => {
    expect(timeAgo(secondsAgo(60 * 5))).toBe("5m ago");
    expect(timeAgo(secondsAgo(3600 * 3))).toBe("3h ago");
    expect(timeAgo(secondsAgo(86400 * 2))).toBe("2d ago");
    expect(timeAgo(secondsAgo(86400 * 14))).toBe("2w ago");
  });

  it("falls back to a date for anything older than a month", () => {
    const old = timeAgo(secondsAgo(86400 * 60));
    expect(old).not.toMatch(/ago$/);
    expect(old.length).toBeGreaterThan(0);
  });

  it("never returns a negative bucket for future timestamps", () => {
    expect(timeAgo(new Date(Date.now() + 60_000))).toBe("just now");
  });

  it("returns empty string for garbage", () => {
    expect(timeAgo("not a date")).toBe("");
  });
});
