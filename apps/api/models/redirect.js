import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "../data.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

export class RedirectModel {
  static async getBySlug(slug) {
    const linkData = data.links.find((link) => link.slug === slug);
    return linkData || null;
  }
}
