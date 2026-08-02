import Stripe from "stripe";

// Lazy singleton — not created until first use so build-time evaluation doesn't fail
let _instance: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(_: Stripe, prop: string | symbol) {
    if (!_instance) {
      _instance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2026-06-24.dahlia",
      });
    }
    return (_instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Plan/pricing config lives in config/plans.ts — do not add plan data here.
