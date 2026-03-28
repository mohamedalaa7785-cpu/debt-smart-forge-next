import axios from "axios";

/* =========================
   TYPES
========================= */
export interface Coordinates {
  lat: number;
  lng: number;
}

/* =========================
   VALIDATION
========================= */
if (!process.env.GOOGLE_MAPS_API_KEY) {
  throw new Error("❌ GOOGLE_MAPS_API_KEY missing");
}

/* =========================
   GEOCODE ADDRESS
========================= */
export async function geocodeAddress(
  address: string
): Promise<Coordinates | null> {
  try {
    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    const result = res.data.results?.[0];

    if (!result) return null;

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    };
  } catch (error) {
    console.error("Geocode error:", error);
    return null;
  }
}

/* =========================
   REVERSE GEOCODE
========================= */
export async function reverseGeocode(
  lat: number,
  lng: number
) {
  try {
    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          latlng: `${lat},${lng}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    return res.data.results?.[0]?.formatted_address || null;
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return null;
  }
          }
