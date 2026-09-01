require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const parcelRoutes = require('./routes/parcelRoutes');
const workerRoutes = require('./routes/workerRoutes');
const driverAuthRoutes = require('./routes/driverAuthRoutes');
const driverRoutes = require('./routes/driverRoutes');
const driverRideRoutes = require('./routes/driverRideRoutes');
const driverParcelRoutes = require('./routes/driverParcelRoutes');
const driverWorkerRoutes = require('./routes/driverWorkerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminWorkerRoutes = require('./routes/adminWorkerRoutes');
const placesRoutes = require('./routes/placesRoutes');
const walletRoutes = require('./routes/walletRoutes');
const couponRoutes = require('./routes/couponRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const supportRoutes = require('./routes/supportRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();
const server = http.createServer(app);


// ✅🔥 MOST IMPORTANT FIX (Render proxy issue)
app.set('trust proxy', 1);


// CORS
const rawOrigins = process.env.CORS_ORIGIN || '*';
const corsOrigin =
  rawOrigins === '*'
    ? '*'
    : rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
});

// DB connect
connectDB();


// Middleware
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}


// ✅ FIXED RATE LIMIT (proxy safe)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);


// OTP limiter
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests, try later' },
});

app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/driver/auth/send-otp', otpLimiter);


// ✅ TEST ROUTE (VERY IMPORTANT)
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'PrinsGo API Running 🚀',
  });
});

// ✅ HEALTH CHECK (Lightweight, external monitor)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'prinsgo-backend',
  });
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/parcels', parcelRoutes);
app.use('/api/workers', workerRoutes);

app.use('/api/driver/auth', driverAuthRoutes);
app.use('/api/driver/workers', driverWorkerRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/driver/rides', driverRideRoutes);
app.use('/api/driver/parcels', driverParcelRoutes);

app.use('/api/admin/workers', adminWorkerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api', publicRoutes);


// Root check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'PrinsGo Backend Running 🚀' });
});


// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_ride_room', (rideId) => {
    socket.join(`ride_${rideId}`);
  });

  socket.on('join_parcel_room', (parcelId) => {
    socket.join(`parcel_${parcelId}`);
  });

  socket.on('driver_location_update', ({ rideId, parcelId, lat, lng }) => {
    if (rideId) io.to(`ride_${rideId}`).emit('driver_location', { lat, lng });
    if (parcelId) io.to(`parcel_${parcelId}`).emit('driver_location', { lat, lng });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);


// Error handling
app.use(notFound);
app.use(errorHandler);


// Server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`PrinsGo Backend is ready\nHealth URL: /api/health`);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    console.log('HTTP server closed');
    try {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
