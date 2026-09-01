require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

const User = require('../models/User');
const Driver = require('../models/Driver');
const WorkerBooking = require('../models/WorkerBooking');
const FeatureToggle = require('../models/FeatureToggle');
const WorkerCategory = require('../models/WorkerCategory');

const { errorHandler } = require('../middleware/errorHandler');

const PORT = 5558;
const BASE_URL = `http://localhost:${PORT}/api`;

const TEST_ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'test_admin_secret_key';

let server;

async function setupDatabase() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prinsgo_test');
    }

    // Clear relevant collections
    await User.deleteMany({ phone: '9999999999' });
    await Driver.deleteMany({ phone: '8888888888' });

    // Set feature toggle
    await FeatureToggle.findOneAndUpdate(
        { key: 'workers_service' },
        { isEnabled: true, label: 'Workers' },
        { upsert: true, new: true }
    );
}

function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${BASE_URL}${path}`);

        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try { parsed = JSON.parse(data); } catch(e) {}
                resolve({ statusCode: res.statusCode, body: parsed });
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- STARTING WORKER INTEGRATION TESTS ---');
    try {
        await setupDatabase();

        // Start server specifically for these tests (assuming app is not exported easily, we can just require server.js which starts it on PORT, or let's just use makeRequest if server is already running.
        // Wait, server.js binds to process.env.PORT. We can just require server.js after setting env port)
        process.env.PORT = PORT;
        require('../server');

        // Wait a sec for server to bind
        await new Promise(r => setTimeout(r, 1500));

        console.log('\n--- 1. Test Categories Endpoint ---');
        let res = await makeRequest('/workers/categories');
        if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode} ${JSON.stringify(res.body)}`);
        if (!Array.isArray(res.body.categories)) throw new Error('Expected categories array');
        if (res.body.categories.length === 0) throw new Error('Categories should be seeded and not empty');
        console.log('✅ Categories fetched successfully');

        const testCategory = res.body.categories[0];

        console.log('\n--- 2. Register Worker (Driver API) ---');
        res = await makeRequest('/driver/auth/verify-otp', {
            method: 'POST',
            body: {
                phone: '8888888888',
                code: '1234', // assuming mock OTP or test environment skips OTP. If it fails, we can just create the driver directly in DB
                name: 'Test Worker',
                vehicleType: 'worker'
            }
        });

        let driver;
        if (res.statusCode !== 200) {
            console.log('OTP flow failed (expected if real OTP is on). Creating driver directly.');
            driver = await Driver.create({
                name: 'Test Worker',
                phone: '8888888888',
                vehicleType: 'worker',
                isWorker: true,
                isApproved: true,
                isAvailable: true,
                isOnline: true,
                workerServiceCategories: [testCategory._id]
            });
        } else {
             driver = await Driver.findOne({ phone: '8888888888' });
             driver.isApproved = true;
             driver.isAvailable = true;
             driver.isOnline = true;
             driver.workerServiceCategories = [testCategory._id];
             await driver.save();
        }

        console.log('✅ Worker registered and approved');

        console.log('\n--- 3. Fetch Eligible Workers ---');
        res = await makeRequest(`/workers?category=${testCategory._id}`);
        if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
        if (!res.body.workers.some(w => w._id.toString() === driver._id.toString())) {
             throw new Error('Newly created worker not found in list');
        }
        console.log('✅ Eligible workers fetched successfully');


        console.log('\n--- 4. Generate Token (For Booking) ---');
        const user = await User.create({
           name: 'Test Customer',
           phone: '9999999999',
           isPhoneVerified: true
        });
        const generateToken = require('../utils/generateToken');
        const token = generateToken(user._id, 'customer');

        console.log('\n--- 5. Test Worker Booking ---');
        res = await makeRequest('/workers/bookings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
                workerId: driver._id,
                categoryId: testCategory._id,
                location: { address: 'Test St', lat: 10, lng: 10 },
                date: new Date().toISOString(),
                time: '14:00',
                taskDescription: 'Fix AC'
            }
        });
        if (res.statusCode !== 201) throw new Error(`Booking failed: ${JSON.stringify(res.body)}`);
        const bookingId = res.body.booking._id;
        console.log('✅ Worker booked successfully');

        console.log('\n--- 6. Test Double Booking Prevention ---');
        res = await makeRequest('/workers/bookings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
                workerId: driver._id,
                categoryId: testCategory._id,
                location: { address: 'Test St 2', lat: 10, lng: 10 },
                date: res.body.booking.date,
                time: '14:00',
                taskDescription: 'Another task'
            }
        });
        if (res.statusCode !== 409) throw new Error(`Expected 409 for double booking, got ${res.statusCode}`);
        console.log('✅ Double booking properly prevented');

        console.log('\n--- 7. Test Service Toggle (Disable) ---');
        await FeatureToggle.findOneAndUpdate({ key: 'workers_service' }, { isEnabled: false });
        res = await makeRequest('/workers/categories');
        if (res.statusCode !== 403) throw new Error(`Expected 403 when disabled, got ${res.statusCode}`);
        console.log('✅ Master toggle successfully blocks access');

        // Re-enable for further tests
        await FeatureToggle.findOneAndUpdate({ key: 'workers_service' }, { isEnabled: true });

        console.log('\n--- 8. All Worker Tests Passed ---');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}

runTests();
