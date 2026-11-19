"use client";
import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@sharadox/icon-web-library/icon";
import { CALLING_CODES, type CallingCountry } from "@sharadox/form-web-library/calling-code";
import { fullPhone, readPhone } from "@sharadox/form-web-library/phone-number";
import styles from "./index.module.css";
import type { PhoneFieldProperties } from "@sharadox/form-web-library/phone-field/type";

// The flags are one module of about 47 KB compressed: loaded on their own, after the field is on screen.
const Flag = lazy(() => import("@sharadox/icon-web-library/flag").then((module) => ({ default: module.Flag })));
const COUNTRIES = Object.keys(CALLING_CODES) as CallingCountry[];

/** A flag, with an empty box of the same size until the flags have loaded. */
function CountryFlag({ country }: { country: CallingCountry }) {
  return (
    <Suspense fallback={<span className={styles.flag} />}>
      <Flag country={country} className={styles.flag} />
    </Suspense>
  );
}

/**
 * A phone number with its country: a button with the country's flag and calling code opens a searchable list of every
 * country (names in the page's language), and beside it a box that takes digits only. Pasting or typing a number
 * that starts with "+" or "00" picks its country. The form receives one field, `name`, holding "+351 912345678" (or
 * nothing when no digits were typed). Arrow keys, Enter and Escape work in the list. Colors come from the text and
 * from `--phone-field-*` variables; the number box takes `inputProps` (id, aria attributes, handlers) and the site's
 * own input styles through `inputClassName`.
 *
 * @example
 * <PhoneField name="phone" locale="pt" defaultCountry="PT" inputProps={{ id: "phone" }} />
 */
export function PhoneField({
  name,
  locale,
  defaultCountry = "PT",
  labels = { country: "Country", search: "Search" },
  inputProps,
  className,
  inputClassName,
}: PhoneFieldProperties) {
  const [country, setCountry] = useState<CallingCountry>(defaultCountry);
  const [digits, setDigits] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  // Every country by name in the page's language, the default one first.
  const sorted = useMemo(
    () =>
      [...COUNTRIES].sort((a, b) =>
        a === defaultCountry ? -1 : b === defaultCountry ? 1 : names.of(a)!.localeCompare(names.of(b)!, locale),
      ),
    [names, locale, defaultCountry],
  );
  const wanted = query.trim().toLowerCase().replace(/^\+/, "");
  const shown = wanted
    ? sorted.filter(
        (code) =>
          names.of(code)!.toLowerCase().includes(wanted) ||
          code.toLowerCase() === wanted ||
          CALLING_CODES[code].startsWith(wanted),
      )
    : sorted;

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current!.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);

  const choose = (code: CallingCountry) => {
    setCountry(code);
    setOpen(false);
    setQuery("");
    button.current!.focus();
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => Math.min(Math.max(index + step, 0), Math.max(shown.length - 1, 0)));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (shown[active]) choose(shown[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      button.current!.focus();
    }
  };
  const optionId = (index: number) => `${id}-option-${index}`;

  return (
    <div ref={root} className={[styles.field, className].filter(Boolean).join(" ")}>
      <input type="hidden" name={name} value={fullPhone(country, digits)} />
      <button
        ref={button}
        type="button"
        className={styles.prefix}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${labels.country}: ${names.of(country)} +${CALLING_CODES[country]}`}
        onClick={() => {
          setOpen((now) => !now);
          setActive(0);
        }}
      >
        <CountryFlag country={country} />
        <span>+{CALLING_CODES[country]}</span>
        <Icon name="chevron-down" className={styles.chevron} />
      </button>
      <input
        {...inputProps}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        className={inputClassName}
        value={digits}
        onChange={(event) => {
          const read = readPhone(event.target.value, country);
          setCountry(read.country);
          setDigits(read.digits.slice(0, 15));
          inputProps?.onChange?.(event);
        }}
      />
      {open && (
        <div className={styles.popover}>
          <input
            className={styles.search}
            type="search"
            role="combobox"
            aria-label={labels.search}
            aria-expanded
            aria-controls={`${id}-list`}
            aria-activedescendant={shown.length ? optionId(active) : undefined}
            placeholder={labels.search}
            value={query}
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={keys}
          />
          <ul ref={list} id={`${id}-list`} role="listbox" aria-label={labels.country} className={styles.list}>
            {shown.map((code, index) => (
              <li
                key={code}
                id={optionId(index)}
                role="option"
                aria-selected={code === country}
                data-index={index}
                data-active={index === active || undefined}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(code)}
              >
                <CountryFlag country={code} />
                <span className={styles.name}>{names.of(code)}</span>
                <span className={styles.code}>+{CALLING_CODES[code]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
