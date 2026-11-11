/** A text field from submitted form data, trimmed and cut to `maximumLength` characters ("" when missing). */
export function readField(form: FormData, name: string, maximumLength: number): string {
  return String(form.get(name) ?? "")
    .trim()
    .slice(0, maximumLength);
}
