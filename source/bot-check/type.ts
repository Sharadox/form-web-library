export interface BotCheckOptions {
  /** A field hidden from people; anything typed in it was typed by a bot. Defaults to "website". */
  honeypotField?: string;
  /** A hidden field holding when the visitor started filling the form (milliseconds). Defaults to "started-at". */
  startedAtField?: string;
  /** People take longer than this to fill a form, in milliseconds. Defaults to 2500. */
  minimumFillTime?: number;
  /** Defaults to now. */
  now?: number;
}
