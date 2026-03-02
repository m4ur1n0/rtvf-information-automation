/**
 * Database writer for petition creation
 * Calls worker API endpoint to insert petition data
 */

export interface PetitionData {
  id: string;
  senderEmail: string;
  senderName: string;
  filmTitle: string;
  logline: string;
  productionType: string;
  directorName: string;
  shootDates: string;
  location: string;
  applicationUrl: string;
  roles: string[];
  deadline: Date | null;
  emailBodyText: string;
  emailBodyHtml: string;
  messageId: string;
  sentAt: number;
}

export async function insertPetitionToDatabase(data: PetitionData): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.WEBHOOK_URL;

  if (!apiUrl) {
    throw new Error('API URL not configured');
  }

  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[DB Writer] WEBHOOK_SECRET not configured. Database insert may fail.');
  }

  const response = await fetch(`${apiUrl}/api/petitions/insert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(webhookSecret ? { 'X-Webhook-Secret': webhookSecret } : {}),
    },
    body: JSON.stringify({
      ...data,
      deadline: data.deadline?.toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Database insert failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || 'Database insert failed');
  }
}
