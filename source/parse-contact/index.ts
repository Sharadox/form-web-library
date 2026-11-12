import { isLikelyBot } from "@sharadox/form-web-library/bot-check";
import { isEmail, isPhone } from "@sharadox/form-web-library/contact-check";
import { readField } from "@sharadox/form-web-library/field";
import type { ParseContactOptions, ParsedContact } from "@sharadox/form-web-library/parse-contact/type";

/**
 * Reads and validates a contact form (`name`, `email`, `phone`, `company`, `message`, `locale`, checkbox choices and
 * any extra `fields`), and flags likely bots (honeypot filled or submitted too fast). Fields are trimmed and capped in
 * length. By default an email and a message are required; `reach: "email-or-phone"` accepts either way of answering,
 * and `requireMessage: false` an empty message.
 *
 * @example
 * const parsed = parseContact(form, { choices: ["website", "logo", "other"] });
 * if (parsed.kind === "valid") console.log(parsed.value.choices);
 */
export function parseContact(
  form: FormData,
  {
    choices = [],
    choiceField = "need",
    reach = "email",
    requireMessage = true,
    fields = [],
    now = Date.now(),
  }: ParseContactOptions = {},
): ParsedContact {
  if (isLikelyBot(form, { now })) return { kind: "bot" };
  const value = {
    name: readField(form, "name", 120),
    email: readField(form, "email", 200),
    phone: readField(form, "phone", 40),
    company: readField(form, "company", 160),
    message: readField(form, "message", 5000),
    locale: readField(form, "locale", 10) || "en",
    choices: [...new Set(form.getAll(choiceField).map(String))].filter((choice) => choices.includes(choice)),
    fields: Object.fromEntries(fields.map((field) => [field, readField(form, field, 200)])),
  };
  const emailValid = isEmail(value.email);
  const reachable =
    reach === "email"
      ? emailValid
      : (value.email || value.phone) !== "" && (!value.email || emailValid) && (!value.phone || isPhone(value.phone));
  if (!value.name || (requireMessage && !value.message) || !reachable) return { kind: "invalid" };
  return { kind: "valid", value };
}
