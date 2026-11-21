import { expect, test } from "vitest";
import { contactAcknowledgement } from "@sharadox/form-web-library/contact-acknowledgement";

test("says the same in every site's words, with a button to the site in the visitor's language", () => {
  const { en, pt } = contactAcknowledgement("https://luispiresdecor.com");
  expect(en.subject).toBe("We received your message");
  expect(pt.subject).toBe("Recebemos a sua mensagem");
  expect(en.eyebrow).toBe("Message received");
  expect(pt.eyebrow).toBe("Mensagem recebida");
  expect(en.heading("Ana")).toBe("Thank you, Ana.");
  expect(pt.heading("Ana")).toBe("Obrigado, Ana.");
  expect(en.paragraphs).toHaveLength(2);
  expect(pt.messageLabel).toBe("A sua mensagem");
  expect(en.button).toEqual({ label: "Visit luispiresdecor.com", href: "https://luispiresdecor.com/en" });
  expect(pt.button).toEqual({ label: "Visitar luispiresdecor.com", href: "https://luispiresdecor.com/pt" });
});
