// Card payment of invoices through Constra is switched OFF on purpose. Clients are told to pay the
// contractor directly (e-transfer, cheque, cash), and the invoice page, the emails and the
// checkout route all follow this one switch. Nothing else needs to change to keep it off.
//
// To turn it on again someday, return the old check here (live Stripe keys, or test keys with
// STRIPE_ALLOW_TEST_PAYMENTS=true) and re-read the card-payment rules in CLAUDE.md first.
export function onlinePaymentsEnabled(): boolean {
  return false;
}
