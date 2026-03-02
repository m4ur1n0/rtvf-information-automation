/**
 * Stub email sender for development
 * Replace with email-sender.ts in production
 */

export interface EmailData {
  to: string;
  replyTo: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  listServiceId: string;
  petitionLink: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendPetitionEmail(data: EmailData): Promise<EmailResult> {
  // Simulate embedding listServiceId in email body (like production does)
  const finalText = `${data.bodyText}\n\n---\n${data.petitionLink}\n\nlist_service_id: ${data.listServiceId}`;

  console.log('[EMAIL STUB] Would send email:', {
    to: data.to,
    replyTo: data.replyTo,
    subject: data.subject,
    headers: {
      'X-ListService-ID': data.listServiceId,
    },
    bodyPreview: finalText.substring(0, 100) + '...',
    htmlPreview: data.bodyHtml.substring(0, 100) + '...',
    petitionLink: data.petitionLink,
    listServiceId: data.listServiceId,
  });

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return fake success
  return {
    success: true,
    messageId: `stub-${Date.now()}`,
  };
}
