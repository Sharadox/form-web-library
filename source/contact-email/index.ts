import { escapeHtml } from "@sharadox/web-library/html/escape";
import type { BrandedEmailOptions, EmailRow } from "@sharadox/form-web-library/contact-email/type";

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** A value, as a link when it has one. */
const value = ({ value: text, href }: EmailRow, color: string) =>
  href
    ? `<a href="${escapeHtml(href)}" style="color:${color};text-decoration:underline">${escapeHtml(text)}</a>`
    : escapeHtml(text);

/**
 * A company's email, the same in every inbox: the logo and the company's name on its own colors at the top, a thin
 * accent line, then the heading, any paragraphs, a table of details, a quoted text and small print at the bottom.
 * Built from tables with inline styles, as email clients need; everything given is escaped.
 *
 * @example
 * brandedEmailHtml({ company: "Sharadox", theme, logo: true, language: "en", preview: "Ana sent a message",
 *   eyebrow: "Contact", heading: "Ana (Café)", rows: [{ label: "Email", value: "ana@example.com" }] });
 */
export function brandedEmailHtml(options: BrandedEmailOptions): string {
  const {
    company,
    theme,
    logo,
    language,
    preview,
    eyebrow,
    heading,
    paragraphs = [],
    rows = [],
    quote,
    footer = [],
  } = options;
  const mark = logo
    ? `<td style="padding:0 14px 0 0;vertical-align:middle"><img src="cid:logo" width="44" height="44" alt="${escapeHtml(company)}" style="display:block;width:44px;height:44px;border:0;border-radius:10px"></td>`
    : "";
  const table = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0 0">${rows
        .map(
          (row) =>
            `<tr><td style="padding:12px 16px 12px 0;border-top:1px solid #ececec;width:132px;vertical-align:top;font:500 13px/1.5 ${FONT};color:#71717a">${escapeHtml(row.label)}</td><td style="padding:12px 0;border-top:1px solid #ececec;vertical-align:top;font:400 15px/1.5 ${FONT};color:#18181b;word-break:break-word">${value(row, "#18181b")}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const text = quote
    ? `<p style="margin:28px 0 8px;font:500 13px/1.5 ${FONT};color:#71717a">${escapeHtml(quote.label)}</p><div style="padding:18px 20px;background:#f6f6f7;border-radius:12px;font:400 15px/1.65 ${FONT};color:#18181b;white-space:pre-wrap;word-break:break-word">${escapeHtml(quote.text)}</div>`
    : "";
  const small = footer.length
    ? `<tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #ececec;font:400 12px/1.7 ${FONT};color:#71717a">${footer
        .map((row) => `${escapeHtml(row.label)}: ${value(row, "#52525b")}`)
        .join("<br>")}</td></tr>`
    : "";
  return `<!doctype html><html lang="${escapeHtml(language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(heading)}</title></head><body style="margin:0;padding:0;background:#f4f4f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden">
<tr><td style="background:${theme.background};padding:24px 32px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${mark}<td style="vertical-align:middle;font:600 18px/1.2 ${FONT};letter-spacing:-0.01em;color:${theme.foreground}">${escapeHtml(company)}</td></tr></table></td></tr>
<tr><td style="height:3px;line-height:3px;font-size:0;background:${theme.accent}">&nbsp;</td></tr>
<tr><td style="padding:32px">
<p style="margin:0 0 10px;font:600 11px/1.4 ${FONT};letter-spacing:0.12em;text-transform:uppercase;color:#71717a">${escapeHtml(eyebrow)}</p>
<h1 style="margin:0;font:600 24px/1.3 ${FONT};letter-spacing:-0.02em;color:#09090b">${escapeHtml(heading)}</h1>
${paragraphs.map((paragraph) => `<p style="margin:16px 0 0;font:400 15px/1.65 ${FONT};color:#3f3f46">${escapeHtml(paragraph)}</p>`).join("")}${table}${text}
</td></tr>${small}
</table></td></tr></table></body></html>`;
}
