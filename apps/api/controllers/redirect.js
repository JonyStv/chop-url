import { RedirectModel } from "../models/redirect.js";
import { UAParser } from "ua-parser-js";
import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "../data.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

export class RedirectController {
  static async redirect(req, res) {
    const ua = req.headers["user-agent"];
    const parser = new UAParser(ua);
    const result = parser.getResult();

    const { slug } = req.params;
    const linkData = await RedirectModel.getBySlug(slug);
    if (!linkData) {
      return res.status(404).json({ error: "Link not found" });
    }

    // 🌍 Geolocalización por IP
    const ip = req.ip;
    const geo = {
      country: req.headers["x-vercel-ip-country"] || "N/A",
      city: req.headers["x-vercel-ip-city"] || "N/A",
    };

    const analyticsData = {
      id: data.analytics.length + 1,
      enlaceId: linkData.id,
      slug,
      usuarioId: linkData.usuarioId,
      visitorId: req.cookies?.visitorId || "vis_anon",
      ip,
      country: geo.country || "N/A",
      city: geo.city || "N/A",
      browser: result.browser.name || "Desconocido",
      os: result.os.name || "Desconocido",
      deviceType: result.device.type || "desktop",
      referrer: req.headers["referer"] || "Directo",
      timestamp: new Date().toISOString(),
    };

    data.analytics.push(analyticsData);
    linkData.totalClicks = (linkData.totalClicks || 0) + 1;

    return res.redirect(302, linkData.urlOriginal);
  }
}
