import assert from "node:assert/strict";
import { describe, test, mock, afterEach, beforeEach } from "node:test";
import { prisma } from "../config/db.js ";
import { UserModel } from "../models/user.js";
import * as authService from "../services/auth.js";
import bcrypt from "bcryptjs";

describe("Auth Service - Unit Tests", () => {
  //Variables Globales
  const passwordParaElTest = "ClaveSuperSecreta123!";
  let passwordHasheada;

  beforeEach(async () => {
    if (!passwordHasheada) {
      passwordHasheada = await bcrypt.hash(passwordParaElTest, 10);
    }
  });
  afterEach(() => {
    mock.restoreAll();
  });
  describe("Flujo de login", () => {
    let prismaSesionCreateOriginal;
    beforeEach(() => {
      // Guardar el método original antes de la prueba
      prismaSesionCreateOriginal = prisma.sesion.create;
    });
    afterEach(() => {
      // Restaurar el método original después de la prueba
      prisma.sesion.create = prismaSesionCreateOriginal;
    });
    test("deberia iniciar sesion correctamente y devolver tokens,", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: await passwordHasheada,
        nombre: "Test User",
        activo: true,
      };
      mock.method(UserModel, "findByEmail", async () => mockUser);

      prisma.sesion.create = async () => ({
        id: "sesion-1",
        token: "mock-refresh-token",
        usuario_id: mockUser.id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const result = await authService.login({
        email: "test@example.com",
        password: passwordParaElTest,
        ip: "127.0.0.1",
        dispositivo: "Test Device",
      });
      assert.ok(result.accessToken, "Debo devolver un accessToken");
      assert.ok(result.refreshToken, "Debo devolver un refreshToken");
    });
    test("deberia fallar si el usuario no existe", async () => {
      mock.method(UserModel, "findByEmail", async () => null);
      await assert.rejects(
        authService.login({
          email: "noexiste@example.com",
          password: passwordParaElTest,
          ip: "127.0.0.1",
          dispositivo: "test",
        }),
        (error) =>
          error.statusCode === 401 || error.message.includes("credenciales"),
      );
    });
    test("deberia fallar si la contraseña es incorrecta", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: await bcrypt.hash("contraseñaIncorrecta", 10),
        nombre: "Test User",
        activo: true,
      };
      mock.method(UserModel, "findByEmail", async () => mockUser);
      await assert.rejects(
        authService.login({
          email: "test@example.com",
          password: passwordParaElTest,
          ip: "127.0.0.1",
          dispositivo: "test",
        }),
        (error) =>
          error.statusCode === 401 || error.message.includes("credenciales"),
      );
    });
  });
  describe("Flujo de Registro", () => {
    let prismaUsuarioCreateOriginal;
    beforeEach(() => {
      // Guardar el método original antes de la prueba
      prismaUsuarioCreateOriginal = prisma.usuario.create;
    });
    afterEach(() => {
      // Restaurar el método original después de la prueba
      prisma.usuario.create = prismaUsuarioCreateOriginal;
    });
    test("deberia registrar un usuario correctamente y encriptar la clave", async () => {
      // 1. ARRANGE
      const plainPassword = "nonHashedPassword";
      const mockDbResponse = {
        id: "user-123",
        email: "test@example.com",
        nombre: "Test User",
        password: "un_hash_simulado_12345", // El hash guardado en la BD
      };

      // El mock ahora es "tonto", solo devuelve lo que la BD devolvería
      mock.method(UserModel, "create", async () => mockDbResponse);
      mock.method(UserModel, "findByEmail", async () => null); // Simulamos que el usuario no existe aún
      mock.method(UserModel, "createSession", async () => ({
        id: "sesion-1",
        token: "mock-refresh-token",
        usuario_id: mockDbResponse.id,
        created_at: new Date(),
      }));

      prisma.sesion.create = async () => ({
        id: "sesion-1",
        token: "mock-refresh-token",
        usuario_id: mockDbResponse.id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      // 2. ACT
      const result = await authService.register({
        email: "test@example.com",
        password: plainPassword,
        nombre: "Test User",
      });

      // 3. ASSERT
      // A) Verificamos lo que el servicio LE ENVIÓ a la base de datos (UserModel.create)
      const llamadasAlModelo = UserModel.create.mock.calls;
      assert.equal(
        llamadasAlModelo.length,
        1,
        "Debe llamar a UserModel.create una vez",
      );

      const datosEnviadosALaBd = llamadasAlModelo[0].arguments[0];
      assert.strictEqual(datosEnviadosALaBd.email, "test@example.com");
      assert.strictEqual(datosEnviadosALaBd.nombre, "Test User");
      assert.notEqual(
        datosEnviadosALaBd.password,
        plainPassword,
        "FATAL: El servicio intentó guardar la contraseña en texto plano en la BD",
      );

      // B) Verificamos lo que el servicio LE DEVUELVE al usuario
      assert.strictEqual(result.user.email, "test@example.com");
      assert.strictEqual(result.user.nombre, "Test User");

      // Validamos que por seguridad, el servicio haya eliminado la contraseña del resultado
      assert.strictEqual(
        result.password,
        undefined,
        "Por seguridad, el register no debe devolver la contraseña (ni siquiera el hash)",
      );
    });
  });
});
