import nodemailer from "nodemailer";
import { ApiError } from "./ApiError.js";

const sendToUserEMailId = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL_USER,
        pass: process.env.NODEMAILER_EMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Blog App" <${process.env.NODEMAILER_EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    throw new ApiError(400, "Failed to send the email to requested email");
  }
};

export { sendToUserEMailId };
