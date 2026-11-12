const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Digits with the usual phone punctuation. */
const PHONE = /^\+?[\d\s().-]+$/;

/**
 * Whether text looks like an email address. Safe in the browser, so forms can check before sending what the server
 * checks again.
 *
 * @example
 * isEmail("ana@example.com"); // true
 */
export function isEmail(text: string): boolean {
  return EMAIL.test(text);
}

/**
 * Whether text looks like a phone number: digits with spaces, brackets, dots or dashes, an optional leading +, and at
 * least seven digits. Safe in the browser.
 *
 * @example
 * isPhone("+351 912 345 678"); // true
 */
export function isPhone(text: string): boolean {
  return PHONE.test(text) && text.replace(/\D/g, "").length >= 7;
}
