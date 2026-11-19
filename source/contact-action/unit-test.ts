import { beforeEach, describe, expect, test, vi } from "vitest";
import { EmailError } from "@sharadox/email-web-library";
import { createContactAction, plainDesign, formPage } from "@sharadox/form-web-library/contact-action";

const send = vi.fn();
const configuration = {
  host: "smtp.example.com",
  port: 587,
  username: "user",
  password: "secret",
  security: "starttls" as const,
};
const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) for (const item of [value].flat()) data.append(name, item);
  return data;
};
const valid = {
  name: "Ana\nSá",
  email: "ana@example.com",
  message: "<b>Hi</b>",
  company: "Café",
  "started-at": "1",
  locale: "pt",
  page: "https://development.sharadox.com/pt#contact",
};
const now = () => new Date("2026-11-17T21:30:00Z");
const logo = async () => ({ content: new Uint8Array([1, 2, 3]), contentType: "image/png", filename: "logo.png" });
const acknowledgement = {
  en: {
    subject: "Sharadox · We received your message",
    eyebrow: "Message received",
    heading: (name: string) => `Thank you, ${name}.`,
    paragraphs: ["We'll reply soon."],
    messageLabel: "Your message",
  },
  pt: {
    subject: "Sharadox · Recebemos a sua mensagem",
    eyebrow: "Mensagem recebida",
    heading: (name: string) => `Obrigado, ${name}.`,
    paragraphs: ["Respondemos em breve."],
    messageLabel: "A sua mensagem",
  },
};
const create = (options: Partial<Parameters<typeof createContactAction>[0]> = {}) =>
  createContactAction({
    to: "contact@sharadox.com",
    company: "Sharadox",
    site: "sharadox.com",
    choices: { logo: "Logo", other: "Others" },
    readConfiguration: () => configuration,
    createSender: () => ({ send }) as never,
    now,
    ...options,
  });

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ messageId: "<id>", accepted: [], rejected: [] });
  vi.unstubAllEnvs();
});

