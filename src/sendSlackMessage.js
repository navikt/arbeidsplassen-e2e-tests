import fetch from "node-fetch";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const CHANNEL = "#team-arbeidsplassen_no-alerts";

async function sendSlackMessage(message) {
  if (!SLACK_BOT_TOKEN) {
    console.error("No Slack token");
    console.error(message);
    return;
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: CHANNEL,
      text: message,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Slack API error:", data);
  }
}

export default sendSlackMessage;
