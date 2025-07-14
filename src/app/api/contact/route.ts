import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// **THE FIX FOR TESTING**: Change the recipient to your verified email
const testingEmail = 'me8999109@gmail.com'; 

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: `Kyotaku Store <onboarding@resend.dev>`, 
      to: [testingEmail], // Use the testing email here
      subject: `رسالة جديدة من متجر كيوتاكو: ${subject}`,
      replyTo: email,
      html: `
        <div style="direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">📨 رسالة جديدة من صفحة التواصل</h2>

            <p style="margin: 12px 0;"><strong>👤 الاسم:</strong> ${name}</p>
            <p style="margin: 12px 0;"><strong>📧 البريد الإلكتروني للعميل:</strong> <a href="mailto:${email}" style="color: #007BFF;">${email}</a></p>
            <p style="margin: 12px 0;"><strong>📝 الموضوع:</strong> ${subject}</p>

            <hr style="margin: 20px 0; border-top: 1px solid #eee;">

            <p style="margin: 12px 0;"><strong>💬 الرسالة:</strong></p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; line-height: 1.8; color: #333;">
                ${message.replace(/\n/g, '<br>')}
            </div>

            <p style="margin-top: 30px; font-size: 0.85em; color: #888;">🕊️ هذه الرسالة أُرسلت من نموذج التواصل على موقع كيوتاكو.</p>
            </div>
        </div>
        `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully' });

  } catch (error: any) {
    console.error('Contact API Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
