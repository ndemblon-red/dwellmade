export type UpgradeReason = "anonymous_used_free" | "free_account" | "paid_limit_reached";

/** Maps a server-reported generation-limit kind to the modal variant to show. */
export function upgradeReasonForKind(kind: "anonymous" | "free" | "paid"): UpgradeReason {
  if (kind === "anonymous") return "anonymous_used_free";
  if (kind === "free") return "free_account";
  return "paid_limit_reached";
}
