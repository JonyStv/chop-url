import fs from "node:fs";
import path from "node:path";
const jsonPath = path.join(process.cwd(), "apps/api/data.json");

let data = {};
try {
  data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
} catch (error) {
  console.error("Error leyendo data.json:", error);
}

export class RedirectModel {
  static async getBySlug(slug) {
    const linkData = data.links.find((link) => link.slug === slug);
    return linkData || null;
  }
}
