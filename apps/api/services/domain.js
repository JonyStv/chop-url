
import { DomainModel } from './../models/domain.js';
import { dnsProvider as dns } from './../config/dns.js';
import { env } from './../config/env.js';

// TODO: replace with real SSL provisioning service
async function emitirCertificadoSSL(domainId) {
  console.warn(`[SSL] Stub: provisioning SSL for domain ${domainId} (not yet implemented)`);
}

const VERIFY_PREFIX = env.redirectorPrefix;
const REDIRECTOR_HOST = env.redirectorHost;

export class DomainNotFoundError extends Error {}
export class DnsError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export async function verifyDomain({ domainId, usuarioId }) {
  const domain = await DomainModel.getById(domainId);
  if (!domain || (usuarioId && domain.usuario_id !== usuarioId)) {
  throw new DomainNotFoundError();
}

  if (domain.status === 'active') {
    return { verified: true, status: 'active', domain };
  }

  // 1) TXT
  let txtOk = false;
  const expectedToken = domain.verification_token || domain.verificationToken;
  if (!expectedToken) {
  throw new Error(`Domain ${domain.id} sin verificationToken`);
}
  try {
    const records = await dns.resolveTxt(`${VERIFY_PREFIX}.${domain.hostname}`);
    const values = records.map((chunks) => chunks.join(''));
    txtOk = values.map(v => v.trim()).includes(expectedToken);;
  } catch (err) {
    await DomainModel.update(domain.id, {
      last_checked_at: new Date(),
      error_message: err.code || err.message,
    });
    throw new DnsError(err.code || 'DNS_ERROR');
  }

  if (!txtOk) {
    const updated = await DomainModel.update(domain.id, {
      status: 'pending',
      last_checked_at: new Date(),
      error_message: 'TXT no coincide todavía',
    });
    return { verified: false, status: updated.status, reason: 'TXT no coincide' };
  }

  // 2) CNAME (opcional / best-effort)
  const cnameOk = await checkCname(domain.hostname);
  if (!cnameOk) {
    const updated = await DomainModel.update(domain.id, {
      status: 'verifying',
      last_checked_at: new Date(),
      error_message: `TXT OK, pero CNAME no apunta a ${REDIRECTOR_HOST}`,
    });
    return { verified: false, status: updated.status, reason: 'CNAME pendiente' };
  }

  // 3) Activar
  const updated = await DomainModel.update(domain.id, {
    status: 'active',
    verified_at: new Date(),
    activated_at: new Date(),
    last_checked_at: new Date(),
    error_message: null,
    ssl_status: 'provisioning',
  });

  // Fire-and-forget: el service no espera
  emitirCertificadoSSL(updated.id).catch((err) =>
    console.error('[SSL] fallo:', err)
  );

  return { verified: true, status: 'active', domain: updated };
}

async function checkCname(hostname) {
  try {
    const cnames = await dns.resolveCname(hostname);
    
    return cnames.some((c) => c.toLowerCase().replace(/\.$/, "").includes(REDIRECTOR_HOST.toLowerCase().replace(/\.$/, "")));
  } catch (err) {
    // ENODATA: no hay CNAME, pero puede haber A. Verificamos A:
    if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
      try {
        const aRecords = await dns.resolve4(hostname);
        return aRecords.length > 0; // hay A, asumimos que apunta a nosotros
      } catch {
        return false; // ni CNAME ni A → no verificar
      }
    }
    return false;
  }
}