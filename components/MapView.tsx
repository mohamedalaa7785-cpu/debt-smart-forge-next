"use client";

interface Props {
  address: string;
}

export default function MapView({ address }: Props) {
  if (!address) return null;

  return (
    <div className="card p-0 overflow-hidden">
      <iframe
        width="100%"
        height="220"
        loading="lazy"
        className="rounded-xl"
        src={`https://www.google.com/maps?q=${encodeURIComponent(
          address
        )}&output=embed`}
      />
    </div>
  );
}
