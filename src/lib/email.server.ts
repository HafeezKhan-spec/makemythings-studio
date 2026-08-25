const RESEND_API = "https://api.resend.com/emails";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

/** Sends transactional email via Resend. Falls back to server log when API key is not set. */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"] ?? "MakeMyThing <onboarding@resend.dev>";

  if (!apiKey) {
    console.info(`[email:dev] To: ${to} | Subject: ${subject}\n${html.replace(/<[^>]+>/g, " ").trim()}`);
    return;
  }

  const response = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    // Fallback for unverified custom domains — Resend sandbox sender
    if (response.status === 403 && !from.includes("resend.dev")) {
      const retry = await fetch(RESEND_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MakeMyThing <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        }),
      });
      if (retry.ok) return;
      const retryBody = await retry.text();
      throw new Error(`Could not send email (${retry.status}): ${retryBody}`);
    }
    throw new Error(`Could not send email (${response.status}): ${body}`);
  }
}

export function otpEmailHtml(code: string, purpose: "login" | "signup"): string {
  const action = purpose === "login" ? "sign in to" : "verify your account on";
  return `
    <div style="font-family:Manrope,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 8px">MakeMyThing.in</h1>
      <p style="color:#555;margin:0 0 20px">Use this code to ${action} MakeMyThing.in:</p>
      <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:0 0 20px">${code}</p>
      <p style="color:#888;font-size:13px;margin:0">This code expires in <strong>5 minutes</strong>. If you didn't request it, you can ignore this email.</p>
    </div>
  `;
}
