/** A validated contact form submission. */
export interface ContactMessage {
  name: string;
  email: string;
  /** Optional; "" when not given. */
  company: string;
  message: string;
  /** The page's locale, sent in a hidden field. */
  locale: string;
  /** The ticked choices (for example "what do you need?"), only from the allowed list. */
  choices: string[];
}

export type ParsedContact = { kind: "bot" } | { kind: "invalid" } | { kind: "valid"; value: ContactMessage };

export interface ParseContactOptions {
  /** Choice values the form may send; anything else is ignored. None by default. */
  choices?: readonly string[];
  /** The checkbox field holding the choices; "need" by default. */
  choiceField?: string;
  /** Now, for the fill-time check (tests). */
  now?: number;
}
