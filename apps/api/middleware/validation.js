import { z } from "zod";
import { AppError } from "../utils/errors.js";

export const registerSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "La contraseña no puede exceder 128 caracteres"),
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  username: z
    .string()
    .min(1, "El nombre de usuario es obligatorio")
    .max(50, "El nombre de usuario no puede exceder 50 caracteres")
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual obligatoria"),
  newPassword: z
    .string()
    .min(8, "Nueva contraseña debe tener al menos 8 caracteres")
    .max(128, "La contraseña no puede exceder 128 caracteres"),
});

export const createLinkSchema = z.object({
  url_original: z.string().url("URL inválida"),
  slug: z
    .string()
    .min(1, "Slug es obligatorio")
    .max(50, "Slug no puede exceder 50 caracteres")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Slug solo puede contener letras, números, guiones y guiones bajos",
    )
    .optional(),
  titulo: z
    .string()
    .max(100, "Título no puede exceder 100 caracteres")
    .optional(),
});

export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("\n");
        return next(new AppError(messages, 400));
      }
      next(error);
    }
  };
};
