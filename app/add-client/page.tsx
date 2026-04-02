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
  const [loans, setLoans] = useState([{ loanType: "PIL", emi: "", balance: "", amountDue: "" }]);

  const addPhone = () => setPhones([...phones, ""]);
  const updatePhone = (i: number, val: string) => {
    const newPhones = [...phones];
    newPhones[i] = val;
    setPhones(newPhones);
  };

  const addLoan = () => setLoans([...loans, { loanType: "PIL", emi: "", balance: "", amountDue: "" }]);
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
          email,
          company,
          notes,
          portfolioType,
          domainType,
          cycleStartDate,
          phones: phones.filter(Boolean),
          loans: loans.map(l => ({
            ...l,
            emi: Number(l.emi) || 0,
            balance: Number(l.balance) || 0,
            amountDue: Number(l.amountDue) || 0
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/client/${data.data.id}`);
      } else {
        alert(data.error || "Failed to save client");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">➕ Add New Client</h1>
        <button 
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {/* BASIC INFO */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Basic Information</h2>
        <div className="grid grid-cols-1 gap-4">
          <input
            className="w-full p-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Client Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              className="w-full p-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full p-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Company / Workplace"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <textarea
            className="w-full p-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24"
            placeholder="Additional Notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* BANKING LOGIC */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Banking & Portfolio Logic</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Portfolio Type</label>
            <select 
              className="w-full p-3 bg-gray-50 border rounded-lg outline-none"
              value={portfolioType}
              onChange={(e) => setPortfolioType(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="WRITEOFF">WRITEOFF</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Domain Type</label>
            <select 
              className="w-full p-3 bg-gray-50 border rounded-lg outline-none"
              value={domainType}
              onChange={(e) => setDomainType(e.target.value)}
            >
              <option value="FIRST">FIRST (3 Months)</option>
              <option value="THIRD">THIRD (Mid-Month)</option>
              <option value="WRITEOFF">WRITEOFF (Dynamic)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Cycle Start Date</label>
            <input 
              type="date"
              className="w-full p-3 bg-gray-50 border rounded-lg outline-none"
              value={cycleStartDate}
              onChange={(e) => setCycleStartDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* CONTACT & LOANS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PHONES */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Contact Numbers</h2>
          {phones.map((p, i) => (
            <input
              key={i}
              className="w-full p-3 bg-gray-50 border rounded-lg outline-none"
              placeholder="Phone Number"
              value={p}
              onChange={(e) => updatePhone(i, e.target.value)}
            />
          ))}
          <button onClick={addPhone} className="text-sm text-blue-600 font-bold hover:underline">
            + Add Another Phone
          </button>
        </div>

        {/* LOANS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Loan Details</h2>
          {loans.map((l, i) => (
            <div key={i} className="p-3 border rounded-lg space-y-2 bg-gray-50">
              <select
                className="w-full p-2 bg-white border rounded outline-none text-sm"
                value={l.loanType}
                onChange={(e) => updateLoan(i, "loanType", e.target.value)}
              >
                <option value="PIL">PIL</option>
                <option value="VSBL">VSBL</option>
                <option value="AUTO">AUTO</option>
                <option value="CC">CC</option>
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="p-2 bg-white border rounded outline-none text-sm"
                  placeholder="EMI"
                  value={l.emi}
                  onChange={(e) => updateLoan(i, "emi", e.target.value)}
                />
                <input
                  className="p-2 bg-white border rounded outline-none text-sm"
                  placeholder="Balance"
                  value={l.balance}
                  onChange={(e) => updateLoan(i, "balance", e.target.value)}
                />
                <input
                  className="p-2 bg-white border rounded outline-none text-sm"
                  placeholder="Due"
                  value={l.amountDue}
                  onChange={(e) => updateLoan(i, "amountDue", e.target.value)}
                />
              </div>
            </div>
          ))}
          <button onClick={addLoan} className="text-sm text-blue-600 font-bold hover:underline">
            + Add Another Loan
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all"
      >
        {loading ? "Creating Client System..." : "🚀 Initialize Client System"}
      </button>
    </div>
  );
}
