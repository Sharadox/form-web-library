import { isEmail, isPhone } from "@sharadox/form-web-library/contact-check";
import type { ContactProblem } from "@sharadox/form-web-library/contact-problem/type";

/**
 * What a form's contact details still lack, by the same rules on the page and on the server: a name, and a way to
 * reply (an email, a phone or both), each valid when given. Empty when they're complete. Forms add their own checks
 * (choices, a message) after these.
 *
 * @example
 * contactProblems({ name: "Ana", email: "", phone: "912" }); // ["phone"]
 */
export function contactProblems({
  name,
  email,
  phone,
}: {
  name: string;
  email: string;
  phone: string;
}): ContactProblem[] {
  const [trimmedEmail, trimmedPhone] = [email.trim(), phone.trim()];
  const problems: ContactProblem[] = [];
  if (!name.trim()) problems.push("name");
  if (!trimmedEmail && !trimmedPhone) problems.push("reach");
  if (trimmedEmail && !isEmail(trimmedEmail)) problems.push("email");
  if (trimmedPhone && !isPhone(trimmedPhone)) problems.push("phone");
  return problems;
}
