// Ride fare configuration per vehicle type
const RIDE_RATES = {
  bike: { baseFare: 20, perKm: 6, perMin: 1, minFare: 30 },
  auto: { baseFare: 30, perKm: 9, perMin: 1.5, minFare: 45 },
  car_mini: { baseFare: 50, perKm: 12, perMin: 2, minFare: 70 },
  car_sedan: { baseFare: 70, perKm: 15, perMin: 2.5, minFare: 100 },
};

const PLATFORM_FEE_PERCENT = 0.02; // 2%

const calculateRideFare = ({ vehicleType, distanceKm, durationMin, surgeMultiplier = 1 }) => {
  const rate = RIDE_RATES[vehicleType];
  if (!rate) throw new Error('Invalid vehicle type');

  const baseFare = rate.baseFare;
  const distanceFare = Math.round(distanceKm * rate.perKm);
  const timeFare = Math.round(durationMin * rate.perMin);

  let subtotal = (baseFare + distanceFare + timeFare) * surgeMultiplier;
  subtotal = Math.max(subtotal, rate.minFare);

  const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENT);
  const totalFare = Math.round(subtotal + platformFee);

  return {
    baseFare,
    distanceFare,
    timeFare,
    surgeMultiplier,
    platformFee,
    totalFare,
  };
};

// Parcel charge configuration per weight category
const PARCEL_RATES = {
  upto_1kg: { baseCharge: 25, perKm: 5, weightCharge: 0 },
  upto_5kg: { baseCharge: 35, perKm: 6, weightCharge: 15 },
  upto_10kg: { baseCharge: 50, perKm: 7, weightCharge: 30 },
  upto_20kg: { baseCharge: 80, perKm: 9, weightCharge: 60 },
};

const calculateParcelCharge = ({ weightCategory, distanceKm }) => {
  const rate = PARCEL_RATES[weightCategory];
  if (!rate) throw new Error('Invalid weight category');

  const baseCharge = rate.baseCharge;
  const distanceCharge = Math.round(distanceKm * rate.perKm);
  const weightCharge = rate.weightCharge;
  const totalCharge = baseCharge + distanceCharge + weightCharge;

  return { baseCharge, distanceCharge, weightCharge, totalCharge };
};

module.exports = { calculateRideFare, calculateParcelCharge, RIDE_RATES, PARCEL_RATES };
