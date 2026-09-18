import { verifyAccessToken } from "../utils/jwt.js";
import { UserModel } from "../models/user.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Acceso no autorizado. Token no proporcionado." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    const user = await UserModel.findById(decoded.id);

    if (!user || !user.activo) {
      return res
        .status(401)
        .json({ message: "Usuario no encontrado o inactivo." });
    }

    req.user = UserModel.sanitizeUser(user);
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Token de acceso inválido o expirado." });
  }
};
