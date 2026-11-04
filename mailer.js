const nodemailer = require("nodemailer");

let transporter = null;

async function getTransporter() {
  if (!transporter) {
    const compte = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: compte.user, pass: compte.pass },
    });
    console.log("SMTP Ethereal prêt :", compte.user);
  }
  return transporter;
}

async function envoyerEmail({ to, subject, text }) {
  const t = await getTransporter();
  try {
    const info = await t.sendMail({
      from: '"GameHub" <noreply@gamehub.local>',
      to,
      subject,
      text,
    });
    console.log(`Email envoyé à ${to}  ${nodemailer.getTestMessageUrl(info)}`);
  } catch (err) {
    transporter = null;
    console.error("Échec envoi email :", err.message);
    throw err;
  }
}

module.exports = { envoyerEmail };
