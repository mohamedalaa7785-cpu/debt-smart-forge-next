"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ImportedPreview = {
  name: string;
  phones: string[];
  loans: Array<{ loanType: string; amountDue: number; overdue: number }>;
  totalAmountDue: number;
  totalOverdue: number;
};

export default function AddClientPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");

  const [portfolioType, setPortfolioType] = useState("ACTIVE");
  const [domainType, setDomainType] = useState("FIRST");
  const [cycleStartDate, setCycleStartDate] = useState(new Date().toISOString().split("T")[0]);

  const [phones, setPhones] = useState([""]);
  const [addresses, setAddresses] = useState([{ address: "", city: "", area: "" }]);
  const [loans, setLoans] = useState([
    {
      loanType: "PIL",
      loanNumber: "",
      amountDue: "",
      cycle: "",
      emi: "",
      balance: "",
      overdue: "",
      bucket: "",
      organization: "",
      willLegal: false,
      referralDate: "",
      collectorPercentage: "",
    },
  ]);

  const [bankText, setBankText] = useState("");
  const [bankImageUrl, setBankImageUrl] = useState("");
  const [bankImporting, setBankImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ count: number; clients: ImportedPreview[] } | null>(null);

  const addPhone = () => setPhones([...phones, ""]);
  const addLoan = () =>
    setLoans([
      ...loans,
      {
        loanType: "PIL",
        loanNumber: "",
        amountDue: "",
        cycle: "",
        emi: "",
        balance: "",
        overdue: "",
        bucket: "",
        organization: "",
        willLegal: false,
        referralDate: "",
        collectorPercentage: "",
      },
    ]);
  const addAddress = () => setAddresses([...addresses, { address: "", city: "", area: "" }]);

  const updatePhone = (i: number, val: string) => {
    const next = [...phones];
    next[i] = val;
    setPhones(next);
  };

  const updateLoan = (i: number, field: string, val: any) => {
    const next = [...loans] as any;
    next[i][field] = val;
    setLoans(next);
  };

  const updateAddress = (i: number, field: string, val: string) => {
    const next = [...addresses] as any;
    next[i][field] = val;
    setAddresses(next);
  };

  async function uploadBankImage(file?: File | null) {
    if (!file) return;

    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: base64, folder: "debt-smart/imports" }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to upload image");
    }

    setBankImageUrl(json.data.url);
  }

  async function previewBankImport() {
    setBankImporting(true);
    setError("");
    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: bankText,
          imageUrl: bankImageUrl,
          dryRun: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Import preview failed");
      setImportSummary(json.data);
    } catch (err: any) {
      setError(err.message || "Import preview failed");
    } finally {
      setBankImporting(false);
    }
  }

  async function executeBankImport() {
    setBankImporting(true);
    setError("");
    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: bankText,
          imageUrl: bankImageUrl,
          dryRun: false,
          assignMode: "round_robin",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Bank import failed");
      alert(`Imported ${json.data.createdCount} clients (skipped ${json.data.skippedCount}).`);
      router.push("/dashboard/clients");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Bank import failed");
    } finally {
      setBankImporting(false);
    }
  }

  async function handleSubmit() {
    if (!name) return setError("Name is required");

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email: email || null,
          company: company || null,
          branch: branch || null,
          notes: notes || null,
          portfolioType,
          domainType,
          cycleStartDate,
          phones: phones.filter(Boolean),
          addresses: addresses.filter((a) => a.address.trim()),
          loans: loans.map((l) => ({
            ...l,
            emi: l.emi || "0",
            balance: l.balance || "0",
            overdue: l.overdue || "0",
            amountDue: l.amountDue || l.overdue || "0",
            loanNumber: l.loanNumber || null,
            cycle: l.cycle || null,
            bucket: l.bucket || null,
            organization: l.organization || null,
            willLegal: Boolean(l.willLegal),
            referralDate: l.referralDate || null,
            collectorPercentage: l.collectorPercentage || null,
          })),
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save client");

      router.push(`/client/${data.data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 pb-20 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">➕ Add New Client</h1>
        <button onClick={() => router.back()} className="text-sm font-bold text-gray-400 hover:text-gray-600 transition">Cancel</button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg border">{error}</div>}

      <div className="border rounded-2xl p-4 space-y-3 bg-amber-50">
        <h2 className="font-extrabold text-gray-900">🏦 Bank File Import (Auto OCR + Auto Distribution)</h2>
        <p className="text-sm text-gray-600">Upload a screenshot/file or paste bank text. System extracts clients, calculates dues/penalties, then imports and distributes automatically.</p>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => uploadBankImage(e.target.files?.[0]).catch((err) => setError(err.message || "Upload failed"))}
          className="w-full border rounded-xl p-2 bg-white"
        />

        <textarea
          className="w-full border rounded-xl p-3 bg-white min-h-28"
          placeholder="Paste raw bank text here (optional if image uploaded)"
          value={bankText}
          onChange={(e) => setBankText(e.target.value)}
        />

        {bankImageUrl && <p className="text-xs text-green-700 break-all">Image uploaded: {bankImageUrl}</p>}

        <div className="flex gap-2">
          <button onClick={previewBankImport} disabled={bankImporting} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:bg-gray-400">Preview extraction</button>
          <button onClick={executeBankImport} disabled={bankImporting} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:bg-gray-400">Import + distribute</button>
        </div>

        {importSummary && (
          <div className="bg-white rounded-xl border p-3 space-y-2">
            <p className="text-sm font-bold">Detected clients: {importSummary.count}</p>
            <div className="max-h-64 overflow-auto space-y-2">
              {importSummary.clients.map((c, i) => (
                <div key={`${c.name}-${i}`} className="border rounded-lg p-2">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-gray-600">Phones: {c.phones.join(" / ") || "-"}</p>
                  <p className="text-xs text-gray-600">Loans: {c.loans.length} | Overdue: {c.totalOverdue.toLocaleString()} | Due: {c.totalAmountDue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <input className="w-full border rounded-xl p-3" placeholder="Client Name *" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full border rounded-xl p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded-xl p-3" placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
        <input className="w-full border rounded-xl p-3 md:col-span-2" placeholder="Company / Employer" value={company} onChange={(e) => setCompany(e.target.value)} />
        <textarea className="w-full border rounded-xl p-3 md:col-span-2 min-h-24" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <select className="w-full border rounded-xl p-3" value={portfolioType} onChange={(e) => setPortfolioType(e.target.value)}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="WRITEOFF">WRITEOFF</option>
        </select>
        <select className="w-full border rounded-xl p-3" value={domainType} onChange={(e) => setDomainType(e.target.value)}>
          <option value="FIRST">FIRST</option>
          <option value="THIRD">THIRD</option>
          <option value="WRITEOFF">WRITEOFF</option>
        </select>
        <input type="date" className="w-full border rounded-xl p-3" value={cycleStartDate} onChange={(e) => setCycleStartDate(e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-bold">📞 Phones</h2><button className="text-blue-600 text-sm font-bold" onClick={addPhone}>+ Add phone</button></div>
        {phones.map((p, i) => <input key={i} className="w-full border rounded-xl p-3" placeholder={`Phone #${i + 1}`} value={p} onChange={(e) => updatePhone(i, e.target.value)} />)}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-bold">📍 Addresses</h2><button className="text-blue-600 text-sm font-bold" onClick={addAddress}>+ Add address</button></div>
        {addresses.map((a, i) => (
          <div key={i} className="grid md:grid-cols-3 gap-3">
            <input className="border rounded-xl p-3 md:col-span-2" placeholder="Address" value={a.address} onChange={(e) => updateAddress(i, "address", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="City" value={a.city} onChange={(e) => updateAddress(i, "city", e.target.value)} />
            <input className="border rounded-xl p-3 md:col-span-3" placeholder="Area" value={a.area} onChange={(e) => updateAddress(i, "area", e.target.value)} />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-bold">💰 Loans</h2><button className="text-blue-600 text-sm font-bold" onClick={addLoan}>+ Add loan</button></div>
        {loans.map((l, i) => (
          <div key={i} className="grid md:grid-cols-2 gap-3 border rounded-xl p-3">
            <input className="border rounded-xl p-3" placeholder="Loan Number" value={l.loanNumber} onChange={(e) => updateLoan(i, "loanNumber", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="Loan type" value={l.loanType} onChange={(e) => updateLoan(i, "loanType", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="Amount Due" value={l.amountDue} onChange={(e) => updateLoan(i, "amountDue", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="Cycle (CYL)" value={l.cycle} onChange={(e) => updateLoan(i, "cycle", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="EMI" value={l.emi} onChange={(e) => updateLoan(i, "emi", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="Balance" value={l.balance} onChange={(e) => updateLoan(i, "balance", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="Overdue" value={l.overdue} onChange={(e) => updateLoan(i, "overdue", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="Bucket (BKT)" value={l.bucket} onChange={(e) => updateLoan(i, "bucket", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="Organization" value={l.organization} onChange={(e) => updateLoan(i, "organization", e.target.value)} />
            <input type="date" className="border rounded-xl p-3" placeholder="Referral Date" value={l.referralDate} onChange={(e) => updateLoan(i, "referralDate", e.target.value)} />
            <input className="border rounded-xl p-3" placeholder="Collector %" value={l.collectorPercentage} onChange={(e) => updateLoan(i, "collectorPercentage", e.target.value)} />
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input type="checkbox" checked={Boolean(l.willLegal)} onChange={(e) => updateLoan(i, "willLegal", e.target.checked)} />
              Will Legal
            </label>
          </div>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:bg-gray-300 transition-all uppercase tracking-widest text-sm">
        {loading ? "Initializing Client..." : "🚀 Create Client Profile"}
      </button>
    </div>
  );
}
