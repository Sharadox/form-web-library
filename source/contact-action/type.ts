import type { EmailSender, EmailServerConfiguration } from "@sharadox/email-web-library";
import type { ContactMessage, ContactReach } from "@sharadox/form-web-library/parse-contact/type";

/** What the form shows after a submission. */
export interface ContactState {
  status: "idle" | "sent" | "invalid" | "rate-limited" | "failed";
}

/** The words the email uses around the visitor's answers, so the inbox can read it in its own language. */
export interface ContactLabels {
  name: string;
  email: string;
  phone: string;
  company: string;
  needs: string;
  language: string;
  /** Before the site's name: "New message from". */
  from: string;
}

export interface ContactActionOptions {
  /** Where messages go, for example "contact@sharadox.com". */
  to: string;
  /** The sender's display name, for example "Sharadox Web Application". */
  senderName: string;
  /** The sender address (an address the email server may send from); `EMAIL_SENDER_ADDRESS` or the server user. */
  senderAddress?: string;
  /** The email subject for a message, for example `Contact · Ana (Café)`. */
  subject: (message: ContactMessage) => string;
  /** Choices the form may send, and how each is named in the email; none by default. */
  choices?: Readonly<Record<string, string>>;
  /** Where the email says the message came from, for example "sharadox.com". */
  site: string;
  /** "email" (the default) requires an email; "email-or-phone" accepts either way of answering. */
  reach?: ContactReach;
  /** False lets the message be empty; true by default. */
  requireMessage?: boolean;
  /** The fewest characters a required message may have; 1 by default. */
  minimumMessageLength?: number;
  /** True requires at least one choice; false by default. */
  requireChoice?: boolean;
  /** Extra single-line fields the form sends, and how each is named in the email, for example `{ place: "Home" }`. */
  fields?: Readonly<Record<string, string>>;
  /** The email's words, in English by default. */
  labels?: Partial<ContactLabels>;
  /** Messages per address per window; 5 per hour by default. */
  rateLimit?: { window: number; maximum: number };
  /**
   * Emails sent per day from everyone together, 50 by default: a ceiling on what a flood from many addresses can cost
   * in email sending. Kept by each server instance; past it, visitors are told to try later.
   */
  dailyMaximum?: number;
  /** The email server; read from `EMAIL_SERVER_*` by default. */
  readConfiguration?: () => EmailServerConfiguration;
  createSender?: (configuration: EmailServerConfiguration) => EmailSender;
  /** Where failures are reported; `console.error` by default. */
  reportError?: (message: string, error: unknown) => void;
}
