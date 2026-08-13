import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { UpgradeModal } from "./UpgradeModal";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const openCheckout = vi.fn();
vi.mock("@/hooks/useStripeCheckout", () => ({
  useStripeCheckout: () => ({
    openCheckout,
    closeCheckout: vi.fn(),
    isOpen: false,
    checkoutElement: null,
  }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "u1" }, loading: false }),
}));

beforeEach(() => vi.clearAllMocks());

describe("UpgradeModal — paid monthly limit", () => {
  const props = {
    open: true,
    onClose: vi.fn(),
    reason: "paid_limit_reached" as const,
    resetsAt: "2026-09-14T00:00:00.000Z",
    used: 50,
    limit: 50,
  };

  it("renders nothing when closed", () => {
    render(<UpgradeModal {...props} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the limit-reached copy with the renewal date and usage", () => {
    render(<UpgradeModal {...props} />);
    expect(screen.getByText("YOU'VE REACHED YOUR MONTHLY LIMIT")).toBeInTheDocument();
    expect(screen.getByText("You've used all 50 generations")).toBeInTheDocument();
    expect(screen.getByText(/14 September/)).toBeInTheDocument();
    expect(screen.getByText("50 of 50 used this month")).toBeInTheDocument();
  });

  it("falls back to generic renewal copy when no reset date is known", () => {
    render(<UpgradeModal {...props} resetsAt={undefined} />);
    expect(screen.getByText(/start of your next billing month/)).toBeInTheDocument();
  });

  it("does not offer a subscription to an existing subscriber", () => {
    render(<UpgradeModal {...props} />);
    expect(screen.queryByText(/Ready to make it yours\?/)).toBeNull();
    expect(screen.queryByRole("button", { name: /subscribe now/i })).toBeNull();
    expect(screen.queryByText(/£15/)).toBeNull();
  });

  it("links Manage subscription to the account page", () => {
    render(<UpgradeModal {...props} />);
    const link = screen.getByRole("link", { name: "Manage subscription" });
    expect(link).toHaveAttribute("href", "/account");
  });

  it("closes via Got it and the close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<UpgradeModal {...props} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Got it" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("UpgradeModal — non-paid variants", () => {
  it("offers checkout to a signed-in free user", async () => {
    const user = userEvent.setup();
    render(<UpgradeModal open onClose={vi.fn()} reason="free_account" />);
    expect(screen.getByText("YOUR FREE VISITOR ALLOWANCE HAS ENDED")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /subscribe now/i }));
    expect(openCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ priceId: "dwellmade_basic_monthly" }),
    );
  });

  it("shows the visitor allowance copy for anonymous users", () => {
    render(<UpgradeModal open onClose={vi.fn()} reason="anonymous_used_free" />);
    expect(screen.getByText("YOU'VE USED YOUR 3 FREE GENERATIONS")).toBeInTheDocument();
  });
});
