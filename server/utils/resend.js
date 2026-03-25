import "dotenv/config";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMailResend = async (to, subject, html) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error("RESEND ERROR:", error);
      throw new Error(error.message || "Failed to send email");
    }

    return data;
  } catch (error) {
    console.error("SENDMAIL ERROR FULL:", error);
    throw error;
  }
};