describe("createContactAction", () => {
  test("emails the company as its web application, the visitor as reply-to, every detail in its layout", async () => {
    vi.stubEnv("EMAIL_SENDER_ADDRESS", "contact@web.sharadox.com");
    expect(await create({ logo })(form({ ...valid, need: ["other", "logo"] }), "1.2.3.4")).toEqual({ status: "sent" });
    const message = send.mock.calls[0]![0];
    expect(message.from).toEqual({ name: "Sharadox Web Application", address: "contact@web.sharadox.com" });
    expect(message.to).toBe("contact@sharadox.com");
    expect(message.replyTo).toEqual({ name: "Ana Sá", address: "ana@example.com" });
    expect(message.subject).toBe("Sharadox Web Application · Contact · Ana Sá (Café)");
    expect(message.text).toBe(
      "Name: Ana\nSá\nEmail: ana@example.com\nCompany: Café\nNeeds: Others, Logo\n\nMessage:\n<b>Hi</b>\n\n" +
        "Form: https://development.sharadox.com/pt#contact\nLanguage: Português\nSent: 2026-11-17 21:30 UTC\nIP: 1.2.3.4",
    );
    expect(message.html).toContain('<img src="cid:logo"');
    expect(message.html).toContain("&lt;b&gt;Hi&lt;/b&gt;");
    expect(message.html).toContain('href="mailto:ana@example.com"');
    expect(message.html).toContain('href="https://development.sharadox.com/pt#contact"');
    expect(message.html).toContain(">Reply to Ana</a>");
    expect(message.inlineImages).toEqual([
      { id: "logo", content: new Uint8Array([1, 2, 3]), contentType: "image/png", filename: "logo.png" },
    ]);
    // No acknowledgement given: no automatic reply.
    expect(send).toHaveBeenCalledTimes(1);
  });

  test("replies automatically in the visitor's language, the company as reply-to", async () => {
    await create({ logo, acknowledgement })(form(valid), "1.2.3.4");
    const reply = send.mock.calls[1]![0];
    expect(reply.to).toEqual({ name: "Ana Sá", address: "ana@example.com" });
    expect(reply.replyTo).toBe("contact@sharadox.com");
    expect(reply.from.name).toBe("Sharadox Web Application");
    expect(reply.subject).toBe("Sharadox · Recebemos a sua mensagem");
    expect(reply.text).toBe("Obrigado, Ana\nSá.\n\nRespondemos em breve.\n\nA sua mensagem:\n<b>Hi</b>");
    expect(reply.html).toContain('lang="pt"');
    expect(reply.html).toContain('href="https://development.sharadox.com"');
    expect(reply.inlineImages).toHaveLength(1);
    // A language without its own reply gets the first one; no message, no quote; no page, the site.
    await create({ acknowledgement })(
      form({ ...valid, locale: "de", message: "", page: "https://evil.example/x" }),
      "1.2.3.5",
    ).catch(() => {});
    await create({ acknowledgement, requireMessage: false })(
      form({ ...valid, locale: "de", message: "", page: "https://evil.example/x" }),
      "1.2.3.6",
    );
    const other = send.mock.calls.at(-1)![0];
    expect(other.subject).toBe("Sharadox · We received your message");
    expect(other.text).toBe("Thank you, Ana\nSá.\n\nWe'll reply soon.");
    expect(other.html).toContain('href="https://sharadox.com"');
    expect(other.inlineImages).toEqual([]);
    expect(send.mock.calls.at(-2)![0].text).toContain("Form: sharadox.com\nLanguage: Deutsch");
  });

  test("never replies without an email, and a failed reply still counts the message as sent", async () => {
    const reportError = vi.fn();
    const action = create({ acknowledgement, reach: "email-or-phone", reportError });
    await action(form({ ...valid, email: "", phone: "+351 912 345 678" }), "8.8.8.1");
    expect(send).toHaveBeenCalledTimes(1);
    send.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("bounced"));
    expect((await action(form(valid), "8.8.8.2")).status).toBe("sent");
    expect(reportError).toHaveBeenCalledWith("contact: the automatic reply failed", expect.any(Error));
  });

  test("names an unknown language by its code, and previews a reply without paragraphs by its subject", async () => {
    const quiet = { ...acknowledgement.en, paragraphs: [] };
    await create({ acknowledgement: { xx: quiet } })(form({ ...valid, locale: "xx" }), "9.9.9.9");
    expect(send.mock.calls[0]![0].text).toContain("Language: xx");
    expect(send.mock.calls[1]![0].html).toContain("Sharadox · We received your message</div>");
  });

  test("shows the form's page only on the site's own domain", () => {
    expect(formPage("https://sharadox.com/en#contact", "sharadox.com")).toBe("https://sharadox.com/en#contact");
    expect(formPage("https://a.development.sharadox.com/", "sharadox.com")).toBe("https://a.development.sharadox.com/");
    expect(formPage("https://notsharadox.com/", "sharadox.com")).toBeUndefined();
    expect(formPage("http://sharadox.com/", "sharadox.com")).toBeUndefined();
    expect(formPage("not a url", "sharadox.com")).toBeUndefined();
    expect(formPage(null, "sharadox.com")).toBeUndefined();
    expect(formPage(`https://sharadox.com/${"a".repeat(500)}`, "sharadox.com")).toBeUndefined();
  });

  test("falls back to the server user as sender, and leaves empty fields out", async () => {
    await create({ senderAddress: undefined })(form({ ...valid, company: "" }), "1.2.3.4");
    const message = send.mock.calls[0]![0];
    expect(message.from.address).toBe("user");
    expect(message.subject).toBe("Sharadox Web Application · Contact · Ana Sá");
    expect(message.text).not.toContain("Company:");
    expect(message.text).not.toContain("Needs:");
  });

  test("uses a given sender address and the defaults for choices", async () => {
    await create({ senderAddress: "hello@example.com", choices: undefined })(
      form({ ...valid, need: "logo" }),
      "1.2.3.4",
    );
    expect(send.mock.calls[0]![0].from.address).toBe("hello@example.com");
  });

  test("fakes success for bots without sending, and reports invalid input", async () => {
    const action = create();
    expect(await action(form({ ...valid, website: "spam" }), "1.2.3.4")).toEqual({ status: "sent" });
    expect(await action(form({ ...valid, email: "nope" }), "1.2.3.4")).toEqual({ status: "invalid" });
    expect(send).not.toHaveBeenCalled();
  });

  test("limits each address", async () => {
    const action = create({ rateLimit: { window: 60_000, maximum: 1 } });
    expect((await action(form(valid), "5.5.5.5")).status).toBe("sent");
    expect((await action(form(valid), "5.5.5.5")).status).toBe("rate-limited");
  });

  test("limits everyone together per day, after each address", async () => {
    const action = create({ dailyMaximum: 2, rateLimit: { window: 60_000, maximum: 1 } });
    expect((await action(form(valid), "6.6.6.1")).status).toBe("sent");
    expect((await action(form(valid), "6.6.6.1")).status).toBe("rate-limited");
    expect((await action(form(valid), "6.6.6.2")).status).toBe("sent");
    expect((await action(form(valid), "6.6.6.3")).status).toBe("rate-limited");
    expect(send).toHaveBeenCalledTimes(2);
  });

  test("passes the message length and choice rules on", async () => {
    const action = create({ minimumMessageLength: 20, requireChoice: true });
    expect((await action(form({ ...valid, need: "logo" }), "7.7.7.7")).status).toBe("invalid");
    expect((await action(form({ ...valid, message: "A message long enough." }), "7.7.7.7")).status).toBe("invalid");
    expect((await action(form({ ...valid, message: "A message long enough.", need: "logo" }), "7.7.7.7")).status).toBe(
      "sent",
    );
  });

  test("reports failures, and invalid messages refused by the email library", async () => {
    const reportError = vi.fn();
    send.mockRejectedValueOnce(new Error("refused"));
    expect((await create({ reportError })(form(valid), "1.1.1.1")).status).toBe("failed");
    expect(reportError).toHaveBeenCalledWith("contact: sending failed", expect.any(Error));
    send.mockRejectedValueOnce(new EmailError("invalid-message", "bad"));
    expect((await create()(form(valid), "2.2.2.2")).status).toBe("invalid");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockRejectedValueOnce(new Error("down"));
    expect((await create({ reportError: undefined, now: undefined })(form(valid), "3.3.3.3")).status).toBe("failed");
    expect(errors).toHaveBeenCalled();
  });

  test("reads the email server from the environment by default", async () => {
    vi.stubEnv("EMAIL_SERVER_HOST", "");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      (await create({ readConfiguration: undefined, createSender: undefined })(form(valid), "4.4.4.4")).status,
    ).toBe("failed");
    expect(errors).toHaveBeenCalled();
  });

  test("accepts a phone instead of an email, adds fields and speaks the inbox's language", async () => {
    const action = create({
      reach: "email-or-phone",
      requireMessage: false,
      fields: { place: "Casa" },
      labels: { name: "Nome", phone: "Telefone", company: "Empresa", contact: "Contacto", page: "Formulário" },
      languageNames: { pt: "Português" },
      design: { ...plainDesign("Sharadox"), colors: { ...plainDesign("Sharadox").colors, accent: "#c79a43" } },
    });
    const phoneOnly = { name: "Rui", phone: "+351 912 345 678", place: "Vilamoura", "started-at": "1", locale: "pt" };
    expect(await action(form({ ...phoneOnly, need: "logo" }), "6.6.6.6")).toEqual({ status: "sent" });
    const message = send.mock.calls[0]![0];
    expect(message.replyTo).toBeUndefined();
    expect(message.subject).toBe("Sharadox Web Application · Contacto · Rui");
    expect(message.text).toBe(
      "Nome: Rui\nTelefone: +351 912 345 678\nCasa: Vilamoura\nNeeds: Logo\n\n" +
        "Formulário: sharadox.com\nLanguage: Português\nSent: 2026-11-17 21:30 UTC\nIP: 6.6.6.6",
    );
    expect(message.html).toContain('href="tel:+351912345678"');
    expect(message.html).toContain("background-color:#c79a43");
    // Only a phone: the button calls them.
    expect(message.html).toContain('href="tel:+351912345678" style="display:inline-block');
    expect(message.html).toContain(">Call Rui</a>");
    expect(message.html).not.toContain("cid:logo");
    await action(form({ ...phoneOnly, place: "" }), "7.7.7.7");
    expect(send.mock.calls[1]![0].text).not.toContain("Casa:");
  });
});

