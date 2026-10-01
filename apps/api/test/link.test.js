import assert from "node:assert/strict";
import { describe, test, mock, afterEach } from "node:test";
import { LinkModel } from "../models/link.js";
import { LinkController } from "../controllers/links.js";

describe("Link Controller - Unit Tests", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe("create", () => {
    test("deberia crear un enlace y devolver 201 con el nuevo link", async () => {
      const mockLink = {
        id: 1,
        slug: "mi-slug",
        url_original: "https://example.com",
        titulo: "Ejemplo",
        estado: "Activo",
        usuario_id: 1,
      };

      mock.method(LinkModel, "create", async () => mockLink);

      const req = {
        body: {
          titulo: "Ejemplo",
          urlOriginal: "https://example.com",
          slug: "mi-slug",
          userId: 1,
        },
      };
      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
      };

      await LinkController.create(req, res);

      // Verificar que LinkModel.create fue llamada con los datos correctos
      const calls = LinkModel.create.mock.calls;
      assert.strictEqual(calls.length, 1, "Debe llamar a LinkModel.create una vez");
      const args = calls[0].arguments[0];
      assert.strictEqual(args.titulo, "Ejemplo");
      assert.strictEqual(args.urlOriginal, "https://example.com");
      assert.strictEqual(args.slug, "mi-slug");
      assert.strictEqual(args.userId, 1);

      // Verificar respuesta: status(201) y json(mockLink)
      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 201);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockLink);
    });

    test("deberia fallar si LinkModel.create lanza un error", async () => {
      mock.method(LinkModel, "create", async () => {
        throw new Error("Error al crear el enlace");
      });

      const req = {
        body: {
          titulo: "Ejemplo",
          urlOriginal: "https://example.com",
          slug: "mi-slug",
          userId: 1,
        },
      };
      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
      };

      await assert.rejects(
        () => LinkController.create(req, res),
        (error) => error.message.includes("Error al crear el enlace"),
      );
    });
  });

  describe("getAll", () => {
    test("deberia devolver todos los enlaces con filtros y paginacion", async () => {
      const mockLinks = [
        {
          id: 1,
          slug: "link-1",
          url_original: "https://example.com/1",
          titulo: "Link Uno",
          estado: "Activo",
          usuario_id: 1,
        },
        {
          id: 2,
          slug: "link-2",
          url_original: "https://example.com/2",
          titulo: "Link Dos",
          estado: "Inactivo",
          usuario_id: 2,
        },
      ];

      mock.method(LinkModel, "getAll", async () => mockLinks);

      const req = {
        query: { estado: "Activo", search: "link", limit: "10", offset: "0" },
      };
      const res = { json: mock.fn() };

      await LinkController.getAll(req, res);

      const calls = LinkModel.getAll.mock.calls;
      assert.strictEqual(calls.length, 1);
      const args = calls[0].arguments[0];
      assert.strictEqual(args.estado, "Activo");
      assert.strictEqual(args.search, "link");
      assert.strictEqual(args.limit, 10);
      assert.strictEqual(args.offset, 0);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockLinks);
    });

    test("deberia funcionar sin filtros", async () => {
      const mockLinks = [];
      mock.method(LinkModel, "getAll", async () => mockLinks);

      const req = { query: {} };
      const res = { json: mock.fn() };

      await LinkController.getAll(req, res);

      const calls = LinkModel.getAll.mock.calls;
      assert.strictEqual(calls.length, 1);
      const args = calls[0].arguments[0];
      assert.strictEqual(args.estado, undefined);
      assert.strictEqual(args.search, undefined);
      assert.strictEqual(args.limit, undefined);
      assert.strictEqual(args.offset, 0);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockLinks);
    });
  });

  describe("getByUserId", () => {
    test("deberia devolver los enlaces de un usuario", async () => {
      const mockLinks = [
        {
          id: 1,
          slug: "link-user-1",
          url_original: "https://example.com/1",
          titulo: "Link del usuario",
          estado: "Activo",
          usuario_id: 5,
        },
      ];

      mock.method(LinkModel, "getByUserId", async () => mockLinks);

      const req = {
        params: { userid: "5" },
        query: { estado: "Activo", limit: "5" },
      };
      const res = { json: mock.fn() };

      await LinkController.getByUserId(req, res);

      const calls = LinkModel.getByUserId.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].arguments[0], "5");
      const options = calls[0].arguments[1];
      assert.strictEqual(options.estado, "Activo");
      assert.strictEqual(options.limit, 5);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockLinks);
    });

    test("deberia devolver array vacio cuando no hay enlaces", async () => {
      mock.method(LinkModel, "getByUserId", async () => []);

      const req = {
        params: { userid: "999" },
        query: {},
      };
      const res = { json: mock.fn() };

      await LinkController.getByUserId(req, res);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], []);
    });
  });

  describe("delete", () => {
    test("deberia eliminar un enlace y devolver 200 con el mensaje", async () => {
      mock.method(LinkModel, "delete", async () => ({ count: 1, status: 200, message: "Enlace eliminado correctamente" }));

      const req = {
        params: { id: "1" },
        user: { id: 1 },
      };
      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
      };

      await LinkController.delete(req, res);

      const calls = LinkModel.delete.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].arguments[0], "1");
      assert.strictEqual(calls[0].arguments[1], 1);

      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 200);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { message: "Enlace eliminado correctamente" });
    });

    test("deberia devolver 404 si el enlace no existe o no pertenece al usuario", async () => {
      mock.method(LinkModel, "delete", async () => ({ count: 0, status: 404, message: "Enlace no encontrado" }));

      const req = {
        params: { id: "999" },
        user: { id: 1 },
      };
      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
      };

      await LinkController.delete(req, res);

      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 404);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { message: "Enlace no encontrado" });
    });
  });

  describe("update", () => {
    test("deberia actualizar un enlace existente", async () => {
      const mockUpdatedLink = {
        id: 1,
        slug: "nuevo-slug",
        url_original: "https://nuevo-ejemplo.com",
        titulo: "Titulo Actualizado",
        estado: "Inactivo",
        usuario_id: 1,
      };

      mock.method(LinkModel, "update", async () => mockUpdatedLink);

      const req = {
        params: { id: "1" },
        body: {
          titulo: "Titulo Actualizado",
          urlOriginal: "https://nuevo-ejemplo.com",
          slug: "nuevo-slug",
          estado: "Inactivo",
        },
      };
      const res = { json: mock.fn() };

      await LinkController.update(req, res);

      const calls = LinkModel.update.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].arguments[0], "1");
      const data = calls[0].arguments[1];
      assert.strictEqual(data.titulo, "Titulo Actualizado");
      assert.strictEqual(data.urlOriginal, "https://nuevo-ejemplo.com");
      assert.strictEqual(data.slug, "nuevo-slug");
      assert.strictEqual(data.estado, "Inactivo");

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 1);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], mockUpdatedLink);
    });

    test("deberia devolver 404 si el enlace no existe para actualizar", async () => {
      mock.method(LinkModel, "update", async () => null);

      const req = {
        params: { id: "999" },
        body: { titulo: "Nuevo Titulo" },
      };
      const res = {
        status: mock.fn(function () {
          return this;
        }),
        json: mock.fn(),
      };

      await LinkController.update(req, res);

      const statusCalls = res.status.mock.calls;
      assert.strictEqual(statusCalls.length, 1);
      assert.strictEqual(statusCalls[0].arguments[0], 404);

      const jsonCalls = res.json.mock.calls;
      assert.strictEqual(jsonCalls.length, 2);
      assert.deepStrictEqual(jsonCalls[0].arguments[0], { error: "Link not found" });
    });
  });
});
