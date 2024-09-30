const nodemailer = require("nodemailer");

const sendMail = async (adminMail, appPassword, email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: adminMail,
        pass: appPassword,
      },
    });
    const mailOptions = {
      from: "sujanrumakantha@gmail.com",
      to: email,
      subject: subject,
      text: text,
    };
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = sendMail;
