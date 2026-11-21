import { createEmailSender, EmailError, emailLayout, readEmailServerConfiguration } from "@sharadox/email-web-library";
import type { EmailDesign, EmailRow, InlineImage } from "@sharadox/email-web-library";
import { separated } from "@sharadox/web-library/text/separated";
import { createRateLimiter } from "@sharadox/form-web-library/rate-limit";
import { parseContact } from "@sharadox/form-web-library/parse-contact";
import type {
  ContactActionOptions,
  ContactLabels,
  ContactState,
  ContactText,
} from "@sharadox/form-web-library/contact-action/type";

const oneLine = (text: string) => text.replace(/[\r\n]+/g, " ");

/** The email's words in English. */
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
  reply: "Reply to",
  call: "Call",
};

/** The email's words in Portuguese. */
export const PORTUGUESE_LABELS: ContactLabels = {
  name: "Nome",
  email: "Email",
  phone: "Telefone",
  company: "Empresa",
  needs: "Pedido",
  language: "Idioma",
  contact: "Contacto",
  message: "Mensagem",
  page: "Formulário",
  sent: "Enviado",
  reply: "Responder a",
  call: "Ligar a",
};

/** The built-in words, by language. */
export const CONTACT_LABELS: Readonly<Record<string, ContactLabels>> = { en: ENGLISH_LABELS, pt: PORTUGUESE_LABELS };

/** Words in the given language: the text itself, its translation, the English one, or the first there is. */
export function textIn(text: ContactText, locale: string): string {
  if (typeof text === "string") return text;
  return text[locale] ?? text.en ?? Object.values(text)[0]!;
}

/** Black on white, plainly, when the site gives no design of its own. */
export const plainDesign = (company: string): EmailDesign => ({
  name: company,
  logo: { width: 44, height: 44 },
  wordmark: true,
  align: "left",
  colors: {
    page: "#f4f4f5",
    card: "#ffffff",
    edge: "#e4e4e7",
    text: "#09090b",
    muted: "#3f3f46",
    quiet: "#71717a",
    rule: "#ececec",
    accent: "#09090b",
    box: "#f6f6f7",
    onAccent: "#ffffff",
  },
  fonts: {
    heading: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    label: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  heading: { size: 24, weight: 600, letterSpacing: "-0.02em", lineHeight: 1.3 },
  label: { size: 11, letterSpacing: "0.12em" },
  rule: "solid",
  radius: 16,
  button: { radius: 999, uppercase: false, letterSpacing: "0" },
});

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
 * the company in its own design (`design`): its logo at the top, every detail the visitor gave, their message, a
 * button to answer them, and the page, language, time and IP at the bottom, all in the language the visitor used the
 * form in. It comes from the company by name, with the subject "Contact · Name (Company)" ("Contacto · …" in
 * Portuguese), and replying answers the visitor. When the visitor left an
 * email and the site gives an `acknowledgement`, they get an automatic reply in their language with their message,
 * which the company can be reached by replying to. Sites can accept a phone instead of an email (`reach`), make the
 * message optional, add fields and give the email's words in more languages (`labels`).
 *
 * @example
 * const sendContact = createContactAction({ to: "contact@sharadox.com", company: "Sharadox", site: "sharadox.com" });
 * // in a "use server" file:
 * export async function sendContactAction(_: ContactState, form: FormData) { return sendContact(form, ip); }
 */
export function createContactAction({
  to,
  company,
  senderName = company,
  senderAddress,
  logo,
  design: givenDesign,
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
  const design = givenDesign ?? plainDesign(company);
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
    // The company reads the email in the language the visitor used the form in.
    const locale = message.locale;
    const labels = { ...(CONTACT_LABELS[locale] ?? ENGLISH_LABELS), ...givenLabels[locale] };
    const page = formPage(form.get("page"), site);
    const language = languageNames[message.locale] ?? message.locale;
    const sent = `${now().toISOString().slice(0, 16).replace("T", " ")} UTC`;
    const named = message.choices.map((choice) => textIn(choices[choice]!, locale));
    const who = message.company ? `${message.name} (${message.company})` : message.name;
    const firstName = message.name.split(/\s+/)[0]!;
    // The one thing to do: answer by email, or call when only a phone was left.
    const answer = message.email
      ? { label: `${labels.reply} ${firstName}`, href: `mailto:${message.email}` }
      : { label: `${labels.call} ${firstName}`, href: `tel:${message.phone.replace(/[^\d+]/g, "")}` };
    const rows: EmailRow[] = [
      { label: labels.name, value: message.name },
      ...(message.email ? [{ label: labels.email, value: message.email, href: `mailto:${message.email}` }] : []),
      ...(message.phone
        ? [{ label: labels.phone, value: message.phone, href: `tel:${message.phone.replace(/[^\d+]/g, "")}` }]
        : []),
      ...(message.company ? [{ label: labels.company, value: message.company }] : []),
      ...Object.entries(fields)
        .filter(([field]) => message.fields[field])
        .map(([field, label]) => ({ label: textIn(label, locale), value: message.fields[field]! })),
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
        subject: oneLine(separated(labels.contact, who)).slice(0, 300),
        text,
        html: emailLayout(
          {
            language: locale,
            preview: separated(who, named.join(", ")),
            eyebrow: labels.contact,
            heading: who,
            rows,
            ...(message.message ? { quote: { label: labels.message, text: message.message } } : {}),
            button: answer,
            footer,
          },
          design,
          Boolean(image),
        ),
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
            html: emailLayout(
              {
                language: message.locale,
                preview: reply.paragraphs[0] ?? reply.subject,
                eyebrow: reply.eyebrow,
                heading: reply.heading(message.name),
                paragraphs: reply.paragraphs,
                ...(message.message ? { quote: { label: reply.messageLabel, text: message.message } } : {}),
                ...(reply.button ? { button: reply.button } : {}),
                // The company's own signature says where it is; without one, a line to its site does.
                ...(design.signature?.length
                  ? {}
                  : {
                      footer: [
                        {
                          label: company,
                          value: page ? new URL(page).origin.replace("https://", "") : site,
                          href: page ? new URL(page).origin : `https://${site}`,
                        },
                      ],
                    }),
              },
              design,
              Boolean(image),
            ),
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
