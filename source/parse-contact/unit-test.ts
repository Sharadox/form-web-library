import { describe, expect, test } from "vitest";
import { parseContact } from "@sharadox/form-web-library/parse-contact";

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) for (const item of [value].flat()) data.append(name, item);
  return data;
};
const valid = { name: " Ana ", email: "ana@example.com", message: "Hello", "started-at": "1000", locale: "pt" };

describe("parseContact", () => {
  test("accepts and trims a valid message, keeping only allowed choices once", () => {
    expect(
      parseContact(form({ ...valid, need: ["logo", "logo", "hack"] }), { choices: ["logo", "other"], now: 10_000 }),
    ).toEqual({
      kind: "valid",
      value: { name: "Ana", email: "ana@example.com", company: "", message: "Hello", locale: "pt", choices: ["logo"] },
    });
  });

  test("reads choices from another field, and defaults the locale", () => {
    const parsed = parseContact(form({ ...valid, locale: "", topic: "a" }), {
      choices: ["a"],
      choiceField: "topic",
      now: 10_000,
    });
    expect(parsed).toMatchObject({ kind: "valid", value: { locale: "en", choices: ["a"] } });
  });

  test("ignores choices when none are allowed", () => {
    expect(parseContact(form({ ...valid, need: "logo" }), { now: 10_000 })).toMatchObject({ value: { choices: [] } });
  });

  test("flags the honeypot and too-fast submissions as bots", () => {
    expect(parseContact(form({ ...valid, website: "spam" }), { now: 10_000 }).kind).toBe("bot");
    expect(parseContact(form(valid), { now: 2000 }).kind).toBe("bot");
  });

  test.each([{ name: "" }, { message: "" }, { email: "ana@example" }])("rejects %j", (change) => {
    expect(parseContact(form({ ...valid, ...change }), { now: 10_000 }).kind).toBe("invalid");
  });

  test("caps field lengths and works with the defaults", () => {
    const parsed = parseContact(form({ ...valid, "started-at": "", message: "a".repeat(6000) }));
    expect(parsed.kind === "valid" && parsed.value.message.length).toBe(5000);
  });
});
