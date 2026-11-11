import { expect, test } from "vitest";
import { createRateLimiter } from "@sharadox/form-web-library/rate-limit";

test("allows the maximum hits per window, per key", () => {
  const allow = createRateLimiter({ window: 1000, maximum: 2 });
  expect(allow("first", 0)).toBe(true);
  expect(allow("first", 10)).toBe(true);
  expect(allow("first", 20)).toBe(false);
  expect(allow("second", 20)).toBe(true);
  expect(allow("first", 1011)).toBe(true);
});
