import { AnalyticModel } from "../models/analytic.js";
import { LinkModel } from "../models/link.js";
import { UAParser } from "ua-parser-js";

export class RedirectController {
  static async redirect(req, res) {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ error: "Slug is required" });
    }
    const ip = req.ip;
    const parser = new UAParser(req.headers);
    const result = parser.getResult();

    const linkData = await LinkModel.getBySlug(slug);
    if (!linkData) {
      return res.status(404).json({ error: "Link not found" });
    }
    const ua = result.ua.toLowerCase();

    const isTablet = result.device.type === "tablet" || ua.includes("tablet");
    const isMobile = result.device.type === "mobile" || ua.includes("mobile");

    const device = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";
    const referrer = parseReferrer(req);
    const geo = {
      country: req.headers["x-vercel-ip-country"] || "N/A",
      city: req.headers["x-vercel-ip-city"] || "N/A",
    };
    await AnalyticModel.create({
      enlace_id: linkData.id,
      usuario_id: linkData.usuario_id,
      visitor_id: req.cookies?.visitorId || "vis_anon",
      ip,
      country: geo.country,
      city: geo.city,
      browser: result.browser.name || "Unknown",
      os: result.os.name || "Unknown",
      device_type: device,
      referrer,
    }).catch((err) => {
      console.error("Error creating analytic:", err);
    });
    return res.redirect(302, linkData.url_original);
  }
}
// Función para analizar el referer y determinar la fuente de tráfico
function parseReferrer(req) {
  // 1. Obtener la cabecera HTTP de Referer/Referrer de la petición
  const rawReferrer =
    req.get("referer") ||
    req.get("referrer") ||
    req.headers["referer"] ||
    req.headers["referrer"];

  // 2. Si no hay cabecera Referer, verificar parámetros de consulta (ej. ?ref=twitter o ?utm_source=instagram)
  if (!rawReferrer) {
    const queryRef = req.query?.ref || req.query?.utm_source;
    if (queryRef && typeof queryRef === "string") {
      return formatKnownDomain(queryRef.trim());
    }
    return "Directo";
  }

  try {
    // 3. Manejar esquemas de aplicaciones móviles (ej. android-app://com.instagram.android/)
    if (rawReferrer.startsWith("android-app://")) {
      const appPackage = rawReferrer
        .replace("android-app://", "")
        .split("/")[0];
      if (appPackage.includes("instagram")) return "Instagram";
      if (appPackage.includes("twitter") || appPackage.includes("x"))
        return "X / Twitter";
      if (appPackage.includes("facebook")) return "Facebook";
      if (appPackage.includes("google")) return "Google";
      if (appPackage.includes("linkedin")) return "LinkedIn";
      if (appPackage.includes("whatsapp")) return "WhatsApp";
      if (appPackage.includes("pinterest")) return "Pinterest";
      if (appPackage.includes("reddit")) return "Reddit";
      return appPackage || "Directo";
    }

    const url = new URL(rawReferrer);
    let host = url.hostname.toLowerCase();

    // 4. Filtrar autoreferencias (si proviene del propio dominio de la API o la aplicación)
    const requestHost = (
      req.get("host") ||
      req.headers["x-forwarded-host"] ||
      ""
    ).toLowerCase();
    if (
      requestHost &&
      (host === requestHost || host.endsWith("." + requestHost))
    ) {
      return "Directo";
    }

    // 5. Eliminar subdominios comunes (www., m., l., lm., mobile., out., link.)
    host = host.replace(/^(www\.|m\.|l\.|lm\.|mobile\.|out\.|link\.)/, "");

    return formatKnownDomain(host);
  } catch {
    return "Directo";
  }
}

function formatKnownDomain(domain) {
  const d = domain.toLowerCase();
  if (d.includes("google")) return "Google";
  if (d.includes("instagram")) return "Instagram";
  if (d.includes("facebook") || d.includes("fb.me")) return "Facebook";
  if (
    d.includes("twitter") ||
    d.includes("t.co") ||
    d === "x.com" ||
    d.endsWith(".x.com")
  )
    return "X / Twitter";
  if (d.includes("linkedin") || d.includes("lnkd.in")) return "LinkedIn";
  if (d.includes("youtube") || d.includes("youtu.be")) return "YouTube";
  if (d.includes("tiktok")) return "TikTok";
  if (d.includes("whatsapp")) return "WhatsApp";
  if (d.includes("reddit")) return "Reddit";
  if (d.includes("pinterest")) return "Pinterest";
  if (d.includes("github")) return "GitHub";
  if (d.includes("t.me") || d.includes("telegram")) return "Telegram";

  return domain || "Directo";
}
