import { prisma } from "../config/db.js";
import bcrypt from "bcryptjs";
import { AppError } from "../utils/errors.js";
export class UserModel {
  //CREATE
  static async create({
    email,
    password,
    nombre,
    plan = "gratuito",
    limiteEnlaces = 10,
    activo = true,
    email_verification_token_hash = null,
    email_verification_expires_at = null,
    email_verification_sent_at = null,
  }) {
    const newUser = {
      email,
      password,
      nombre,
      plan,
      limite_enlaces: limiteEnlaces,
      activo,
      email_verification_token_hash,
      email_verification_expires_at,
      email_verification_sent_at,
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

    const data = this.buildUpdateData(user, updates);

    try {
      return await prisma.usuario.update({
        where: { id },
        data,
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new AppError('El correo electrónico ya está en uso', 400);
      }
      throw err;
    }
  }

  static buildUpdateData(user, updates) {
    const data = {};

    // Whitelist de campos editables
    const allowedFields = ['nombre', 'email'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) data[field] = updates[field];
    }

    // Si cambia el email, normalizar + resetear verificación
    if (data.email) {
      data.email = data.email.trim().toLowerCase();

      if (data.email === user.email) {
        delete data.email;   // no cambió, ignorar
      } else {
        data.email_verified_at = null;
        data.email_verification_token_hash = null;
        data.email_verification_expires_at = null;
        data.email_verification_sent_at = null;
      }
    }

    return data;
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
    if (!session) throw new AppError("Sesión no encontrada", 404);

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
