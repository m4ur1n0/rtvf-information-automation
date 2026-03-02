import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
// import { sendPetitionEmail } from '@/lib/email-stub'; // Change to @/lib/email-sender for production
import { sendPetitionEmail } from '@/lib/email-sender';
// import { insertPetitionToDatabase } from '@/lib/db-writer'; // Disabled during testing

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
    const subject = `[SEEKING PEOPLE] ${body.filmTitle}`;

    // Send email
    // TESTING MODE: Currently sends ONLY to creator's email for testing
    // DO NOT uncomment the line below until ready for production
    const result = await sendPetitionEmail({
      // PRODUCTION (COMMENTED OUT): Uncomment this line to send to actual listserv
      // to: process.env.PETITION_RECIPIENT_EMAIL || 'rtvf-l@list.northwestern.edu',

      // TESTING: Send only to petition creator for testing
      to: body.senderEmail,
      replyTo: body.senderEmail,
      subject,
      bodyHtml: body.emailBodyHtml,
      bodyText: body.emailBodyText,
      listServiceId: opportunityId,
      petitionLink,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Insert into database
    // TESTING MODE: Database insert disabled during testing
    // Uncomment the code below when ready to save petitions to database
    /*
    // Parse deadline if provided
    const deadline = body.deadline ? new Date(body.deadline) : null;

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
    */
    console.log('[TESTING] Skipping database insert. Petition data:', {
      id: opportunityId,
      filmTitle: body.filmTitle,
      senderEmail: body.senderEmail,
    });

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
