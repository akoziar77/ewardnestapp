import { DocPage } from "./components/DocPage";

export default function ChangelogDoc() {
  return (
    <DocPage title="Changelog" description="Recent updates to the RewardsNest developer platform.">
      <h2>March 2026</h2>
      <ul>
        <li><strong>Event Explorer</strong> — Browse, filter, and replay events from the admin panel.</li>
        <li><strong>Webhook Manager</strong> — Create, edit, test, and monitor webhook subscriptions.</li>
        <li><strong>Dead Letter Queue</strong> — Failed deliveries are now automatically captured for inspection.</li>
        <li><strong>HMAC-SHA256 signatures</strong> — All webhook deliveries are signed for verification.</li>
      </ul>

      <h2>February 2026</h2>
      <ul>
        <li><strong>Receipt OCR</strong> — AI-powered receipt scanning with brand matching.</li>
        <li><strong>Booster Engine</strong> — Configurable point multipliers based on tiers, SKUs, and actions.</li>
        <li><strong>Geofence Import</strong> — Bulk import brand locations with radius-based check-in zones.</li>
      </ul>

      <h2>January 2026</h2>
      <ul>
        <li><strong>Tier Progression</strong> — Automatic tier upgrades based on lifetime spend per brand.</li>
        <li><strong>Streak Tracking</strong> — Daily check-in streaks with bonus points.</li>
        <li><strong>Multi-brand Ledger</strong> — Points tracked per merchant with full transaction history.</li>
      </ul>
    </DocPage>
  );
}
