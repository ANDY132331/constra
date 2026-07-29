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

export const PLANS = {
  starter: {
    name: "Starter",
    price: 0,
    priceId: null,
    limits: { projects: 2, workers: 5 },
    features: [
      "2 active projects",
      "5 crew members",
      "Time tracking & clock-in",
      "Basic scheduling",
      "Safety logs",
      "Crew messaging",
    ],
  },
  pro: {
    name: "Pro",
    price: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    limits: { projects: Infinity, workers: Infinity },
    features: [
      "Unlimited projects & crew",
      "Invoices & estimates (PDF)",
      "Payroll & reports export",
      "Equipment management",
      "RFIs & punch lists",
      "Document vault",
      "GPS clock-in verification",
      "AI Daily Brief",
      "Materials tracker",
      "Priority support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
