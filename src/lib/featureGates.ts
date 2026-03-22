import { type TierKey } from "./subscriptionTiers";

export interface FeatureGate {
  key: string;
  label: string;
  description: string;
  free: boolean;
  pro: boolean;
  business: boolean;
}

export const FEATURE_GATES: FeatureGate[] = [
  {
    key: "basic_visit_tracking",
    label: "Visit Tracking",
    description: "Log and track visits to your favorite brands",
    free: true,
    pro: true,
    business: true,
  },
  {
    key: "standard_rewards",
    label: "Standard Rewards",
    description: "Access the standard rewards catalog",
    free: true,
    pro: true,
    business: true,
  },
  {
    key: "brand_connections_3",
    label: "Up to 3 Brand Connections",
    description: "Connect up to 3 loyalty programs",
    free: true,
    pro: true,
    business: true,
  },
  {
    key: "unlimited_brands",
    label: "Unlimited Brand Connections",
    description: "Connect as many loyalty programs as you want",
    free: false,
    pro: true,
    business: true,
  },
  {
    key: "advanced_analytics",
    label: "Advanced Analytics",
    description: "Detailed stats, trends, and spending insights",
    free: false,
    pro: true,
    business: true,
  },
  {
    key: "premium_rewards",
    label: "Premium Rewards",
    description: "Access exclusive premium rewards",
    free: false,
    pro: true,
    business: true,
  },
  {
    key: "geofence_alerts",
    label: "Geofence Alerts",
    description: "Get notified when near brand locations",
    free: false,
    pro: true,
    business: true,
  },
  {
    key: "priority_points",
    label: "Priority Point Tracking",
    description: "Real-time point balance sync across programs",
    free: false,
    pro: true,
    business: true,
  },
  {
    key: "team_analytics",
    label: "Team Analytics Dashboard",
    description: "Shared analytics for your team or household",
    free: false,
    pro: false,
    business: true,
  },
  {
    key: "custom_integrations",
    label: "Custom Integrations",
    description: "Connect custom loyalty APIs and data sources",
    free: false,
    pro: false,
    business: true,
  },
  {
    key: "priority_support",
    label: "Priority Support",
    description: "Fast-track support with dedicated assistance",
    free: false,
    pro: false,
    business: true,
  },
  {
    key: "api_access",
    label: "API Access",
    description: "Programmatic access to your loyalty data",
    free: false,
    pro: false,
    business: true,
  },
];

export type FeatureKey = typeof FEATURE_GATES[number]["key"];

export function hasFeatureAccess(featureKey: string, tier: TierKey): boolean {
  const gate = FEATURE_GATES.find((f) => f.key === featureKey);
  if (!gate) return false;
  return gate[tier];
}
