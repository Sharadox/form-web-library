# Changelog

What changed in each version of `@sharadox/form-web-library`, newest first.

## 0.8.0

- The company's email comes from the company by name (or `senderName`), no longer "<company> Web Application".
- Its subject is the form's name and the visitor's: "Contact · Ana (Café)".
- It is in the language the visitor used the form in: built-in English and Portuguese words (`CONTACT_LABELS`), `labels` by language, and choices and fields named in each language.
- The automatic reply's subject starts with the form's name too: "Contact · We received your message".

## 0.6.1

Llms.txt summary names the phone field

## 0.5.1

README's example passes a real EmailDesign

## 0.5.0

CreateContactAction takes `design` (email-web-library ^0.4.0 EmailDesign; plainDesign(company) by default) instead of `theme`, and lays out both emails with emailLayout; the notice has a button to answer the visitor (labels.reply "Reply to" + first name, or labels.call "Call" when only a phone was left); an acknowledgement may carry a `button`; with a design signature, the reply leaves out its line to the site; contact-email (brandedEmailHtml) is removed: use email-web-library's emailLayout
