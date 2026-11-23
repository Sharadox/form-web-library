# Changelog

What changed in each version of `@sharadox/form-web-library`, newest first.

## 0.8.3

Workflows from git-hub-action-library v0.2.2: npm Trusted Publishing only

## 0.8.2

Contact emails can go through Amazon SES without a password (email-web-library 0.7): the sender address then comes from `senderAddress` or `EMAIL_SENDER_ADDRESS` (there is no SMTP user to fall back on), and a missing one is a configuration error, nothing sent.

## 0.8.1

Sharadox libraries are required with caret ranges, so their patches reach every site (email-web-library 0.6.1 among them).

## 0.8.0

- **Breaking:** the contact form sends one email, to both the visitor and the company (`to`), so they share one conversation: replies go to the company (`Reply-To`), so replying the visitor reaches it, and replying to all the company reaches the visitor, never the sending address. The automatic reply and its `acknowledgement` option are gone.
- Its subject is "Contact · Name (Organization) · <conversation identifier>", a UUID version 7 (`identifier`), in the language the visitor used the form in ("Contacto · …").
- It thanks the visitor by name, says the company will answer within a working day and that replying adds to the conversation, lists every detail (name, organization, email, phone, the site's fields, the needs one per line, the message keeping its lines, the conversation identifier), and signs off "Best regards, <Company>." The form page, language, time and IP are no longer shown (the visitor sees the email too).
- Built-in English and Portuguese words (`CONTACT_LABELS`), `labels` by language, choices and fields named in each language. **Breaking:** `ContactLabels` has new words; `site`, `languageNames`, `now`, `formPage` and `LANGUAGE_NAMES` are gone.
- It comes from the company by name (or `senderName`), no longer "<company> Web Application".
- The email uses email-web-library's one layout, the same in every mail app; `darkLogo` is the white logo for dark themes.

## 0.6.1

Llms.txt summary names the phone field

## 0.5.1

README's example passes a real EmailDesign

## 0.5.0

CreateContactAction takes `design` (email-web-library ^0.4.0 EmailDesign; plainDesign(company) by default) instead of `theme`, and lays out both emails with emailLayout; the notice has a button to answer the visitor (labels.reply "Reply to" + first name, or labels.call "Call" when only a phone was left); an acknowledgement may carry a `button`; with a design signature, the reply leaves out its line to the site; contact-email (brandedEmailHtml) is removed: use email-web-library's emailLayout
