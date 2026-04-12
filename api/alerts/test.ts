import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({ error: 'Email credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are not configured in Vercel Environment Variables.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const targetEmail = email || process.env.GMAIL_USER;

    await transporter.sendMail({
      from: `"WebAnalytics Pro" <${process.env.GMAIL_USER}>`,
      to: targetEmail,
      subject: 'Test Alert: WebAnalytics Pro',
      text: 'This is a test alert from your WebAnalytics Pro dashboard. Email notifications are working!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4F46E5;">WebAnalytics Pro</h2>
          <h3>Test Alert Successful</h3>
          <p>Hello!</p>
          <p>This is a test alert from your WebAnalytics Pro dashboard. If you are reading this, your email notifications are configured correctly on Vercel.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">This is an automated message, please do not reply.</p>
        </div>
      `
    });

    res.status(200).json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email. Check your credentials.' });
  }
}
