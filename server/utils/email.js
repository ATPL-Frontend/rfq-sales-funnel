import "dotenv/config";
import nodemailer from "nodemailer";

export const sendMail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // requireTLS: true,
    tls: {
      rejectUnauthorized: false,
    },
    family: 4,
    // logger: true,
    // debug: true,
    // connectionTimeout: 20000,
    // greetingTimeout: 20000,
    // socketTimeout: 30000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"RFQ login" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    console.error("SENDMAIL ERROR FULL:", error);
    throw error;
  }
};