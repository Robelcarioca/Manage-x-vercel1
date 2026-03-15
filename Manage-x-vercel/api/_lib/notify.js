import nodemailer from "nodemailer";
import prisma from "./prisma.js";

const canSendEmail = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = canSendEmail()
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  : null;

export const notifyUser = async (userId, type, title, body) => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body }
  });

  if (transporter && process.env.SMTP_FROM) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: title,
        text: body
      });
    }
  }

  return notification;
};