export interface BotFieldsProperties {
  /** The honeypot's field name: people never fill it (it's out of sight), robots do. `website` by default. */
  honeypotField?: string;
  /** The field that records when the form appeared. `started-at` by default. */
  startedAtField?: string;
  /** The honeypot's visible label, read only by robots. */
  honeypotLabel?: string;
}
