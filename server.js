require('dotenv').config();
const express = require('express');
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
const driverAuthRoutes = require('./routes/driverAuthRoutes');
const driverRoutes = require('./routes/driverRoutes');
const driverRideRoutes = require('./routes/driverRideRoutes');
const driverParcelRoutes = require('./routes/driverParcelRoutes');
const adminRoutes = require('./routes/adminRoutes');
const placesRoutes = require('./routes/placesRoutes');
const walletRoutes = require('./routes/walletRoutes');

const app = express();
const server = http.createServer(app);

// CORS_ORIGIN can be '*' (allow all), a single URL, or multiple comma-separated URLs
// e.g. CORS_ORIGIN=https://prinsgo-customer.vercel.app,https://prinsgo-driver.vercel.app,https://prinsgo-admin.vercel.app
const rawOrigins = process.env.CORS_ORIGIN || '*';
const corsOrigin =
  rawOrigins === '*'
    ? '*'
    : rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting - prevents abuse on OTP and general APIs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api', apiLimiter);

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { success: false, message: 'Too many OTP requests, please try again later' },
});
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/driver/auth/send-otp', otpLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/parcels', parcelRoutes);

app.use('/api/driver/auth', driverAuthRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/driver/rides', driverRideRoutes);
app.use('/api/driver/parcels', driverParcelRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/wallet', walletRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'PrinsGo API is running' });
});

// Socket.IO - live driver location + ride/parcel status updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Driver joins a room per ride/parcel to broadcast live location
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

// Error handling (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`PrinsGo backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
