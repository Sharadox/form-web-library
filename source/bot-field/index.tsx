"use client";
import { useEffect, useRef } from "react";
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
  const startedAt = useRef<HTMLInputElement>(null);
  useEffect(() => {
    startedAt.current!.value = String(Date.now());
  }, []);
  return (
    <>
      <input ref={startedAt} type="hidden" name={startedAtField} defaultValue="0" />
      <div style={HIDDEN} aria-hidden>
        <label>
          {honeypotLabel}
          <input name={honeypotField} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  );
}
