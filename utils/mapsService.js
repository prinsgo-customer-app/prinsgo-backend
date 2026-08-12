// utils/mapsService.js

const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
};

const getApiKey = () => {
  return process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY || null;
};

// ===============================
// Distance Matrix
// ===============================
const getDistanceAndDuration = async (
  originLat,
  originLng,
  destLat,
  destLng
) => {
  const apiKey = getApiKey();

  // Haversine fallback if API key is not configured
  if (!apiKey) {
    console.warn("GOOGLE_API_KEY not configured, using haversine fallback.");
    const dist = calculateHaversineDistance(originLat, originLng, destLat, destLng);
    const distanceKm = dist > 0 ? Number(dist.toFixed(1)) : 1.5;
    const durationMin = Math.max(1, Math.round(distanceKm * 2.5 + 3));
    return { distanceKm, durationMin };
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${originLat},${originLng}` +
      `&destinations=${destLat},${destLng}` +
      `&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log("Distance Matrix Response:", data);

    if (data.status !== "OK") {
      throw new Error(
        `Google Distance Matrix Error: ${data.status} - ${
          data.error_message || "Unknown Error"
        }`
      );
    }

    const element = data.rows[0].elements[0];

    if (element.status !== "OK") {
      throw new Error(element.status);
    }

    return {
      distanceKm: +(element.distance.value / 1000).toFixed(1),
      durationMin: Math.round(element.duration.value / 60),
    };
  } catch (error) {
    console.warn("Google Distance Matrix API call failed, using haversine fallback:", error.message);
    const dist = calculateHaversineDistance(originLat, originLng, destLat, destLng);
    const distanceKm = dist > 0 ? Number(dist.toFixed(1)) : 1.5;
    const durationMin = Math.max(1, Math.round(distanceKm * 2.5 + 3));
    return { distanceKm, durationMin };
  }
};

// ===============================
// Reverse Geocoding
// ===============================
const reverseGeocode = async (lat, lng) => {
  const apiKey = getApiKey();

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?latlng=${lat},${lng}` +
    `&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  console.log("Geocode Response:", data);

  if (data.status !== "OK") {
    throw new Error(
      `Google Geocoding Error: ${data.status} - ${
        data.error_message || "Unknown Error"
      }`
    );
  }

  if (!data.results.length) {
    throw new Error("No address found");
  }

  return data.results[0].formatted_address;
};

// ===============================
// Places Autocomplete
// ===============================
const searchPlaces = async (input, lat, lng) => {
  const apiKey = getApiKey();

  let url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodeURIComponent(input)}` +
    `&components=country:in` +
    `&key=${apiKey}`;

  if (lat && lng) {
    url += `&location=${lat},${lng}&radius=30000`;
  }

  const response = await fetch(url);
  const data = await response.json();

  console.log("Places API Response:", JSON.stringify(data, null, 2));

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(
      `Google Places API Error: ${data.status} - ${
        data.error_message || "Unknown Error"
      }`
    );
  }

  return data.predictions || [];
};

// ===============================
// Place Details
// ===============================
const getPlaceDetails = async (placeId) => {
  const apiKey = getApiKey();

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}` +
    `&fields=formatted_address,geometry` +
    `&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  console.log("Place Details Response:", data);

  if (data.status !== "OK") {
    throw new Error(
      `Google Place Details Error: ${data.status} - ${
        data.error_message || "Unknown Error"
      }`
    );
  }

  return {
    address: data.result.formatted_address,
    lat: data.result.geometry.location.lat,
    lng: data.result.geometry.location.lng,
  };
};

module.exports = {
  getDistanceAndDuration,
  reverseGeocode,
  searchPlaces,
  getPlaceDetails,
};
