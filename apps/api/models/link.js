import { prisma } from "../config/db.js";
import { env } from "../config/env.js";

export class LinkModel {
  //CREATE
  static async create({ titulo, urlOriginal, slug, userId, dominioId }) {
    let dominio = env.publicUrl;
    if (!dominio.endsWith("/")) {
      dominio += "/";
    }

    const newLink = {
      usuario_id: userId,
      dominio_id: dominioId || null,
      slug,
      url_original: urlOriginal,
      titulo,
      estado: "Activo",
    };
    await prisma.usuario.update({
      where: {
        id: userId,
      },
      data: {
        enlaces_creados: {
          increment: 1,
        },
      },
    });
    return await prisma.enlace.create({
      data: newLink,
      include: {
        dominio: true,
      },
    });
  }
  //READ
  static async getAll({ estado, search, limit, offset }) {
    let filteredLinks = await prisma.enlace.findMany({
      include: {
        dominio: true,
      },
    });
    filteredLinks = filterLinks(filteredLinks, {
      estado,
      search,
      limit,
      offset,
    });
    return filteredLinks;
  }

  static async getByUserId(userid, { estado, search, limit, offset }) {
    let filteredLinks = await prisma.enlace.findMany({
      where: {
        usuario_id: userid,
      },
      include: {
        dominio: true,
      },
    });
    filteredLinks = filterLinks(filteredLinks, {
      estado,
      search,
      limit,
      offset,
    });
    return filteredLinks;
  }
  static async getBySlug(slug) {
    return await prisma.enlace.findUnique({
      where: {
        slug,
      },
      include: {
        dominio: true,
      },
    });
  }
  static async getById(id) {
    return await prisma.enlace.findUnique({
      where: {
        id,
      },
    });
  }
  //UPDATE
  static async update(id, { titulo, urlOriginal, slug, estado }) {
    return await prisma.enlace.update({
      where: {
        id,
      },
      data: {
        titulo,
        url_original: urlOriginal,
        slug,
        estado,
      },
    });
  }
  //DELETE
  static async delete(id, userid) {
    const result = await prisma.enlace.deleteMany({
      where: {
        id,
        usuario_id: userid,
      },
    });

    if (result.count === 0) {
      return { count: 0, status: 404, message: "Enlace no encontrado" };
    }

    await prisma.usuario.update({
      where: { id: userid },
      data: { enlaces_creados: { decrement: 1 } },
    });

    return { count: result.count, status: 200, message: "Enlace eliminado correctamente" };
  }
}
const filterLinks = (filteredLinks, { estado, search, limit, offset }) => {
  if (estado) {
    filteredLinks = filteredLinks.filter(
      (link) => link.estado.toLowerCase() === estado.toLowerCase(),
    );
  }
  if (search) {
    filteredLinks = filteredLinks.filter(
      (link) =>
        link.titulo.toLowerCase().includes(search.toLowerCase()) ||
        link.url_original.toLowerCase().includes(search.toLowerCase()) ||
        link.slug.toLowerCase().includes(search.toLowerCase()),
    );
  }
  if (limit !== undefined) {
    const offsetNum = offset || 0;
    filteredLinks = filteredLinks.slice(offsetNum, offsetNum + limit);
  }
  return filteredLinks;
};
