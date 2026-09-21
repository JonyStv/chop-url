import { prisma } from "../config/db.js";
import { LinkModel } from "../models/link.js";

export class AnalyticModel {
  //CREATE
  static async create({
    enlace_id,
    usuario_id,
    visitor_id,
    ip,
    country,
    city,
    browser,
    os,
    deviceType,
    referrer,
  }) {
    const analyticsData = {
      enlace_id,
      usuario_id,
      visitor_id,
      ip,
      country,
      city,
      browser,
      os,
      device_type: deviceType,
      referrer,
    };
    this.incrementClickCount(enlace_id);
    return await prisma.analiticas.create({
      data: analyticsData,
    });
  }

  static async incrementClickCount(enlaceId) {
    let linkData = await LinkModel.getById(enlaceId);
    if (!linkData) {
      throw new Error("Link not found");
    }
    let totalClicksSum = (linkData.totalClicks =
      (linkData.totalClicks || 0) + 1);
    return await prisma.enlaces.update({
      where: {
        id: enlaceId,
      },
      data: {
        total_clicks: totalClicksSum,
      },
    });
  }
  //READ
  static async getByUserId(userid) {
    return await prisma.analiticas.findMany({
      where: {
        usuario_id: userid,
      },
    });
  }
  static async getSummaryByUserId(userid, linkid = null, options = {}) {
    //Devolvemos rescumen con el usuario id y link id si se proporciona.
    const uid = userid; //PARA MOSTRAR LAS ANALITICAS DE TODOS LOS ENLACES DE UN USUARIO
    const lid = linkid && linkid !== "all" ? linkid : null; // PARA MOSTRAR LAS ANALITICAS DE UN ENLACE ESPECIFICO SI SE PROPORCIONA
    const { startDate, endDate } = options;
    let analytics;
    if (lid) {
      analytics = await prisma.analiticas.findMany({
        where: {
          enlace_id: lid,
        },
      });
    } else {
      analytics = await prisma.analiticas.findMany({
        where: {
          usuario_id: uid,
        },
      });
    }
    // Filtrar por intervalo de fechas si se proporciona
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      analytics = analytics.filter((a) => new Date(a.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      analytics = analytics.filter((a) => new Date(a.timestamp) <= end);
    }

    const totalClicks = analytics.length;
    const uniqueVisitors = new Set(analytics.map((a) => a.visitorId)).size;

    // Función auxiliar para calcular porcentaje y distribución por campo
    const getDistribution = (field, limit = 5) => {
      const counts = {};
      let total = 0;

      analytics.forEach((entry) => {
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
    const devices = getDistribution("device_type", 5);
    const referrers = getDistribution("referrer", 5);

    const primaryCountry =
      countries.labels[0] === "N/A"
        ? (countries.labels[1] ?? "N/A")
        : (countries.labels[0] ?? "N/A");

    const averageCTR = Math.round(
      totalClicks > 0 ? (uniqueVisitors / totalClicks) * 100 : 0,
    );

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
