import { expect, test } from "vitest";
import { brandedEmailHtml } from "@sharadox/form-web-library/contact-email";

const theme = { background: "#000000", foreground: "#ffffff", accent: "#c79a43" };

test("lays out the logo and name on the brand's colors, then the heading, details, quote and small print", () => {
  const html = brandedEmailHtml({
    company: "Luis Pires Decor",
    theme,
    logo: true,
    language: "pt",
    preview: "Ana <pede>",
    eyebrow: "Contacto",
    heading: "Ana & Rui",
    paragraphs: ["Obrigado."],
    rows: [
      { label: "Email", value: "ana@example.com", href: "mailto:ana@example.com" },
      { label: "Casa", value: "Loulé" },
    ],
    quote: { label: "Mensagem", text: "Linha 1\nLinha 2" },
    footer: [{ label: "Formulário", value: "https://luispiresdecor.com/pt", href: "https://luispiresdecor.com/pt" }],
  });
  expect(html).toMatch(/^<!doctype html><html lang="pt">/);
  expect(html).toContain('<img src="cid:logo" width="44" height="44" alt="Luis Pires Decor"');
  expect(html).toContain("background:#000000");
  expect(html).toContain("background:#c79a43");
  expect(html).toContain("Ana &amp; Rui");
  expect(html).toContain("Ana &lt;pede&gt;");
  expect(html).toContain('<a href="mailto:ana@example.com"');
  expect(html).toContain("Linha 1\nLinha 2");
  expect(html).toContain('Formulário: <a href="https://luispiresdecor.com/pt"');
});

test("leaves out what it isn't given", () => {
  const html = brandedEmailHtml({
    company: "Sharadox",
    theme,
    logo: false,
    language: "en",
    preview: "",
    eyebrow: "Contact",
    heading: "Ana",
  });
  expect(html).not.toContain("cid:logo");
  expect(html).not.toContain(
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse',
  );
  expect(html).not.toContain("#f6f6f7");
  expect(html).not.toContain("#fafafa");
});
