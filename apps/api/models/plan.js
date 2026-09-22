import { prisma } from "../config/db.js";

export class PlanModel {
  static async getAll() {
    return await prisma.plan.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    });
  }
  static async getById(id) {
    return await prisma.plan.findUnique({
      where: { id },
    });
  }
}
