/**
 * Production email sender using Resend
 * Requires RESEND_API_KEY environment variable
 */

import { Resend } from 'resend';
import type { EmailData, EmailResult } from './email-stub';

export async function sendPetitionEmail(data: EmailData): Promise<EmailResult> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Embed petition link and listServiceId in HTML body
    // Images are already embedded inline in the HTML as base64 data URLs
    const finalHtml = `
      ${data.bodyHtml}
      <hr />
      <p><a href="${data.petitionLink}">View this petition online</a></p>
      <p style="color: #999; font-size: 11px;">list_service_id: ${data.listServiceId}</p>
    `;

    const finalText = `${data.bodyText}\n\n---\n${data.petitionLink}\n\nlist_service_id: ${data.listServiceId}`;

    // Send email via Resend
    const result = await resend.emails.send({
      from: process.env.PETITION_FROM_EMAIL || "listservice@resend.dev",
      to: data.to,
      replyTo: data.replyTo,
      subject: data.subject,
      html: finalHtml,
      text: finalText,
      headers: {
        'X-ListService-ID': data.listServiceId,
      },
    });

    if (result.error) {
      console.error('[EMAIL] Resend error:', result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id || 'unknown',
    };
  } catch (error) {
    console.error('[EMAIL] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
