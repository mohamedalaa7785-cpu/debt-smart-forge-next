"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Basic Info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  
  // Banking Logic
  const [portfolioType, setPortfolioType] = useState("ACTIVE");
  const [domainType, setDomainType] = useState("FIRST");
  const [cycleStartDate, setCycleStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Dynamic Lists
  const [phones, setPhones] = useState([""]);
  const [loans, setLoans] = useState([{ loanType: "PIL", emi: "", balance: "", overdue: "" }]);

  const addPhone = () => setPhones([...phones, ""]);
  const updatePhone = (i: number, val: string) => {
    const newPhones = [...phones];
    newPhones[i] = val;
    setPhones(newPhones);
  };

  const addLoan = () => setLoans([...loans, { loanType: "PIL", emi: "", balance: "", overdue: "" }]);
  const updateLoan = (i: number, field: string, val: string) => {
    const newLoans = [...loans] as any;
    newLoans[i][field] = val;
    setLoans(newLoans);
  };

  const handleSubmit = async () => {
    if (!name) return alert("Name is required");
    setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || null,
          company: company || null,
          notes: notes || null,
          portfolioType,
          domainType,
          cycleStartDate,
          phones: phones.filter(Boolean),
          loans: loans.map(l => ({
            ...l,
            emi: l.emi || "0",
            balance: l.balance || "0",
            overdue: l.overdue || "0",
            amountDue: l.overdue || "0" // For backward compatibility
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/client/${data.data.id}`);
        router.refresh();
      } else {
        throw new Error(data.error || "Failed to save client");
      }
    } catch (err) {
      console.error(err);
      alert((err as Error)?.message || "Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 pb-20 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">➕ Add New Client</h1>
        <button 
          onClick={() => router.back()}
          className="text-sm font-bold text-gray-400 hover:text-gray-600 transition"
        >
          Cancel
        </button>
      </div>

      {/* BASIC INFO */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Basic Information</h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">Full Name *</label>
            <input
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
              placeholder="e.g. Mohamed Ahmed"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">Email Address</label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">Company / Workplace</label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                placeholder="e.g. Vodafone Egypt"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">Internal Notes</label>
            <textarea
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium h-24"
              placeholder="Any additional details about the client..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* BANKING LOGIC */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banking & Portfolio Logic</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">Portfolio</label>
            <select 
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-700"
              value={portfolioType}
              onChange={(e) => setPortfolioType(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="WRITEOFF">WRITEOFF</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">Domain</label>
            <select 
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-700"
              value={domainType}
              onChange={(e) => setDomainType(e.target.value)}
            >
              <option value="FIRST">FIRST (3M)</option>
              <option value="THIRD">THIRD (Mid)</option>
              <option value="WRITEOFF">WRITEOFF</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">Start Date</label>
            <input 
              type="date"
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-700"
              value={cycleStartDate}
              onChange={(e) => setCycleStartDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* CONTACT & LOANS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PHONES */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Numbers</h2>
          <div className="space-y-3">
            {phones.map((p, i) => (
              <input
                key={i}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 transition"
                placeholder="01xxxxxxxxx"
                value={p}
                onChange={(e) => updatePhone(i, e.target.value)}
              />
            ))}
          </div>
          <button onClick={addPhone} className="text-xs text-blue-600 font-black hover:text-blue-700 transition uppercase tracking-widest">
            + Add Phone
          </button>
        </div>

        {/* LOANS */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loan Details</h2>
          <div className="space-y-4">
            {loans.map((l, i) => (
              <div key={i} className="p-4 border border-gray-100 rounded-xl space-y-3 bg-gray-50">
                <select
                  className="w-full p-2 bg-white border border-gray-100 rounded-lg outline-none text-xs font-black uppercase text-gray-600"
                  value={l.loanType}
                  onChange={(e) => updateLoan(i, "loanType", e.target.value)}
                >
                  <option value="PIL">PIL (Personal)</option>
                  <option value="VSBL">VSBL (Business)</option>
                  <option value="AUTO">AUTO</option>
                  <option value="CC">Credit Card</option>
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase">EMI</p>
                    <input
                      className="w-full p-2 bg-white border border-gray-100 rounded-lg outline-none text-sm font-bold"
                      placeholder="0"
                      value={l.emi}
                      onChange={(e) => updateLoan(i, "emi", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Balance</p>
                    <input
                      className="w-full p-2 bg-white border border-gray-100 rounded-lg outline-none text-sm font-bold"
                      placeholder="0"
                      value={l.balance}
                      onChange={(e) => updateLoan(i, "balance", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Overdue</p>
                    <input
                      className="w-full p-2 bg-white border border-gray-100 rounded-lg outline-none text-sm font-bold text-red-600"
                      placeholder="0"
                      value={l.overdue}
                      onChange={(e) => updateLoan(i, "overdue", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addLoan} className="text-xs text-blue-600 font-black hover:text-blue-700 transition uppercase tracking-widest">
            + Add Loan
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:bg-gray-300 transition-all uppercase tracking-widest text-sm"
      >
        {loading ? "Initializing Client..." : "🚀 Create Client Profile"}
      </button>
    </div>
  );
}
