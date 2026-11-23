import type { EmailDesign, EmailSender, EmailServerConfiguration } from "@sharadox/email-web-library";
import type { ContactReach } from "@sharadox/form-web-library/parse-contact/type";

/** What the form shows after a submission. */
export interface ContactState {
  status: "idle" | "sent" | "invalid" | "rate-limited" | "failed";
}

/** Words the email shows in one language, or in each language by code (`{ en: "Home", pt: "Casa" }`). */
export type ContactText = string | Readonly<Record<string, string>>;

/** The email's words around the visitor's answers, in one language. */
export interface ContactLabels {
  /** The form's name: first in the subject ("Contact · Ana · …") and in small capitals above the heading. */
  contact: string;
  /** Before the visitor's name in the heading: "Thank you" ("Thank you, Ana."). */
  thanks: string;
  /** Under the heading: what happens next, and that replying adds to the conversation. */
  paragraphs: readonly string[];
  name: string;
  organization: string;
  email: string;
  phone: string;
  needs: string;
  message: string;
  /** Above the conversation's identifier: "Conversation identifier". */
  conversation: string;
  /** Before the company's name at the end: "Best regards,". */
  closing: string;
}

/** The company's logo at the top of every email: a square image (PNG), sent inside the email. */
export interface EmailLogo {
  content: Uint8Array;
  contentType: string;
  filename: string;
}

export interface ContactActionOptions {
  /**
   * The company's address, for example "contact@sharadox.com": the email goes to it and to the visitor, and replies
   * come to it.
   */
  to: string;
  /**
   * The company, for example "Sharadox". Its emails come from it by name (unless `senderName` says otherwise), and
   * sign off with its name. The subject is the form's name, the visitor's and the conversation's identifier:
   * "Contact · Name (Organization) · 019a…".
   */
  company: string;
  /** The name emails come from; the company's by default. */
  senderName?: string;
  /**
   * The sender address (an address the email server may send from); `EMAIL_SENDER_ADDRESS` or the SMTP server user.
   * Required one way or the other with Amazon SES, which has no server user.
   */
  senderAddress?: string;
  /** The company's logo at the top of every email, in black, with a thin white outline for darkened mail apps. */
  logo?: () => Promise<EmailLogo>;
  /** The same logo in white, shown instead where the mail app is in a dark theme (with `logo` only). */
  darkLogo?: () => Promise<EmailLogo>;
  /**
   * What makes the emails the company's (email-web-library's `EmailDesign`: its name, its logo's size, whether the
   * name sits beside the logo, its signature), in the one layout every mail app shows alike.
   */
  design?: EmailDesign;
  /** Choices the form may send, and how each is named in the email (in each language, or one); none by default. */
  choices?: Readonly<Record<string, ContactText>>;
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
   * example `{ place: { en: "Place", pt: "Local" } }`.
   */
  fields?: Readonly<Record<string, ContactText>>;
  /**
   * The email's words in each language, by code, over the built-in English and Portuguese ones. The email is in the
   * language the visitor used the form in (English when it has no words for it).
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
  /** A new conversation identifier, a UUID version 7 by default (tests give their own). */
  identifier?: () => string;
}
