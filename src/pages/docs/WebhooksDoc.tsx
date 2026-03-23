import { DocPage } from "./components/DocPage";
import { CodeBlock } from "./components/CodeBlock";
import { Callout } from "./components/Callout";

export default function WebhooksDoc() {
  return (
    <DocPage title="Webhooks" description="Receive real-time notifications when events occur on the platform.">
      <h2>How It Works</h2>
      <p>Register an HTTPS endpoint. When an event fires, we send a <code>POST</code> request with a signed JSON payload. You have 10 seconds to return a <code>2xx</code> response.</p>

      <h2>Creating a Subscription</h2>
      <CodeBlock language="bash" code={`curl -X POST https://api.rewardsnest.app/v1/webhooks \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/webhooks/rn",
    "event_type": "receipt.uploaded",
    "secret": "whsec_your_signing_secret"
  }'`} />

      <h2>Verifying Signatures</h2>
      <p>Each delivery includes an <code>X-RN-Signature</code> header containing an HMAC-SHA256 hex digest of the request body:</p>
      <CodeBlock language="javascript" title="verify.js" code={`import crypto from "crypto";

function verifySignature(body, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`} />

      <Callout type="warning" title="Retries">
        Failed deliveries are retried up to 5 times with exponential backoff. After 5 failures the event moves to the dead-letter queue.
      </Callout>

      <h2>Payload Format</h2>
      <CodeBlock language="json" code={`{
  "event_id": "evt_a1b2c3",
  "event_type": "receipt.uploaded",
  "brand_id": "brand_xyz",
  "payload": { ... },
  "timestamp": "2026-03-23T12:00:00Z"
}`} />
    </DocPage>
  );
}
