// Clients should only be sent to card checkout when Stripe is live; a test-mode checkout
// rejects real cards. Set STRIPE_ALLOW_TEST_PAYMENTS=true to try test payments yourself.
export function onlinePaymentsEnabled(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return true;
  return !!key && process.env.STRIPE_ALLOW_TEST_PAYMENTS === "true";
}
