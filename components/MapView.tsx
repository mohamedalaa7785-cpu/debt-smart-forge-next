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

/* =========================
   LOAD GOOGLE SCRIPT
========================= */
function loadGoogleMaps() {
  if (typeof window === "undefined") return;

  if (window.google) return;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  script.async = true;

  document.body.appendChild(script);
}

/* =========================
   COMPONENT
========================= */
export default function MapView({
  clients = [],
  address,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);

  /* =========================
     INIT MAP
  ========================= */
  useEffect(() => {
    loadGoogleMaps();

    const interval = setInterval(() => {
      if (window.google && mapRef.current) {
        const m = new window.google.maps.Map(mapRef.current, {
          center: { lat: 30.0444, lng: 31.2357 },
          zoom: 10,
          disableDefaultUI: true,
        });

        setMap(m);
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  /* =========================
     HANDLE ADDRESS
  ========================= */
  useEffect(() => {
    if (!map || !address) return;

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

  /* =========================
     HANDLE CLIENTS
  ========================= */
  useEffect(() => {
    if (!map || clients.length === 0) return;

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

  /* =========================
     UI
  ========================= */
  return (
    <div className="relative">

      <div
        ref={mapRef}
        className="w-full h-[320px] rounded-xl border"
      />

      {/* QUICK ACTIONS */}
      {address && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            address
          )}`}
          target="_blank"
          className="absolute bottom-2 right-2 bg-black text-white text-xs px-3 py-1 rounded"
        >
          Open in Maps
        </a>
      )}
    </div>
  );
          }
