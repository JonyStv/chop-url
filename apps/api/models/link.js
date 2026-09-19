import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

const jsonPath = path.join(process.cwd(), "apps/api/data.json");

let data = {};
try {
  data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
} catch (error) {
  console.error("Error leyendo data.json:", error);
}
export class LinkModel {
  static async getAll({ estado, search, limit, offset }) {
    let filteredLinks = data.links;
    filteredLinks = filterLinks(filteredLinks, {
      estado,
      search,
      limit,
      offset,
    });
    return filteredLinks;
  }

  static async getByUserId(userid, { estado, search, limit, offset }) {
    let filteredLinks = data.links.filter(
      (link) => link.usuarioId === parseInt(userid),
    );
    filteredLinks = filterLinks(filteredLinks, {
      estado,
      search,
      limit,
      offset,
    });
    return filteredLinks;
  }

  static async create({ titulo, urlOriginal, slug, userId }) {
    let dominio = env.publicUrl;
    if (!dominio.endsWith("/")) {
      dominio += "/";
    }
    const urlAcortada = `${dominio}${slug}`;
    const fechaCreacion = new Date().toISOString();

    const newLink = {
      id: data.links.length + 1,
      usuarioId: parseInt(userId),
      slug,
      urlOriginal,
      titulo,
      urlAcortada,
      fechaCreacion,
      estado: "Activo",
      fechaExpiracion: null, // No use by now
      tags: [], // No use by now
      totalClicks: 0,
    };
    data.links.push(newLink);
    return newLink;
  }

  static async delete(id, userid) {
    const linkId = parseInt(id);
    const userId = parseInt(userid);
    const link = data.links.find((l) => l.id === linkId);
    if (!link) {
      return { status: 404, message: "Enlace no encontrado" };
    }
    if (link.usuarioId !== userId) {
      return { status: 403, message: "No autorizado" };
    }

    // Eliminar también todas las analytics asociadas al enlace eliminado.
    data.analytics = data.analytics.filter((a) => a.enlaceId !== linkId);
    data.links = data.links.filter((l) => l.id !== linkId);
    return { status: 200, message: "Enlace eliminado correctamente" };
  }

  static async update(id, { titulo, urlOriginal, urlAcortada, estado, tags }) {
    const linkIndex = data.links.findIndex((link) => link.id === parseInt(id));
    if (linkIndex !== -1) {
      data.links[linkIndex] = {
        ...data.links[linkIndex],
        titulo,
        urlOriginal,
        urlAcortada,
        estado,
        tags,
      };
      return data.links[linkIndex];
    }
    return null;
  }
}
// Helper function to filter links based on estado, search, limit, and offset
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
        link.urlAcortada.toLowerCase().includes(search.toLowerCase()) ||
        link.urlOriginal.toLowerCase().includes(search.toLowerCase()) ||
        link.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase()),
        ),
    );
  }
  if (limit !== undefined) {
    const offsetNum = offset || 0;
    filteredLinks = filteredLinks.slice(offsetNum, offsetNum + limit);
  }
  return filteredLinks;
};
