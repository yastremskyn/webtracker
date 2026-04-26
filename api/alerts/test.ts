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

    const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%"><defs><mask id="line-mask"><rect width="512" height="512" fill="white" /><path d="M 60 400 L 150 260 L 240 360 L 350 200 L 450 120" fill="none" stroke="black" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" /><circle cx="60" cy="400" r="32" fill="black" /><circle cx="150" cy="260" r="32" fill="black" /><circle cx="240" cy="360" r="32" fill="black" /><circle cx="350" cy="200" r="32" fill="black" /><circle cx="450" cy="120" r="32" fill="black" /></mask></defs><g fill="#2dd4bf" mask="url(#line-mask)"><rect x="36" y="220" width="48" height="240" rx="8" /><rect x="126" y="100" width="48" height="360" rx="8" /><rect x="216" y="180" width="48" height="280" rx="8" /><rect x="326" y="80" width="48" height="380" rx="8" /><rect x="426" y="160" width="48" height="300" rx="8" /></g><path d="M 60 400 L 150 260 L 240 360 L 350 200 L 450 120" fill="none" stroke="#3b82f6" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" /><g fill="#3b82f6"><circle cx="60" cy="400" r="24" /><circle cx="150" cy="260" r="24" /><circle cx="240" cy="360" r="24" /><circle cx="350" cy="200" r="24" /><circle cx="450" cy="120" r="24" /></g></svg>`;
    const encodedLogo = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

    await transporter.sendMail({
      from: `"UWebAnalytics" <${process.env.GMAIL_USER}>`,
      to: targetEmail,
      subject: 'Test Alert: UWebAnalytics',
      text: 'This is a test alert from your UWebAnalytics dashboard. Email notifications are working!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
            <img src="${encodedLogo}" alt="UWebAnalytics Logo" style="width: 40px; height: 40px;" />
            <h2 style="color: #4F46E5; margin: 0;">UWebAnalytics</h2>
          </div>
          <h3>Test Alert Successful</h3>
          <p>Hello!</p>
          <p>This is a test alert from your UWebAnalytics dashboard. If you are reading this, your email notifications are configured correctly.</p>
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
