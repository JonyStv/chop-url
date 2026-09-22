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
    device_type,
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
      device_type,
      referrer,
    };
    await this.incrementClickCount(enlace_id);
    return await prisma.analitica.create({
      data: analyticsData,
    });
  }

  static async incrementClickCount(enlaceId) {
    return await prisma.enlace.update({
      where: {
        id: enlaceId,
      },
      data: {
        total_clicks: {
          increment: 1, // Incrementar de forma atómica en la BD
        },
      },
    });
  }
  //READ
  static async getByUserId(userid) {
    return await prisma.analitica.findMany({
      where: {
        usuario_id: userid,
      },
    });
  }
  static #buildSummary(analytics) {
    const totalClicks = analytics.length;
    const uniqueVisitors = new Set(analytics.map((a) => a.visitor_id)).size;

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

      if (total === 0) return { labels: [], data: [] };

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

    // Extra: contamos los clics del país principal para poder comparar semanas
    const primaryCountryClicks = primaryCountry
      ? analytics.filter((a) => a.country === primaryCountry).length
      : 0;

    return {
      totalClicks,
      uniqueVisitors,
      primaryCountry,
      primaryCountryClicks,
      averageCTR,
      countries,
      devices,
      referrers,
      comparison: {
        totalClicks: 0,
        uniqueVisitors: 0,
        primaryCountryClicks: 0,
        averageCTR: 0,
      },
    };
  }
  static #getWeekRange(referenceDate = newDate(), offsetWeeks = 0) {
    const date = new Date(referenceDate);
    const day = date.getDay(); // 0 (Domingo) a 6 (Sábado)
    const diffToMonday = day === 0 ? -6 : 1 - day; // Ajuste para que el lunes sea el primer día
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday + offsetWeeks * 7);
    monday.setHours(0, 0, 0, 0); // Establecer a medianoche

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999); // Establecer al final del día

    return { start: monday, end: sunday };
  }
  static async getSummaryByUserId(userid, linkid = null, options = {}) {
    const lid = linkid && linkid !== "all" ? linkid : null;
    const { startDate, endDate } = options;

    const baseWhere = lid ? { enlace_id: lid } : { usuario_id: userid };

    let currentStart, currentEnd;
    if (startDate) {
      currentStart = new Date(startDate);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = endDate ? new Date(endDate) : new Date(CurrentStart);
      currentEnd.setHours(23, 59, 59, 999);
    } else {
      const range = this.#getWeekRange(new Date(), 0);
      currentStart = range.start;
      currentEnd = range.end;
    }

    const prevStart = new Date(currentStart);
    prevStart.setDate(currentStart.getDate() - 7);
    const prevEnd = new Date(currentEnd);
    prevEnd.setDate(currentEnd.getDate() - 7);

    const [currentData, previousData] = await Promise.all([
      prisma.analitica.findMany({
        where: {
          ...baseWhere,
          timestamp: {
            gte: currentStart,
            lte: currentEnd,
          },
        },
      }),
      prisma.analitica.findMany({
        where: {
          ...baseWhere,
          timestamp: {
            gte: prevStart,
            lte: prevEnd,
          },
        },
      }),
    ]);
    const current = this.#buildSummary(currentData);
    const previous = this.#buildSummary(previousData);

    const comparison = {
      totalClicks: pctChange(current.totalClicks, previous.totalClicks),
      uniqueVisitors: pctChange(
        current.uniqueVisitors,
        previous.uniqueVisitors,
      ),
      primaryCountryClicks: pctChange(
        current.primaryCountryClicks,
        previous.primaryCountryClicks,
      ),
      averageCTR: pctChange(current.averageCTR, previous.averageCTR),
    };

    return {
      ...current,
      comparison,
    };
  }
}

function pctChange(current, previous) {
  if (previous === 0) {
    if (current === 0) return 0; // Evitar división por cero y cambio nulo
    return 100; // Cambio del 100% desde cero a un valor positivo
  }
  return Math.round(((current - previous) / previous) * 100);
}
