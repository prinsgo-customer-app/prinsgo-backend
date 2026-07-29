const Otp = require('../models/Otp');

// Generate 6 digit OTP
const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create OTP
const createOtp = async (phone, purpose = 'login') => {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await Otp.deleteMany({
    phone: phone.toString().trim(),
    purpose,
    verified: false,
  });

  await Otp.create({
    phone: phone.toString().trim(),
    code: code.toString().trim(),
    purpose,
    expiresAt,
    verified: false,
  });

  console.log("==================================");
  console.log("OTP CREATED");
  console.log("Phone :", phone);
  console.log("Code  :", code);
  console.log("==================================");

  return code;
};

// Verify OTP
const verifyOtp = async (phone, code, purpose = 'login') => {

  phone = phone.toString().trim();
  code = code.toString().trim();

  console.log("==================================");
  console.log("VERIFY OTP REQUEST");
  console.log("Phone :", phone);
  console.log("Code  :", code);

  const allOtps = await Otp.find({ phone });

  console.log("DB Records :", JSON.stringify(allOtps, null, 2));

  const record = await Otp.findOne({
    phone,
    code,
    purpose,
    verified: false,
  });

  console.log("Matched Record :", record);

  if (!record) {
    return {
      valid: false,
      message: "Invalid OTP"
    };
  }

  if (record.expiresAt < new Date()) {
    return {
      valid: false,
      message: "OTP expired"
    };
  }

  record.verified = true;
  await record.save();

  console.log("OTP VERIFIED SUCCESSFULLY");

  return {
    valid: true,
    message: "OTP verified"
  };
};

// Send SMS
const sendOtpSms = async (phone, code) => {

  if (!process.env.OTP_API_KEY) {
    console.log(`[DEV OTP] Sending OTP ${code} to ${phone}`);
    return true;
  }

  try {

    const response = await fetch("https://api.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.OTP_API_KEY,
      },
      body: JSON.stringify({
        mobile: `91${phone}`,
        otp: code,
        template_id: process.env.OTP_TEMPLATE_ID || undefined,
      }),
    });

    const data = await response.json();

    if (data.type === "error") {
      console.log(data);
      return false;
    }

    return true;

  } catch (err) {

    console.log(err);

    return false;

  }

};

module.exports = {
  createOtp,
  verifyOtp,
  sendOtpSms,
  generateOtpCode,
};
