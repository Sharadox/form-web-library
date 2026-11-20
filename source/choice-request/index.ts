"use client";
import { useEffect, useRef } from "react";

/**
 * Asks a form on the page to tick some choices (those already ticked stay ticked), for buttons that lead to the form,
 * such as a service card's. `event` names the form's channel, for example "site:contact-choice".
 *
 * @example
 * requestChoices("sharadox:contact-need", ["website"]);
 */
export function requestChoices<Key extends string>(event: string, choices: readonly Key[]): void {
  dispatchEvent(new CustomEvent<readonly Key[]>(event, { detail: choices }));
}

/**
 * The form's side: calls `onRequest` with the choices each request asks for, while the form is on the page.
 *
 * @example
 * useChoiceRequests("sharadox:contact-need", (choices) => setTicked((ticked) => new Set([...ticked, ...choices])));
 */
export function useChoiceRequests<Key extends string>(
  event: string,
  onRequest: (choices: readonly Key[]) => void,
): void {
  const latest = useRef(onRequest);
  useEffect(() => {
    latest.current = onRequest;
  });
  useEffect(() => {
    const listener = (request: Event) => latest.current((request as CustomEvent<readonly Key[]>).detail);
    addEventListener(event, listener);
    return () => removeEventListener(event, listener);
  }, [event]);
}
