"use client";

export default function OSINTPanel({ osint }: any) {
  if (!osint) {
    return (
      <div className="p-4 bg-gray-50 border rounded-lg text-sm text-gray-400 text-center">
        No intelligence data available for this client.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <span className="text-blue-600">🔍</span> OSINT Intelligence
        </h2>
        <div className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
          Confidence: {osint.confidenceScore}%
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* SUMMARY */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Executive Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{osint.summary || "No summary available."}</p>
        </div>

        {/* SOCIAL MEDIA */}
        {osint.social && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Social Presence</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(osint.social).map(([platform, link]: [string, any]) => (
                <a 
                  key={platform} 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xs font-medium capitalize">{platform}</span>
                  <span className="text-xs text-blue-600 truncate flex-1">{link}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* WORKPLACE */}
        {osint.workplace && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Verified Workplace</h3>
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
              <div className="font-bold text-sm text-green-800">{osint.workplace.company || "Unknown Company"}</div>
              <div className="text-xs text-green-700 mt-1">{osint.workplace.address}</div>
              {osint.workplace.phone && (
                <div className="text-xs text-green-700 font-medium mt-1">📞 {osint.workplace.phone}</div>
              )}
            </div>
          </div>
        )}

        {/* IMAGE MATCHES */}
        {osint.imageResults && osint.imageResults.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Image Intelligence Matches</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {osint.imageResults.map((img: any, idx: number) => (
                <div key={idx} className="flex-shrink-0 w-24 space-y-1">
                  <div className="aspect-square bg-gray-200 rounded overflow-hidden border">
                    <img src={img.url} alt="Match" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{img.source || "Web Match"}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
