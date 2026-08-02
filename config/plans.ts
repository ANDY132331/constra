// All plan/pricing config lives here. Change prices without touching any UI code.

export type PlanId = "free" | "pro" | "enterprise";
export type BillingCycle = "monthly" | "annual";

export type PlanLimits = {
  workers: number | "unlimited";
  activeProjects: number | "unlimited";
  photoStorage: "unlimited";
};

export type PlanFeature = {
  label: string;
  included: boolean;
  highlight?: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  /** USD cents/month when billed monthly. 0 = free. -1 = custom/contact sales. */
  monthlyPrice: number;
  /** USD cents/month when billed annually (displayed price, billed as annual lump). */
  annualPrice: number;
  /** Days of free trial before payment required. 0 = no trial. */
  trialDays: number;
  color: string;
  badge?: string;
  limits: PlanLimits;
  features: PlanFeature[];
};

const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "For small teams getting started",
    monthlyPrice: 0,
    annualPrice: 0,
    trialDays: 0,
    color: "#6b7280",
    limits: {
      workers: "unlimited",
      activeProjects: "unlimited",
      photoStorage: "unlimited",
    },
    features: [
      { label: "Unlimited workers", included: true },
      { label: "Unlimited active projects", included: true },
      { label: "Unlimited photo & file storage", included: true },
      { label: "Full time tracking & live clock-in photos", included: true },
      { label: "GPS verification on every clock-in", included: true },
      { label: "Scheduling & task management", included: true },
      { label: "Safety logs & incident reporting", included: true },
      { label: "Basic reports & analytics", included: true },
      { label: "Team invite code & management", included: true },
      { label: "Advanced reports & payroll export", included: false },
      { label: "Custom roles & permissions", included: false },
      { label: "Priority support", included: false },
      { label: "API access", included: false },
    ],
  },

  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For growing businesses",
    monthlyPrice: 2900,   // $29/month
    annualPrice: 1900,    // $19/month billed annually = $228/year
    trialDays: 14,
    color: "#f59e0b",
    badge: "Most Popular",
    limits: {
      workers: "unlimited",
      activeProjects: "unlimited",
      photoStorage: "unlimited",
    },
    features: [
      { label: "Unlimited workers", included: true, highlight: true },
      { label: "Unlimited active projects", included: true, highlight: true },
      { label: "Unlimited photo & file storage", included: true },
      { label: "Time tracking & live clock-in photos", included: true },
      { label: "Advanced reports & PDF export", included: true, highlight: true },
      { label: "Custom roles & permissions", included: true },
      { label: "Scheduling", included: true },
      { label: "Safety logs", included: true },
      { label: "Full admin tools & audit logs", included: true },
      { label: "Priority support", included: true, highlight: true },
      { label: "API access", included: true },
    ],
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large organizations",
    monthlyPrice: -1,  // Custom pricing
    annualPrice: -1,
    trialDays: 30,
    color: "#8b5cf6",
    limits: {
      workers: "unlimited",
      activeProjects: "unlimited",
      photoStorage: "unlimited",
    },
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "Custom integrations & webhooks", included: true },
      { label: "SLA guarantee", included: true },
      { label: "On-premise deployment option", included: true },
      { label: "Custom contracts & billing", included: true },
      { label: "SSO / SAML", included: true },
      { label: "Multi-company management", included: true },
    ],
  },
};

export { PLANS };

/** Format a monthly price in USD cents to display string. */
export function formatPlanPrice(cents: number): string {
  if (cents === 0) return "$0";
  if (cents < 0) return "Custom";
  const dollars = cents / 100;
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`;
}

/** Annual savings vs paying monthly for 12 months. */
export function annualSavings(plan: Plan): number {
  if (plan.monthlyPrice <= 0) return 0;
  return (plan.monthlyPrice - plan.annualPrice) * 12;
}

/** Check whether a given resource count is within the plan limit. */
export function withinLimit(current: number, limit: number | "unlimited"): boolean {
  return limit === "unlimited" || current < limit;
}

/** Human-readable limit string. */
export function limitLabel(limit: number | "unlimited"): string {
  return limit === "unlimited" ? "Unlimited" : String(limit);
}

export default PLANS;
