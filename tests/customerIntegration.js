require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');
const UserNotification = require('../models/UserNotification');
const SupportTicket = require('../models/SupportTicket');

const authRoutes = require('../routes/authRoutes');
const couponRoutes = require('../routes/couponRoutes');
const rideRoutes = require('../routes/rideRoutes');
const parcelRoutes = require('../routes/parcelRoutes');
const bookingRoutes = require('../routes/bookingRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const supportRoutes = require('../routes/supportRoutes');
const adminRoutes = require('../routes/adminRoutes');

const { errorHandler } = require('../middleware/errorHandler');

const PORT = 5556;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runCustomerTests() {
  console.log('--- STARTING CUSTOMER INTEGRATION TESTS ---');

  // 1. Database Connection
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prinsgo');
  }
  console.log('✅ Connected to MongoDB');

  const testPhone = '9000000001';
  const testName = 'Alice Customer';

  // Clear existing test entries
  await User.deleteMany({ phone: testPhone });
  await Coupon.deleteMany({ code: { $in: ['DISCOUNT10', 'FIXED50', 'EXPIRED20', 'RIDEONLY'] } });
  await Ride.deleteMany({});
  await Parcel.deleteMany({});
  await UserNotification.deleteMany({});
  await SupportTicket.deleteMany({});

  // 2. Setup Express Server
  const app = express();
  app.use(express.json());

  // Mount Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/rides', rideRoutes);
  app.use('/api/parcels', parcelRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new Server(server);
  app.set('io', io);

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✅ Express server listening on port ${PORT}`);

  try {
    // ==========================================
    // Test 1: Customer Authentication / OTP Register & Login
    // ==========================================
    console.log('1. Testing Customer Auth & Registration...');

    // Request OTP
    const sendOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone }),
    });
    const sendOtpData = await sendOtpRes.json();
    if (!sendOtpRes.ok || !sendOtpData.success) {
      throw new Error('Send OTP failed: ' + JSON.stringify(sendOtpData));
    }
    console.log('✅ Send OTP request passed.');

    // Find the generated OTP in DB (since we are testing in-sandbox, bypass real SMS)
    const OtpModel = require('../models/Otp');
    const otpRecord = await OtpModel.findOne({ phone: testPhone }).sort({ createdAt: -1 });
    if (!otpRecord) {
      throw new Error('OTP record not found in database');
    }
    const testOtpCode = otpRecord.code;

    // Verify OTP and Register (New User)
    const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, code: testOtpCode, name: testName }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.success || !verifyData.token) {
      throw new Error('Verify OTP & Registration failed: ' + JSON.stringify(verifyData));
    }
    const token = verifyData.token;
    const customerId = verifyData.user.id;
    console.log('✅ Customer OTP Verification & Registration passed.');

    // Fetch Profile via /me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    if (!meRes.ok || !meData.success || meData.user.phone !== testPhone) {
      throw new Error('Get profile /me failed: ' + JSON.stringify(meData));
    }
    console.log('✅ Get profile /auth/me passed.');

    // Update Profile
    const updateRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Alice Updated', email: 'alice@example.com' }),
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok || !updateData.success || updateData.user.name !== 'Alice Updated') {
      throw new Error('Update profile failed: ' + JSON.stringify(updateData));
    }
    console.log('✅ Update profile passed.');

    // ==========================================
    // Test 2: Saved Addresses CRUD
    // ==========================================
    console.log('2. Testing Saved Addresses CRUD...');

    // 2.1 Add Address
    const addAddressRes = await fetch(`${BASE_URL}/auth/address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        label: 'home',
        address: '123 Main Street, Bangalore',
        lat: 12.9716,
        lng: 77.5946,
      }),
    });
    const addAddressData = await addAddressRes.json();
    if (!addAddressRes.ok || !addAddressData.success || addAddressData.savedAddresses.length === 0) {
      throw new Error('Add Saved Address failed: ' + JSON.stringify(addAddressData));
    }
    const addressId = addAddressData.savedAddresses[0]._id;
    console.log('✅ Add Saved Address passed.');

    // 2.2 Get Addresses
    const getAddressRes = await fetch(`${BASE_URL}/auth/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getAddressData = await getAddressRes.json();
    if (!getAddressRes.ok || !getAddressData.success || getAddressData.savedAddresses.length === 0) {
      throw new Error('Get Saved Addresses failed: ' + JSON.stringify(getAddressData));
    }
    console.log('✅ Get Saved Addresses passed.');

    // 2.3 Update Address
    const updateAddressRes = await fetch(`${BASE_URL}/auth/address/${addressId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        label: 'work',
        address: '456 Tech Park, Bangalore',
        lat: 12.9780,
        lng: 77.5980,
      }),
    });
    const updateAddressData = await updateAddressRes.json();
    if (!updateAddressRes.ok || !updateAddressData.success || updateAddressData.savedAddresses[0].label !== 'work') {
      throw new Error('Update Saved Address failed: ' + JSON.stringify(updateAddressData));
    }
    console.log('✅ Update Saved Address passed.');

    // 2.4 Validate invalid coordinate range
    const badAddressRes = await fetch(`${BASE_URL}/auth/address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        label: 'other',
        address: 'Mars Planet',
        lat: 500, // Invalid lat
        lng: 120,
      }),
    });
    if (badAddressRes.status !== 400) {
      throw new Error('Address coordinate validation did not fail on bad inputs');
    }
    console.log('✅ Saved Address input coordinate validation passed.');

    // ==========================================
    // Test 3: Coupon System
    // ==========================================
    console.log('3. Testing Coupon & Promo System...');

    // Let's seed some coupons using Coupon Model directly (like admin would do)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const couponPercent = await Coupon.create({
      code: 'DISCOUNT10',
      description: '10% discount',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 100,
      maxDiscountAmount: 50,
      expiryDate: futureDate,
      isActive: true,
      userUsageLimit: 2,
    });

    const couponFixed = await Coupon.create({
      code: 'FIXED50',
      description: '₹50 flat off',
      discountType: 'fixed',
      discountValue: 50,
      minOrderAmount: 200,
      expiryDate: futureDate,
      isActive: true,
    });

    const couponExpired = await Coupon.create({
      code: 'EXPIRED20',
      description: '20% discount',
      discountType: 'percentage',
      discountValue: 20,
      minOrderAmount: 50,
      expiryDate: pastDate,
      isActive: true,
    });

    const couponRideOnly = await Coupon.create({
      code: 'RIDEONLY',
      description: 'Rides only discount',
      discountType: 'fixed',
      discountValue: 30,
      minOrderAmount: 50,
      expiryDate: futureDate,
      isActive: true,
      eligibleService: 'ride',
    });

    // 3.1 Get eligible coupons for Customer
    const listCouponRes = await fetch(`${BASE_URL}/coupons?serviceType=ride`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listCouponData = await listCouponRes.json();
    if (!listCouponRes.ok || !listCouponData.success) {
      throw new Error('List customer coupons failed: ' + JSON.stringify(listCouponData));
    }
    const foundCodes = listCouponData.coupons.map((c) => c.code);
    if (!foundCodes.includes('DISCOUNT10') || foundCodes.includes('EXPIRED20')) {
      throw new Error('Eligible coupon filtering failed: ' + JSON.stringify(foundCodes));
    }
    console.log('✅ List eligible coupons passed.');

    // 3.2 Validate percentage coupon success
    const validateRes1 = await fetch(`${BASE_URL}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: 'DISCOUNT10', amount: 300, serviceType: 'ride' }),
    });
    const valData1 = await validateRes1.json();
    if (!validateRes1.ok || valData1.discount !== 30 || valData1.finalAmount !== 270) {
      throw new Error('Validate DISCOUNT10 failed: ' + JSON.stringify(valData1));
    }
    console.log('✅ Validate percentage coupon passed.');

    // 3.3 Validate percentage coupon with capped maxDiscountAmount
    const validateRes2 = await fetch(`${BASE_URL}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: 'DISCOUNT10', amount: 800, serviceType: 'ride' }),
    });
    const valData2 = await validateRes2.json();
    if (!validateRes2.ok || valData2.discount !== 50) { // Capped at maxDiscountAmount (50)
      throw new Error('Validate DISCOUNT10 max cap failed: ' + JSON.stringify(valData2));
    }
    console.log('✅ Validate percentage coupon with max limit cap passed.');

    // 3.4 Validate fixed coupon success
    const validateRes3 = await fetch(`${BASE_URL}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: 'FIXED50', amount: 250, serviceType: 'parcel' }),
    });
    const valData3 = await validateRes3.json();
    if (!validateRes3.ok || valData3.discount !== 50 || valData3.finalAmount !== 200) {
      throw new Error('Validate FIXED50 failed: ' + JSON.stringify(valData3));
    }
    console.log('✅ Validate fixed coupon passed.');

    // 3.5 Validate expired coupon fails
    const validateRes4 = await fetch(`${BASE_URL}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: 'EXPIRED20', amount: 100, serviceType: 'ride' }),
    });
    if (validateRes4.status !== 400) {
      throw new Error('Expired coupon was validated successfully');
    }
    console.log('✅ Expired coupon validation denial passed.');

    // 3.6 Validate ineligible service fails
    const validateRes5 = await fetch(`${BASE_URL}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: 'RIDEONLY', amount: 100, serviceType: 'parcel' }),
    });
    if (validateRes5.status !== 400) {
      throw new Error('Service-ineligible coupon was validated successfully');
    }
    console.log('✅ Service-ineligible coupon validation denial passed.');

    // ==========================================
    // Test 4: Booking with Coupons
    // ==========================================
    console.log('4. Testing Booking Ride & Parcel with Coupons...');

    // 4.1 Book Ride with Coupon
    const bookRideRes = await fetch(`${BASE_URL}/rides/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pickup: { address: 'Indiranagar, Bangalore', lat: 12.9716, lng: 77.6412 },
        drop: { address: 'Koramangala, Bangalore', lat: 12.9352, lng: 77.6245 },
        vehicleType: 'car_mini',
        paymentMethod: 'cash',
        couponCode: 'DISCOUNT10',
      }),
    });
    const bookRideData = await bookRideRes.json();
    if (!bookRideRes.ok || !bookRideData.success || !bookRideData.ride.couponCode) {
      throw new Error('Book Ride with Coupon failed: ' + JSON.stringify(bookRideData));
    }
    console.log(`✅ Book Ride with Coupon success! Discount: ${bookRideData.ride.discount}, Final: ${bookRideData.ride.finalAmount}`);

    // Verify coupon usage incremented in DB
    const couponAfter = await Coupon.findOne({ code: 'DISCOUNT10' });
    if (couponAfter.usedCount !== 1) {
      throw new Error('Coupon global usedCount was not incremented');
    }
    console.log('✅ Coupon usedCount tracked correctly.');

    // ==========================================
    // Test 5: Unified Bookings / History
    // ==========================================
    console.log('5. Testing Unified Bookings / History...');

    const bookingsRes = await fetch(`${BASE_URL}/bookings?status=all&page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const bookingsData = await bookingsRes.json();
    if (!bookingsRes.ok || !bookingsData.success || bookingsData.bookings.length === 0) {
      throw new Error('Get Unified Bookings failed: ' + JSON.stringify(bookingsData));
    }
    const bookedItem = bookingsData.bookings[0];
    if (bookedItem.bookingType !== 'ride' || bookedItem.discount === 0) {
      throw new Error('Unified booking details mismatch: ' + JSON.stringify(bookedItem));
    }
    console.log('✅ Unified Bookings retrieval passed.');

    // ==========================================
    // Test 6: Customer Notification System
    // ==========================================
    console.log('6. Testing Customer Notifications...');

    // Seed a notification
    const seededNotif = await UserNotification.create({
      user: customerId,
      title: 'Welcome Alice!',
      message: 'Thank you for registering with PrinsGo.',
      type: 'general',
    });

    // Get notifications
    const getNotifRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getNotifData = await getNotifRes.json();
    if (!getNotifRes.ok || !getNotifData.success || getNotifData.notifications.length === 0) {
      throw new Error('Get Notifications failed: ' + JSON.stringify(getNotifData));
    }
    console.log('✅ Get Notifications passed.');

    // Get unread count
    const unreadRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const unreadData = await unreadRes.json();
    if (!unreadRes.ok || unreadData.count !== 1) {
      throw new Error('Get Unread Count failed: ' + JSON.stringify(unreadData));
    }
    console.log('✅ Get Unread Count passed.');

    // Mark as read
    const readRes = await fetch(`${BASE_URL}/notifications/${seededNotif._id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    const readData = await readRes.json();
    if (!readRes.ok || !readData.success || !readData.notification.isRead) {
      throw new Error('Mark notification as read failed: ' + JSON.stringify(readData));
    }
    console.log('✅ Mark notification as read passed.');

    // ==========================================
    // Test 7: Support Ticket System
    // ==========================================
    console.log('7. Testing Support Ticket System...');

    // 7.1 Create ticket
    const createTicketRes = await fetch(`${BASE_URL}/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject: 'Wallet issue',
        description: 'Loaded ₹500 but wallet balance is not updated',
        category: 'wallet',
      }),
    });
    const createTicketData = await createTicketRes.json();
    if (!createTicketRes.ok || !createTicketData.success) {
      throw new Error('Create support ticket failed: ' + JSON.stringify(createTicketData));
    }
    const ticketId = createTicketData.ticket._id;
    console.log('✅ Create Support Ticket passed.');

    // 7.2 Get my tickets
    const getTicketsRes = await fetch(`${BASE_URL}/support/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getTicketsData = await getTicketsRes.json();
    if (!getTicketsRes.ok || getTicketsData.tickets.length === 0) {
      throw new Error('Get support tickets failed: ' + JSON.stringify(getTicketsData));
    }
    console.log('✅ Get Customer Support Tickets passed.');

    // 7.3 Customer reply
    const replyRes = await fetch(`${BASE_URL}/support/tickets/${ticketId}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'Any update on this?' }),
    });
    const replyData = await replyRes.json();
    if (!replyRes.ok || replyData.ticket.replies.length === 0) {
      throw new Error('Customer reply failed: ' + JSON.stringify(replyData));
    }
    console.log('✅ Customer Reply to Ticket passed.');

    // ==========================================
    // Clean up test entries
    // ==========================================
    await User.findByIdAndDelete(customerId);
    await Coupon.deleteMany({ code: { $in: ['DISCOUNT10', 'FIXED50', 'EXPIRED20', 'RIDEONLY'] } });
    await Ride.deleteMany({ customer: customerId });
    await UserNotification.deleteMany({ user: customerId });
    await SupportTicket.deleteMany({ customer: customerId });
    console.log('✅ Cleaned up all customer test data.');

    console.log('🎉 --- ALL CUSTOMER INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('❌ Test execution encountered an error:', error);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runCustomerTests();
