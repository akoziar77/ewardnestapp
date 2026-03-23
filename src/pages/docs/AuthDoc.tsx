import { DocPage } from "./components/DocPage";
import { CodeBlock } from "./components/CodeBlock";
import { Callout } from "./components/Callout";

export default function AuthDoc() {
  return (
    <DocPage title="Authentication" description="Authenticate API requests using Bearer tokens or API keys.">
      <h2>Bearer Token</h2>
      <p>Obtain an access token by signing in through the standard auth flow. Include it in the <code>Authorization</code> header:</p>
      <CodeBlock language="bash" code={`curl -X GET https://api.rewardsnest.app/v1/me \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`} />

      <h2>API Key Authentication</h2>
      <p>For server-to-server integrations, use an API key instead of a user token:</p>
      <CodeBlock language="bash" code={`curl -X GET https://api.rewardsnest.app/v1/brands \\
  -H "X-API-Key: rn_live_abc123..."`} />

      <Callout type="warning" title="Keep keys secret">
        Never expose API keys in client-side code. Use environment variables on your server.
      </Callout>

      <h2>Token Refresh</h2>
      <p>Access tokens expire after 1 hour. Use the refresh token to obtain a new access token without re-authenticating:</p>
      <CodeBlock language="javascript" title="token-refresh.js" code={`const { data } = await supabase.auth.refreshSession();
console.log(data.session.access_token);`} />
    </DocPage>
  );
}
