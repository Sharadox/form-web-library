import type { InputHTMLAttributes } from "react";
import type { CallingCountry } from "@sharadox/form-web-library/calling-code";

export interface PhoneFieldProperties {
  /** The form field that receives the full number, "+351 912345678". */
  name: string;
  /** The page's language, for the countries' names (BCP 47, "pt" or "en-GB"). */
  locale: string;
  /** The country chosen at first, and first in the list. Defaults to Portugal. */
  defaultCountry?: CallingCountry;
  /** The picker's words for assistive technology and the search box. Default English. */
  labels?: { country: string; search: string };
  /** Passed to the number box: id, aria attributes, maxLength, onChange and so on (not type, value or name). */
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "name" | "defaultValue">;
  className?: string;
  /** The site's own class for the number box. */
  inputClassName?: string;
}
