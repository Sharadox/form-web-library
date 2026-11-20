// @vitest-environment happy-dom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { requestChoices, useChoiceRequests } from "@sharadox/form-web-library/choice-request";

afterEach(cleanup);

test("hands each request's choices to the form while it is on the page", () => {
  const first = vi.fn();
  const second = vi.fn();
  const { rerender, unmount } = renderHook(({ handler }) => useChoiceRequests("site:choice", handler), {
    initialProps: { handler: first },
  });
  requestChoices("site:choice", ["website"]);
  expect(first).toHaveBeenCalledWith(["website"]);
  rerender({ handler: second });
  requestChoices("site:choice", ["hosting", "email"]);
  expect(second).toHaveBeenCalledWith(["hosting", "email"]);
  unmount();
  requestChoices("site:choice", ["late"]);
  expect(second).toHaveBeenCalledTimes(1);
});
