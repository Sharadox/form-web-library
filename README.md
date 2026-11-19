# @sharadox/form-web-library

Forms on the server, written once for every site:

- **Field reading:** trimmed and capped in length.
- **Bot checks:** a hidden honeypot field, and a minimum time to fill the form.
- **Rate limiting:** a sliding window per key.
- **A contact form action:** it validates, fakes success for bots, limits each address and everyone together per day (50 emails by default, `dailyMaximum`, so a flood from many addresses can't run up the email bill), and emails the message in text and HTML with the visitor as reply-to, through `@sharadox/email-web-library`.
- **Options per site:**
  - accept a phone instead of an email (`reach: "email-or-phone"`)
  - make the message optional (`requireMessage: false`) or ask for a longer one (`minimumMessageLength`)
  - require at least one choice (`requireChoice: true`)
  - add single-line fields (`fields: { place: "Home" }`)
  - write the email in the inbox's language (`labels`)

## Install

```sh
pnpm add @sharadox/form-web-library
```

## Use

```ts
// the site's library
export const sendContact = createContactAction({
  to: "contact@example.com",
  company: "Example", // from "Example Web Application", subject "Example Web Application · Contact · Ana (Café)"
  site: "example.com",
  choices: { website: "Website", logo: "Logo", other: "Others" },
  logo: async () => ({ content: await readFile(LOGO), contentType: "image/png", filename: "logo.png" }),
  design: EXAMPLE_EMAIL, // the brand's EmailDesign (email-web-library): colors, type, rules, header, signature
  acknowledgement: {
    en: {
      subject: "Example · We received your message",
      eyebrow: "Message received",
      heading: (name) => `Thank you, ${name}.`,
      paragraphs: ["We'll get back to you shortly."],
      messageLabel: "Your message",
      button: { label: "Visit example.com", href: "https://example.com" }, // optional
    },
  },
});
```

Every email has the same layout: the company's logo and name on its colors at the top, then the visitor's name
(and company), every detail they gave, their message, and at the bottom the page the form was sent from, the
language, the time and the IP address. Replying answers the visitor. With `acknowledgement`, a visitor who left an
email also gets an automatic reply in their language, with their message, and replying to it reaches the company.
The emails are laid out by email-web-library's `emailLayout` in the brand's `design` (its `EmailDesign`), which a site also uses for any other email it sends.

```ts

```

```ts
// the application's server action
"use server";
export async function sendContactAction(_: ContactState, form: FormData) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return sendContact(form, ip);
}
```

The form sends these fields:

- **text:** `name`, `email`, `phone`, `company`, `message`, plus any `fields` the site adds
- **hidden:** `locale`, `started-at` (`Date.now()` when the visitor started) and `page` (`location.href` when sending; shown only when it's on the site's domain)
- **checkboxes:** `need`
- **honeypot:** `website`, kept off screen

The email server comes from `EMAIL_SERVER_*` and `EMAIL_SENDER_ADDRESS`.

## API

| Import             | Export                                                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `…/contact-action` | `createContactAction(options)` → `(form, ip) => Promise<ContactState>`; `ENGLISH_LABELS`, `PLAIN_THEME`, `LANGUAGE_NAMES`, `formPage(value, site)`; `ContactState`, `ContactActionOptions`, `ContactLabels`, `ContactAcknowledgement` and `EmailLogo` in `…/contact-action/type` |
| `…/parse-contact`  | `parseContact(form, { choices?, choiceField?, reach?, requireMessage?, minimumMessageLength?, requireChoice?, fields?, now? })` → `bot`, `invalid` or `valid`                                                                                                                    |
| `…/contact-check`  | `isEmail(text)`, `isPhone(text)`: the rules the action uses, safe in the browser for checks before sending                                                                                                                                                                       |
| `…/bot-check`      | `isLikelyBot(form, { honeypotField?, startedAtField?, minimumFillTime?, now? })`                                                                                                                                                                                                 |
| `…/rate-limit`     | `createRateLimiter({ window, maximum })` → `(key, now?) => boolean` (kept in memory, per server instance)                                                                                                                                                                        |
| `…/field`          | `readField(form, name, maximumLength)`                                                                                                                                                                                                                                           |

## Develop

`pnpm verify` runs formatting, lint, type-check, tests with 100% coverage and the build. Branches follow `<feature>.development` → `development` → `index`, and releases are `v<version>` tags on `index`.

## License

Licença Sharadox de Código Aberto, versão 0.1.0. See [português](LICENCA.md) (the binding text) and the [English translation](LICENSE.md).
