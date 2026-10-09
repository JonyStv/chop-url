import { prisma } from "../config/db.js";
import { LinkModel } from "../models/link.js";

export class AnalyticModel {
  // CREATE
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

  // READ
  static async getByUserId(userid, monthlyLimit = null) {
    const analytics = await prisma.analitica.findMany({
      where: {
        usuario_id: userid,
      },
    });
    const visibleIds = await this.#getVisibleCurrentMonthIds(userid, monthlyLimit);
    return this.#applyMonthlyCap(analytics, visibleIds, monthlyLimit);
  }

  static async #getVisibleCurrentMonthIds(usuarioId, monthlyLimit) {
    if (monthlyLimit === null || monthlyLimit === undefined) {
      return null;
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const rows = await prisma.analitica.findMany({
      where: {
        usuario_id: usuarioId,
        timestamp: { gte: monthStart, lt: monthEnd },
      },
      select: { id: true },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      take: Math.max(0, Number(monthlyLimit)),
    });

    return new Set(rows.map((row) => row.id));
  }

  static async getVisibleCurrentMonthClicksByLink(usuarioId, monthlyLimit) {
    if (monthlyLimit === null || monthlyLimit === undefined) {
      return null;
    }

    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const rows = await prisma.analitica.findMany({
      where: {
        usuario_id: usuarioId,
      },
      select: { id: true, enlace_id: true, timestamp: true },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
    });

    const currentMonthRows = rows.filter(
      (row) =>
        row.timestamp >= monthStart &&
        row.timestamp < monthEnd,
    );
    const visibleCurrentMonthIds = new Set(
      currentMonthRows
        .slice(0, Math.max(0, Number(monthlyLimit)))
        .map((row) => row.id),
    );

    return rows.reduce((clicksByLink, row) => {
      const isCurrentMonth =
        row.timestamp >= monthStart && row.timestamp < monthEnd;
      if (!isCurrentMonth || visibleCurrentMonthIds.has(row.id)) {
        clicksByLink.set(
          row.enlace_id,
          (clicksByLink.get(row.enlace_id) ?? 0) + 1,
        );
      }
      return clicksByLink;
    }, new Map());
  }

  static #applyMonthlyCap(analytics, visibleCurrentMonthIds, monthlyLimit) {
    if (monthlyLimit === null || monthlyLimit === undefined) {
      return analytics;
    }

    const now = new Date();
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const monthEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

    return analytics.filter((entry) => {
      const timestamp = entry.timestamp?.getTime();
      if (timestamp === undefined || timestamp < monthStart || timestamp >= monthEnd) {
        return true;
      }
      return visibleCurrentMonthIds.has(entry.id);
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
      clicksOverTime: [],
    };
  }

  static async getClicksOverTime(
    usuarioId,
    enlaceId = null,
    { startDate, endDate } = {},
    monthlyLimit = null,
  ) {
    const visibleIds = await this.#getVisibleCurrentMonthIds(usuarioId, monthlyLimit);
    const timestamp = {};
    if (startDate) timestamp.gte = this.#parseDateStart(startDate);
    if (endDate) timestamp.lte = this.#parseDateEnd(endDate);

    const rows = await prisma.analitica.findMany({
      where: {
        usuario_id: usuarioId,
        ...(enlaceId ? { enlace_id: enlaceId } : {}),
        ...(Object.keys(timestamp).length > 0 ? { timestamp } : {}),
      },
      select: { id: true, timestamp: true },
      orderBy: { timestamp: "asc" },
    });
    const grouped = new Map();
    this.#applyMonthlyCap(rows, visibleIds, monthlyLimit).forEach((row) => {
      const date = row.timestamp.toISOString().split("T")[0];
      grouped.set(date, (grouped.get(date) ?? 0) + 1);
    });

    return [...grouped.entries()].map(([fecha, clics]) => ({ fecha, clics }));
  }

  static #parseDateStart(date) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  static #parseDateEnd(date) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  static async getSummaryByUserId(userid, linkid = null, options = {}) {
    const lid = linkid && linkid !== "all" ? linkid : null;
    const { startDate, endDate, monthlyLimit = null } = options;
    const visibleCurrentMonthIds = await this.#getVisibleCurrentMonthIds(
      userid,
      monthlyLimit,
    );

    const baseWhere = {
      usuario_id: userid,
      ...(lid ? { enlace_id: lid } : {}),
    };

    let currentStart, currentEnd;
    if (startDate) {
      currentStart = this.#parseDateStart(startDate);
      currentEnd = endDate
        ? this.#parseDateEnd(endDate)
        : this.#parseDateEnd(startDate);
    }

    const currentTimestamp = {};
    const previousTimestamp = {};
    if (currentStart) {
      currentTimestamp.gte = currentStart;
      currentTimestamp.lte = currentEnd;

      const periodLength = currentEnd.getTime() - currentStart.getTime() + 1;
      previousTimestamp.gte = new Date(currentStart.getTime() - periodLength);
      previousTimestamp.lte = new Date(currentStart.getTime() - 1);
    }

    const currentDataPromise = prisma.analitica.findMany({
      where: {
        ...baseWhere,
        ...(currentStart ? { timestamp: currentTimestamp } : {}),
      },
    });
    const previousDataPromise = currentStart
      ? prisma.analitica.findMany({
          where: {
            ...baseWhere,
            timestamp: previousTimestamp,
          },
        })
      : Promise.resolve([]);
    const [currentData, previousData] = await Promise.all([
      currentDataPromise,
      previousDataPromise,
    ]);

    const current = this.#buildSummary(
      this.#applyMonthlyCap(currentData, visibleCurrentMonthIds, monthlyLimit),
    );
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

    const clicksOverTime = await this.getClicksOverTime(
      userid,
      lid,
      { startDate, endDate },
      monthlyLimit,
    );

    return {
      ...current,
      comparison,
      clicksOverTime,
    };
  }
}

function pctChange(current, previous) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}
