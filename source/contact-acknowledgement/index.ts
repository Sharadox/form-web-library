import type { ContactAcknowledgement } from "@sharadox/form-web-library/contact-action/type";

/**
 * The automatic reply every site's contact form sends, in English and Portuguese, with the same words everywhere:
 * "We received your message", thanks by name, a reply within one working day, the message back, and a button to the
 * site (`site`, its address, opened in the visitor's language).
 *
 * @example
 * createContactAction({ ..., acknowledgement: contactAcknowledgement("https://sharadox.com") });
 */
export function contactAcknowledgement(site: string): Readonly<Record<"en" | "pt", ContactAcknowledgement>> {
  const address = new URL(site);
  const page = (locale: string) => new URL(`/${locale}`, address).href;
  return {
    en: {
      subject: "We received your message",
      eyebrow: "Message received",
      heading: (name) => `Thank you, ${name}.`,
      paragraphs: [
        "Your message reached us, and we'll get back to you shortly, usually within one working day.",
        "Anything to add? Just reply to this email.",
      ],
      messageLabel: "Your message",
      button: { label: `Visit ${address.host}`, href: page("en") },
    },
    pt: {
      subject: "Recebemos a sua mensagem",
      eyebrow: "Mensagem recebida",
      heading: (name) => `Obrigado, ${name}.`,
      paragraphs: [
        "A sua mensagem chegou até nós, e respondemos em breve, normalmente num dia útil.",
        "Quer acrescentar alguma coisa? Basta responder a este email.",
      ],
      messageLabel: "A sua mensagem",
      button: { label: `Visitar ${address.host}`, href: page("pt") },
    },
  };
}
