import { beforeEach, describe, expect, test, vi } from "vitest";
import { EmailError } from "@sharadox/email-web-library";
import { createContactAction, plainDesign, textIn } from "@sharadox/form-web-library/contact-action";

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
  message: "<b>Hi</b>\nBye",
  company: "Café",
  "started-at": "1",
  locale: "pt",
};
const ID = "019a8f3c-6b2e-7c41-9d03-5e1f2a7b8c90";
const logo = async () => ({ content: new Uint8Array([1, 2, 3]), contentType: "image/png", filename: "logo.png" });
const darkLogo = async () => ({
  content: new Uint8Array([4, 5, 6]),
  contentType: "image/png",
  filename: "logo-dark.png",
});
const create = (options: Partial<Parameters<typeof createContactAction>[0]> = {}) =>
  createContactAction({
    to: "contact@sharadox.com",
    company: "Sharadox",
    choices: { logo: "Logo", other: { en: "Others", pt: "Outros" } },
    readConfiguration: () => configuration,
    createSender: () => ({ send }) as never,
    identifier: () => ID,
    ...options,
  });

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ messageId: "<id>", accepted: [], rejected: [] });
  vi.unstubAllEnvs();
});

describe("createContactAction", () => {
  test("sends one email to the visitor and the company, replies going to the company", async () => {
    vi.stubEnv("EMAIL_SENDER_ADDRESS", "contact@web.sharadox.com");
    const sent = await create({ logo, darkLogo })(form({ ...valid, need: ["other", "logo"] }), "1.2.3.4");
    expect(sent).toEqual({ status: "sent" });
    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0]![0];
    expect(message.from).toEqual({ name: "Sharadox", address: "contact@web.sharadox.com" });
    expect(message.to).toEqual([{ name: "Ana Sá", address: "ana@example.com" }, "contact@sharadox.com"]);
    expect(message.replyTo).toBe("contact@sharadox.com");
    // In the language the visitor used the form in, with the conversation's identifier.
    expect(message.subject).toBe(`Contacto · Ana Sá (Café) · ${ID}`);
    expect(message.inlineImages).toEqual([
      { id: "logo", content: new Uint8Array([1, 2, 3]), contentType: "image/png", filename: "logo.png" },
      { id: "logo-dark", content: new Uint8Array([4, 5, 6]), contentType: "image/png", filename: "logo-dark.png" },
    ]);
  });

  test("thanks the visitor, lists every detail with the needs one per line, and signs off", async () => {
    await create({ logo })(form({ ...valid, need: ["other", "logo"] }), "1.2.3.4");
    const message = send.mock.calls[0]![0];
    expect(message.text).toBe(
      [
        "Obrigado, Ana\nSá.",
        "",
        "A sua mensagem chegou até nós e responderemos o mais brevemente possível, normalmente dentro de um dia útil.",
        "Caso queira acrescentar algo à conversa, basta responder a este email.",
        "",
        "Nome: Ana\nSá",
        "Organização: Café",
        "Email: ana@example.com",
        "Necessidades:\n- Outros\n- Logo",
        "Mensagem:\n<b>Hi</b>\nBye",
        `Identificador da conversa: ${ID}`,
        "",
        "Cumprimentos,",
        "Sharadox.",
      ].join("\n"),
    );
    const { html } = message;
    expect(html).toContain('lang="pt"');
    expect(html).toContain(">Contacto</div>");
    expect(html).toContain("Obrigado, Ana\nSá.</h1>");
    expect(html).toContain("&bull;&nbsp;Outros<br>&bull;&nbsp;Logo");
    expect(html).toContain("&lt;b&gt;Hi&lt;/b&gt;\nBye");
    expect(html).toContain(`>${ID}</div>`);
    expect(html).toContain('href="mailto:ana@example.com"');
    expect(html).toContain("Cumprimentos,<br><b");
    expect(html).toContain(">Sharadox</b>.");
    expect(html).toContain('<img src="cid:logo"');
    expect(html).not.toContain("cid:logo-dark");
  });

  test("in English: the English words, the label for each detail, and English for unknown languages", async () => {
    await create()(form({ ...valid, locale: "en", phone: "+351 912 345 678" }), "1.2.3.4");
    const english = send.mock.calls[0]![0];
    expect(english.subject).toBe(`Contact · Ana Sá (Café) · ${ID}`);
    expect(english.text).toContain("Thank you, Ana\nSá.\n\nYour message has reached us and we will get back to you");
    expect(english.text).toContain(
      "Name: Ana\nSá\nOrganization: Café\nEmail: ana@example.com\nPhone: +351 912 345 678",
    );
    expect(english.text).toContain(`Conversation identifier: ${ID}\n\nBest regards,\nSharadox.`);
    expect(english.html).toContain('href="tel:+351912345678"');
    await create()(form({ ...valid, locale: "de" }), "1.2.3.5");
    expect(send.mock.calls[1]![0].subject).toBe(`Contact · Ana Sá (Café) · ${ID}`);
  });

  test("a visitor who left only a phone isn't sent anything; the company still is, with the site's fields and words", async () => {
    const action = create({
      reach: "email-or-phone",
      requireMessage: false,
      fields: { place: { en: "Place", pt: "Local" } },
      labels: { pt: { needs: "Criações" }, en: { contact: "Booking" } },
      senderName: "Sharadox Studio",
      design: plainDesign("Sharadox"),
      darkLogo, // without the black logo, the white one isn't carried either
    });
    const phoneOnly = { name: "Rui", phone: "+351 912 345 678", place: "Vilamoura", "started-at": "1", locale: "pt" };
    expect(await action(form({ ...phoneOnly, need: "logo" }), "6.6.6.6")).toEqual({ status: "sent" });
    const message = send.mock.calls[0]![0];
    expect(message.to).toEqual(["contact@sharadox.com"]);
    expect(message.from.name).toBe("Sharadox Studio");
    expect(message.subject).toBe(`Contacto · Rui · ${ID}`);
    expect(message.text).toContain("Nome: Rui\nTelefone: +351 912 345 678\nLocal: Vilamoura\nCriações:\n- Logo\n");
    expect(message.text).not.toContain("Mensagem:");
    expect(message.inlineImages).toEqual([]);
    await action(form({ ...phoneOnly, place: "" }), "7.7.7.7");
    expect(send.mock.calls[1]![0].text).not.toContain("Local:");
    await action(form({ ...phoneOnly, locale: "en", need: "other" }), "7.7.7.8");
    expect(send.mock.calls[2]![0].subject).toBe(`Booking · Rui · ${ID}`);
    expect(send.mock.calls[2]![0].text).toContain("Place: Vilamoura\nNeeds:\n- Others");
  });

  test("makes a new UUID version 7 for each conversation by default", async () => {
    await create({ identifier: undefined })(form(valid), "1.2.3.4");
    await create({ identifier: undefined })(form(valid), "1.2.3.5");
    const [first, second] = send.mock.calls.map(([message]) => message.subject.split(" · ").at(-1));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first).not.toBe(second);
  });

  test("previews by the heading when there are no paragraphs, and leaves empty fields out", async () => {
    await create({ labels: { pt: { paragraphs: [] } } })(form({ ...valid, company: "" }), "1.2.3.4");
    const message = send.mock.calls[0]![0];
    expect(message.subject).toBe(`Contacto · Ana Sá · ${ID}`);
    expect(message.text).not.toContain("Organização:");
    expect(message.text).not.toContain("Necessidades:");
    expect(message.html).toContain('opacity:0">Obrigado, Ana\nSá.</div>');
  });

  test("falls back to the server user as sender, or uses a given sender address and the defaults for choices", async () => {
    await create({ senderAddress: undefined })(form(valid), "1.2.3.4");
    expect(send.mock.calls[0]![0].from.address).toBe("user");
    await create({ senderAddress: "hello@example.com", choices: undefined })(
      form({ ...valid, need: "logo" }),
      "1.2.3.5",
    );
    expect(send.mock.calls[1]![0].from.address).toBe("hello@example.com");
  });

  test("through Amazon SES (no server user) the sender address must be given, else nothing is sent", async () => {
    const amazon = { kind: "amazon-ses" as const, region: "us-east-1", credentials: async () => ({}) as never };
    const reportError = vi.fn();
    vi.stubEnv("EMAIL_SENDER_ADDRESS", "");
    const action = create({ readConfiguration: () => amazon, senderAddress: undefined, reportError });
    expect((await action(form(valid), "5.5.5.5")).status).toBe("failed");
    expect(send).not.toHaveBeenCalled();
    expect(reportError.mock.calls[0]![1]).toMatchObject({
      code: "configuration",
      message: "EMAIL_SENDER_ADDRESS is missing (Amazon SES has no server user to send as)",
    });
    vi.stubEnv("EMAIL_SENDER_ADDRESS", "contact@web.sharadox.com");
    expect((await action(form(valid), "5.5.5.6")).status).toBe("sent");
    expect(send.mock.calls[0]![0].from.address).toBe("contact@web.sharadox.com");
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
    expect((await create({ reportError: undefined })(form(valid), "3.3.3.3")).status).toBe("failed");
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
});

test("words in a language: the text itself, its translation, the English one, or the first there is", () => {
  expect(textIn("Casa", "en")).toBe("Casa");
  expect(textIn({ en: "Home", pt: "Casa" }, "pt")).toBe("Casa");
  expect(textIn({ en: "Home", pt: "Casa" }, "de")).toBe("Home");
  expect(textIn({ pt: "Casa", es: "Casa grande" }, "de")).toBe("Casa");
});
