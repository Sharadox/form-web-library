"use client";
import { useEffect, useState } from "react";
import type { BotFieldsProperties } from "@sharadox/form-web-library/bot-field/type";

/** Out of sight but still in the form, so robots that fill every field give themselves away. */
const HIDDEN = { position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" } as const;

/**
 * The two hidden fields `isLikelyBot` reads: a honeypot people never see, and the moment the form appeared (forms
 * sent faster than a person can type are refused). Put it inside the form; field names match `isLikelyBot`'s
 * defaults.
 *
 * @example
 * <form action={send}><BotFields />…</form>
 */
export function BotFields({
  honeypotField = "website",
  startedAtField = "started-at",
  honeypotLabel = "Website",
}: BotFieldsProperties) {
  // Held in state, not written into the field: React puts a hidden field back to its default whenever the form renders
  // again, which would silently turn the fill-time check off.
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => setStartedAt(Date.now()), []);
  return (
    <>
      <input type="hidden" name={startedAtField} value={startedAt} readOnly />
      <div style={HIDDEN} aria-hidden>
        <label>
          {honeypotLabel}
          <input name={honeypotField} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  );
}
