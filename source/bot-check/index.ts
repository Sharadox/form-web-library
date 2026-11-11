import type { BotCheckOptions } from "@sharadox/form-web-library/bot-check/type";

/** Whether a form submission looks automated: the honeypot is filled, or it was submitted faster than people can. */
export function isLikelyBot(
  form: FormData,
  {
    honeypotField = "website",
    startedAtField = "started-at",
    minimumFillTime = 2500,
    now = Date.now(),
  }: BotCheckOptions = {},
): boolean {
  const started = Number(form.get(startedAtField) ?? 0);
  return Boolean(form.get(honeypotField)) || Boolean(started && now - started < minimumFillTime);
}
