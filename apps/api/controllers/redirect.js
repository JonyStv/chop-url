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
    const referrer = req.get("referer") || req.get("referrer");
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
      referrer: referrer || "Directo",
    }).catch((err) => {
      console.error("Error creating analytic:", err);
    });
    return res.redirect(302, linkData.url_original);
  }
}
