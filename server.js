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
const vehicleRoutes = require('./routes/vehicleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

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
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/payment', paymentRoutes);


// Root check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'PrinsGo Backend Running 🚀' });
});


// Socket.IO
const socketAuthMiddleware = require('./utils/socketAuth');
const Ride = require('./models/Ride');
const Parcel = require('./models/Parcel');

io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id} (Role: ${socket.role}, ID: ${socket.user?._id})`);

  // Driver automatically joins their own private room
  if (socket.role === 'driver') {
    socket.join(`driver_${socket.user._id}`);
  }

  socket.on('join_ride_room', async (rideId) => {
    try {
      const ride = await Ride.findById(rideId);
      if (!ride) return socket.emit('error', 'Ride not found');

      // Verify that the connecting user is either the customer or the assigned driver
      const isCustomer = socket.role === 'customer' && ride.customer.toString() === socket.user._id.toString();
      const isDriver = socket.role === 'driver' && ride.driver && ride.driver.toString() === socket.user._id.toString();

      if (isCustomer || isDriver || socket.role === 'admin') {
        socket.join(`ride_${rideId}`);
        console.log(`${socket.role} joined ride room: ride_${rideId}`);
      } else {
        socket.emit('error', 'Unauthorized to join this ride room');
      }
    } catch (error) {
      socket.emit('error', 'Error joining ride room');
    }
  });

  socket.on('join_parcel_room', async (parcelId) => {
    try {
      const parcel = await Parcel.findById(parcelId);
      if (!parcel) return socket.emit('error', 'Parcel not found');

      // Verify that the connecting user is either the customer or the assigned driver
      const isCustomer = socket.role === 'customer' && parcel.customer.toString() === socket.user._id.toString();
      const isDriver = socket.role === 'driver' && parcel.driver && parcel.driver.toString() === socket.user._id.toString();

      if (isCustomer || isDriver || socket.role === 'admin') {
        socket.join(`parcel_${parcelId}`);
        console.log(`${socket.role} joined parcel room: parcel_${parcelId}`);
      } else {
        socket.emit('error', 'Unauthorized to join this parcel room');
      }
    } catch (error) {
      socket.emit('error', 'Error joining parcel room');
    }
  });

  socket.on('driver_location_update', ({ rideId, parcelId, lat, lng }) => {
    if (socket.role !== 'driver') {
      return socket.emit('error', 'Only drivers can update location');
    }

    // Instead of querying DB on every ping, check if the driver is already in the room
    // The driver is only allowed to join the room if authorized by 'join_ride_room' logic
    if (rideId) {
      const roomName = `ride_${rideId}`;
      if (socket.rooms.has(roomName)) {
        io.to(roomName).emit('driver_location', { lat, lng });
      }
    }

    if (parcelId) {
      const roomName = `parcel_${parcelId}`;
      if (socket.rooms.has(roomName)) {
        io.to(roomName).emit('driver_location', { lat, lng });
      }
    }
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
  console.log(`PrinsGo backend running on port ${PORT}`);
});
