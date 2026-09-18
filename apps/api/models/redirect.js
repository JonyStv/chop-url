import data from "../data.json" with { type: "json" };

export class RedirectModel {
  static async getBySlug(slug) {
    const linkData = data.links.find((link) => link.slug === slug);
    return linkData || null;
  }
}
