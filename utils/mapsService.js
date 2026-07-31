// utils/mapsService.js

const fetch = require("node-fetch");

// Get Google API Key
const getApiKey = () => {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  return apiKey;
};

// Get Driving Distance & Duration
const getDistanceAndDuration = async (
  originLat,
  originLng,
  destLat,
  destLng
) => {
  const apiKey = getApiKey();

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(`Google Maps API error: ${data.status}`);
  }

  const element = data.rows[0].elements[0];

  if (element.status !== "OK") {
    throw new Error(
      "Could not calculate route between the given points"
    );
  }

  return {
    distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,
    durationMin: Math.round(element.duration.value / 60),
  };
};

// Reverse Geocoding
const reverseGeocode = async (lat, lng) => {
  const apiKey = getApiKey();

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.results.length) {
    throw new Error(
      "Could not resolve address for given coordinates"
    );
  }

  return data.results[0].formatted_address;
};

// Search Places
const searchPlaces = async (input, lat, lng) => {
  const apiKey = getApiKey();

  let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    input
  )}&key=${apiKey}&components=country:in`;

  if (lat && lng) {
    url += `&location=${lat},${lng}&radius=30000`;
  }

  const response = await fetch(url);
  const data = await response.json();

  if (
    data.status !== "OK" &&
    data.status !== "ZERO_RESULTS"
  ) {
    throw new Error(
      `Google Places API error: ${data.status}`
    );
  }

  return data.predictions || [];
};

// Place Details
const getPlaceDetails = async (placeId) => {
  const apiKey = getApiKey();

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(
      `Google Place Details error: ${data.status}`
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
