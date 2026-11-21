import type { EmailDesign, EmailSender, EmailServerConfiguration } from "@sharadox/email-web-library";
import type { ContactReach } from "@sharadox/form-web-library/parse-contact/type";

/** What the form shows after a submission. */
export interface ContactState {
  status: "idle" | "sent" | "invalid" | "rate-limited" | "failed";
}

/** Words the email shows in one language, or in each language by code (`{ en: "Home", pt: "Casa" }`). */
export type ContactText = string | Readonly<Record<string, string>>;

/** The words the email uses around the visitor's answers, in one language. */
export interface ContactLabels {
  name: string;
  email: string;
  phone: string;
  company: string;
  needs: string;
  language: string;
  /** The form's name: in the subject ("Contact · Ana") and in small capitals above the visitor's name. */
  contact: string;
  /** Above the visitor's message: "Message". */
  message: string;
  /** The page the form was sent from: "Form". */
  page: string;
  /** When it was sent: "Sent". */
  sent: string;
  /** The button that answers the visitor, before their first name: "Reply to". */
  reply: string;
  /** The button that calls a visitor who left only a phone, before their first name: "Call". */
  call: string;
}

/** The automatic reply to the visitor, in one language: thanks, what happens next, and their message back. */
export interface ContactAcknowledgement {
  /** For example "We received your message": the sender already names the company, so the subject doesn't. */
  subject: string;
  /** The heading, from the visitor's name, for example `Thank you, ${name}.`. */
  heading: (name: string) => string;
  /** What happens next. */
  paragraphs: readonly string[];
  /** Above their message: "Your message". */
  messageLabel: string;
  /** The small capitals above the heading, for example "Message received". */
  eyebrow: string;
  /** A button under their message, for example to the site. */
  button?: { label: string; href: string };
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
   * The company, for example "Sharadox". Its emails come from it by name (unless `senderName` says otherwise), and
   * carry its name beside the logo. The subject is the form's name and the visitor's: "Contact · Name (Company)".
   */
  company: string;
  /** The name emails come from; the company's by default. */
  senderName?: string;
  /** The sender address (an address the email server may send from); `EMAIL_SENDER_ADDRESS` or the server user. */
  senderAddress?: string;
  /** The company's logo, at the top of every email. */
  logo?: () => Promise<EmailLogo>;
  /**
   * The brand's design for its emails (email-web-library's `EmailDesign`: colors, type, rules, header, button,
   * signature), so they look like its website; plain black on white by default.
   */
  design?: EmailDesign;
  /** Each language's name in the email, by code; English names of common languages by default. */
  languageNames?: Readonly<Record<string, string>>;
  /**
   * The automatic reply to visitors who left an email, by language (the form's locale; the first one otherwise). It
   * comes from the same sender, and replying to it reaches `to`. None by default.
   */
  acknowledgement?: Readonly<Record<string, ContactAcknowledgement>>;
  /** Choices the form may send, and how each is named in the email (in each language, or one); none by default. */
  choices?: Readonly<Record<string, ContactText>>;
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
  /**
   * Extra single-line fields the form sends, and how each is named in the email (in each language, or one), for
   * example `{ place: { en: "Home", pt: "Casa" } }`.
   */
  fields?: Readonly<Record<string, ContactText>>;
  /**
   * The email's words in each language, by code, over the built-in English and Portuguese ones. The email the company
   * gets is in the language the visitor used the form in (English when it has no words for it).
   */
  labels?: Readonly<Record<string, Partial<ContactLabels>>>;
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
