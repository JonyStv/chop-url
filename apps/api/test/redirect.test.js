import assert from "node:assert/strict";
import { describe, test, mock, afterEach } from "node:test";
import { LinkModel } from "../models/link.js";
import { AnalyticModel } from "../models/analytic.js";
import { RedirectController } from "../controllers/redirect.js";

describe("Redirect Controller - Unit Tests", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  // Helper para crear un req con headers completos para UAParser
  function createRequest(slug, ip, headers, cookies = {}) {
    return {
      params: { slug },
      ip,
      headers,
      query: {},
      cookies,
      get: function (header) {
        const lower = header.toLowerCase();
        return this.headers[lower] || this.headers[header] || null;
      },
    };
  }

  describe("redirect", () => {
    test("deberia redirigir a la URL original cuando el slug existe", async () => {
      const mockLink = {
        id: "link-1",
        slug: "mi-link",
        url_original: "https://example.com/target",
        titulo: "Mi Link",
        estado: "Activo",
        usuario_id: "user-1",
      };

      mock.method(LinkModel, "getBySlug", async () => mockLink);
      mock.method(AnalyticModel, "create", async () => ({}));

      const req = createRequest(
        "mi-link",
        "192.168.1.1",
        {
          "x-vercel-ip-country": "ES",
          "x-vercel-ip-city": "Madrid",
          referer: "https://google.com/search?q=test",
          host: "api.chop-url.com",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        { visitorId: "visitor-123" },
      );

      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
        redirect: mock.fn(),
      };

      await RedirectController.redirect(req, res);

      const linkCalls = LinkModel.getBySlug.mock.calls;
      assert.strictEqual(linkCalls.length, 1);
      assert.strictEqual(linkCalls[0].arguments[0], "mi-link");

      const analyticCalls = AnalyticModel.create.mock.calls;
      assert.strictEqual(analyticCalls.length, 1);
      const analyticData = analyticCalls[0].arguments[0];
      assert.strictEqual(analyticData.enlace_id, "link-1");
      assert.strictEqual(analyticData.usuario_id, "user-1");
      assert.strictEqual(analyticData.visitor_id, "visitor-123");
      assert.strictEqual(analyticData.ip, "192.168.1.1");
      assert.strictEqual(analyticData.country, "ES");
      assert.strictEqual(analyticData.city, "Madrid");
      assert.strictEqual(analyticData.referrer, "Google");
      assert.strictEqual(analyticData.browser, "Chrome");
      assert.strictEqual(analyticData.os, "Windows");
      assert.strictEqual(analyticData.device_type, "Desktop");

      const redirectCalls = res.redirect.mock.calls;
      assert.strictEqual(redirectCalls.length, 1);
      assert.strictEqual(redirectCalls[0].arguments[0], 302);
      assert.strictEqual(redirectCalls[0].arguments[1], "https://example.com/target");
    });

    test("deberia manejar redireccion sin cookies de visitorId (anonimo)", async () => {
      const mockLink = {
        id: "link-2",
        slug: "sin-cookies",
        url_original: "https://example.org/page",
        titulo: "Sin Cookies",
        estado: "Activo",
        usuario_id: "user-2",
      };

      mock.method(LinkModel, "getBySlug", async () => mockLink);
      mock.method(AnalyticModel, "create", async () => ({}));

      const req = createRequest(
        "sin-cookies",
        "10.0.0.1",
        {
          "x-vercel-ip-country": "US",
          "x-vercel-ip-city": "New York",
          referer: "https://www.facebook.com/",
          host: "api.chop-url.com",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        {},
      );

      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
        redirect: mock.fn(),
      };

      await RedirectController.redirect(req, res);

      const analyticData = AnalyticModel.create.mock.calls[0].arguments[0];
      assert.strictEqual(analyticData.visitor_id, "vis_anon");
      assert.strictEqual(analyticData.country, "US");
      assert.strictEqual(analyticData.city, "New York");
      assert.strictEqual(analyticData.referrer, "Facebook");
    });

    test("deberia devolver 404 si el slug no existe", async () => {
      mock.method(LinkModel, "getBySlug", async () => null);

      const req = createRequest(
        "no-existe",
        "192.168.1.1",
        {},
        {},
      );

      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
        redirect: mock.fn(),
      };

      await RedirectController.redirect(req, res);

      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 404);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { error: "Link not found" });
    });

    test("deberia devolver 400 si no se proporciona slug", async () => {
      const req = createRequest(
        undefined,
        "192.168.1.1",
        {},
        {},
      );

      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
        redirect: mock.fn(),
      };

      await RedirectController.redirect(req, res);

      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 400);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { error: "Slug is required" });
    });

    test("deberia identificar dispositivo mobile correctamente", async () => {
      const mockLink = {
        id: "link-mobile",
        slug: "mobile-test",
        url_original: "https://example.com/mobile",
        titulo: "Test Mobile",
        estado: "Activo",
        usuario_id: "user-1",
      };

      mock.method(LinkModel, "getBySlug", async () => mockLink);
      mock.method(AnalyticModel, "create", async () => ({}));

      const req = createRequest(
        "mobile-test",
        "192.168.1.1",
        {
          referer: "https://www.instagram.com/p/test",
          host: "api.chop-url.com",
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        },
        {},
      );

      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
        redirect: mock.fn(),
      };

      await RedirectController.redirect(req, res);

      const analyticData = AnalyticModel.create.mock.calls[0].arguments[0];
      assert.strictEqual(analyticData.device_type, "Mobile");
      assert.strictEqual(analyticData.referrer, "Instagram");
      assert.strictEqual(analyticData.browser, "Mobile Safari");
      assert.strictEqual(analyticData.os, "iOS");
    });

    test("deberia identificar dispositivo tablet correctamente", async () => {
      const mockLink = {
        id: "link-tablet",
        slug: "tablet-test",
        url_original: "https://example.com/tablet",
        titulo: "Test Tablet",
        estado: "Activo",
        usuario_id: "user-1",
      };

      mock.method(LinkModel, "getBySlug", async () => mockLink);
      mock.method(AnalyticModel, "create", async () => ({}));

      const req = createRequest(
        "tablet-test",
        "192.168.1.1",
        {
          referer: "https://www.linkedin.com/",
          host: "api.chop-url.com",
          "user-agent":
            "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        },
        {},
      );

      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
        redirect: mock.fn(),
      };

      await RedirectController.redirect(req, res);

      const analyticData = AnalyticModel.create.mock.calls[0].arguments[0];
      assert.strictEqual(analyticData.device_type, "Tablet");
      assert.strictEqual(analyticData.referrer, "LinkedIn");
      assert.strictEqual(analyticData.browser, "Mobile Safari");
    });

    test("deberia manejar errores al crear analitica sin romper la redireccion", async () => {
      const mockLink = {
        id: "link-1",
        slug: "con-error",
        url_original: "https://example.com/error-test",
        titulo: "Con Error",
        estado: "Activo",
        usuario_id: "user-1",
      };

      mock.method(LinkModel, "getBySlug", async () => mockLink);
      mock.method(AnalyticModel, "create", async () => {
        throw new Error("Error de base de datos");
      });

      const req = createRequest(
        "con-error",
        "192.168.1.1",
        {
          referer: "https://www.twitter.com/",
          host: "api.chop-url.com",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        {},
      );

      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
        redirect: mock.fn(),
      };

      await RedirectController.redirect(req, res);

      // La redireccion debe seguir funcionando incluso con error en analytic
      const redirectCalls = res.redirect.mock.calls;
      assert.strictEqual(redirectCalls.length, 1);
      assert.strictEqual(redirectCalls[0].arguments[0], 302);
      assert.strictEqual(redirectCalls[0].arguments[1], "https://example.com/error-test");
    });
  });

  describe("parseReferrer", () => {
    test("deberia devolver Directo cuando no hay referer ni parametros", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: () => null,
        headers: {},
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "Directo");
    });

    test("deberia usar parametro query ref cuando no hay cabecera referer", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: () => null,
        headers: {},
        query: { ref: "twitter" },
      };
      assert.strictEqual(mod.parseReferrer(req), "X / Twitter");
    });

    test("deberia usar parametro query utm_source cuando no hay cabecera referer", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: () => null,
        headers: {},
        query: { utm_source: "instagram" },
      };
      assert.strictEqual(mod.parseReferrer(req), "Instagram");
    });

    test("deberia formatear dominio conocido de referer", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: (h) => (h === "referer" ? "https://www.google.com/search" : null),
        headers: { referer: "https://www.google.com/search" },
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "Google");
    });

    test("deberia detectar autoreferencia y devolver Directo", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: (h) => {
          if (h === "referer") return "https://api.chop-url.com/page";
          if (h === "host") return "api.chop-url.com";
          return null;
        },
        headers: {
          referer: "https://api.chop-url.com/page",
          "x-forwarded-host": "api.chop-url.com",
          host: "api.chop-url.com",
        },
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "Directo");
    });

    test("deberia manejar android-app:// referer", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: (h) => (h === "referer" ? "android-app://com.instagram.android/" : null),
        headers: { referer: "android-app://com.instagram.android/" },
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "Instagram");
    });

    test("deberia quitar subdominios comunes como www y m", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: (h) => (h === "referer" ? "https://www.youtube.com/watch" : null),
        headers: { referer: "https://www.youtube.com/watch", host: "api.chop-url.com" },
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "YouTube");
    });

    test("deberia devolver Directo cuando el referer no se puede parsear", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: () => "invalid-url",
        headers: { referer: "invalid-url" },
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "Directo");
    });
  });

  describe("formatKnownDomain", () => {
    test("deberia reconocer dominio google", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: (h) => (h === "referer" ? "https://www.google.es/search?q=test" : null),
        headers: {
          referer: "https://www.google.es/search?q=test",
          host: "api.chop-url.com",
        },
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "Google");
    });

    test("deberia reconocer dominio facebook", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: (h) => (h === "referer" ? "https://www.facebook.com/post" : null),
        headers: {
          referer: "https://www.facebook.com/post",
          host: "api.chop-url.com",
        },
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "Facebook");
    });

    test("deberia reconocer dominio tiktok", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: (h) => (h === "referer" ? "https://www.tiktok.com/@user/video" : null),
        headers: {
          referer: "https://www.tiktok.com/@user/video",
          host: "api.chop-url.com",
        },
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "TikTok");
    });

    test("deberia reconocer dominio github", async () => {
      const mod = await import("../controllers/redirect.js");
      const req = {
        get: (h) => (h === "referer" ? "https://github.com/user/repo" : null),
        headers: {
          referer: "https://github.com/user/repo",
          host: "api.chop-url.com",
        },
        query: {},
      };
      assert.strictEqual(mod.parseReferrer(req), "GitHub");
    });
  });
});
