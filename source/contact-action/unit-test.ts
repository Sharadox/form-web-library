import { beforeEach, describe, expect, test, vi } from "vitest";
import { EmailError } from "@sharadox/email-web-library";
import { createContactAction } from "@sharadox/form-web-library/contact-action";

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
};
const create = (options: Partial<Parameters<typeof createContactAction>[0]> = {}) =>
  createContactAction({
    to: "contact@sharadox.com",
    senderName: "Sharadox Web Application",
    site: "sharadox.com",
    subject: (message) => `Contact · ${message.name}${message.company ? ` (${message.company})` : ""}`,
    choices: { logo: "Logo", other: "Others" },
    readConfiguration: () => configuration,
    createSender: () => ({ send }) as never,
    ...options,
  });

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ messageId: "<id>", accepted: [], rejected: [] });
  vi.unstubAllEnvs();
});

describe("createContactAction", () => {
  test("emails the inbox with the visitor as reply-to, choices named and input escaped", async () => {
    vi.stubEnv("EMAIL_SENDER_ADDRESS", "web@email.sharadox.com");
    expect(await create()(form({ ...valid, need: ["other", "logo"] }), "1.2.3.4")).toEqual({ status: "sent" });
    const message = send.mock.calls[0]![0];
    expect(message.from).toEqual({ name: "Sharadox Web Application", address: "web@email.sharadox.com" });
    expect(message.to).toBe("contact@sharadox.com");
    expect(message.replyTo).toEqual({ name: "Ana Sá", address: "ana@example.com" });
    expect(message.subject).toBe("Contact · Ana Sá (Café)");
    expect(message.text).toContain("Needs: Others, Logo\nLanguage: pt\nIP: 1.2.3.4");
    expect(message.html).toContain("&lt;b&gt;Hi&lt;/b&gt;");
    expect(message.html).toContain("Others, Logo");
    expect(message.html).toContain("New message from sharadox.com (pt)");
  });

  test("falls back to the server user as sender, and leaves empty fields out", async () => {
    await create({ senderAddress: undefined })(form({ ...valid, company: "" }), "1.2.3.4");
    const message = send.mock.calls[0]![0];
    expect(message.from.address).toBe("user");
    expect(message.text).toContain("Company: —\nNeeds: —");
    expect(message.html).not.toContain("color:#444");
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

  test("accepts a phone instead of an email, adds fields and speaks the inbox's language", async () => {
    const action = create({
      reach: "email-or-phone",
      requireMessage: false,
      fields: { place: "Casa" },
      labels: { name: "Nome", phone: "Telefone", company: "Empresa", from: "Nova mensagem de" },
    });
    const phoneOnly = { name: "Rui", phone: "+351 912 345 678", place: "Vilamoura", "started-at": "1", locale: "pt" };
    expect(await action(form({ ...phoneOnly, need: "logo" }), "6.6.6.6")).toEqual({ status: "sent" });
    const message = send.mock.calls[0]![0];
    expect(message.replyTo).toBeUndefined();
    expect(message.text).toBe(
      "Nome: Rui\nEmail: —\nTelefone: +351 912 345 678\nEmpresa: —\nCasa: Vilamoura\nNeeds: Logo\nLanguage: pt\nIP: 6.6.6.6",
    );
    expect(message.html).toContain('<a href="tel:+351912345678">+351 912 345 678</a>');
    expect(message.html).toContain("Casa: Vilamoura");
    expect(message.html).toContain("Nova mensagem de sharadox.com");
    expect(message.html).not.toContain("<hr");
    await action(form({ ...phoneOnly, place: "" }), "7.7.7.7");
    expect(send.mock.calls[1]![0].text).toContain("Casa: —");
    expect(send.mock.calls[1]![0].html).not.toContain("Casa:");
  });
});
