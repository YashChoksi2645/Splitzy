const nodemailer = require('nodemailer');
const dns = require('dns');

// Fixes a common "queryA ETIMEOUT smtp.gmail.com" error: on some networks
// (many home routers/ISPs with incomplete IPv6 support), Node tries an IPv6
// DNS lookup first, which hangs until it times out, before ever trying IPv4 -
// even though IPv4 would have worked instantly. Forcing IPv4-first avoids that.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Generic SMTP sender - defaults to Gmail so a beginner only needs to set
// EMAIL_USER + EMAIL_PASS (a Gmail "App Password", not your normal password -
// see the README for how to generate one). Any other SMTP provider (Outlook,
// a transactional email service, etc.) works too by setting EMAIL_HOST/EMAIL_PORT.
function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      'Email is not configured: set EMAIL_USER and EMAIL_PASS in your .env (see README section on email verification).'
    );
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // upgrades to TLS via STARTTLS on port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Fail fast with a clear error instead of hanging for minutes if the
    // network can't reach Gmail at all (e.g. SMTP ports blocked outbound -
    // this is common on some serverless hosts, see README troubleshooting).
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
}

async function sendOtpEmail(toEmail, otp, name) {
  const transporter = getTransporter();
  const fromName = process.env.EMAIL_FROM_NAME || 'Splitzy';

  await transporter.sendMail({
    from: `"${fromName}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Your Splitzy verification code: ${otp}`,
    text: `Hi ${name || ''},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#5b5fef;">Verify your email</h2>
        <p>Hi ${name || ''},</p>
        <p>Your verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color:#1f2937;">${otp}</p>
        <p style="color:#6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  });
}

module.exports = { sendOtpEmail };
