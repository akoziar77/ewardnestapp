import { DocPage } from "./components/DocPage";
import { CodeBlock } from "./components/CodeBlock";

export default function EventsDoc() {
  return (
    <DocPage title="Events" description="Browse the complete event catalog and understand payload schemas.">
      <h2>Event Types</h2>
      <table>
        <thead><tr><th>Event</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>receipt.uploaded</code></td><td>A receipt was submitted for processing</td></tr>
          <tr><td><code>receipt.approved</code></td><td>A receipt passed review and points were awarded</td></tr>
          <tr><td><code>receipt.rejected</code></td><td>A receipt was rejected during review</td></tr>
          <tr><td><code>points.earned</code></td><td>Points were credited to a user</td></tr>
          <tr><td><code>points.redeemed</code></td><td>Points were spent on a reward</td></tr>
          <tr><td><code>tier.changed</code></td><td>A user's tier level changed</td></tr>
          <tr><td><code>streak.updated</code></td><td>A user's streak count was updated</td></tr>
          <tr><td><code>reward.redeemed</code></td><td>A reward was redeemed by a user</td></tr>
          <tr><td><code>brand.visit</code></td><td>A check-in at a brand location was recorded</td></tr>
        </tbody>
      </table>

      <h2>Example: receipt.uploaded</h2>
      <CodeBlock language="json" code={`{
  "event_id": "evt_r3c1pt",
  "event_type": "receipt.uploaded",
  "brand_id": "brand_xyz",
  "payload": {
    "receipt_id": "rec_abc123",
    "user_id": "usr_456",
    "merchant_name": "Corner Bakery",
    "total_amount": 27.50,
    "status": "pending"
  },
  "timestamp": "2026-03-23T14:30:00Z"
}`} />

      <h2>Filtering Events</h2>
      <p>When creating a webhook subscription, specify the exact <code>event_type</code> you want to receive. Each subscription handles one event type.</p>
    </DocPage>
  );
}
