"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: any;
  }
}

interface ClientLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Props {
  clients?: ClientLocation[];
  address?: string;
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

function loadGoogleMaps() {
  if (typeof window === "undefined") return;
  if (!MAPS_KEY) return;
  if (window.google?.maps) return;

  const existing = document.querySelector('script[data-google-maps="true"]');
  if (existing) return;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}`;
  script.async = true;
  script.defer = true;
  script.dataset.googleMaps = "true";

  document.body.appendChild(script);
}

export default function MapView({ clients = [], address }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!MAPS_KEY) {
      setError("Google Maps key is missing");
      return;
    }

    loadGoogleMaps();

    const interval = setInterval(() => {
      if (window.google?.maps && mapRef.current) {
        const m = new window.google.maps.Map(mapRef.current, {
          center: { lat: 30.0444, lng: 31.2357 },
          zoom: 10,
          disableDefaultUI: true,
        });

        setMap(m);
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!map || !address || !window.google?.maps) return;

    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ address }, (results: any, status: string) => {
      if (status === "OK" && results[0]) {
        const loc = results[0].geometry.location;

        map.setCenter(loc);
        map.setZoom(14);

        new window.google.maps.Marker({
          position: loc,
          map,
          title: address,
        });
      }
    });
  }, [map, address]);

  useEffect(() => {
    if (!map || clients.length === 0 || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();

    clients.forEach((c) => {
      const position = { lat: c.lat, lng: c.lng };

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: c.name,
      });

      const info = new window.google.maps.InfoWindow({
        content: `
          <div style="font-size:12px">
            <strong>${c.name}</strong><br/>
            <a href="/client/${c.id}">Open</a>
          </div>
        `,
      });

      marker.addListener("click", () => {
        info.open(map, marker);
      });

      bounds.extend(position);
    });

    map.fitBounds(bounds);
  }, [map, clients]);

  if (error) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-700">{error}</div>;
  }

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-[320px] rounded-xl border" />

      {address && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-2 right-2 bg-black text-white text-xs px-3 py-1 rounded"
        >
          Open in Maps
        </a>
      )}
    </div>
  );
}
