import { createEmailSender, EmailError, readEmailServerConfiguration } from "@sharadox/email-web-library";
import type { InlineImage } from "@sharadox/email-web-library";
import { separate } from "@sharadox/web-library/text/separate";
import { SEPARATOR } from "@sharadox/web-library/text/separator";
import { brandedEmailHtml } from "@sharadox/form-web-library/contact-email";
import type { EmailRow, EmailTheme } from "@sharadox/form-web-library/contact-email/type";
import { createRateLimiter } from "@sharadox/form-web-library/rate-limit";
import { parseContact } from "@sharadox/form-web-library/parse-contact";
import type { ContactActionOptions, ContactLabels, ContactState } from "@sharadox/form-web-library/contact-action/type";

const oneLine = (text: string) => text.replace(/[\r\n]+/g, " ");

/** The email's words when the site gives none. */
export const ENGLISH_LABELS: ContactLabels = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  needs: "Needs",
  language: "Language",
  contact: "Contact",
  message: "Message",
  page: "Form",
  sent: "Sent",
};

/** Black and white, when the site gives no colors. */
export const PLAIN_THEME: EmailTheme = { background: "#000000", foreground: "#ffffff", accent: "#ffffff" };

/** Common languages' names, when the site gives none. */
export const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  en: "English",
  pt: "Português",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
};

/**
 * The page the form was sent from, when it is a web address on the site's domain (or a subdomain of it); anything
 * else is left out, so a forged field can't put a link of someone else's in the inbox.
 */
