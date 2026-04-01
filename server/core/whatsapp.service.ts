import { normalizePhone } from "@/lib/utils";

/* =========================
   FAB BANK LEGAL TEMPLATE 🏦
========================= */
export const FAB_LEGAL_TEMPLATE = `
FAB Bank Legal Notice:
Dear {name},
This is a formal legal notification regarding your outstanding debt of EGP {amount}.
Please be advised that failure to settle this amount within 24 hours will result in
immediate legal proceedings and reporting to the Central Bank of Egypt (CBE).
To avoid legal action, please contact us immediately or visit your nearest branch.
`;

/* =========================
   BUILD MESSAGE (SMART)
========================= */
export function buildMessage(type: "reminder" | "warning" | "legal", name: string, amount?: string) {
  if (type === "legal") {
    return FAB_LEGAL_TEMPLATE
      .replace("{name}", name)
      .replace("{amount}", amount || "0");
  }

  if (type === "warning") {
    return `Warning: ${name}, your payment is overdue. Please settle immediately.`;
  }

  return `Reminder: ${name}, your payment is due soon. Thank you.`;
}

/* =========================
   WHATSAPP URL (SMART)
========================= */
export function buildWhatsAppUrl(phone: string, message: string) {
  const clean = normalizePhone(phone);
  const text = encodeURIComponent(message);

  return `https://wa.me/${clean}?text=${text}`;
}
