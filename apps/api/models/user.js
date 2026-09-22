import { prisma } from "../config/db.js";
import bcrypt from "bcryptjs";

export class UserModel {
  //CREATE
  static async create({
    email,
    password,
    nombre,
    plan = "gratuito",
    limiteEnlaces = 10,
    activo = true,
  }) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      password: hashedPassword,
      nombre,
      plan,
      limite_enlaces: limiteEnlaces,
      activo,
    };

    return await prisma.usuario.create({
      data: newUser,
    });
  }
  static async createSession({ usuarioId, token, ip = "", dispositivo = "" }) {
    const newSession = {
      usuario_id: usuarioId,
      token,
      fecha_expiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip,
      dispositivo,
    };
    return await prisma.sesion.create({
      data: newSession,
    });
  }
  //READ
  static sanitizeUser(newUser) {
    if (!newUser) return null;

    const { password, ...sanitizedUser } = newUser;
    return sanitizedUser;
  }
  static async findByEmail(email) {
    return await prisma.usuario.findUnique({
      where: { email },
    });
  }
  static async findById(id) {
    const numericId = id;
    return await prisma.usuario.findUnique({
      where: { id: numericId },
    });
  }
  static async findSessionByToken(token) {
    return await prisma.sesion.findUnique({
      where: { token },
    });
  }
  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
  //UPDATE
  static async updateUser(id, updates) {
    const user = await this.findById(id);
    if (!user) return null;

    return await prisma.usuario.update({
      where: { id },
      data: updates,
    });
  }

  static async updatePassword(id, newHashedPassword) {
    const user = await this.findById(id);
    if (!user) return null;

    return await prisma.usuario.update({
      where: { id },
      data: { password: newHashedPassword },
    });
  }
  //REMOVE
  static async removeSession(token) {
    const session = await this.findSessionByToken(token);
    if (!session) return false;

    await prisma.sesion.delete({
      where: { token },
    });
    return true;
  }
  static async removeAllSessionsForUser(userId) {
    await prisma.sesion.deleteMany({
      where: { usuario_id: userId },
    });
  }
  static async deleteUser(id) {
    const user = await this.findById(id);
    if (!user) return null;

    await prisma.usuario.delete({
      where: { id },
    });
    return true;
  }
}
