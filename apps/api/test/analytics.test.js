import assert from "node:assert/strict";
import { describe, test, mock, afterEach } from "node:test";
import { AnalyticModel } from "../models/analytic.js";
import { AnalyticsController } from "../controllers/analytics.js";
import { prisma } from "../config/db.js";

describe("Analytics Controller - Unit Tests", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe("getByUserId", () => {
    test("deberia devolver los analytics de un usuario", async () => {
      const mockAnalytics = [
        {
          id: "analytic-1",
          enlace_id: "link-1",
          usuario_id: "user-1",
          visitor_id: "visitor-1",
          ip: "192.168.1.1",
          country: "ES",
          city: "Madrid",
          browser: "Chrome",
          os: "Windows",
          device_type: "desktop",
          referrer: "google.com",
          timestamp: new Date(),
        },
        {
          id: "analytic-2",
          enlace_id: "link-1",
          usuario_id: "user-1",
          visitor_id: "visitor-2",
          ip: "192.168.1.2",
          country: "US",
          city: "New York",
          browser: "Firefox",
          os: "MacOS",
          device_type: "mobile",
          referrer: "direct",
          timestamp: new Date(),
        },
      ];

      mock.method(AnalyticModel, "getByUserId", async () => mockAnalytics);

      const req = {
        params: { userid: "user-1" },
      };
      const res = { json: mock.fn() };

      await AnalyticsController.getByUserId(req, res);

      const calls = AnalyticModel.getByUserId.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].arguments[0], "user-1");

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockAnalytics);
    });

    test("deberia devolver 404 si no hay analytics para el usuario", async () => {
      mock.method(AnalyticModel, "getByUserId", async () => null);

      const req = {
        params: { userid: "nonexistent-user" },
      };
      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
      };

      await AnalyticsController.getByUserId(req, res);

      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 404);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 2);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { error: "Analytics not found" });
    });

    test("deberia devolver array vacio cuando el usuario no tiene analytics", async () => {
      mock.method(AnalyticModel, "getByUserId", async () => []);

      const req = {
        params: { userid: "user-2" },
      };
      const res = { json: mock.fn() };

      await AnalyticsController.getByUserId(req, res);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], []);
    });
  });

  describe("getSummary", () => {
    test("deberia devolver el resumen con los parametros correctos", async () => {
      const mockSummary = {
        totalClicks: 100,
        uniqueVisitors: 50,
        primaryCountry: "ES",
        primaryCountryClicks: 40,
        averageCTR: 50,
        countries: { labels: ["ES", "US"], data: [40, 20] },
        devices: { labels: ["desktop"], data: [60] },
        referrers: { labels: ["google.com"], data: [30] },
        comparison: {
          totalClicks: 10,
          uniqueVisitors: 5,
          primaryCountryClicks: 8,
          averageCTR: 12,
        },
        clicksOverTime: [
          { fecha: "2026-09-01", clics: 10 },
          { fecha: "2026-09-02", clics: 15 },
        ],
      };

      mock.method(AnalyticModel, "getSummaryByUserId", async () => mockSummary);

      const req = {
        params: { userid: "user-1", linkid: "link-1" },
        query: { startDate: "2026-09-01", endDate: "2026-09-30" },
      };
      const res = { json: mock.fn() };

      await AnalyticsController.getSummary(req, res);

      const calls = AnalyticModel.getSummaryByUserId.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].arguments[0], "user-1");
      assert.strictEqual(calls[0].arguments[1], "link-1");
      const options = calls[0].arguments[2];
      assert.strictEqual(options.startDate, "2026-09-01");
      assert.strictEqual(options.endDate, "2026-09-30");

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockSummary);
    });

    test("deberia funcionar sin linkid (resumen general del usuario)", async () => {
      const mockSummary = {
        totalClicks: 200,
        uniqueVisitors: 100,
        primaryCountry: "US",
        primaryCountryClicks: 80,
        averageCTR: 50,
        countries: { labels: ["US"], data: [40] },
        devices: { labels: ["mobile"], data: [60] },
        referrers: { labels: ["direct"], data: [100] },
        comparison: {
          totalClicks: 0,
          uniqueVisitors: 0,
          primaryCountryClicks: 0,
          averageCTR: 0,
        },
        clicksOverTime: [],
      };

      mock.method(AnalyticModel, "getSummaryByUserId", async () => mockSummary);

      const req = {
        params: { userid: "user-1", linkid: "all" },
        query: {},
      };
      const res = { json: mock.fn() };

      await AnalyticsController.getSummary(req, res);

      const calls = AnalyticModel.getSummaryByUserId.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].arguments[0], "user-1");
      assert.strictEqual(calls[0].arguments[1], "all");
      const options = calls[0].arguments[2];
      assert.strictEqual(options.startDate, undefined);
      assert.strictEqual(options.endDate, undefined);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockSummary);
    });

    test("deberia manejar cuando no hay datos de resumen", async () => {
      mock.method(AnalyticModel, "getSummaryByUserId", async () => null);

      const req = {
        params: { userid: "user-1", linkid: "link-1" },
        query: {},
      };
      const res = { json: mock.fn() };

      await AnalyticsController.getSummary(req, res);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], null);
    });
  });

  describe("AnalyticModel #buildSummary", () => {
    test("deberia construir un resumen correcto desde datos crudos", async () => {
      // Accedemos al metodo privado via el prototype
      const buildSummary = Object.getOwnPropertyNames(AnalyticModel.prototype)
        .filter((n) => n.startsWith("#buildSummary"))[0];

      // No podemos acceder directamente a #buildSummary, asi que probamos
      // indirectamente a traves de getSummaryByUserId mockeando los datos que Prisma devuelve
      // y verificando que el resultado tenga la estructura correcta

      // Simulamos los datos que prisma.analitica.findMany devolveria
      const mockCurrentData = [
        {
          id: "a1",
          enlace_id: "link-1",
          usuario_id: "user-1",
          visitor_id: "v1",
          country: "ES",
          device_type: "desktop",
          referrer: "google.com",
          timestamp: new Date("2026-09-15T10:00:00Z"),
        },
        {
          id: "a2",
          enlace_id: "link-1",
          usuario_id: "user-1",
          visitor_id: "v2",
          country: "ES",
          device_type: "mobile",
          referrer: "direct",
          timestamp: new Date("2026-09-15T11:00:00Z"),
        },
        {
          id: "a3",
          enlace_id: "link-1",
          usuario_id: "user-1",
          visitor_id: "v1",
          country: "US",
          device_type: "desktop",
          referrer: "google.com",
          timestamp: new Date("2026-09-16T10:00:00Z"),
        },
      ];

      // Mockear prisma.analitica.findMany para que devuelva nuestros datos
      const originalFindMany = prisma.analitica.findMany;
      prisma.analitica.findMany = async () => mockCurrentData;

      // Mockear getClicksOverTime para evitar consulta raw real
      mock.method(AnalyticModel, "getClicksOverTime", async () => []);

      const result = await AnalyticModel.getSummaryByUserId("user-1", "link-1", {});

      assert.strictEqual(result.totalClicks, 3);
      assert.strictEqual(result.uniqueVisitors, 2);
      assert.strictEqual(result.primaryCountry, "ES");
      assert.strictEqual(result.primaryCountryClicks, 2);
      assert.strictEqual(result.averageCTR, 67);

      // Restaurar
      prisma.analitica.findMany = originalFindMany;
    });

    test("deberia manejar datos vacios correctamente", async () => {
      const originalFindMany = prisma.analitica.findMany;
      prisma.analitica.findMany = async () => [];
      mock.method(AnalyticModel, "getClicksOverTime", async () => []);

      const result = await AnalyticModel.getSummaryByUserId("user-1", "link-1", {});

      assert.strictEqual(result.totalClicks, 0);
      assert.strictEqual(result.uniqueVisitors, 0);
      assert.strictEqual(result.primaryCountry, "N/A");
      assert.strictEqual(result.primaryCountryClicks, 0);
      assert.strictEqual(result.averageCTR, 0);
      assert.deepStrictEqual(result.countries, { labels: [], data: [] });
      assert.deepStrictEqual(result.devices, { labels: [], data: [] });
      assert.deepStrictEqual(result.referrers, { labels: [], data: [] });

      prisma.analitica.findMany = originalFindMany;
    });
  });
});
