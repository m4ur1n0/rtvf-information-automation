import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sendPetitionEmail } from '@/lib/email-stub'; // Change to @/lib/email-sender for production
import { insertPetitionToDatabase } from '@/lib/db-writer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['senderEmail', 'senderName', 'filmTitle', 'logline'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { ok: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate opportunity ID
    const opportunityId = uuidv4();

    // Build petition link with hash
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const petitionLink = `${siteUrl}/petitions/#${opportunityId}`;

    // Prepare email subject
    const subject = `[PETITION] ${body.filmTitle}`;

    // Send email
    const result = await sendPetitionEmail({
      to: process.env.PETITION_RECIPIENT_EMAIL || 'rtvf-l@list.northwestern.edu',
      replyTo: body.senderEmail,
      subject,
      bodyHtml: body.emailBodyHtml,
      bodyText: body.emailBodyText,
      images: body.images || [],
      listServiceId: process.env.LISTSERVICE_ID || 'user-created-petition',
      petitionLink,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Parse deadline if provided
    const deadline = body.deadline ? new Date(body.deadline) : null;

    // Insert into database
    try {
      await insertPetitionToDatabase({
        id: opportunityId,
        senderEmail: body.senderEmail,
        senderName: body.senderName,
        filmTitle: body.filmTitle,
        logline: body.logline,
        productionType: body.productionType || '',
        directorName: body.directorName || '',
        shootDates: body.shootDates || '',
        location: body.location || '',
        applicationUrl: body.applicationUrl || '',
        roles: body.roles || [],
        deadline,
        emailBodyText: body.emailBodyText,
        emailBodyHtml: body.emailBodyHtml,
        messageId: result.messageId || '',
        sentAt: Math.floor(Date.now() / 1000),
      });
    } catch (dbError) {
      console.error('[API] Database insert error:', dbError);
      // Email was sent successfully, but DB insert failed
      // We'll still return success but log the error
      console.warn('[API] Email sent but database insert failed. Manual sync may be needed.');
    }

    return NextResponse.json({
      ok: true,
      opportunityId,
      messageId: result.messageId,
    });

  } catch (error) {
    console.error('[API] Create petition error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
