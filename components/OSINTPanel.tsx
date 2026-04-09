"use client";

interface OSINT {
  id: string;
  summary: string | null;
  confidenceScore: number | null;
  social: any;
  workplace: any;
  webResults: any;
  imageResults: any;
  mapsResults?: any;
}

export default function OSINTPanel({ osint }: { osint: OSINT | null }) {
  if (!osint) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔍</span> OSINT Intelligence
        </h2>
        <div className="p-8 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-sm font-medium">
          No intelligence data available for this client.
        </div>
      </div>
    );
  }

  const confidence = Number(osint.confidenceScore || 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <span className="text-blue-600">🔍</span> OSINT Intelligence
        </h2>
        <div className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${
          confidence > 70 ? "bg-green-100 text-green-700" : 
          confidence > 40 ? "bg-blue-100 text-blue-700" : 
          "bg-gray-100 text-gray-700"
        }`}>
          Confidence: {confidence}%
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* SUMMARY */}
        <div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Executive Summary</h3>
          <p className="text-sm text-gray-700 font-medium leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
            {osint.summary || "No summary available."}
          </p>
        </div>

        {/* SOCIAL MEDIA */}
        {osint.social && Array.isArray(osint.social) && osint.social.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Social Presence</h3>
            <div className="flex flex-wrap gap-2">
              {osint.social.map((link: string, idx: number) => (
                <a 
                  key={idx} 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-xs text-blue-600 font-bold hover:bg-blue-50 hover:border-blue-200 transition truncate max-w-full"
                >
                  {link.includes('facebook') ? 'Facebook' : 
                   link.includes('linkedin') ? 'LinkedIn' : 
                   link.includes('twitter') ? 'Twitter' : 
                   link.includes('instagram') ? 'Instagram' : 'Social Profile'}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* WORKPLACE */}
        {osint.workplace && Array.isArray(osint.workplace) && osint.workplace.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Employment Signals</h3>
            <div className="space-y-2">
              {osint.workplace.map((w: string, idx: number) => (
                <div key={idx} className="p-3 bg-green-50/50 border border-green-100/50 rounded-xl text-xs text-green-800 font-medium">
                  {w}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IMAGE MATCHES */}
        {osint.imageResults && Array.isArray(osint.imageResults) && osint.imageResults.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Image Matches</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {osint.imageResults.map((img: string, idx: number) => (
                <div key={idx} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={img} alt="Match" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOCATION SIGNALS */}
        {osint.mapsResults && Array.isArray(osint.mapsResults) && osint.mapsResults.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Location Signals</h3>
            <div className="space-y-2">
              {osint.mapsResults.slice(0, 6).map((place: string, idx: number) => (
                <div key={idx} className="p-3 bg-indigo-50/60 border border-indigo-100/60 rounded-xl text-xs text-indigo-800 font-medium">
                  {place}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
