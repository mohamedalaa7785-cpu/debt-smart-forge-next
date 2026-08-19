import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Debt Smart OS",
    short_name: "Debt Smart",
    description: "منصة ذكاء وتحليلات لإدارة التحصيل والنمو بالموافقة والحوكمة.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/og-image.png", sizes: "1200x630", type: "image/png", purpose: "maskable" }],
  };
}
