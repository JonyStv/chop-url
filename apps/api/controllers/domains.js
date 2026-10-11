import {DomainModel, DomainValidationError, DomainConflictError} from "../models/domain.js";
import * as domainService from "../services/domain.js";
import {env} from "../config/env.js";

export class DomainController {
  static async getByUserId(req, res) {
    const { userid } = req.params;
    if (req.user && req.user.id !== userid) {
      return res.status(403).json({ error: "No puedes consultar dominios de otro usuario." });
    }
    const domains = await DomainModel.getByUserId(userid);
    return res.json(domains);
  }

  static async getDomainStatus(req, res) {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    const domain = await DomainModel.getStatusById(id);
    if (!domain || (usuarioId && domain.usuario_id !== usuarioId)) {
      return res.status(404).json({ message: 'Dominio no encontrado' });
    }
    return res.json({ status: domain.status, ssl_status: domain.ssl_status });
  }

  static async create(req, res) {
    const userId = req.user?.id ?? req.body.userId;
    const { hostname } = req.body;
    try {
      const domain = await DomainModel.create({ hostname, userId });
      return res.status(201).json({
        domain,
        dnsInstructions: {
          step1_txt: {
            type: "TXT",
            name: `${env.redirectorPrefix}.${hostname}`,
            value: domain.verification_token,
          },
          step2_cname: {
            type: "CNAME",
            name: hostname,
            value: env.redirectorHost,
          },
          note: 'Puede tardar hasta 48 horas en propagarse. Una vez propagado, haga clic en "Verificar dominio" para completar la verificación.',
        },
      });
    } catch (err) {
      if (err instanceof DomainValidationError) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof DomainConflictError) {
        return res.status(409).json({ error: err.message });
      }
      console.error('[create domain]', err);
      return res.status(500).json({ error: 'Error interno' });
    }
  }
  static async verifyDomain(req, res) {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    try {
      const result = await domainService.verifyDomain({
        domainId: id,
        usuarioId,
      });

      // 200 si activo/verificado, 202 si aún pendiente
      const status = result.verified ? 200 : 202;
      return res.status(status).json(result);
  } catch (err) {
    if (err instanceof domainService.DomainNotFoundError) {
      return res.status(404).json({ message: 'Dominio no encontrado' });
    }
    if (err instanceof domainService.DnsError) {
      return res.status(202).json({ verified: false, reason: err.code });
    }
    console.error('[verifyDomain]', err);
    return res.status(500).json({ message: 'Error interno' });
  }
  };
  static async delete(req, res) {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    const domain = await DomainModel.getById(id);
    if (!domain || (usuarioId && domain.usuario_id !== usuarioId)) {
      return res.status(404).json({ message: 'Dominio no encontrado' });
    }
    const deletedDomain = await DomainModel.delete(id);
    return res.status(200).json({ message: 'Dominio eliminado', domain: deletedDomain });
  }
}