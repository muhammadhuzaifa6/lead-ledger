import { google } from "googleapis";

export default async function handler(req, res) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await client.getToken(req.query.code);

    if (!tokens.refresh_token) {
      return res.status(200).send(`
        <h2>Connected, but no refresh token was returned.</h2>
        <p>This usually happens if you've already granted access before. Go to
        <a href="https://myaccount.google.com/permissions" target="_blank">Google Account permissions</a>,
        remove access for this app, then visit <code>/api/auth</code> again.</p>
      `);
    }

    res.status(200).send(`
      <h2>Connected!</h2>
      <p>Copy this refresh token and paste it into your Vercel project's environment variables
      as <code>GOOGLE_REFRESH_TOKEN</code>, then redeploy:</p>
      <pre style="background:#eee;padding:12px;border-radius:6px;word-break:break-all;">${tokens.refresh_token}</pre>
      <p>Keep this secret — do not commit it to your repo.</p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Auth failed — check the Vercel function logs for details.");
  }
}