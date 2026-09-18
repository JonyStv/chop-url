import { UserModel } from "../models/user.js";

export class UserController {
  static async getAllUsers(req, res) {
    const users = await UserModel.getAll();
    res.json(users);
  }

  static async getUserById(req, res) {
    const { id } = req.params;
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(user);
  }

  static async updateUser(req, res) {
    const { id } = req.params;
    const updates = req.body;
    const updatedUser = await UserModel.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(updatedUser);
  }

  static async deleteUser(req, res) {
    const { id } = req.params;
    const deletedUser = await UserModel.deleteUser(id);
    if (!deletedUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado correctamente" });
  }
}
