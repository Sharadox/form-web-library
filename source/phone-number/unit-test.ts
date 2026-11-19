import { expect, test } from "vitest";
import { fullPhone, readPhone } from "@sharadox/form-web-library/phone-number";

test("keeps only the digits of a national number", () => {
  expect(readPhone("912 345-678 (home)", "PT")).toEqual({ country: "PT", digits: "912345678" });
});

test("an international number picks its country from the calling code", () => {
  expect(readPhone("+44 20 7946 0958", "PT")).toEqual({ country: "GB", digits: "2079460958" });
  expect(readPhone("00351912345678", "GB")).toEqual({ country: "PT", digits: "912345678" });
  expect(readPhone("+1 416 555 0100", "PT")).toEqual({ country: "US", digits: "4165550100" });
});

test("keeps the chosen country when it shares the calling code", () => {
  expect(readPhone("+1 416 555 0100", "CA")).toEqual({ country: "CA", digits: "4165550100" });
});

test("an unknown calling code keeps the country and the digits", () => {
  expect(readPhone("+999", "PT")).toEqual({ country: "PT", digits: "999" });
});

test("joins the calling code and the digits, or nothing without digits", () => {
  expect(fullPhone("PT", "912345678")).toBe("+351 912345678");
  expect(fullPhone("PT", "")).toBe("");
});
