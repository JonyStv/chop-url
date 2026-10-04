import { LinkModel } from "../models/link.js";
import { SubscriptionService } from "../services/subscription.js";
import { AppError } from "../utils/errors.js";

export class LinkController {
  static async getAll(req, res) {
    const { estado, search, limit, offset } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;

    const filteredLinks = await LinkModel.getAll({
      estado,
      search,
      limit: limitNum,
      offset: offsetNum,
    });
    res.json(filteredLinks);
  }
  static async getByUserId(req, res) {
    const { userid } = req.params;
    const { estado, search, limit, offset } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;

    const links = await LinkModel.getByUserId(userid, {
      estado,
      search,
      limit: limitNum,
      offset: offsetNum,
    });
    if (!links) {
      res.status(404).json({ error: "Link not found" });
    }
    res.json(links);
  }
  static async create(req, res) {
    const { titulo, urlOriginal, slug, userId } = req.body;

    if (typeof userId === "string" || typeof userId === "number") {
      const canCreate = await SubscriptionService.canCreateLink(userId);
      if (!canCreate) {
        throw new AppError(
          "No puedes crear más enlaces con tu plan actual o tu suscripción no está activa.",
          403,
        );
      }
    }

    const newLink = await LinkModel.create({
      titulo,
      urlOriginal,
      slug,
      userId,
    });
    return res.status(201).json(newLink);
  }
  static async delete(req, res) {
    const { id } = req.params;
    const userid = req.user.id;
    const result = await LinkModel.delete(id, userid);
    if (!result) {
      return res.status(404).json({ message: "Link not found or not authorized" });
    }
    return res.status(200).json({ message: result.message });
  }
  static async update(req, res) {
    const { id } = req.params;
    const { titulo, urlOriginal, slug, estado } = req.body;
    const updatedLink = await LinkModel.update(id, {
      titulo,
      urlOriginal,
      slug,
      estado,
    });

    if (!updatedLink) {
      res.status(404).json({ error: "Link not found" });
    }
    res.json(updatedLink);
  }
}
