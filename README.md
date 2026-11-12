# @sharadox/form-web-library

Forms on the server, written once for every site:

- **Field reading:** trimmed and capped in length.
- **Bot checks:** a hidden honeypot field, and a minimum time to fill the form.
- **Rate limiting:** a sliding window per key.
- **A contact form action:** it validates, fakes success for bots, limits each address, and emails the message in text and HTML with the visitor as reply-to, through `@sharadox/email-web-library`.
- **Options per site:**
  - accept a phone instead of an email (`reach: "email-or-phone"`)
  - make the message optional (`requireMessage: false`)
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
  senderName: "Example Web Application",
  site: "example.com",
  subject: (message) =>
    separate(SEPARATOR, "Contact", message.company ? `${message.name} (${message.company})` : message.name),
  choices: { website: "Website", logo: "Logo", other: "Others" },
});
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
- **hidden:** `locale`, and `started-at` (`Date.now()` when the visitor started)
- **checkboxes:** `need`
- **honeypot:** `website`, kept off screen

The email server comes from `EMAIL_SERVER_*` and `EMAIL_SENDER_ADDRESS`.

## API

| Import             | Export                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `…/contact-action` | `createContactAction(options)` → `(form, ip) => Promise<ContactState>`; `ENGLISH_LABELS`; `ContactState`, `ContactActionOptions` and `ContactLabels` in `…/contact-action/type` |
| `…/parse-contact`  | `parseContact(form, { choices?, choiceField?, reach?, requireMessage?, fields?, now? })` → `bot`, `invalid` or `valid`                                                          |
| `…/contact-check`  | `isEmail(text)`, `isPhone(text)`: the rules the action uses, safe in the browser for checks before sending                                                                      |
| `…/bot-check`      | `isLikelyBot(form, { honeypotField?, startedAtField?, minimumFillTime?, now? })`                                                                                                |
| `…/rate-limit`     | `createRateLimiter({ window, maximum })` → `(key, now?) => boolean` (kept in memory, per server instance)                                                                       |
| `…/field`          | `readField(form, name, maximumLength)`                                                                                                                                          |

## Develop

`pnpm verify` runs formatting, lint, type-check, tests with 100% coverage and the build. Branches follow `<feature>.development` → `development` → `index`, and releases are `v<version>` tags on `index`.

## License

Licença Sharadox de Código Aberto, versão 0.1.0. See [português](LICENCA.md) (the binding text) and the [English translation](LICENSE.md).
