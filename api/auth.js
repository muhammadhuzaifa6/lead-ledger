import { google } from "googleapis";

export default function handler(req, res) {
  const token = req.query.token;
  if (!token) {
    return res.status(400).send("Missing session token — connect from inside the app, not this URL directly.");
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    state: token,
  });

  res.redirect(url);
}