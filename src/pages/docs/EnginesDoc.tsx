import { DocPage } from "./components/DocPage";
import { CodeBlock } from "./components/CodeBlock";
import { Callout } from "./components/Callout";

export default function EnginesDoc() {
  return (
    <DocPage title="Engine Architecture" description="The modular engine system that powers RewardsNest backend logic.">
      <h2>Overview</h2>
      <p>
        RewardsNest uses a set of composable, event-driven engines located in{" "}
        <code>src/lib/engines/</code>. Each engine handles a single domain and communicates
        through a shared <strong>Event Bus</strong>.
      </p>

      <h2>Quick Import</h2>
      <CodeBlock language="typescript" title="Barrel import" code={`import {
  ValidationEngine,
  boosterEngine,
  automationEngine,
  ocrEngine,
  integrationEngine,
  pointsEngine,
  receiptEngine,
  eventBus,
} from "@/lib/engines";`} />

      <Callout type="info">
        All engines are exported from a single barrel file — no need to import
        from individual modules.
      </Callout>

      <h2>Engines Reference</h2>

      <h3>Validation Engine</h3>
      <p>Validates receipt payloads before processing.</p>
      <CodeBlock language="typescript" code={`const result = ValidationEngine.validateReceipt({
  userId: "user_001",
  brand: "Starbucks",
  amount: 7.45,
  uploadedAt: "2026-03-20T14:22:10Z",
});
// result.success === true`} />

      <h3>Booster Engine</h3>
      <p>Registers brand-specific multipliers and applies them to base points.</p>
      <CodeBlock language="typescript" code={`boosterEngine.registerBooster({
  id: "boost_sb",
  brand: "Starbucks",
  multiplier: 2,
});

const boosted = boosterEngine.applyBoosterIfEligible("Starbucks", 10);
// boosted.data === 20`} />

      <h3>Points Engine</h3>
      <p>Calculates base points ($1 = 1 point) and supports multiplied calculations.</p>
      <CodeBlock language="typescript" code={`pointsEngine.calculatePoints(7.45);        // { success: true, data: 7 }
pointsEngine.calculateWithMultiplier(10, 3); // { success: true, data: 30 }`} />

      <h3>Receipt Engine</h3>
      <p>Orchestrates validation, points calculation, and event emission for a receipt upload.</p>
      <CodeBlock language="typescript" code={`const result = await receiptEngine.processReceipt({
  userId: "user_001",
  brand: "Starbucks",
  amount: 7.45,
  uploadedAt: "2026-03-20T14:22:10Z",
});
// result.data.brand === "Starbucks"`} />

      <h3>Automation Engine</h3>
      <p>Registers trigger → action automations and executes them.</p>
      <CodeBlock language="typescript" code={`automationEngine.registerAutomation({
  id: "auto_notify",
  trigger: "RECEIPT_UPLOADED",
  action: "SEND_NOTIFICATION",
  active: true,
});

await automationEngine.runAutomation("SEND_NOTIFICATION", "user_001");`} />

      <h3>OCR Engine</h3>
      <p>Parses receipt image data and returns extracted text.</p>
      <CodeBlock language="typescript" code={`const parsed = await ocrEngine.parseImage(base64String);
// parsed.data === "Starbucks\\nLatte 4.95\\nTotal 7.45"`} />

      <h3>Integration Engine</h3>
      <p>Handles third-party webhook payloads from registered providers.</p>
      <CodeBlock language="typescript" code={`integrationEngine.registerProvider("Shopify", async (payload) => {
  return { success: true, data: true };
});

await integrationEngine.handleWebhook("Shopify", { order_id: "123" });`} />

      <h3>Event Bus</h3>
      <p>Pub/sub system that connects engines via typed events.</p>
      <CodeBlock language="typescript" code={`eventBus.on("RECEIPT_UPLOADED", async (event) => {
  console.log("Receipt from", event.brand);
});

await eventBus.emit({
  type: "RECEIPT_UPLOADED",
  userId: "user_001",
  brand: "Starbucks",
  amount: 7.45,
});`} />

      <h2>Bootstrap</h2>
      <p>
        Call <code>bootstrapRewardsNest()</code> at app start to register default
        boosters, automations, and integration providers.
      </p>
      <CodeBlock language="typescript" title="src/bootstrap.ts" code={`import { bootstrapRewardsNest } from "@/bootstrap";

bootstrapRewardsNest();
// "RewardsNest engines bootstrapped."`} />

      <Callout type="warning">
        Always call <code>bootstrapRewardsNest()</code> before processing any
        receipts or handling webhooks.
      </Callout>
    </DocPage>
  );
}
