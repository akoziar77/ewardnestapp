import { DocPage } from "./components/DocPage";
import { CodeBlock } from "./components/CodeBlock";
import { Callout } from "./components/Callout";

export default function SdkNodeDoc() {
  return (
    <DocPage title="Node.js SDK" description="The official SDK for server-side integrations.">
      <h2>Installation</h2>
      <CodeBlock language="bash" code="npm install @rewardsnest/sdk" />

      <h2>Quick Start</h2>
      <CodeBlock language="javascript" title="index.js" code={`import { RewardsNest } from "@rewardsnest/sdk";

const rn = new RewardsNest({
  apiKey: process.env.RN_API_KEY,
  environment: "live" // or "test"
});

// Fetch brand details
const brand = await rn.brands.get("brand_xyz");
console.log(brand.name);

// List recent events
const events = await rn.events.list({
  type: "receipt.uploaded",
  limit: 10
});`} />

      <Callout type="info">
        The SDK automatically handles authentication, retries, and pagination.
      </Callout>

      <h2>Webhook Helpers</h2>
      <CodeBlock language="javascript" title="webhook-handler.js" code={`import { RewardsNest } from "@rewardsnest/sdk";

const rn = new RewardsNest({ apiKey: process.env.RN_API_KEY });

// Express middleware
app.post("/webhooks/rn", (req, res) => {
  const isValid = rn.webhooks.verify(
    req.body,
    req.headers["x-rn-signature"],
    process.env.RN_WEBHOOK_SECRET
  );
  if (!isValid) return res.status(401).send("Invalid signature");
  // Process event...
  res.status(200).send("OK");
});`} />
    </DocPage>
  );
}
