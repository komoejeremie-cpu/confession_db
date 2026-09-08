import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

try {
  await transporter.verify();
  console.log('✅ Connexion SMTP Brevo réussie.');
} catch (error) {
  console.error('❌ Échec de la connexion SMTP.');
  console.error(error.message);
}