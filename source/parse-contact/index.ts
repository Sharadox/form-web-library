import { isLikelyBot } from "@sharadox/form-web-library/bot-check";
import { readField } from "@sharadox/form-web-library/field";
import type { ParseContactOptions, ParsedContact } from "@sharadox/form-web-library/parse-contact/type";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Reads and validates a contact form (`name`, `email`, `company`, `message`, `locale` and checkbox choices), and
 * flags likely bots (honeypot filled or submitted too fast). Fields are trimmed and capped in length.
 *
 * @example
 * const parsed = parseContact(form, { choices: ["website", "logo", "other"] });
 * if (parsed.kind === "valid") console.log(parsed.value.choices);
 */
export function parseContact(
  form: FormData,
  { choices = [], choiceField = "need", now = Date.now() }: ParseContactOptions = {},
): ParsedContact {
  if (isLikelyBot(form, { now })) return { kind: "bot" };
  const value = {
    name: readField(form, "name", 120),
    email: readField(form, "email", 200),
    company: readField(form, "company", 160),
    message: readField(form, "message", 5000),
    locale: readField(form, "locale", 10) || "en",
    choices: [...new Set(form.getAll(choiceField).map(String))].filter((choice) => choices.includes(choice)),
  };
  if (!value.name || !value.message || !EMAIL.test(value.email)) return { kind: "invalid" };
  return { kind: "valid", value };
}
