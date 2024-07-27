const nodemailer = require("nodemailer");

const SendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: "Chat App",
    to: options.to,
    subject: options.subject,
    // text: options.text,
    html: options.text,
  };

  const result = await transporter.sendMail(mailOptions);
  return result;
};

module.exports = SendEmail;
