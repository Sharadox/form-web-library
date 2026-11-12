/** A validated contact form submission. */
export interface ContactMessage {
  name: string;
  /** "" when not given (allowed when `reach` is "email-or-phone" and a phone is given). */
  email: string;
  /** "" when not given. */
  phone: string;
  /** Optional; "" when not given. */
  company: string;
  /** "" when not given (allowed when `requireMessage` is false). */
  message: string;
  /** The page's locale, sent in a hidden field. */
  locale: string;
  /** The ticked choices (for example "what do you need?"), only from the allowed list. */
  choices: string[];
  /** The extra text fields asked for (`fields`), each "" when not given. */
  fields: Record<string, string>;
}

export type ParsedContact = { kind: "bot" } | { kind: "invalid" } | { kind: "valid"; value: ContactMessage };

/** How the visitor must leave a way to answer them: an email, or at least one of email and phone. */
export type ContactReach = "email" | "email-or-phone";

export interface ParseContactOptions {
  /** Choice values the form may send; anything else is ignored. None by default. */
  choices?: readonly string[];
  /** The checkbox field holding the choices; "need" by default. */
  choiceField?: string;
  /** "email" (the default) requires a valid email; "email-or-phone" requires either, each valid when given. */
  reach?: ContactReach;
  /** False lets the message be empty; true by default. */
  requireMessage?: boolean;
  /** Extra single-line text fields to read, for example `["place"]`. */
  fields?: readonly string[];
  /** Now, for the fill-time check (tests). */
  now?: number;
}
