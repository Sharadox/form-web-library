import { CALLING_CODES, MAIN_CALLING_COUNTRY, type CallingCountry } from "@sharadox/form-web-library/calling-code";

/**
 * Splits what someone typed or pasted into a phone field. A leading "+" or "00" starts an international number, so
 * its calling code picks the country (the longest code that matches; `current` stays when it shares that code, so
 * Canada isn't swapped for the United States, and otherwise a shared code goes to its main country). Everything else that isn't a digit is dropped.
 *
 * @example
 * readPhone("+351 912 345 678", "GB"); // { country: "PT", digits: "912345678" }
 * readPhone("912-345", "PT"); // { country: "PT", digits: "912345" }
 */
export function readPhone(text: string, current: CallingCountry): { country: CallingCountry; digits: string } {
  const international = /^\s*(\+|00)/.exec(text);
  const digits = text.replace(/\D/g, "");
  if (!international) return { country: current, digits };
  const rest = international[1] === "00" ? digits.slice(2) : digits;
  for (let length = 3; length >= 1; length--) {
    const code = rest.slice(0, length);
    if (CALLING_CODES[current] === code) return { country: current, digits: rest.slice(length) };
    const country =
      MAIN_CALLING_COUNTRY[code] ??
      (Object.keys(CALLING_CODES) as CallingCountry[]).find((key) => CALLING_CODES[key] === code);
    if (country) return { country, digits: rest.slice(length) };
  }
  return { country: current, digits: rest };
}

/**
 * The full number to send: "+<calling code> <digits>", or nothing without digits.
 *
 * @example
 * fullPhone("PT", "912345678"); // "+351 912345678"
 */
export function fullPhone(country: CallingCountry, digits: string): string {
  return digits ? `+${CALLING_CODES[country]} ${digits}` : "";
}
