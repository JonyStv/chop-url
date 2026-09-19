import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

const jsonPath = path.join(process.cwd(), "apps/api/data.json");

let data = {};
try {
  data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
} catch (error) {
  console.error("Error leyendo data.json:", error);
}
export class UserModel {
  static async findByEmail(email) {
    if (!email) return null;
    return (
      data.usuarios.find(
        (user) => user.email.toLowerCase() === email.toLowerCase(),
      ) || null
    );
  }

  static async findById(id) {
    const numericId = parseInt(id);
    return data.usuarios.find((user) => user.id === numericId) || null;
  }

  static async create({ email, password, nombre }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const maxId = data.usuarios.length
      ? Math.max(...data.usuarios.map((u) => u.id))
      : 0;
    const newId = maxId + 1;

    const newUser = {
      id: newId,
      email,
      password: hashedPassword,
      nombre,
      fechaRegistro: new Date().toISOString(),
      plan: "gratuito",
      limiteEnlaces: 10,
      enlacesCreados: 0,
      activo: true,
    };

    data.usuarios.push(newUser);
    return newUser;
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  static async createSession({ usuarioId, token, ip = "", dispositivo = "" }) {
    const maxId = data.sesiones.length
      ? Math.max(...data.sesiones.map((s) => s.id))
      : 0;
    const newSession = {
      id: maxId + 1,
      usuarioId: parseInt(usuarioId),
      token,
      fechaCreacion: new Date().toISOString(),
      fechaExpiracion: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ip,
      dispositivo,
    };

    data.sesiones.push(newSession);
    return newSession;
  }

  static async findSessionByToken(token) {
    return data.sesiones.find((s) => s.token === token) || null;
  }

  static async removeSession(token) {
    const index = data.sesiones.findIndex((s) => s.token === token);
    if (index !== -1) {
      data.sesiones.splice(index, 1);
      return true;
    }
    return false;
  }

  static async removeAllSessionsForUser(userId) {
    const numericId = parseInt(userId);
    const sessionsToRemove = data.sesiones.filter(
      (session) => session.usuarioId === numericId,
    );

    data.sesiones = data.sesiones.filter(
      (session) => session.usuarioId !== numericId,
    );

    return sessionsToRemove.length;
  }

  static sanitizeUser(user) {
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  static async updateUser(id, updates) {
    const user = await this.findById(id);
    if (!user) return null;

    Object.assign(user, updates);
    return user;
  }
  static async updatePassword(id, newHashedPassword) {
    const user = await this.findById(id);
    if (!user) return null;

    Object.assign(user, { password: newHashedPassword });
    return user;
  }
}
