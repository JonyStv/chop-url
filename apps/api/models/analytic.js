import fs from "node:fs";
import path from "node:path";

const jsonPath = path.join(process.cwd(), "apps/api/data.json");

let data = {};
try {
  data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
} catch (error) {
  console.error("Error leyendo data.json:", error);
}
export class AnalyticModel {
  static async getByUserId(userid) {
    return data.analytics.filter(
      (analytic) => analytic.usuarioId === parseInt(userid),
    );
  }

  static async getSummaryByUserId(userid, linkid = null, options = {}) {
    const uid = parseInt(userid);
    const lid = linkid && linkid !== "all" ? parseInt(linkid) : null;
    const { startDate, endDate } = options;

    let userAnalytics = data.analytics.filter((a) => a.usuarioId === uid);
    let userLinks = data.links.filter((l) => l.usuarioId === uid);

    if (lid !== null && !isNaN(lid)) {
      userAnalytics = userAnalytics.filter((a) => a.enlaceId === lid);
      userLinks = userLinks.filter((l) => l.id === lid);
    }

    // Filtrar por intervalo de fechas si se proporciona
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      userAnalytics = userAnalytics.filter(
        (a) => new Date(a.timestamp) >= start,
      );
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      userAnalytics = userAnalytics.filter((a) => new Date(a.timestamp) <= end);
    }

    const totalClicks =
      startDate || endDate
        ? userAnalytics.length
        : userLinks.reduce((sum, link) => sum + (link.totalClicks || 0), 0);

    const uniqueVisitors = new Set(userAnalytics.map((a) => a.visitorId)).size;

    // Función auxiliar para calcular porcentaje y distribución por campo
    const getDistribution = (field, limit = 5) => {
      const counts = {};
      let total = 0;

      userAnalytics.forEach((entry) => {
        const val = entry[field];
        if (val) {
          counts[val] = (counts[val] || 0) + 1;
          total++;
        }
      });

      if (total === 0) {
        return { labels: [], data: [] };
      }

      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      return {
        labels: sorted.map(([label]) => label),
        data: sorted.map(([, count]) => Math.round((count / total) * 100)),
      };
    };

    const countries = getDistribution("country", 5);
    const devices = getDistribution("deviceType", 5);
    const referrers = getDistribution("referrer", 5);

    const primaryCountry =
      countries.labels.length > 0 ? countries.labels[0] : "N/A";

    const activeLinks = userLinks.filter((l) => l.estado === "Activo");
    const averageCTR =
      activeLinks.length > 0
        ? parseFloat((totalClicks / activeLinks.length).toFixed(1))
        : 0;

    return {
      totalClicks,
      uniqueVisitors,
      primaryCountry,
      averageCTR,
      countries,
      devices,
      referrers,
    };
  }
}
