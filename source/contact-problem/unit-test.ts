import { expect, test } from "vitest";
import { contactProblems } from "@sharadox/form-web-library/contact-problem";

test("needs a name and a valid way to reply", () => {
  expect(contactProblems({ name: "Ana", email: "ana@example.pt", phone: "" })).toEqual([]);
  expect(contactProblems({ name: " ", email: "", phone: " " })).toEqual(["name", "reach"]);
  expect(contactProblems({ name: "Ana", email: "ana@", phone: "12" })).toEqual(["email", "phone"]);
  expect(contactProblems({ name: "Ana", email: "", phone: "+351 912 345 678" })).toEqual([]);
});
