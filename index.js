require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// Credential Schema
const credentialSchema = new mongoose.Schema({
  user: String,
  pass: String,
});
const Credential = mongoose.model("Credential", credentialSchema, "bulkmail");

// Email validation
const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

// Send Email API
app.post("/sendemail", async (req, res) => {
  try {
    const { msg, emailList } = req.body;
    if (!msg || !Array.isArray(emailList))
      return res.status(400).json({ success: false, message: "Invalid data" });

    const validEmails = emailList.filter(isValidEmail);
    if (validEmails.length === 0)
      return res.status(400).json({ success: false, message: "No valid emails" });

    const data = await Credential.findOne().sort({ _id: -1 });
    if (!data)
      return res.status(400).json({ success: false, message: "No email credentials" });

    // nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: data.user,
        pass: data.pass, 
      },
    });

    await transporter.verify();

    for (const email of validEmails) {
      try {
        await transporter.sendMail({
          from: `"Bulk Mail" <${data.user}>`,
          to: email,
          subject: "Bulk Message",
          text: msg,
        });
        console.log("📧 Sent:", email);
        await new Promise((res) => setTimeout(res, 1000));
      } catch (err) {
        console.error("❌ Failed to send:", email, err.message);
      }
    }

    res.json({ success: true, message: "Emails sent (check logs for failures)" });
  } catch (error) {
    console.error("❌ Email Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));