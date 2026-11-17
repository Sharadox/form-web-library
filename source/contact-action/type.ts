import type { EmailSender, EmailServerConfiguration } from "@sharadox/email-web-library";
import type { EmailTheme } from "@sharadox/form-web-library/contact-email/type";
import type { ContactReach } from "@sharadox/form-web-library/parse-contact/type";

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
  /** The small capitals above the visitor's name: "Contact". */
  contact: string;
  /** Above the visitor's message: "Message". */
  message: string;
  /** The page the form was sent from: "Form". */
  page: string;
  /** When it was sent: "Sent". */
  sent: string;
}

/** The automatic reply to the visitor, in one language: thanks, what happens next, and their message back. */
export interface ContactAcknowledgement {
  /** For example "Sharadox · We received your message". */
  subject: string;
  /** The heading, from the visitor's name, for example `Thank you, ${name}.`. */
  heading: (name: string) => string;
  /** What happens next. */
  paragraphs: string[];
  /** Above their message: "Your message". */
  messageLabel: string;
  /** The small capitals above the heading, for example "Message received". */
  eyebrow: string;
}

/** The company's logo at the top of every email: a square image (PNG), sent inside the email. */
export interface EmailLogo {
  content: Uint8Array;
  contentType: string;
  filename: string;
}

export interface ContactActionOptions {
  /** Where messages go, for example "contact@sharadox.com". */
  to: string;
  /**
   * The company, for example "Sharadox". Its emails come from "<company> Web Application", with the subject
   * "<company> Web Application · Contact · Name (Company)", and carry its name beside the logo.
   */
  company: string;
  /** The sender address (an address the email server may send from); `EMAIL_SENDER_ADDRESS` or the server user. */
  senderAddress?: string;
  /** The company's logo, at the top of every email. */
  logo?: () => Promise<EmailLogo>;
  /** The brand's colors for the top of every email; black and white by default. */
  theme?: EmailTheme;
  /** Each language's name in the email, by code; English names of common languages by default. */
  languageNames?: Readonly<Record<string, string>>;
  /**
   * The automatic reply to visitors who left an email, by language (the form's locale; the first one otherwise). It
   * comes from the same sender, and replying to it reaches `to`. None by default.
   */
  acknowledgement?: Readonly<Record<string, ContactAcknowledgement>>;
  /** Choices the form may send, and how each is named in the email; none by default. */
  choices?: Readonly<Record<string, string>>;
  /**
   * The site's domain, for example "sharadox.com". The page the form was sent from (the "page" field) is shown only
   * when it is on this domain or one of its subdomains.
   */
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
  /** Now, for the time the email shows (tests). */
  now?: () => Date;
}
