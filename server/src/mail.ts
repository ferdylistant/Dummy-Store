export interface Email {
  to: string
  subject: string
  text: string
  html: string
}

export interface Mailer {
  send(email: Email): Promise<void>
}

/**
 * Sends through Resend when a key is set. Without one, emails are printed to
 * the server log, so sign up still works during development.
 */
export function createMailer(options: { resendApiKey: string; from: string }): Mailer {
  if (!options.resendApiKey) {
    return {
      async send(email) {
        console.log(`\n[email] Ke: ${email.to}\n[email] Subjek: ${email.subject}\n${email.text}\n`)
      },
    }
  }

  return {
    async send(email) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ from: options.from, ...email }),
      })
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        // Sign up does not wait for the email, so the log is where a failure shows up.
        console.error(`[email] Gagal mengirim ke ${email.to}. Resend ${response.status}: ${detail}`)
        if (response.status === 403) {
          console.error(
            '[email] Periksa MAIL_FROM: alamat pengirim harus dari domain yang sudah diverifikasi di Resend, atau kosongkan untuk memakai onboarding@resend.dev.',
          )
        }
        throw new Error(`Resend ${response.status}: ${detail}`)
      }
    },
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

/** A plain, readable email with one button. */
export function actionEmail(options: {
  to: string
  subject: string
  greeting: string
  body: string
  action: string
  url: string
  footnote: string
}): Email {
  const text = `${options.greeting}\n\n${options.body}\n\n${options.action}: ${options.url}\n\n${options.footnote}`
  const html = `<!doctype html><html lang="id"><body style="margin:0;background:#f5f5f7;font-family:Inter,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:32px">
<tr><td style="font-weight:600;font-size:16px">Dummy Store</td></tr>
<tr><td style="padding-top:24px;font-size:22px;font-weight:600">${escapeHtml(options.subject)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#6e6e73">${escapeHtml(options.greeting)}<br><br>${escapeHtml(options.body)}</td></tr>
<tr><td style="padding-top:24px"><a href="${escapeHtml(options.url)}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:999px">${escapeHtml(options.action)}</a></td></tr>
<tr><td style="padding-top:24px;font-size:13px;line-height:1.6;color:#6e6e73">${escapeHtml(options.footnote)}</td></tr>
</table></td></tr></table></body></html>`
  return { to: options.to, subject: options.subject, text, html }
}
