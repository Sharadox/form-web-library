// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BotFields } from "@sharadox/form-web-library/bot-field";
import { isLikelyBot } from "@sharadox/form-web-library/bot-check";

afterEach(cleanup);

test("records when the form appeared and hides a honeypot, as isLikelyBot reads them", () => {
  vi.spyOn(Date, "now").mockReturnValue(1000);
  const { container } = render(
    <form>
      <BotFields />
    </form>,
  );
  const form = new FormData(container.querySelector("form")!);
  expect(form.get("started-at")).toBe("1000");
  expect(form.get("website")).toBe("");
  expect(isLikelyBot(form, { now: 5000 })).toBe(false);
  expect(isLikelyBot(form, { now: 1500 })).toBe(true);
  expect(container.querySelector("[aria-hidden]")!.textContent).toBe("Website");
  vi.restoreAllMocks();
});

test("keeps the moment the form appeared when the form renders again", () => {
  vi.spyOn(Date, "now").mockReturnValue(1000);
  const form = (label: string) => (
    <form>
      <BotFields honeypotLabel={label} />
    </form>
  );
  const { container, rerender } = render(form("Website"));
  rerender(form("Site"));
  expect(new FormData(container.querySelector("form")!).get("started-at")).toBe("1000");
  vi.restoreAllMocks();
});

test("takes other field names and label", () => {
  const { container } = render(<BotFields honeypotField="url" startedAtField="opened" honeypotLabel="Site" />);
  expect(container.querySelector('[name="url"]')).not.toBeNull();
  expect(container.querySelector('[name="opened"]')).not.toBeNull();
});
