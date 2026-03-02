/**
 * Production email sender using Resend
 * Requires RESEND_API_KEY environment variable
 */

import { Resend } from 'resend';
import type { EmailData, EmailResult } from './email-stub';

export async function sendPetitionEmail(data: EmailData): Promise<EmailResult> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Convert base64 images to attachments
    const attachments = data.images.map((img, idx) => {
      // Extract base64 content and determine file type
      const matches = img.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        console.warn(`Invalid image data URL at index ${idx}`);
        return null;
      }

      const [, extension, content] = matches;

      return {
        filename: `image-${idx + 1}.${extension}`,
        content: content,
      };
    }).filter((att): att is NonNullable<typeof att> => att !== null);

    // Embed petition link in HTML body
    const finalHtml = `
      ${data.bodyHtml}
      <hr />
      <p><a href="${data.petitionLink}">View this petition online</a></p>
    `;

    const finalText = `${data.bodyText}\n\n---\n${data.petitionLink}`;

    // Send email via Resend
    const result = await resend.emails.send({
      from: process.env.PETITION_FROM_EMAIL || 'petitions@yourdomain.com',
      to: data.to,
      replyTo: data.replyTo,
      subject: data.subject,
      html: finalHtml,
      text: finalText,
      headers: {
        'X-ListService-ID': data.listServiceId,
      },
      attachments,
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
