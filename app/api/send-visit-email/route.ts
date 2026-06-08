import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      email,
      fullName,
      ticketNumber,
      visitorType,
      reason,
      visitTime
    } = body;

    if (!email || !fullName || !ticketNumber) {
      return NextResponse.json(
        { error: 'Missing required email fields.' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"QNHS Clinic" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `QNHS Clinic Visit Record - ${ticketNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>QNHS Clinic Visit Confirmation</h2>
          <p>Hello <b>${fullName}</b>,</p>

          <p>Your clinic visit has been recorded.</p>

          <p><b>Ticket Number:</b> ${ticketNumber}</p>
          <p><b>Visitor Type:</b> ${visitorType}</p>
          <p><b>Reason:</b> ${reason}</p>
          <p><b>Date/Time:</b> ${visitTime}</p>
          <p><b>Status:</b> Waiting</p>

          <br />
          <p>Please wait for the clinic staff/nurse.</p>
          <p>Thank you.</p>

          <hr />
          <small>QNHS Clinic Health Information System</small>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Email sending failed.' },
      { status: 500 }
    );
  }
}