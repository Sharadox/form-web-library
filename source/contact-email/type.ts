/** A brand's colors for its emails: the band at the top and the thin line under it. */
export interface EmailTheme {
  /** The top band's color, behind the logo, for example "#000000". */
  background: string;
  /** The company name's color on the band, for example "#ffffff". */
  foreground: string;
  /** The thin line under the band, for example the brand's gold. */
  accent: string;
}

/** One line of the details table: a label and its value (plain text, or `href` to make it a link). */
export interface EmailRow {
  label: string;
  value: string;
  href?: string;
}

export interface BrandedEmailOptions {
  /** The company, beside the logo in the top band. */
  company: string;
  theme: EmailTheme;
  /** True when a logo is sent with the email as the inline image "logo". */
  logo: boolean;
  /** The language of the email, for the html's `lang`. */
  language: string;
  /** The line shown in the inbox's preview, before the email is opened. */
  preview: string;
  /** The small capitals above the heading, for example "Contact". */
  eyebrow: string;
  heading: string;
  /** Paragraphs under the heading. */
  paragraphs?: readonly string[];
  /** The details table. */
  rows?: EmailRow[];
  /** A longer text in its own box, keeping its line breaks (the visitor's message), with its label. */
  quote?: { label: string; text: string };
  /** Small print at the bottom: where it came from, when, and so on. */
  footer?: EmailRow[];
}
