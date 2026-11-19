// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { PhoneField } from "@sharadox/form-web-library/phone-field";

afterEach(cleanup);

const value = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="hidden"]')!.value;
/** Lets the lazily loaded flags arrive. */
const flags = () => act(() => import("@sharadox/icon-web-library/flag").then(() => new Promise((r) => setTimeout(r))));

test("sends nothing until digits are typed, then the full number, ignoring anything else typed", async () => {
  const typed: string[] = [];
  const { container } = render(
    <PhoneField
      name="phone"
      locale="en"
      inputProps={{ id: "phone", "aria-invalid": true, onChange: (event) => typed.push(event.target.value) }}
      className="field"
      inputClassName="box"
    />,
  );
  await flags();
  expect(value(container)).toBe("");
  const box = container.querySelector<HTMLInputElement>("#phone")!;
  expect(box.className).toBe("box");
  expect(box.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(box, { target: { value: "912 abc 345-678" } });
  expect(box.value).toBe("912345678");
  expect(value(container)).toBe("+351 912345678");
  expect(typed).toEqual(["912 abc 345-678"]);
  expect(container.querySelector(".field svg[aria-hidden]")).not.toBeNull();
});

test("a pasted international number picks its country", () => {
  const { container } = render(<PhoneField name="phone" locale="en" />);
  fireEvent.change(container.querySelector('input[type="tel"]')!, { target: { value: "+44 20 7946 0958" } });
  expect(value(container)).toBe("+44 2079460958");
  expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Country: United Kingdom +44");
});

test("the list has every country by name in the page's language, the default first, and can be searched", async () => {
  render(<PhoneField name="phone" locale="pt" defaultCountry="BR" labels={{ country: "País", search: "Procurar" }} />);
  const prefix = screen.getByRole("button", { name: "País: Brasil +55" });
  fireEvent.click(prefix);
  expect(prefix.getAttribute("aria-expanded")).toBe("true");
  const options = screen.getAllByRole("option");
  expect(options).toHaveLength(245);
  expect(options[0]!.textContent).toBe("Brasil+55");
  expect(options[0]!.getAttribute("aria-selected")).toBe("true");
  expect(options[1]!.textContent).toContain("+93");
  const search = screen.getByRole("combobox", { name: "Procurar" });
  fireEvent.change(search, { target: { value: "+351" } });
  expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Portugal+351"]);
  fireEvent.change(search, { target: { value: "es" } });
  expect(screen.getAllByRole("option").map((option) => option.textContent)).toContain("Espanha+34");
  fireEvent.change(search, { target: { value: "nothing like it" } });
  expect(screen.queryAllByRole("option")).toHaveLength(0);
  expect(search.getAttribute("aria-activedescendant")).toBeNull();
  fireEvent.keyDown(search, { key: "Enter" });
  expect(screen.getByRole("listbox")).toBeDefined();
  fireEvent.click(prefix);
  expect(screen.queryByRole("listbox")).toBeNull();
});

test("arrow keys move through the list, Enter chooses, Escape closes", () => {
  const { container } = render(<PhoneField name="phone" locale="en" />);
  const prefix = screen.getByRole("button");
  fireEvent.click(prefix);
  const search = screen.getByRole("combobox");
  fireEvent.change(search, { target: { value: "united" } });
  fireEvent.keyDown(search, { key: "ArrowUp" });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  const active = screen.getAllByRole("option")[2]!;
  expect(active.hasAttribute("data-active")).toBe(true);
  expect(search.getAttribute("aria-activedescendant")).toBe(active.id);
  fireEvent.keyDown(search, { key: "a" });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(document.activeElement).toBe(prefix);
  fireEvent.change(container.querySelector('input[type="tel"]')!, { target: { value: "5" } });
  expect(value(container)).toMatch(/^\+\d+ 5$/);
  fireEvent.click(prefix);
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
});

test("a pointer picks a country, and a press outside closes the list", () => {
  const { container } = render(<PhoneField name="phone" locale="en" />);
  fireEvent.click(screen.getByRole("button"));
  const spain = screen.getAllByRole("option").find((option) => option.textContent === "Spain+34")!;
  fireEvent.pointerMove(spain);
  expect(spain.hasAttribute("data-active")).toBe(true);
  fireEvent.click(spain);
  fireEvent.change(container.querySelector('input[type="tel"]')!, { target: { value: "612" } });
  expect(value(container)).toBe("+34 612");
  fireEvent.click(screen.getByRole("button"));
  fireEvent.pointerDown(screen.getByRole("combobox"));
  expect(screen.getByRole("listbox")).toBeDefined();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("listbox")).toBeNull();
});
