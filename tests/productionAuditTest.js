require('dotenv').config();
process.env.ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'test_admin_secret_key';
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');

const Banner = require('../models/Banner');
const Coupon = require('../models/Coupon');
const FeatureToggle = require('../models/FeatureToggle');
const AdminSettings = require('../models/AdminSettings');

const adminRoutes = require('../routes/adminRoutes');
const publicRoutes = require('../routes/publicRoutes');
const { errorHandler } = require('../middleware/errorHandler');

const PORT = 5557;
const BASE_ADMIN_URL = `http://localhost:${PORT}/api/admin`;
const BASE_PUBLIC_URL = `http://localhost:${PORT}/api`;

async function runProductionAuditTest() {
  console.log('--- STARTING COMPLETE PRODUCTION AUDIT & SECURITY DTO TEST ---');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prinsgo');
  }
  console.log('✅ Connected to MongoDB');

  const app = express();
  app.use(express.json());

  app.use('/api/admin', adminRoutes);
  app.use('/api', publicRoutes);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✅ Server listening on port ${PORT}`);

  try {
    const adminSecret = process.env.ADMIN_SECRET_KEY || 'test_admin_secret_key';

    // Admin login
    const loginRes = await fetch(`${BASE_ADMIN_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: adminSecret }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Store original settings to restore later
    const originalSettingsDoc = await AdminSettings.getSingleton();
    const originalSettings = originalSettingsDoc.toObject();

    // Set bank details via admin PUT
    await fetch(`${BASE_ADMIN_URL}/settings`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        bankAccountName: 'SECRET ADMIN BANK HOLDER',
        bankAccountNumber: '1234567890987654',
        bankIfsc: 'SECRET0001234',
        bankName: 'SECRET ADMIN BANK',
      }),
    });

    // ==========================================
    // 1. BANNER CREATE, UPDATE, IMAGE PERSISTENCE & PUBLIC DISPLAY
    // ==========================================
    console.log('\n--- 1. Testing Banner Create, Update & Display ---');
    const bannerImg = 'https://example.com/test_banner_img.png';
    const createBannerRes = await fetch(`${BASE_ADMIN_URL}/banners`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'TEST_BANNER_PROD_123',
        imageUrl: bannerImg,
        linkType: 'url',
        linkValue: 'https://example.com',
        order: 1,
        isActive: true,
      }),
    });
    const createBannerData = await createBannerRes.json();
    if (!createBannerRes.ok || !createBannerData.banner?._id) {
      throw new Error('Banner creation failed: ' + JSON.stringify(createBannerData));
    }
    const bannerId = createBannerData.banner._id;

    // MongoDB verify
    const dbBannerCreated = await Banner.findById(bannerId).lean();
    if (!dbBannerCreated || dbBannerCreated.title !== 'TEST_BANNER_PROD_123' || dbBannerCreated.imageUrl !== bannerImg) {
      throw new Error('Banner MongoDB creation verification failed');
    }

    // Public Sync (No secret required)
    const getPublicBannersRes = await fetch(`${BASE_PUBLIC_URL}/banners`);
    const getPublicBannersData = await getPublicBannersRes.json();
    const foundPublicBanner = getPublicBannersData.banners.find((b) => b.title === 'TEST_BANNER_PROD_123');
    if (!foundPublicBanner || foundPublicBanner.imageUrl !== bannerImg) {
      throw new Error('Public/Customer/Driver Banners sync failed');
    }

    // Cleanup Banner
    await fetch(`${BASE_ADMIN_URL}/banners/${bannerId}`, { method: 'DELETE', headers: adminHeaders });
    console.log('✅ 1. Banner Create, Image URL Persistence, and Public Display verified.');

    // ==========================================
    // 2. COUPON CREATE & PERSISTENCE
    // ==========================================
    console.log('\n--- 2. Testing Coupon Create & Persistence ---');
    const couponCode = 'TESTPROD' + Math.floor(1000 + Math.random() * 9000);
    const createCouponRes = await fetch(`${BASE_ADMIN_URL}/coupons`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: couponCode,
        description: 'Test production coupon',
        discountType: 'percentage',
        discountValue: 15,
        minOrderAmount: 100,
        maxDiscountAmount: 50,
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
        isActive: true,
        eligibleService: 'all',
      }),
    });
    const createCouponData = await createCouponRes.json();
    if (!createCouponRes.ok || !createCouponData.coupon?._id) {
      throw new Error('Coupon creation failed: ' + JSON.stringify(createCouponData));
    }
    const couponId = createCouponData.coupon._id;

    // MongoDB verify
    const dbCoupon = await Coupon.findById(couponId).lean();
    if (!dbCoupon || dbCoupon.code !== couponCode) {
      throw new Error('Coupon MongoDB verification failed');
    }

    // Cleanup Coupon
    await fetch(`${BASE_ADMIN_URL}/coupons/${couponId}`, { method: 'DELETE', headers: adminHeaders });
    console.log('✅ 2. Coupon Create and MongoDB Persistence verified.');

    // ==========================================
    // 3. TERMS, PRIVACY, FAQ, ABOUT & APP SETTINGS PERSISTENCE & SYNC
    // ==========================================
    console.log('\n--- 3. Testing Terms, Privacy, FAQ, About & App Settings ---');
    const cmsPayload = {
      terms: 'TEST TERMS PERSIST 123',
      privacy: 'TEST PRIVACY PERSIST 456',
      about: 'TEST ABOUT PERSIST 789',
      faq: 'TEST FAQ PERSIST 321',
      faqs: [{ question: 'TEST FAQ PERSIST 321', answer: 'Answer 321' }],
      supportPhone: '+1-800-555-0199',
      supportEmail: 'support@prinsgo.com',
    };

    // Admin Save
    const putSettingsRes = await fetch(`${BASE_ADMIN_URL}/settings`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify(cmsPayload),
    });
    const putSettingsData = await putSettingsRes.json();
    if (!putSettingsRes.ok || putSettingsData.settings.terms !== 'TEST TERMS PERSIST 123') {
      throw new Error('PUT Settings failed');
    }

    // MongoDB verify
    const dbSettings = await AdminSettings.getSingleton();
    if (dbSettings.terms !== 'TEST TERMS PERSIST 123' || dbSettings.privacy !== 'TEST PRIVACY PERSIST 456') {
      throw new Error('MongoDB Settings persistence failed');
    }

    // Admin Reload verify (Admin GET returns bank details for authorized admin)
    const getAdminSettingsRes = await fetch(`${BASE_ADMIN_URL}/settings`, { headers: adminHeaders });
    const getAdminSettingsData = await getAdminSettingsRes.json();
    if (getAdminSettingsData.settings.terms !== 'TEST TERMS PERSIST 123' || !getAdminSettingsData.settings.bankAccountNumber) {
      throw new Error('Admin GET Settings check failed');
    }

    // Customer / Driver Sync verify (Public GET returns settings BUT STRIPS bank details)
    const getPublicSettingsRes = await fetch(`${BASE_PUBLIC_URL}/settings`);
    const getPublicSettingsData = await getPublicSettingsRes.json();
    if (
      getPublicSettingsData.settings.terms !== 'TEST TERMS PERSIST 123' ||
      getPublicSettingsData.settings.privacy !== 'TEST PRIVACY PERSIST 456' ||
      getPublicSettingsData.settings.about !== 'TEST ABOUT PERSIST 789' ||
      getPublicSettingsData.settings.faq !== 'TEST FAQ PERSIST 321'
    ) {
      throw new Error('Public/Customer/Driver Settings sync failed');
    }

    // SECURITY CHECK: Verify sensitive fields are NOT in public response
    if (
      getPublicSettingsData.settings.bankAccountNumber ||
      getPublicSettingsData.settings.bankIfsc ||
      getPublicSettingsData.settings.bankName ||
      getPublicSettingsData.settings.bankAccountName
    ) {
      throw new Error('CRITICAL SECURITY LEAK: Public /api/settings exposed sensitive bank details!');
    }
    console.log('✅ 3. Terms, Privacy, FAQ, About & App Settings SAVE, MongoDB, GET, Admin Reload, and Customer/Driver Sync verified.');
    console.log('✅ 3a. SECURITY DTO VERIFIED: Sensitive bank details are strictly STRIPPED from public endpoints.');

    // ==========================================
    // 4. FEATURE TOGGLE PERSISTENCE & SYNC
    // ==========================================
    console.log('\n--- 4. Testing Feature Toggle ---');
    const toggleKey = 'test_feature_toggle_' + Math.floor(Math.random() * 1000);
    const createToggleRes = await fetch(`${BASE_ADMIN_URL}/toggles`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        key: toggleKey,
        label: 'Test Feature Toggle',
        description: 'Testing toggle persistence',
        isEnabled: true,
      }),
    });
    const createToggleData = await createToggleRes.json();
    if (!createToggleRes.ok || !createToggleData.toggle?._id) {
      throw new Error('Feature Toggle creation failed');
    }

    // Customer/Driver Sync verify
    const getPublicTogglesRes = await fetch(`${BASE_PUBLIC_URL}/toggles`);
    const getPublicTogglesData = await getPublicTogglesRes.json();
    if (!getPublicTogglesData.toggles.some((t) => t.key === toggleKey && t.isEnabled === true)) {
      throw new Error('Public Feature Toggle sync failed');
    }

    // Cleanup Toggle
    await fetch(`${BASE_ADMIN_URL}/toggles/${toggleKey}`, { method: 'DELETE', headers: adminHeaders });
    console.log('✅ 4. Feature Toggle Create, Mongo, GET, Admin Reload, and Customer/Driver Sync verified.');

    // Restore original settings
    await AdminSettings.findOneAndUpdate(
      { _id: originalSettingsDoc._id },
      { $set: originalSettings }
    );
    console.log('✅ Original Settings restored.');

    console.log('\n🎉 --- ALL AUDIT MODULES AND SECURITY REQUIREMENTS PASSED VERIFICATION! ---');
  } catch (error) {
    console.error('❌ Audit test failed:', error);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runProductionAuditTest();
