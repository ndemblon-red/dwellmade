import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FaqSection, FAQ_ITEMS } from "./FaqSection";

const questions = () => screen.getAllByRole("button", { expanded: false }).concat(screen.queryAllByRole("button", { expanded: true }));

const allButtons = () => screen.getAllByRole("button");

describe("FaqSection", () => {
  it("renders every question collapsed by default", () => {
    render(<FaqSection />);
    const buttons = allButtons();
    expect(buttons).toHaveLength(FAQ_ITEMS.length);
    for (const [i, button] of buttons.entries()) {
      expect(button).toHaveTextContent(FAQ_ITEMS[i].question);
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveTextContent("+");
    }
    expect(questions()).toHaveLength(FAQ_ITEMS.length);
  });

  it("opens an item on click and shows its answer", async () => {
    const user = userEvent.setup();
    render(<FaqSection />);
    const first = allButtons()[0];
    await user.click(first);

    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveTextContent("−");
    const panel = document.getElementById(first.getAttribute("aria-controls")!);
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("aria-hidden", "false");
    expect(panel).toHaveTextContent(FAQ_ITEMS[0].answer);
  });

  it("closes the same item when clicked again", async () => {
    const user = userEvent.setup();
    render(<FaqSection />);
    const first = allButtons()[0];
    await user.click(first);
    await user.click(first);

    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(first).toHaveTextContent("+");
    const panel = document.getElementById(first.getAttribute("aria-controls")!);
    expect(panel).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps only one item open at a time", async () => {
    const user = userEvent.setup();
    render(<FaqSection />);
    const buttons = allButtons();

    await user.click(buttons[0]);
    await user.click(buttons[3]);

    expect(buttons[0]).toHaveAttribute("aria-expanded", "false");
    expect(buttons[3]).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
  });

  it("links each button to its own panel", () => {
    render(<FaqSection />);
    const ids = allButtons().map((b) => b.getAttribute("aria-controls"));
    expect(new Set(ids).size).toBe(FAQ_ITEMS.length);
    for (const id of ids) {
      expect(document.getElementById(id!)).not.toBeNull();
    }
  });

  it("reaches the questions with Tab in document order", async () => {
    const user = userEvent.setup();
    render(<FaqSection />);
    const buttons = allButtons();

    await user.tab();
    expect(buttons[0]).toHaveFocus();
    await user.tab();
    expect(buttons[1]).toHaveFocus();
  });

  it("toggles the focused item with Enter and keeps focus", async () => {
    const user = userEvent.setup();
    render(<FaqSection />);
    const first = allButtons()[0];

    await user.tab();
    await user.keyboard("{Enter}");
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(first).toHaveFocus();
  });

  it("toggles the focused item with Space", async () => {
    const user = userEvent.setup();
    render(<FaqSection />);
    const first = allButtons()[0];

    await user.tab();
    await user.keyboard(" ");
    expect(first).toHaveAttribute("aria-expanded", "true");

    await user.keyboard(" ");
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(first).toHaveFocus();
  });
});
