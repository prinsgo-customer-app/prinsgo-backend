require('dotenv').config();
process.env.ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'test_admin_secret_key';
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');
const FeatureToggle = require('../models/FeatureToggle');
const AdminSettings = require('../models/AdminSettings');

const adminRoutes = require('../routes/adminRoutes');
const { errorHandler } = require('../middleware/errorHandler');

const PORT = 5555;
const BASE_URL = `http://localhost:${PORT}/api/admin`;

async function runTests() {
  console.log('--- STARTING ADMIN INTEGRATION TESTS ---');

  // 1. Database Connection
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prinsgo');
  }
  console.log('✅ Connected to MongoDB');

  // Clear any existing test documents (optional/safe)
  await User.deleteMany({ phone: { $in: ['9999999999', '9888888888'] } });
  await Driver.deleteMany({ phone: { $in: ['9777777777', '9666666666'] } });

  // 2. Setup Express & Socket.IO Test Server
  const app = Math.random() > 2 ? null : express();
  app.use(express.json());

  // Register routes
  app.use('/api/admin', adminRoutes);
  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new Server(server);
  app.set('io', io);

  let statsBroadcasted = false;
  io.on('connection', (socket) => {
    socket.on('dashboard_stats_update', () => {
      statsBroadcasted = true;
    });
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✅ Express server listening on port ${PORT}`);

  try {
    const adminSecret = process.env.ADMIN_SECRET_KEY || 'test_admin_secret_key';

    // ==========================================
    // Test 1: Admin Auth Login using Secret Key
    // ==========================================
    console.log('Testing Admin login with secret...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: adminSecret }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.success || !loginData.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginData));
    }
    const token = loginData.token;
    console.log('✅ Admin login successful, JWT generated.');

    // ==========================================
    // Test 2: Admin Me Route with JWT Token
    // ==========================================
    console.log('Testing Admin auth/me with JWT...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    if (!meRes.ok || !meData.success || meData.admin.role !== 'admin') {
      throw new Error('Admin me check failed: ' + JSON.stringify(meData));
    }
    console.log('✅ Admin profile verified successfully via JWT.');

    // ==========================================
    // Test 3: Customer CRUD
    // ==========================================
    console.log('Testing Customer CRUD operations...');

    // Create Customer
    const createCustomerRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test Customer',
        phone: '9999999999',
        email: 'customer@test.com',
      }),
    });
    const createCustData = await createCustomerRes.json();
    if (!createCustomerRes.ok || !createCustData.success) {
      throw new Error('Create Customer failed: ' + JSON.stringify(createCustData));
    }
    const customerId = createCustData.customer._id;
    console.log('✅ Create Customer passed.');

    // List Customers with Pagination & Search
    const listCustRes = await fetch(`${BASE_URL}/customers?search=Test&page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listCustData = await listCustRes.json();
    if (!listCustRes.ok || listCustData.customers.length === 0) {
      throw new Error('List/Search Customers failed: ' + JSON.stringify(listCustData));
    }
    console.log('✅ List/Search Customers with Pagination passed.');

    // Update Customer
    const updateCustomerRes = await fetch(`${BASE_URL}/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Updated Test Customer' }),
    });
    const updateCustData = await updateCustomerRes.json();
    if (!updateCustomerRes.ok || updateCustData.customer.name !== 'Updated Test Customer') {
      throw new Error('Update Customer failed: ' + JSON.stringify(updateCustData));
    }
    console.log('✅ Update Customer passed.');

    // ==========================================
    // Test 4: Driver CRUD
    // ==========================================
    console.log('Testing Driver CRUD operations...');

    // Create Driver
    const createDriverRes = await fetch(`${BASE_URL}/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test Driver',
        phone: '9777777777',
        vehicleType: 'car_mini',
        vehicleNumber: 'KA03MX1234',
      }),
    });
    const createDriverData = await createDriverRes.json();
    if (!createDriverRes.ok || !createDriverData.success) {
      throw new Error('Create Driver failed: ' + JSON.stringify(createDriverData));
    }
    const driverId = createDriverData.driver._id;
    console.log('✅ Create Driver passed.');

    // List Drivers with Search & Filter
    const listDriverRes = await fetch(`${BASE_URL}/drivers?search=KA03MX&status=approved`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listDriverData = await listDriverRes.json();
    if (!listDriverRes.ok || listDriverData.drivers.length === 0) {
      throw new Error('List/Search Drivers failed: ' + JSON.stringify(listDriverData));
    }
    console.log('✅ List/Search Drivers passed.');

    // ==========================================
    // Test 5: Ride CRUD
    // ==========================================
    console.log('Testing Ride CRUD operations...');

    // Create Ride
    const createRideRes = await fetch(`${BASE_URL}/rides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        customer: customerId,
        driver: driverId,
        pickup: { address: 'Pickup Address', lat: 12.97, lng: 77.59 },
        drop: { address: 'Drop Address', lat: 13.03, lng: 77.60 },
        vehicleType: 'car_mini',
      }),
    });
    const createRideData = await createRideRes.json();
    if (!createRideRes.ok || !createRideData.success) {
      throw new Error('Create Ride failed: ' + JSON.stringify(createRideData));
    }
    const rideId = createRideData.ride._id;
    console.log('✅ Create Ride passed.');

    // List/Search Rides
    const listRidesRes = await fetch(`${BASE_URL}/rides?search=Updated&status=requested`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listRidesData = await listRidesRes.json();
    if (!listRidesRes.ok || listRidesData.rides.length === 0) {
      throw new Error('List/Search Rides failed: ' + JSON.stringify(listRidesData));
    }
    console.log('✅ List/Search Rides with customer filter passed.');

    // Delete Ride
    const deleteRideRes = await fetch(`${BASE_URL}/rides/${rideId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!deleteRideRes.ok) {
      throw new Error('Delete Ride failed');
    }
    console.log('✅ Delete Ride passed.');

    // ==========================================
    // Clean up
    // ==========================================
    await User.findByIdAndDelete(customerId);
    await Driver.findByIdAndDelete(driverId);
    console.log('✅ Cleaned up test data.');

    console.log('🎉 --- ALL ADMIN INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('❌ Test execution encountered an error:', error);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runTests();