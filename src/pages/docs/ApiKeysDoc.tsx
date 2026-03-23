import { DocPage } from "./components/DocPage";
import { CodeBlock } from "./components/CodeBlock";
import { Callout } from "./components/Callout";

export default function ApiKeysDoc() {
  return (
    <DocPage title="API Keys" description="Create and manage API keys for programmatic access.">
      <h2>Key Types</h2>
      <table>
        <thead><tr><th>Type</th><th>Prefix</th><th>Use Case</th></tr></thead>
        <tbody>
          <tr><td>Live</td><td><code>rn_live_</code></td><td>Production integrations</td></tr>
          <tr><td>Test</td><td><code>rn_test_</code></td><td>Sandbox / development</td></tr>
        </tbody>
      </table>

      <h2>Creating a Key</h2>
      <CodeBlock language="bash" code={`curl -X POST https://api.rewardsnest.app/v1/api-keys \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Integration", "scopes": ["read:brands", "write:webhooks"]}'`} />

      <Callout type="info" title="Scopes">
        Keys can be scoped to specific resources. Available scopes: <code>read:brands</code>, <code>write:webhooks</code>, <code>read:events</code>, <code>write:rewards</code>.
      </Callout>

      <h2>Rotating Keys</h2>
      <p>Rotate a key to invalidate the old secret and generate a new one. The old key remains valid for 24 hours to allow migration.</p>
      <CodeBlock language="bash" code={`curl -X POST https://api.rewardsnest.app/v1/api-keys/KEY_ID/rotate \\
  -H "Authorization: Bearer YOUR_TOKEN"`} />
    </DocPage>
  );
}
