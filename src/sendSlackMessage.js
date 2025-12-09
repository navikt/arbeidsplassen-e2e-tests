import fetch from "node-fetch";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const CHANNEL = "#team-arbeidsplassen_no-alerts";
// Kun send Slack hvis denne er satt (f.eks. i CI)
const ENABLE_SLACK_ALERTS = process.env.SLACK_ALERTS_ENABLED === "true";

/**
 * @param {string | { text: string; blocks?: unknown[]; attachments?: unknown[] }} payload
 */
async function sendSlackMessage(payload) {

  const bodyBase =
      typeof payload === "string"
          ? { text: payload }
          : payload;

  const body = {
    channel: CHANNEL,
    unfurl_links: false,
    unfurl_media: false,
    ...bodyBase,
  };

  if (!ENABLE_SLACK_ALERTS) {
    console.log("[Slack] Alerts disabled (SLACK_ALERTS_ENABLED !== 'true').");
    console.log("[Slack] Would have sent:");
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  if (!SLACK_BOT_TOKEN) {
    console.error("[Slack] No Slack token");
    console.error(JSON.stringify(body, null, 2));
    return;
  }

  console.log("[Slack] Sending message to", CHANNEL);

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Slack API error:", data);
  }
}

export default sendSlackMessage;
