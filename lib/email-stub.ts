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
  images: string[]; // base64 data URLs
  listServiceId: string;
  petitionLink: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendPetitionEmail(data: EmailData): Promise<EmailResult> {
  console.log('[EMAIL STUB] Would send email:', {
    to: data.to,
    replyTo: data.replyTo,
    subject: data.subject,
    headers: {
      'X-ListService-ID': data.listServiceId,
    },
    bodyPreview: data.bodyText.substring(0, 100) + '...',
    imageCount: data.images.length,
    petitionLink: data.petitionLink,
  });

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return fake success
  return {
    success: true,
    messageId: `stub-${Date.now()}`,
  };
}
