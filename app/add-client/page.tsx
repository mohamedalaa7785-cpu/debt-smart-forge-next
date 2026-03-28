"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* =========================
   TYPES
========================= */
interface Loan {
  loanType: string;
  emi: string;
  balance: string;
}

/* =========================
   PAGE
========================= */
export default function AddClientPage() {
  const router = useRouter();

  /* =========================
     STATE
  ========================= */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  const [phones, setPhones] = useState<string[]>([""]);
  const [addresses, setAddresses] = useState<string[]>([""]);

  const [loans, setLoans] = useState<Loan[]>([
    { loanType: "PIL", emi: "", balance: "" },
  ]);

  const [loading, setLoading] = useState(false);

  /* =========================
     HANDLERS
  ========================= */
  const updatePhone = (index: number, value: string) => {
    const updated = [...phones];
    updated[index] = value;
    setPhones(updated);
  };

  const addPhone = () => setPhones([...phones, ""]);

  const updateAddress = (index: number, value: string) => {
    const updated = [...addresses];
    updated[index] = value;
    setAddresses(updated);
  };

  const addAddress = () => setAddresses([...addresses, ""]);

  const updateLoan = (
    index: number,
    field: keyof Loan,
    value: string
  ) => {
    const updated = [...loans];
    updated[index][field] = value;
    setLoans(updated);
  };

  const addLoan = () => {
    setLoans([
      ...loans,
      { loanType: "PIL", emi: "", balance: "" },
    ]);
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async () => {
    if (!name) return alert("Name required");
    if (!phones[0]) return alert("Phone required");
    if (!loans[0].emi) return alert("Loan EMI required");

    setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          company,
          phones: phones.filter(Boolean),
          addresses: addresses.filter(Boolean),
          loans: loans.map((l) => ({
            loanType: l.loanType,
            emi: Number(l.emi),
            balance: Number(l.balance),
          })),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Error");
        return;
      }

      router.push(`/client/${data.data.id}`);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <h1 className="title">➕ Add Client</h1>

      {/* BASIC INFO */}
      <div className="card space-y-3">
        <input
          className="input"
          placeholder="Client Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="input"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {/* PHONES */}
      <div className="card space-y-2">
        <p className="font-semibold">📞 Phones</p>

        {phones.map((p, i) => (
          <input
            key={i}
            className="input"
            placeholder="Phone"
            value={p}
            onChange={(e) => updatePhone(i, e.target.value)}
          />
        ))}

        <button onClick={addPhone} className="btn btn-secondary">
          + Add Phone
        </button>
      </div>

      {/* ADDRESSES */}
      <div className="card space-y-2">
        <p className="font-semibold">📍 Addresses</p>

        {addresses.map((a, i) => (
          <input
            key={i}
            className="input"
            placeholder="Address"
            value={a}
            onChange={(e) => updateAddress(i, e.target.value)}
          />
        ))}

        <button onClick={addAddress} className="btn btn-secondary">
          + Add Address
        </button>
      </div>

      {/* LOANS */}
      <div className="card space-y-3">
        <p className="font-semibold">💰 Loans</p>

        {loans.map((l, i) => (
          <div key={i} className="space-y-2 border p-2 rounded-xl">

            <select
              className="input"
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
              className="input"
              placeholder="EMI"
              value={l.emi}
              onChange={(e) =>
                updateLoan(i, "emi", e.target.value)
              }
            />

            <input
              className="input"
              placeholder="Balance"
              value={l.balance}
              onChange={(e) =>
                updateLoan(i, "balance", e.target.value)
              }
            />
          </div>
        ))}

        <button onClick={addLoan} className="btn btn-secondary">
          + Add Loan
        </button>
      </div>

      {/* SUBMIT */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn btn-primary w-full"
      >
        {loading ? "Saving..." : "Save Client"}
      </button>
    </div>
  );
  }
