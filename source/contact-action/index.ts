import { createEmailSender, EmailError, emailLayout, readEmailServerConfiguration } from "@sharadox/email-web-library";
import type { EmailDesign, EmailRow, InlineImage } from "@sharadox/email-web-library";
import { uuidVersion7 } from "@sharadox/web-library/identifier/uuid-version-7";
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
  contact: "Contact",
  thanks: "Thank you",
  paragraphs: [
    "Your message has reached us and we will get back to you as soon as possible, usually within a working day.",
    "Feel free to reply to this email, in case you would like to add anything else to the conversation.",
  ],
  name: "Name",
  organization: "Organization",
  email: "Email",
  phone: "Phone",
  needs: "Needs",
  message: "Message",
  conversation: "Conversation identifier",
  closing: "Best regards,",
};

/** The email's words in Portuguese. */
export const PORTUGUESE_LABELS: ContactLabels = {
  contact: "Contacto",
  thanks: "Obrigado",
  paragraphs: [
    "A sua mensagem chegou até nós e responderemos o mais brevemente possível, normalmente dentro de um dia útil.",
    "Caso queira acrescentar algo à conversa, basta responder a este email.",
  ],
  name: "Nome",
  organization: "Organização",
  email: "Email",
  phone: "Telefone",
  needs: "Necessidades",
  message: "Mensagem",
  conversation: "Identificador da conversa",
  closing: "Cumprimentos,",
};

/** The built-in words, by language. */
export const CONTACT_LABELS: Readonly<Record<string, ContactLabels>> = { en: ENGLISH_LABELS, pt: PORTUGUESE_LABELS };

/** Words in the given language: the text itself, its translation, the English one, or the first there is. */
export function textIn(text: ContactText, locale: string): string {
  if (typeof text === "string") return text;
  return text[locale] ?? text.en ?? Object.values(text)[0]!;
}

/** The logo (when the site gives one) and the company's name beside it, when the site gives no design of its own. */
export const plainDesign = (company: string): EmailDesign => ({
  name: company,
  logo: { width: 44, height: 44 },
  wordmark: true,
});

/**
 * Builds the work of a contact form's server action: checks for bots (they get a fake success), validates, limits
 * each address and everyone together per day (`dailyMaximum`, so a flood can't run up the email bill), then sends one
 * email to both the visitor and the company (`to`), so they share one conversation: replying, the visitor reaches the
 * company; replying to all, the company reaches the visitor (the sending address is never in the way: replies go to
 * `to`). It thanks the visitor by name, says what happens next, lists every detail they gave (their needs one per
 * line, their message keeping its lines) and the conversation's identifier (a UUID version 7), and signs off with the
 * company's name, all in the language the visitor used the form in. It comes from the company by name, with the
 * subject "Contact · Name (Organization) · <identifier>" ("Contacto · …" in Portuguese). A visitor who left only a
 * phone isn't sent anything; the company still is. Sites can accept a phone instead of an email (`reach`), make the
 * message optional, add fields and give the email's words in more languages (`labels`).
 *
 * @example
 * const sendContact = createContactAction({ to: "contact@sharadox.com", company: "Sharadox" });
 * // in a "use server" file:
 * export async function sendContactAction(_: ContactState, form: FormData) { return sendContact(form, ip); }
 */
export function createContactAction({
  to,
  company,
  senderName = company,
  senderAddress,
  logo,
  darkLogo,
  design: givenDesign,
  choices = {},
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
  identifier = () => uuidVersion7(),
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
    // The email is in the language the visitor used the form in.
    const locale = message.locale;
    const labels = { ...(CONTACT_LABELS[locale] ?? ENGLISH_LABELS), ...givenLabels[locale] };
    const conversation = identifier();
    const needs = message.choices.map((choice) => textIn(choices[choice]!, locale));
    const who = message.company ? `${message.name} (${message.company})` : message.name;
    const heading = `${labels.thanks}, ${message.name}.`;
    const rows: EmailRow[] = [
      { label: labels.name, value: message.name },
      ...(message.company ? [{ label: labels.organization, value: message.company }] : []),
      ...(message.email ? [{ label: labels.email, value: message.email, href: `mailto:${message.email}` }] : []),
      ...(message.phone
        ? [{ label: labels.phone, value: message.phone, href: `tel:${message.phone.replace(/[^\d+]/g, "")}` }]
        : []),
      ...Object.entries(fields)
        .filter(([field]) => message.fields[field])
        .map(([field, label]) => ({ label: textIn(label, locale), value: message.fields[field]! })),
      ...(needs.length ? [{ label: labels.needs, value: needs }] : []),
      ...(message.message ? [{ label: labels.message, value: message.message, keepLines: true }] : []),
      { label: labels.conversation, value: conversation },
    ];
    const text = [
      heading,
      "",
      ...labels.paragraphs,
      "",
      ...rows.map((row) =>
        typeof row.value === "string"
          ? `${row.label}:${row.keepLines ? "\n" : " "}${row.value}`
          : [`${row.label}:`, ...row.value.map((item) => `- ${item}`)].join("\n"),
      ),
      "",
      labels.closing,
      `${company}.`,
    ].join("\n");
    try {
      const image = logo ? await logo() : undefined;
      const darkImage = image && darkLogo ? await darkLogo() : undefined;
      const inlineImages: InlineImage[] = [
        ...(image ? [{ id: "logo", ...image }] : []),
        ...(darkImage ? [{ id: "logo-dark", ...darkImage }] : []),
      ];
      const configuration = readConfiguration();
      await createSender(configuration).send({
        from: {
          name: senderName,
          address: senderAddress || process.env.EMAIL_SENDER_ADDRESS || configuration.username,
        },
        // One email to both: the visitor (when they left an email) and the company, in one conversation.
        to: [...(message.email ? [{ name: oneLine(message.name), address: message.email }] : []), to],
        // Replies go to the company, never to the sending address; replying to all, the company reaches the visitor.
        replyTo: to,
        subject: oneLine(separated(labels.contact, who, conversation)).slice(0, 300),
        text,
        html: emailLayout(
          {
            language: locale,
            preview: labels.paragraphs[0] ?? heading,
            eyebrow: labels.contact,
            heading,
            paragraphs: labels.paragraphs,
            rows,
            closing: labels.closing,
          },
          design,
          { light: Boolean(image), dark: Boolean(darkImage) },
        ),
        inlineImages,
      });
      return { status: "sent" };
    } catch (error) {
      if (error instanceof EmailError && error.code === "invalid-message") return { status: "invalid" };
      reportError("contact: sending failed", error);
      return { status: "failed" };
    }
  };
}
