import { expect, test } from "vitest";
import { isLikelyBot } from "@sharadox/form-web-library/bot-check";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

test("flags a filled honeypot and too-fast submissions", () => {
  expect(isLikelyBot(form({ "started-at": "1000" }), { now: 10_000 })).toBe(false);
  expect(isLikelyBot(form({ "started-at": "1000", website: "spam" }), { now: 10_000 })).toBe(true);
  expect(isLikelyBot(form({ "started-at": "1000" }), { now: 2000 })).toBe(true);
});

test("doesn't judge the fill time when the start wasn't sent, and takes other field names and limits", () => {
  expect(isLikelyBot(form({}))).toBe(false);
  expect(isLikelyBot(form({ trap: "x" }), { honeypotField: "trap" })).toBe(true);
  expect(isLikelyBot(form({ began: "1000" }), { startedAtField: "began", minimumFillTime: 500, now: 1600 })).toBe(
    false,
  );
});
