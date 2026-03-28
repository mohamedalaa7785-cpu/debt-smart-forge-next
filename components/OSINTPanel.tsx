export default function OSINTPanel({ osint }: any) {
  if (!osint) {
    return (
      <div className="card text-sm text-gray-400">
        No OSINT data
      </div>
    );
  }

  return (
    <div className="card space-y-2">

      <h2 className="font-semibold">🔍 Intelligence</h2>

      <p className="text-sm">{osint.summary}</p>

      <div className="text-xs">
        Confidence: {osint.confidence}%
      </div>

      {osint.socialLinks?.length > 0 && (
        <div className="text-xs break-all">
          {osint.socialLinks.join(" | ")}
        </div>
      )}
    </div>
  );
}
