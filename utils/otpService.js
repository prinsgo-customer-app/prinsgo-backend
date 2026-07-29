const Otp = require('../models/Otp');

// Generate a 6-digit numeric OTP
const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create and store an OTP for a phone number, purpose-scoped, valid 5 minutes
const createOtp = async (phone, purpose = 'login') => {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Remove any older unverified OTPs for this phone + purpose
  await Otp.deleteMany({ phone, purpose, verified: false });

  await Otp.create({ phone, code, purpose, expiresAt });
  return code;
};

// Check an OTP code for a phone + purpose WITHOUT consuming it
const checkOtp = async (phone, code, purpose = 'login') => {
  const record = await Otp.findOne({ phone, code, purpose, verified: false });
  if (!record) return { valid: false, message: 'Invalid OTP' };
  if (record.expiresAt < new Date()) return { valid: false, message: 'OTP expired' };
  return { valid: true, message: 'OTP verified', record };
};

// Mark an OTP record as verified/consumed (call only once the flow will complete)
const consumeOtp = async (record) => {
  record.verified = true;
  await record.save();
};

// Verify an OTP code for a phone + purpose (checks and immediately consumes)
const verifyOtp = async (phone, code, purpose = 'login') => {
  const result = await checkOtp(phone, code, purpose);
  if (!result.valid) return result;
  await consumeOtp(result.record);
  return { valid: true, message: 'OTP verified' };
};

// Send OTP via SMS gateway (uses OTP_API_KEY-based provider, e.g. MSG91/Fast2SMS style REST API)
const sendOtpSms = async (phone, code) => {
  if (!process.env.OTP_API_KEY) {
    // Dev fallback - log to console instead of failing silently
    console.log(`[DEV OTP] Sending OTP ${code} to ${phone}`);
    return true;
  }

  try {
    const response = await fetch('https://api.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: process.env.OTP_API_KEY,
      },
      body: JSON.stringify({
        mobile: `91${phone}`,
        otp: code,
        template_id: process.env.OTP_TEMPLATE_ID || undefined,
      }),
    });
    const data = await response.json();
    if (data.type === 'error') {
      console.error('OTP send failed:', data.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('OTP SMS error:', error.message);
    return false;
  }
};

module.exports = { createOtp, verifyOtp, checkOtp, consumeOtp, sendOtpSms, generateOtpCode };
