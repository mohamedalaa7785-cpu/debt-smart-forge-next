export function buildMessage(type: "reminder" | "warning", name: string) {
  if (type === "reminder") {
    return `Hello ${name}, please remember your payment.`;
  }

  return `Final notice ${name}, please contact us immediately.`;
}

export function buildWhatsAppUrl(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
