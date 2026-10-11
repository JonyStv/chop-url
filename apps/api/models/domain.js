import {prisma} from "../config/db.js";

export class DomainValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

export class DomainConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainConflictError';
  }
}

export class DomainModel {
  static async create({hostname, userId}) {
    if (!hostname || typeof hostname !== "string") {
      throw new DomainValidationError("Hostname is required");
    }

    hostname = hostname
      .trim()
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .replace(/\/$/, "");

    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,11}?$/;
    if (!domainRegex.test(hostname)) {
      throw new DomainValidationError("Invalid hostname format");
    }

    const existingDomain = await DomainModel.getByHostname(hostname);
    if (existingDomain) {
      throw new DomainConflictError("Domain already exists");
    }

    const userAlreadyHasDomain = await prisma.dominio.findFirst({
      where: { usuario_id: userId },
    });
    if (userAlreadyHasDomain) {
      throw new DomainConflictError("User already has a domain");
    }

    const verificationToken = `chop-url=${crypto.randomUUID()}`;
    const domain = await prisma.dominio.create({
      data: {
        usuario_id: userId,
        hostname,
        verification_token: verificationToken,
        status: "pending",
        ssl_status: "pending",
      },
    });
    return domain;
  }

  static async getByUserId(userId) {
    const dominio = await prisma.dominio.findMany({
      where: {
        usuario_id: userId,
      },
    });
    return dominio;
  }

  static async getById(id) {
    return await prisma.dominio.findUnique({
      where: { id },
    });
  }

  static async getByHostname(hostname) {
    return await prisma.dominio.findUnique({
      where: { hostname },
    });
  }

  static async getStatusById(id) {
    return await prisma.dominio.findUnique({
      where: { id },
      select: {
        id: true,
        usuario_id: true,
        hostname: true,
        status: true,
        sslStatus: true,
        errorMessage: true,
        verifiedAt: true,
        lastCheckedAt: true,
      },
    });
  }

  static async delete(id) {
    return await prisma.dominio.delete({
      where: { id },
    });
  }

  static async update(id, data) {
    return await prisma.dominio.update({
      where: { id },
      data,
    });
  }
}