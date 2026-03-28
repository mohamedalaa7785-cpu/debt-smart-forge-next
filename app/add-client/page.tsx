"use client";

import { useState } from "react";

type Phone = { phone: string };
type Address = { address: string };
type Loan = {
  loanType: string;
  emi: string;
  balance: string;
};

export default function AddClientPage() {
  const [name, setName] = useState("");
  const [phones, setPhones] = useState<Phone[]>([{ phone: "" }]);
  const [addresses, setAddresses] = useState<Address[]>([{ address: "" }]);
  const [loans, setLoans] = useState<Loan[]>([
    { loanType: "PIL", emi: "", balance: "" },
  ]);

  const [loading, setLoading] = useState(false);

  /* =========================
     HANDLERS
  ========================= */

  const addPhone = () => {
    setPhones([...phones, { phone: "" }]);
  };

  const updatePhone = (i: number, value: string) => {
    const updated = [...phones];
    updated[i].phone = value;
    setPhones(updated);
  };

  const addAddress = () => {
    setAddresses([...addresses, { address: "" }]);
  };

  const updateAddress = (i: number, value: string) => {
    const updated = [...addresses];
    updated[i].address = value;
    setAddresses(updated);
  };

  const addLoan = () => {
    setLoans([...loans, { loanType: "PIL", emi: "", balance: "" }]);
  };

  const updateLoan = (i: number, key: keyof Loan, value: string) => {
    const updated = [...loans];
    updated[i][key] = value;
    setLoans(updated);
  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Name required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name,
          phones,
          addresses,
          loans,
        }),
      });

      if (!res.ok) throw new Error();

      alert("Client added ✅");

      setName("");
      setPhones([{ phone: "" }]);
      setAddresses([{ address: "" }]);
      setLoans([{ loanType: "PIL", emi: "", balance: "" }]);
    } catch {
      alert("Error adding client ❌");
    }

    setLoading(false);
  };

  /* =========================
     UI
  ========================= */

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Add Client</h1>

      {/* NAME */}
      <input
        className="w-full border p-3 rounded"
        placeholder="Client Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* PHONES */}
      <div>
        <h2 className="font-semibold mb-2">Phones</h2>
        {phones.map((p, i) => (
          <input
            key={i}
            className="w-full border p-2 mb-2 rounded"
            placeholder="Phone"
            value={p.phone}
            onChange={(e) => updatePhone(i, e.target.value)}
          />
        ))}
        <button onClick={addPhone} className="text-blue-500 text-sm">
          + Add Phone
        </button>
      </div>

      {/* ADDRESSES */}
      <div>
        <h2 className="font-semibold mb-2">Addresses</h2>
        {addresses.map((a, i) => (
          <input
            key={i}
            className="w-full border p-2 mb-2 rounded"
            placeholder="Address"
            value={a.address}
            onChange={(e) => updateAddress(i, e.target.value)}
          />
        ))}
        <button onClick={addAddress} className="text-blue-500 text-sm">
          + Add Address
        </button>
      </div>

      {/* LOANS */}
      <div>
        <h2 className="font-semibold mb-2">Loans</h2>
        {loans.map((l, i) => (
          <div key={i} className="border p-3 rounded mb-2 space-y-2">
            <select
              className="w-full border p-2 rounded"
              value={l.loanType}
              onChange={(e) =>
                updateLoan(i, "loanType", e.target.value)
              }
            >
              <option value="PIL">PIL</option>
              <option value="VSBL">VSBL</option>
              <option value="AUTO">AUTO</option>
              <option value="CC">CC</option>
              <option value="WRITEOFF">WRITEOFF</option>
            </select>

            <input
              className="w-full border p-2 rounded"
              placeholder="EMI"
              value={l.emi}
              onChange={(e) => updateLoan(i, "emi", e.target.value)}
            />

            <input
              className="w-full border p-2 rounded"
              placeholder="Balance"
              value={l.balance}
              onChange={(e) => updateLoan(i, "balance", e.target.value)}
            />
          </div>
        ))}
        <button onClick={addLoan} className="text-blue-500 text-sm">
          + Add Loan
        </button>
      </div>

      {/* SUBMIT */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-black text-white p-3 rounded"
      >
        {loading ? "Saving..." : "Save Client"}
      </button>
    </div>
  );
}