test("the automatic reply carries the site's button, and the company's signature instead of a line to its site", async () => {
  const send = vi.fn(async () => ({ messageId: "x", accepted: ["contact@sharadox.com"], rejected: [] }));
  const action = createContactAction({
    to: "contact@sharadox.com",
    company: "Sharadox",
    site: "sharadox.com",
    design: { ...plainDesign("Sharadox"), signature: [{ text: "sharadox.com", href: "https://sharadox.com" }] },
    acknowledgement: {
      en: {
        subject: "Sharadox · We received your message",
        heading: (name: string) => `Thank you, ${name}.`,
        paragraphs: ["We'll reply soon."],
        messageLabel: "Your message",
        eyebrow: "Message received",
        button: { label: "Visit sharadox.com", href: "https://sharadox.com" },
      },
    },
    readConfiguration: () => ({
      host: "smtp.example.com",
      port: 587,
      security: "starttls",
      username: "web@sharadox.com",
      password: "x",
    }),
    createSender: () => ({ send, verify: async () => {} }),
    now: () => new Date("2026-11-17T21:30:00Z"),
  });
  const data = new FormData();
  for (const [key, value] of Object.entries({
    name: "Ana Sá",
    email: "ana@example.com",
    message: "Hello there",
    "started-at": "1",
    locale: "en",
  }))
    data.set(key, value);
  expect(await action(data, "8.8.8.8")).toEqual({ status: "sent" });
  const reply = (send.mock.calls[1] as unknown as [{ html: string }])[0].html;
  expect(reply).toContain(">Visit sharadox.com</a>");
  expect(reply).toContain('<span style="white-space:nowrap"><a href="https://sharadox.com"');
  expect(reply).not.toContain("Sharadox: <a");
});
