# @sharadox/form-web-library

Forms, written once for every site.

In the browser:

- **A phone field (`phone-field`):** a button with the country's flag and calling code opens a searchable list of every country, named in the page's language, and the number box beside it takes digits only. Pasting "+44…" or "0044…" picks the country. The form receives one field with "+351 912345678". Its colors come from the text and the `--phone-field-*` variables (`-line`, `-accent`, `-surface`, `-popover`, `-radius`, `-gap`). Flags come from `@sharadox/icon-web-library` and load on their own, after the field.

On the server:

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

```tsx
<PhoneField
  name="phone"
  locale="pt"
  defaultCountry="PT"
  labels={{ country: "País", search: "Procurar" }}
  inputProps={{ id: "phone", "aria-describedby": "phone-error" }}
  inputClassName={styles.input}
/>
```

Also: `calling-code` (`CALLING_CODES` by country, `MAIN_CALLING_COUNTRY` for shared codes) and `phone-number` (`readPhone(text, country)`, `fullPhone(country, digits)`).

## Install

```sh
pnpm add @sharadox/form-web-library
```

## Use

```ts
// the site's library
export const sendContact = createContactAction({
  to: "contact@example.com", // the email goes here and to the visitor; replies come here
  company: "Example", // from "Example", signed "Best regards, Example."
  choices: { website: "Website", logo: "Logo", other: "Others" },
  logo: async () => ({ content: await readFile(LOGO), contentType: "image/png", filename: "logo.png" }),
  darkLogo: async () => ({ content: await readFile(LOGO_DARK), contentType: "image/png", filename: "logo-dark.png" }), // white, for dark themes
  design: EXAMPLE_EMAIL, // the company's EmailDesign (email-web-library): name, logo size, wordmark, signature
});
```

The form sends one email, to both the visitor and the company, so they share one conversation. It comes from the
company by name, from the sending address (`EMAIL_SENDER_ADDRESS`), with replies set to go to the company: replying,
the visitor reaches the company, and replying to all, the company reaches the visitor (the sending address never
appears). The subject is "Contact · Ana (Café) · <conversation identifier>", a UUID version 7. The email thanks the
visitor by name, says the company will answer within a working day and that replying adds to the conversation, lists
every detail they gave (name, organization, email, phone, the site's fields, their needs one per line, their message
keeping its lines) and the conversation's identifier, and signs off with the company's name, all in the language the
visitor used the form in (English and Portuguese built in, `labels` for more). A visitor who left only a phone isn't
sent anything; the company still is. The email is laid out by email-web-library's `emailLayout`, which a site also
uses for any other email it sends.

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

| Import              | Export                                                                                                                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `…/contact-problem` | `contactProblems({ name, email, phone })`: what a form's contact details still lack                                                                                                                                                                                                                |
| `…/choice-request`  | `requestChoices(event, choices)`, `useChoiceRequests(event, onRequest)`: a button elsewhere asks the form to tick choices                                                                                                                                                                          |
| `…/bot-field`       | `<BotFields />`: the honeypot and fill-time fields `isLikelyBot` reads                                                                                                                                                                                                                             |
| `…/contact-action`  | `createContactAction(options)` → `(form, ip) => Promise<ContactState>`; `ENGLISH_LABELS`, `PORTUGUESE_LABELS`, `CONTACT_LABELS`, `plainDesign(company)`, `textIn(text, locale)`; `ContactState`, `ContactActionOptions`, `ContactLabels`, `ContactText` and `EmailLogo` in `…/contact-action/type` |
| `…/parse-contact`   | `parseContact(form, { choices?, choiceField?, reach?, requireMessage?, minimumMessageLength?, requireChoice?, fields?, now? })` → `bot`, `invalid` or `valid`                                                                                                                                      |
| `…/contact-check`   | `isEmail(text)`, `isPhone(text)`: the rules the action uses, safe in the browser for checks before sending                                                                                                                                                                                         |
| `…/bot-check`       | `isLikelyBot(form, { honeypotField?, startedAtField?, minimumFillTime?, now? })`                                                                                                                                                                                                                   |
| `…/rate-limit`      | `createRateLimiter({ window, maximum })` → `(key, now?) => boolean` (kept in memory, per server instance)                                                                                                                                                                                          |
| `…/field`           | `readField(form, name, maximumLength)`                                                                                                                                                                                                                                                             |

## Develop

`pnpm verify` runs formatting, lint, type-check, tests with 100% coverage and the build. Branches follow `<feature>.development` → `development` → `index`, and releases are `v<version>` tags on `index`.

## License

Licença Sharadox de Código Aberto, versão 0.1.0. See [português](LICENCA.md) (the binding text) and the [English translation](LICENSE.md).
