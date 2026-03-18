import "dotenv/config";
import nodemailer from "nodemailer";

export const sendMail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: rmail.colocity.host,
    port: Number(587),
    secure: false,
    auth: {
      user: "noreply@atpldhaka.com",
      pass: "Jamil@2020!",
    },
    requireTLS: true,
    tls: {
      rejectUnauthorized: false,
    },
    family: 4,
    logger: true,
    debug: true,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  });

  try {
    await transporter.verify();
    console.log("SMTP verify successful");

    const info = await transporter.sendMail({
      from: `"RFQ login" <noreply@atpldhaka.com>`,
      to,
      subject,
      html,
    });

    console.log("Mail sent:", info);
    return info;
  } catch (error) {
    console.error("SENDMAIL ERROR FULL:", error);
    throw error;
  }
};