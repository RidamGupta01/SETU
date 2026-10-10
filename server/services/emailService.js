import dotenv from 'dotenv';
import nodemailerClient from 'nodemailer';

dotenv.config();

const sendEmail = async (options) => {
  const isSmtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );

  if (!isSmtpConfigured) {
    console.log('--- MOCK EMAIL OUTBOX ---');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message:\n${options.message}`);
    console.log('-------------------------');
    return { success: true, mock: true };
  }

  const transporter = nodemailerClient.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const message = {
    from: `${process.env.FROM_NAME || 'SETU'} <${process.env.FROM_EMAIL || 'noreply@setu.gov.in'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message}</p>`,
  };

  const info = await transporter.sendMail(message);

  console.log(`Message sent: ${info.messageId}`);
  return info;
};

export default sendEmail;
