// utils/mapsService.js

const getApiKey = () => {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  return apiKey;
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
