// utils/mailer.ts
import nodemailer from 'nodemailer';

// export const sendMail = async (to: string, subject: string, html: string) => {
//   const transporter = nodemailer.createTransport({
//     service: 'Gmail',
//     auth: {
//       user: process.env.EMAIL_FROM,
//       pass: process.env.EMAIL_PASS
//     }
//   });

//   await transporter.sendMail({
//     from: `"Wintru Games" <${process.env.EMAIL_FROM}>`,
//     to,
//     subject,
//     html
//   });
// };

export const sendMail = async (to: string, subject: string, html: string) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: `"Wintru Games" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html
    });
};
