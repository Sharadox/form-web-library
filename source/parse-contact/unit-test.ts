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
      value: {
        name: "Ana",
        email: "ana@example.com",
        phone: "",
        company: "",
        message: "Hello",
        locale: "pt",
        choices: ["logo"],
        fields: {},
      },
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

  describe("reaching the visitor by email or phone", () => {
    const options = { reach: "email-or-phone" as const, requireMessage: false, fields: ["place"], now: 10_000 };
    const base = { name: "Rui", "started-at": "1000" };

    test.each([
      [{ phone: "+351 912 345 678" }, "valid"],
      [{ email: "rui@example.com" }, "valid"],
      [{ email: "rui@example.com", phone: "(91) 234-5678" }, "valid"],
      [{}, "invalid"],
      [{ phone: "12345" }, "invalid"],
      [{ phone: "call me" }, "invalid"],
      [{ email: "nope", phone: "912345678" }, "invalid"],
      [{ email: "rui@example.com", phone: "abc" }, "invalid"],
    ])("%j is %s", (fields, kind) => {
      expect(parseContact(form({ ...base, ...fields }), options).kind).toBe(kind);
    });

    test("reads extra fields and lets the message be empty", () => {
      expect(parseContact(form({ ...base, phone: "912345678", place: " Vilamoura " }), options)).toMatchObject({
        kind: "valid",
        value: { phone: "912345678", message: "", fields: { place: "Vilamoura" } },
      });
    });
  });
});
