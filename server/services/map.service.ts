import axios from "axios";
import { parseNumber } from "@/lib/utils";

/* =========================
   CONFIG
========================= */
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  throw new Error("❌ GOOGLE_MAPS_API_KEY missing");
}

/* =========================
   TYPES
========================= */
export interface Coordinates {
  lat: number;
  lng: number;
}

/* =========================
   INTERNAL CACHE 🔥
========================= */
const cache = new Map<string, Coordinates>();

/* =========================
   SAFE REQUEST
========================= */
async function safeRequest(params: any) {
  try {
    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          ...params,
          key: API_KEY,
        },
        timeout: 8000,
      }
    );

    return res.data;
  } catch (error) {
    console.error("MAP REQUEST ERROR:", error);
    return null;
  }
}

/* =========================
   GEOCODE ADDRESS 🔥
========================= */
export async function geocodeAddress(
  address: string
): Promise<Coordinates | null> {
  try {
    if (!address || address.length < 3) return null;

    /* =========================
       CACHE CHECK
    ========================= */
    if (cache.has(address)) {
      return cache.get(address)!;
    }

    const data = await safeRequest({
      address,
    });

    if (!data || data.status !== "OK") {
      return null;
    }

    const location = data.results?.[0]?.geometry?.location;

    if (!location) return null;

    const coords = {
      lat: parseNumber(location.lat),
      lng: parseNumber(location.lng),
    };

    /* =========================
       SAVE CACHE
    ========================= */
    cache.set(address, coords);

    return coords;
  } catch (error) {
    console.error("GEOCODE ERROR:", error);
    return null;
  }
}

/* =========================
   REVERSE GEOCODE 🔥
========================= */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    if (!lat || !lng) return null;

    const data = await safeRequest({
      latlng: `${lat},${lng}`,
    });

    if (!data || data.status !== "OK") {
      return null;
    }

    return data.results?.[0]?.formatted_address || null;
  } catch (error) {
    console.error("REVERSE GEOCODE ERROR:", error);
    return null;
  }
}

/* =========================
   BATCH GEOCODE 🔥
========================= */
export async function geocodeBatch(
  addresses: string[]
): Promise<
  {
    address: string;
    lat: number;
    lng: number;
  }[]
> {
  const results = await Promise.all(
    addresses.map(async (address) => {
      const coords = await geocodeAddress(address);

      if (!coords) return null;

      return {
        address,
        ...coords,
      };
    })
  );

  return results.filter(Boolean) as any;
}

/* =========================
   DISTANCE CALCULATION 🔥
========================= */
export function calculateDistance(
  a: Coordinates,
  b: Coordinates
) {
  const toRad = (v: number) => (v * Math.PI) / 180;

  const R = 6371; // km

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const aVal =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 *
      Math.cos(lat1) *
      Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));

  return R * c;
}

/* =========================
   NEAREST CLIENTS 🔥
========================= */
export function findNearest(
  base: Coordinates,
  clients: { id: string; lat: number; lng: number }[]
) {
  return clients
    .map((c) => ({
      ...c,
      distance: calculateDistance(base, c),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);
        }
