import { DocPage } from "./components/DocPage";
import { CodeBlock } from "./components/CodeBlock";
import { Callout } from "./components/Callout";

export default function TestingDoc() {
  return (
    <DocPage title="Testing" description="Tools and strategies for testing your integration.">
      <h2>Sandbox Environment</h2>
      <p>Use test API keys (prefixed <code>rn_test_</code>) to interact with the sandbox. No real points are awarded and no webhooks are delivered to production endpoints.</p>

      <h2>Sending Test Events</h2>
      <p>From the Webhook Manager, click <strong>Send Test Event</strong> to fire a synthetic event to your endpoint:</p>
      <CodeBlock language="bash" code={`curl -X POST https://api.rewardsnest.app/v1/webhooks/test \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"subscription_id": "sub_abc123"}'`} />

      <Callout type="success" title="Tip">
        Use a request inspector like <strong>webhook.site</strong> to see exactly what payloads we deliver.
      </Callout>

      <h2>Replaying Events</h2>
      <p>In the Event Explorer, select any event and click <strong>Replay</strong> to re-deliver it to all active webhook subscriptions.</p>

      <h2>Common Debugging Steps</h2>
      <ol>
        <li>Check the <strong>Delivery Logs</strong> in Webhook Manager for HTTP status codes</li>
        <li>Verify your endpoint returns <code>200</code> within 10 seconds</li>
        <li>Ensure your signature verification uses the correct secret</li>
        <li>Check the <strong>Dead Letter Queue</strong> in Event Explorer for failed deliveries</li>
      </ol>
    </DocPage>
  );
}
