import axios from "axios";
import { parseNumber } from "@/lib/utils";
import { db } from "@/server/db";
import { clientAddresses, clients, clientLoans } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { getRequiredEnv } from "@/lib/env";

/* =========================
   CONFIG
========================= */
const API_KEY = getRequiredEnv("GOOGLE_MAPS_API_KEY");

/* =========================
   TYPES
========================= */
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapClient {
  id: string;
  name: string;
  lat: number;
  lng: number;
  risk: string;
  priority: number;
  totalDue: number;
  phone?: string;
  address?: string;
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
   GET CLIENTS FOR MAP 🔥
========================= */
export async function getClientsForMap(): Promise<MapClient[]> {
  try {
    const results = await db.select({
      id: clients.id,
      name: clients.name,
      lat: clientAddresses.lat,
      lng: clientAddresses.lng,
      address: clientAddresses.address,
      totalDue: sql<number>`SUM(${clientLoans.amountDue})`,
    })
    .from(clients)
    .innerJoin(clientAddresses, eq(clients.id, clientAddresses.clientId))
    .innerJoin(clientLoans, eq(clients.id, clientLoans.clientId))
    .groupBy(clients.id, clientAddresses.id)
    .where(eq(clientAddresses.isPrimary, true));

    return results.map(r => ({
      id: r.id,
      name: r.name || "Unknown",
      lat: parseFloat(r.lat || "0"),
      lng: parseFloat(r.lng || "0"),
      risk: "HIGH", // Simplified
      priority: 80, // Simplified
      totalDue: r.totalDue || 0,
      address: r.address || "N/A"
    }));
  } catch (error) {
    console.error("getClientsForMap error:", error);
    return [];
  }
}

/* =========================
   OPTIMIZE ROUTE 🔥
========================= */
export async function optimizeRoute(clientIds: string[]): Promise<MapClient[]> {
  const allClients = await getClientsForMap();
  return allClients.filter(c => clientIds.includes(c.id)).sort((a, b) => b.priority - a.priority);
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
