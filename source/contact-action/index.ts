import { createEmailSender, EmailError, readEmailServerConfiguration } from "@sharadox/email-web-library";
import { escapeHtml } from "@sharadox/web-library/html/escape";
import { separate } from "@sharadox/web-library/text/separate";
import { createRateLimiter } from "@sharadox/form-web-library/rate-limit";
import { parseContact } from "@sharadox/form-web-library/parse-contact";
import type { ContactActionOptions, ContactState } from "@sharadox/form-web-library/contact-action/type";

const oneLine = (text: string) => text.replace(/[\r\n]+/g, " ");

/**
 * Builds the work of a contact form's server action: checks for bots (they get a fake success), validates, limits
 * each address, then emails the message with the visitor as reply-to, in plain text and HTML (user input escaped).
 * The application's server action reads the visitor's IP address and calls the result.
 *
 * @example
 * const sendContact = createContactAction({ to: "contact@sharadox.com", senderName: "Sharadox Web Application",
 *   site: "sharadox.com", subject: (message) => separate("•", "Contact", message.name) });
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
  rateLimit = { window: 60 * 60 * 1000, maximum: 5 },
  readConfiguration = readEmailServerConfiguration,
  createSender = createEmailSender,
  reportError = (message, error) => console.error(message, error),
}: ContactActionOptions): (form: FormData, ip: string) => Promise<ContactState> {
  const allow = createRateLimiter(rateLimit);
  return async (form, ip) => {
    const parsed = parseContact(form, { choices: Object.keys(choices) });
    if (parsed.kind === "bot") return { status: "sent" };
    if (parsed.kind === "invalid") return { status: "invalid" };
    if (!allow(ip)) return { status: "rate-limited" };
    const message = parsed.value;
    const named = message.choices.map((choice) => choices[choice]!);
    const text = `Name: ${message.name}\nEmail: ${message.email}\nCompany: ${message.company || "—"}\nNeeds: ${named.join(", ") || "—"}\nLanguage: ${message.locale}\nIP: ${ip}\n\n${message.message}`;
    const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#111">
    <p style="color:#666;font-size:13px;margin:0 0 16px">New message from ${escapeHtml(site)} (${escapeHtml(message.locale)})</p>
    <p style="margin:0">${separate("·", `<b>${escapeHtml(message.name)}</b>`, message.company && escapeHtml(message.company))}<br><a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a></p>
    ${named.length ? `<p style="margin:12px 0 0;color:#444">${escapeHtml(named.join(", "))}</p>` : ""}
    <hr style="border:0;border-top:1px solid #eee;margin:18px 0">
    <p style="white-space:pre-wrap;margin:0">${escapeHtml(message.message)}</p></div>`;
    try {
      const configuration = readConfiguration();
      await createSender(configuration).send({
        from: {
          name: senderName,
          address: senderAddress || process.env.EMAIL_SENDER_ADDRESS || configuration.username,
        },
        to,
        // Replying to the email answers the visitor at the address they typed.
        replyTo: { name: oneLine(message.name), address: message.email },
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
