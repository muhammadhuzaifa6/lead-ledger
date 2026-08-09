import { google } from "googleapis";

function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return client;
}

function mapRoundToStage(text) {
  const t = text.toLowerCase();
  if (/offer/.test(t)) return "Offer";
  if (/(reject|declin|no longer)/.test(t)) return "Rejected";
  if (/(3rd|third)/.test(t)) return "3rd Call";
  if (/(final|onsite|on-site|panel)/.test(t)) return "Final Call";
  if (/(2nd|second)/.test(t)) return "2nd Call";
  return "1st Call";
}

function parseEventTitle(title) {
  if (title.includes("<>")) {
    const parts = title.split("<>").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return { round: parts[0], jobTitle: parts[1], company: parts[2], recruiterName: "" };
    }
    if (parts.length === 2) {
      return { round: parts[0], jobTitle: parts[1], company: "", recruiterName: "" };
    }
    return { round: title, jobTitle: "", company: title, recruiterName: "" };
  }
  const parts = title.split(/\s*-\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return { company: parts[0], recruiterName: parts[1], round: parts.slice(2).join(" - "), jobTitle: "" };
  }
  if (parts.length === 2) {
    return { company: parts[0], recruiterName: "", round: parts[1], jobTitle: "" };
  }
  return { company: title, recruiterName: "", round: title, jobTitle: "" };
}

function parseDescription(description) {
  const fields = {};
  if (!description) return fields;
  description.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) return;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (!value || /^n\/?a$/i.test(value)) return;
    if (/position|role|job title/.test(key)) fields.jobTitle = value;
    else if (/^company$/.test(key)) fields.company = value;
    else if (/job link|posting/.test(key)) fields.jobUrl = value;
    else if (/^round$/.test(key)) fields.round = value;
    else if (/recruiter'?s?\s*email/.test(key)) fields.recruiterEmail = value;
    else if (/recruiter'?s?\s*name/.test(key)) fields.recruiterName = value;
    else if (/salary/.test(key)) fields.salary = value;
    else if (/interview mode/.test(key)) fields.interviewMode = value;
    else if (/interview link/.test(key)) fields.interviewLink = value;
    else if (/stack/.test(key)) fields.stack = value;
    else if (/region/.test(key)) fields.region = value;
  });
  return fields;
}

export default async function handler(req, res) {
  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return res.status(401).json({
        error: "Not connected yet — visit /api/auth first, then paste the refresh token into your Vercel env vars.",
      });
    }

    const oauth2Client = getOAuthClient();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const timeMin = new Date(Date.now() - 3 * 86400000).toISOString();
    const timeMax = new Date(Date.now() + 30 * 86400000).toISOString();

    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const results = (data.items || [])
      .filter((ev) => ev.summary)
      .map((ev) => {
        const titleParsed = parseEventTitle(ev.summary);
        const desc = parseDescription(ev.description);

        const company = desc.company || titleParsed.company || "";
        const jobTitle = desc.jobTitle || titleParsed.jobTitle || "";
        const recruiterName = desc.recruiterName || titleParsed.recruiterName || "";
        const stage = mapRoundToStage(titleParsed.round || desc.round || "");
        const start = ev.start?.dateTime || ev.start?.date;

        let salary = 0;
        if (desc.salary) {
          const digits = desc.salary.replace(/[^0-9]/g, "");
          salary = digits ? Number(digits) : 0;
        }

        const noteBits = [];
        if (desc.interviewMode) noteBits.push(`Mode: ${desc.interviewMode}`);
        if (desc.interviewLink) noteBits.push(`Link: ${desc.interviewLink}`);
        if (desc.stack) noteBits.push(`Stack: ${desc.stack}`);
        if (desc.region) noteBits.push(`Region: ${desc.region}`);

        return {
          company,
          recruiterName,
          recruiterEmail: desc.recruiterEmail || "",
          jobTitle,
          jobUrl: desc.jobUrl || "",
          stage,
          salary,
          eventDate: start ? start.slice(0, 16) : "",
          notes: noteBits.join(" · ") || ev.description || ev.summary,
        };
      });

    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
}