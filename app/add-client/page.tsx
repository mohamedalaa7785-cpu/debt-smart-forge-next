// file: app/add-client/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddClientPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Basic Info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");

  // Banking Logic
  const [portfolioType, setPortfolioType] = useState("ACTIVE");
  const [domainType, setDomainType] = useState("FIRST");
  const [cycleStartDate, setCycleStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Dynamic Lists
  const [phones, setPhones] = useState([""]);
  const [loans, setLoans] = useState([
    { loanType: "PIL", emi: "", balance: "", overdue: "" },
  ]);

  const addPhone = () => setPhones([...phones, ""]);
  const updatePhone = (i: number, val: string) => {
    const newPhones = [...phones];
    newPhones[i] = val;
    setPhones(newPhones);
  };

  const addLoan = () =>
    setLoans([...loans, { loanType: "PIL", emi: "", balance: "", overdue: "" }]);

  const updateLoan = (i: number, field: string, val: string) => {
    const newLoans = [...loans] as any;
    newLoans[i][field] = val;
    setLoans(newLoans);
  };

  async function handleSubmit() {
    if (!name) return setError("Name is required");

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 🔥 مهم عشان cookies
        body: JSON.stringify({
          name,
          email: email || null,
          company: company || null,
          notes: notes || null,
          portfolioType,
          domainType,
          cycleStartDate,
          phones: phones.filter(Boolean),
          loans: loans.map((l) => ({
            ...l,
            emi: l.emi || "0",
            balance: l.balance || "0",
            overdue: l.overdue || "0",
            amountDue: l.overdue || "0",
          })),
        }),
      });

      const data = await res.json();

      // 🔥 لو session بايظة
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save client");
      }

      router.push(`/client/${data.data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 pb-20 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          ➕ Add New Client
        </h1>
        <button
          onClick={() => router.back()}
          className="text-sm font-bold text-gray-400 hover:text-gray-600 transition"
        >
          Cancel
        </button>
      </div>

      {/* ERROR 🔥 */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg border">
          {error}
        </div>
      )}

      {/* باقي الكود زي ما هو بدون تغيير */}
      
      {/* (نفس UI بتاعك — ممتاز ومش محتاج تعديل 👌) */}

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
