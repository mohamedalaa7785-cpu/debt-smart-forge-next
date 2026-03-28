import axios from "axios";
import { parseNumber } from "@/lib/utils";

export type GeocodeResult = {
  formattedAddress: string;
  lat: number;
  lng: number;
  confidence: number;
};

export type MapClientPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  label?: string | null;
};

function getGoogleMapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || "";
}

export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const apiKey = getGoogleMapsApiKey();
  const cleanAddress = address.trim();

  if (!cleanAddress) return null;
  if (!apiKey) {
    return null;
  }

  try {
    const { data } = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: cleanAddress,
          key: apiKey,
        },
        timeout: 20000,
      }
    );

    const first = data?.results?.[0];
    if (!first) return null;

    const location = first?.geometry?.location;

    if (
      typeof location?.lat !== "number" ||
      typeof location?.lng !== "number"
    ) {
      return null;
    }

    return {
      formattedAddress: String(first.formatted_address || cleanAddress),
      lat: location.lat,
      lng: location.lng,
      confidence: data?.status === "OK" ? 90 : 50,
    };
  } catch {
    return null;
  }
}

export function calculateDistanceKm(
  from: { lat: number | string; lng: number | string },
  to: { lat: number | string; lng: number | string }
) {
  const lat1 = (parseNumber(from.lat) * Math.PI) / 180;
  const lon1 = (parseNumber(from.lng) * Math.PI) / 180;
  const lat2 = (parseNumber(to.lat) * Math.PI) / 180;
  const lon2 = (parseNumber(to.lng) * Math.PI) / 180;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return 6371 * c;
}

export function clusterClientPoints(points: MapClientPoint[]) {
  const clusters: Array<{
    center: { lat: number; lng: number };
    points: MapClientPoint[];
  }> = [];

  const thresholdKm = 1.5;

  for (const point of points) {
    let matchedCluster = clusters.find((cluster) => {
      const dist = calculateDistanceKm(cluster.center, point);
      return dist <= thresholdKm;
    });

    if (!matchedCluster) {
      matchedCluster = {
        center: { lat: point.lat, lng: point.lng },
        points: [],
      };
      clusters.push(matchedCluster);
    }

    matchedCluster.points.push(point);

    const avgLat =
      matchedCluster.points.reduce((sum, p) => sum + p.lat, 0) /
      matchedCluster.points.length;

    const avgLng =
      matchedCluster.points.reduce((sum, p) => sum + p.lng, 0) /
      matchedCluster.points.length;

    matchedCluster.center = {
      lat: avgLat,
      lng: avgLng,
    };
  }

  return clusters;
}

export function findNearestClient(
  origin: { lat: number | string; lng: number | string },
  points: MapClientPoint[]
) {
  if (!points.length) return null;

  let nearest: { point: MapClientPoint; distanceKm: number } | null = null;

  for (const point of points) {
    const distanceKm = calculateDistanceKm(origin, point);

    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = {
        point,
        distanceKm,
      };
    }
  }

  return nearest;
}

export function buildMapMarkers(points: MapClientPoint[]) {
  return points.map((point) => ({
    id: point.id,
    name: point.name,
    lat: point.lat,
    lng: point.lng,
    label: point.label ?? point.name,
  }));
}

export async function geocodeManyAddresses(addresses: string[]) {
  const results = await Promise.all(
    addresses.map(async (address) => {
      const geo = await geocodeAddress(address);
      return {
        address,
        geo,
      };
    })
  );

  return results;
    }