export function formPage(value: ReturnType<FormData["get"]>, site: string): string | undefined {
  if (typeof value !== "string" || value.length > 500) return undefined;
  try {
    const url = new URL(value);
    const host = url.hostname;
    return url.protocol === "https:" && (host === site || host.endsWith(`.${site}`)) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Builds the work of a contact form's server action: checks for bots (they get a fake success), validates, limits
 * each address and everyone together per day (`dailyMaximum`, so a flood can't run up the email bill), then emails
 * the company in its own layout: the logo and name at the top, every detail the visitor gave, their message, and the
 * page, language, time and IP at the bottom. It comes from "<company> Web Application" with the subject
 * "<company> Web Application · Contact · Name (Company)", and replying answers the visitor. When the visitor left an
 * email and the site gives an `acknowledgement`, they get an automatic reply in their language with their message,
 * which the company can be reached by replying to. Sites can accept a phone instead of an email (`reach`), make the
 * message optional, add fields and write the email in their own language (`labels`).
 *
 * @example
 * const sendContact = createContactAction({ to: "contact@sharadox.com", company: "Sharadox", site: "sharadox.com" });
 * // in a "use server" file:
 * export async function sendContactAction(_: ContactState, form: FormData) { return sendContact(form, ip); }
 */
export function createContactAction({
  to,
  company,
  senderAddress,
  logo,
  theme = PLAIN_THEME,
  languageNames = LANGUAGE_NAMES,
  acknowledgement,
  choices = {},
  site,
  reach = "email",
  requireMessage = true,
  minimumMessageLength = 1,
  requireChoice = false,
  fields = {},
  labels: givenLabels = {},
  rateLimit = { window: 60 * 60 * 1000, maximum: 5 },
  dailyMaximum = 50,
  readConfiguration = readEmailServerConfiguration,
  createSender = createEmailSender,
  reportError = (message, error) => console.error(message, error),
  now = () => new Date(),
}: ContactActionOptions): (form: FormData, ip: string) => Promise<ContactState> {
  const allow = createRateLimiter(rateLimit);
  const allowToday = createRateLimiter({ window: 24 * 60 * 60 * 1000, maximum: dailyMaximum });
  const labels = { ...ENGLISH_LABELS, ...givenLabels };
  const senderName = `${company} Web Application`;
  return async (form, ip) => {
    const parsed = parseContact(form, {
      choices: Object.keys(choices),
      reach,
      requireMessage,
      minimumMessageLength,
      requireChoice,
      fields: Object.keys(fields),
    });
    if (parsed.kind === "bot") return { status: "sent" };
    if (parsed.kind === "invalid") return { status: "invalid" };
    // Each address first, so one address can't use up everyone's daily emails.
    if (!allow(ip) || !allowToday("everyone")) return { status: "rate-limited" };
    const message = parsed.value;
    const page = formPage(form.get("page"), site);
    const language = languageNames[message.locale] ?? message.locale;
    const sent = `${now().toISOString().slice(0, 16).replace("T", " ")} UTC`;
    const named = message.choices.map((choice) => choices[choice]!);
    const who = message.company ? `${message.name} (${message.company})` : message.name;
    const rows: EmailRow[] = [
      { label: labels.name, value: message.name },
      ...(message.email ? [{ label: labels.email, value: message.email, href: `mailto:${message.email}` }] : []),
      ...(message.phone
        ? [{ label: labels.phone, value: message.phone, href: `tel:${message.phone.replace(/[^\d+]/g, "")}` }]
        : []),
      ...(message.company ? [{ label: labels.company, value: message.company }] : []),
      ...Object.entries(fields)
        .filter(([field]) => message.fields[field])
        .map(([field, label]) => ({ label, value: message.fields[field]! })),
      ...(named.length ? [{ label: labels.needs, value: named.join(", ") }] : []),
    ];
    const footer: EmailRow[] = [
      ...(page ? [{ label: labels.page, value: page, href: page }] : [{ label: labels.page, value: site }]),
      { label: labels.language, value: language },
      { label: labels.sent, value: sent },
      { label: "IP", value: ip },
    ];
    const text = [
      ...rows.map((row) => `${row.label}: ${row.value}`),
      ...(message.message ? ["", `${labels.message}:`, message.message] : []),
      "",
      ...footer.map((row) => `${row.label}: ${row.value}`),
    ].join("\n");
    try {
      const image = logo ? await logo() : undefined;
      const inlineImages: InlineImage[] = image ? [{ id: "logo", ...image }] : [];
      const configuration = readConfiguration();
      const sender = createSender(configuration);
      const from = {
        name: senderName,
        address: senderAddress || process.env.EMAIL_SENDER_ADDRESS || configuration.username,
      };
      await sender.send({
        from,
        to,
        // Replying to the email answers the visitor at the address they typed.
        ...(message.email ? { replyTo: { name: oneLine(message.name), address: message.email } } : {}),
        subject: oneLine(separate(SEPARATOR, senderName, labels.contact, who)).slice(0, 300),
        text,
        html: brandedEmailHtml({
          company,
          theme,
          logo: Boolean(image),
          language: "en",
          preview: separate(SEPARATOR, who, named.join(", ")),
          eyebrow: labels.contact,
          heading: who,
          rows,
          ...(message.message ? { quote: { label: labels.message, text: message.message } } : {}),
          footer,
        }),
        inlineImages,
      });
      // The automatic reply: never stops the message itself from counting as sent.
      const reply = acknowledgement?.[message.locale] ?? Object.values(acknowledgement ?? {})[0];
      if (reply && message.email) {
        try {
          await sender.send({
            from,
            to: { name: oneLine(message.name), address: message.email },
            replyTo: to,
            subject: oneLine(reply.subject).slice(0, 300),
            text: [
              reply.heading(message.name),
              "",
              ...reply.paragraphs,
              ...(message.message ? ["", `${reply.messageLabel}:`, message.message] : []),
            ].join("\n"),
            html: brandedEmailHtml({
              company,
              theme,
              logo: Boolean(image),
              language: message.locale,
              preview: reply.paragraphs[0] ?? reply.subject,
              eyebrow: reply.eyebrow,
              heading: reply.heading(message.name),
              paragraphs: reply.paragraphs,
              ...(message.message ? { quote: { label: reply.messageLabel, text: message.message } } : {}),
              footer: [
                {
                  label: company,
                  value: page ? new URL(page).origin.replace("https://", "") : site,
                  href: page ? new URL(page).origin : `https://${site}`,
                },
              ],
            }),
            inlineImages,
          });
        } catch (error) {
          reportError("contact: the automatic reply failed", error);
        }
      }
      return { status: "sent" };
    } catch (error) {
      if (error instanceof EmailError && error.code === "invalid-message") return { status: "invalid" };
      reportError("contact: sending failed", error);
      return { status: "failed" };
    }
  };
}
