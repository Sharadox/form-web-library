import { createEmailSender, EmailError, readEmailServerConfiguration } from "@sharadox/email-web-library";
import { escapeHtml } from "@sharadox/web-library/html/escape";
import { separate } from "@sharadox/web-library/text/separate";
import { SEPARATOR } from "@sharadox/web-library/text/separator";
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
  from: "New message from",
};

/**
 * Builds the work of a contact form's server action: checks for bots (they get a fake success), validates, limits
 * each address, then emails the message in plain text and HTML (user input escaped), with the visitor as reply-to
 * when they left an email. Sites can accept a phone instead of an email (`reach`), make the message optional, add
 * fields and write the email in their own language (`labels`).
 *
 * @example
 * const sendContact = createContactAction({ to: "contact@sharadox.com", senderName: "Sharadox Web Application",
 *   site: "sharadox.com", subject: (message) => separate(SEPARATOR, "Contact", message.name) });
 * // in a "use server" file:
 * export async function sendContactAction(_: ContactState, form: FormData) { return sendContact(form, ip); }
 */
export function createContactAction({
  to,
  senderName,
  senderAddress,
  subject,
  choices = {},
  site,
  reach = "email",
  requireMessage = true,
  fields = {},
  labels: givenLabels = {},
  rateLimit = { window: 60 * 60 * 1000, maximum: 5 },
  readConfiguration = readEmailServerConfiguration,
  createSender = createEmailSender,
  reportError = (message, error) => console.error(message, error),
}: ContactActionOptions): (form: FormData, ip: string) => Promise<ContactState> {
  const allow = createRateLimiter(rateLimit);
  const labels = { ...ENGLISH_LABELS, ...givenLabels };
  return async (form, ip) => {
    const parsed = parseContact(form, {
      choices: Object.keys(choices),
      reach,
      requireMessage,
      fields: Object.keys(fields),
    });
    if (parsed.kind === "bot") return { status: "sent" };
    if (parsed.kind === "invalid") return { status: "invalid" };
    if (!allow(ip)) return { status: "rate-limited" };
    const message = parsed.value;
    const named = message.choices.map((choice) => choices[choice]!);
    const extra = Object.entries(fields).map(([field, label]) => [label, message.fields[field]!] as const);
    const lines = [
      [labels.name, message.name],
      [labels.email, message.email || "—"],
      ...(message.phone ? [[labels.phone, message.phone] as const] : []),
      [labels.company, message.company || "—"],
      ...extra.map(([label, value]) => [label, value || "—"] as const),
      [labels.needs, named.join(", ") || "—"],
      [labels.language, message.locale],
      ["IP", ip],
    ];
    const text = `${lines.map(([label, value]) => `${label}: ${value}`).join("\n")}${message.message ? `\n\n${message.message}` : ""}`;
    const contacts = [
      message.email && `<a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a>`,
      message.phone &&
        `<a href="tel:${escapeHtml(message.phone.replace(/[^\d+]/g, ""))}">${escapeHtml(message.phone)}</a>`,
    ];
    const details = extra.filter(([, value]) => value);
    const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#111">
    <p style="color:#666;font-size:13px;margin:0 0 16px">${escapeHtml(labels.from)} ${escapeHtml(site)} (${escapeHtml(message.locale)})</p>
    <p style="margin:0">${separate(SEPARATOR, `<b>${escapeHtml(message.name)}</b>`, message.company && escapeHtml(message.company))}<br>${separate(SEPARATOR, ...contacts)}</p>
    ${details.length ? `<p style="margin:12px 0 0;color:#444">${details.map(([label, value]) => `${escapeHtml(label)}: ${escapeHtml(value)}`).join("<br>")}</p>` : ""}
    ${named.length ? `<p style="margin:12px 0 0;color:#444">${escapeHtml(named.join(", "))}</p>` : ""}
    ${message.message ? `<hr style="border:0;border-top:1px solid #eee;margin:18px 0">\n    <p style="white-space:pre-wrap;margin:0">${escapeHtml(message.message)}</p>` : ""}</div>`;
    try {
      const configuration = readConfiguration();
      await createSender(configuration).send({
        from: {
          name: senderName,
          address: senderAddress || process.env.EMAIL_SENDER_ADDRESS || configuration.username,
        },
        to,
        // Replying to the email answers the visitor at the address they typed.
        ...(message.email ? { replyTo: { name: oneLine(message.name), address: message.email } } : {}),
        subject: oneLine(subject(message)).slice(0, 300),
        text,
        html,
      });
      return { status: "sent" };
    } catch (error) {
      if (error instanceof EmailError && error.code === "invalid-message") return { status: "invalid" };
      reportError("contact: sending failed", error);
      return { status: "failed" };
    }
  };
}
