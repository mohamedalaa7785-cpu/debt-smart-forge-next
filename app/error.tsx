"use client";

export default function Error({
  error,
}: {
  error: Error;
}) {
  return (
    <div className="p-4 text-center text-red-500">
      Something went wrong
    </div>
  );
}
