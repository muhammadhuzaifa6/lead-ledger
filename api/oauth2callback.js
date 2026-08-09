import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send("Missing code or session token.");
  }

  // "state" is the user's Supabase session token — verify it to know who's connecting
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${state}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(state);
  if (userError || !userData?.user) {
    return res.status(401).send("Could not verify your account — go back to the app and try connecting again.");
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      return res.status(200).send(`
        <h2>Connected, but no refresh token was returned.</h2>
        <p>This usually happens if you've already granted access before. Go to
        <a href="https://myaccount.google.com/permissions" target="_blank">Google Account permissions</a>,
        remove access for this app, then try connecting again from Ledger.</p>
      `);
    }

    const { error: upsertError } = await supabase
      .from("calendar_connections")
      .upsert({ user_id: userData.user.id, refresh_token: tokens.refresh_token });

    if (upsertError) {
      return res.status(500).send("Connected to Google, but saving failed — " + upsertError.message);
    }

    res.status(200).send(`
      <h2>Calendar connected!</h2>
      <p>You can close this tab and go back to Ledger.</p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Auth failed — check the Vercel function logs for details.");
  }
}