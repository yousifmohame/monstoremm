// src/app/api/auth/send-reset-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // **THE FIX**: Check for environment variables and throw a clear error if they are missing.
    const hostUser = process.env.HOSTINGER_EMAIL_USER;
    const hostPass = process.env.HOSTINGER_EMAIL_PASS;

    if (!hostUser || !hostPass) {
      console.error("Missing Hostinger SMTP credentials in .env.local");
      throw new Error("Server configuration error: SMTP credentials are not set.");
    }
    
    // Generate the password reset link
    const link = await adminAuth.generatePasswordResetLink(email);

    // Configure Nodemailer with Hostinger SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: hostUser,
        pass: hostPass,
      },
    });

    // Email content
    const mailOptions = {
      from: `Kyotaku Store <${hostUser}>`,
      to: email,
      subject: "إعادة تعيين كلمة المرور لمتجر كيوتاكو",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right; line-height: 1.6;">
          <h2>مرحبًا،</h2>
          <p>لقد طلبت إعادة تعيين كلمة المرور لحسابك في متجر كيوتاكو.</p>
          <p>اضغط على الرابط التالي لإكمال العملية. الرابط صالح لمدة ساعة واحدة.</p>
          <p style="text-align: center; margin: 25px 0;">
            <a href="${link}" style="background-color: #e11d48; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">إعادة تعيين كلمة المرور</a>
          </p>
          <p>إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني.</p>
          <br>
          <p>شكرًا لك،</p>
          <p><strong>فريق كيوتاكو</strong></p>
        </div>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Password reset link sent.' });

  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ success: true, message: 'If the email is registered, a reset link will be sent.' });
    }
    console.error('Send Reset Email API Error:', error);
    return NextResponse.json({ error: 'Failed to send reset email.' }, { status: 500 });
  }
}
