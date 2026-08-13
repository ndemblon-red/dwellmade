import { describe, expect, it, vi, beforeEach } from "vitest";

const signInWithPassword = vi.fn();
const signOut = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithPassword, signOut } },
}));

const { signInWithEmail, signOutSession } = await import("./auth-actions");

beforeEach(() => {
  signInWithPassword.mockReset();
  signOut.mockReset();
});

describe("signInWithEmail", () => {
  it("signs in with the trimmed email and the given password", async () => {
    signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });

    await expect(signInWithEmail("  user@dwellmade.co.uk ", "hunter2")).resolves.toBeUndefined();

    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@dwellmade.co.uk",
      password: "hunter2",
    });
  });

  it("throws when the credentials are rejected", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error("Invalid login credentials"),
    });

    await expect(signInWithEmail("user@dwellmade.co.uk", "wrong")).rejects.toThrow(
      "Invalid login credentials",
    );
  });
});

describe("signOutSession", () => {
  it("clears the session", async () => {
    signOut.mockResolvedValue({ error: null });

    await expect(signOutSession()).resolves.toBeUndefined();

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("throws when sign out fails", async () => {
    signOut.mockResolvedValue({ error: new Error("network down") });

    await expect(signOutSession()).rejects.toThrow("network down");
  });
});
