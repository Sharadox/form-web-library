import { expect, test } from "vitest";
import { isEmail, isPhone } from "@sharadox/form-web-library/contact-check";

test.each([
  ["ana@example.com", true],
  ["ana@example", false],
  ["ana example@x.pt", false],
])("isEmail(%j) is %s", (text, expected) => {
  expect(isEmail(text)).toBe(expected);
});

test.each([
  ["+351 912 345 678", true],
  ["(91) 234-5678", true],
  ["12345", false],
  ["call me", false],
  ["+351 91a 345 678", false],
])("isPhone(%j) is %s", (text, expected) => {
  expect(isPhone(text)).toBe(expected);
});
