import { UserModel } from "../models/user.js";
import bcrypt from "bcryptjs";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import { prisma } from "../config/db.js";
import crypto from "crypto";
import { emailService } from "./email.js";

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
export const register = async ({
  email,
  password,
  nombre,
  ip,
  dispositivo,
}) => {
  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw new AppError("El correo electrónico ya está registrado.", 400);
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const rawToken = crypto.randomBytes(64).toString("hex");
  const newUser = await UserModel.create({
    email,
    password: hashedPassword,
    nombre,
    email_verification_token_hash: sha256(rawToken),
    email_verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    email_verification_sent_at: new Date(),
  });

  const payload = { id: newUser.id, email: newUser.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  
  await UserModel.createSession({
    usuarioId: newUser.id,
    token: refreshToken,
    ip,
    dispositivo,
  });

  return {
    user: UserModel.sanitizeUser(newUser),
    accessToken,
    refreshToken,
    rawToken, // Return the raw token for email verification
  };
};

export const login = async ({ email, password, ip, dispositivo }) => {
  const user = await UserModel.findByEmail(email);
  if (!user) {
    throw new AppError("Credenciales inválidas.", 401);
  }

  if (!user.activo) {
    throw new AppError("Tu cuenta ha sido desactivada.", 403);
  }

  const isPasswordValid = await UserModel.comparePassword(
    password,
    user.password,
  );
  if (!isPasswordValid) {
    throw new AppError("Credenciales inválidas.", 401);
  }

  const payload = { id: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await UserModel.createSession({
    usuarioId: user.id,
    token: refreshToken,
    ip,
    dispositivo,
  });

  return {
    user: UserModel.sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

export const refresh = async (refreshToken, ip, dispositivo) => {
  if (!refreshToken) {
    throw new AppError("Token de refresco requerido.", 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    console.error("Token de refresco inválido o expirado:", err.message);
    throw new AppError("Token de refresco inválido o expirado.", 401);
  }

  const session = await UserModel.findSessionByToken(refreshToken);
  if (!session) {
    throw new AppError("Sesión no encontrada o ya cerrada.", 401);
  }

  const user = await UserModel.findById(decoded.id);
  if (!user || !user.activo) {
    console.error("Usuario no encontrado o inactivo:", decoded?.id);
    throw new AppError("Usuario no encontrado o inactivo.", 401);
  }

  await UserModel.removeSession(refreshToken);

  const payload = { id: user.id, email: user.email };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  await UserModel.createSession({
    usuarioId: user.id,
    token: newRefreshToken,
    ip,
    dispositivo,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};
export const changePassword = async (
  userId,
  { currentPassword, newPassword },
  meta = {},
) => {
  // Validate input
  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    !currentPassword ||
    !newPassword
  ) {
    throw new AppError("Se requiere la contraseña actual y la nueva.", 400);
  }
  if (currentPassword === newPassword) {
    throw new AppError(
      "La nueva contraseña no puede ser la misma que la actual.",
      400,
    );
  }
  if (newPassword.length < 6) {
    throw new AppError(
      "La nueva contraseña debe tener al menos 6 caracteres.",
      400,
    );
  }
  // Find the user
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError("Usuario no encontrado.", 404);
  if (!user.activo) throw new AppError("Usuario inactivo.", 403);

  // Verify current password
  const ok = await UserModel.comparePassword(currentPassword, user.password);
  if (!ok) throw new AppError("Contraseña actual incorrecta.", 401);

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  const userUpdated = await UserModel.updatePassword(userId, hashedPassword);

  // Invalidate all sessions for this user
  await UserModel.removeAllSessionsForUser(userId);

  // Create a new session for the user
  const accessToken = signAccessToken({
    id: userUpdated.id,
    email: userUpdated.email,
  });
  const refreshToken = signRefreshToken({
    id: userUpdated.id,
    email: userUpdated.email,
  });
  await UserModel.createSession({
    usuarioId: userUpdated.id,
    token: refreshToken,
    ip: meta.ip || "",
    dispositivo: meta.dispositivo || "",
  });

  return {
    accessToken,
    refreshToken,
  };
};
export const logout = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError("Token de refresco requerido para cerrar sesión.", 400);
  }
  return await UserModel.removeSession(refreshToken);
};

export const verifyEmail = async (rawToken) => {
  const tokenHash = sha256(rawToken);
  const user = await prisma.usuario.findUnique({
    where: { email_verification_token_hash: tokenHash },
  });
  if (!user) throw new Error("Token de verificación inválido o expirado.");
  if (user.email_verified_at) throw new Error("El correo electrónico ya ha sido verificado.");
  if (user.email_verification_expires_at < new Date()) throw new Error("El token de verificación ha expirado.");
  
  await prisma.usuario.update({
    where: { id: user.id },
    data: {
      email_verified_at: new Date(),
      email_verification_token_hash: null,
      email_verification_expires_at: null,
    },
  });
  return true;
};
export const resendVerificationEmail = async (email) => {
  const user = await UserModel.findByEmail(email);
  if (!user) throw new Error("Usuario no encontrado.");
  if (user.email_verified_at) throw new Error("El correo electrónico ya ha sido verificado.");

  if (user.email_verification_sent_at){
    const diff = Date.now() - user.email_verification_sent_at.getTime();
    if (diff < 5 * 60 * 1000) throw new Error("Espera 5 minutos antes de reenviar")
  }
  const rawToken = crypto.randomBytes(64).toString("hex");
  await emailService.sendVerification(user.email, user.nombre, rawToken);
  await prisma.usuario.update({
    where: { id: user.id },
    data: {
      email_verification_token_hash: sha256(rawToken),
      email_verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      email_verification_sent_at: new Date(),
    },
  });
  
}