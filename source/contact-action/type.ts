import type { EmailSender, EmailServerConfiguration } from "@sharadox/email-web-library";
import type { ContactMessage } from "@sharadox/form-web-library/parse-contact/type";

/** What the form shows after a submission. */
export interface ContactState {
  status: "idle" | "sent" | "invalid" | "rate-limited" | "failed";
}

export interface ContactActionOptions {
  /** Where messages go, for example "contact@sharadox.com". */
  to: string;
  /** The sender's display name, for example "Sharadox Web Application". */
  senderName: string;
  /** The sender address (an address the email server may send from); `EMAIL_SENDER_ADDRESS` or the server user. */
  senderAddress?: string;
  /** The email subject for a message, for example `Contact • Ana (Café)`. */
  subject: (message: ContactMessage) => string;
  /** Choices the form may send, and how each is named in the email; none by default. */
  choices?: Readonly<Record<string, string>>;
  /** Where the email says the message came from, for example "sharadox.com". */
  site: string;
  /** Messages per address per window; 5 per hour by default. */
  rateLimit?: { window: number; maximum: number };
  /** The email server; read from `EMAIL_SERVER_*` by default. */
  readConfiguration?: () => EmailServerConfiguration;
  createSender?: (configuration: EmailServerConfiguration) => EmailSender;
  /** Where failures are reported; `console.error` by default. */
  reportError?: (message: string, error: unknown) => void;
}
