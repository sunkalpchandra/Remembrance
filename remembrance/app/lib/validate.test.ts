import { describe, expect, it } from "vitest";
import { isUuid } from "./validate";

describe("isUuid", () => {
  it("accepts canonical v4 UUIDs", () => {
    expect(isUuid("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
  });

  it("accepts uppercase hex", () => {
    expect(isUuid("123E4567-E89B-42D3-A456-426614174000")).toBe(true);
  });

  it("rejects malformed input that would throw a Postgres cast error", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("123e4567e89b42d3a456426614174000")).toBe(false); // no dashes
    expect(isUuid("123e4567-e89b-42d3-a456-42661417400")).toBe(false); // short
    expect(isUuid("123e4567-e89b-42d3-a456-4266141740000")).toBe(false); // long
    expect(isUuid("gggggggg-gggg-gggg-gggg-gggggggggggg")).toBe(false); // non-hex
  });

  it("rejects injection-shaped strings", () => {
    expect(isUuid("123e4567-e89b-42d3-a456-426614174000; DROP TABLE")).toBe(
      false,
    );
    expect(isUuid(" 123e4567-e89b-42d3-a456-426614174000")).toBe(false);
  });
});
