// domain.service.js
import { DomainModel } from './../models/domain.js';
import { dnsProvider as dns } from './../config/dns.js';

// TODO: replace with real SSL provisioning service
async function emitirCertificadoSSL(domainId) {
  console.warn(`[SSL] Stub: provisioning SSL for domain ${domainId} (not yet implemented)`);
}

const VERIFY_PREFIX = 'chop-url';
const REDIRECTOR_HOST = 'chop-url.com';

export class DomainNotFoundError extends Error {}
export class DnsError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export async function verifyDomain({ domainId, usuarioId }) {
  const domain = await DomainModel.getById(domainId);
  if (!domain) throw new DomainNotFoundError();

  if (domain.status === 'active') {
    return { verified: true, status: 'active', domain };
  }

  // 1) TXT
  let txtOk = false;
  const expectedToken = domain.verification_token || domain.verificationToken;
  try {
    const records = await dns.resolveTxt(`${VERIFY_PREFIX}.${domain.hostname}`);
    txtOk = records.flat().includes(expectedToken);
  } catch (err) {
    await DomainModel.update(domain.id, {
      lastCheckedAt: new Date(),
      errorMessage: err.code || err.message,
    });
    throw new DnsError(err.code || 'DNS_ERROR');
  }

  if (!txtOk) {
    const updated = await DomainModel.update(domain.id, {
      status: 'pending',
      lastCheckedAt: new Date(),
      errorMessage: 'TXT no coincide todavía',
    });
    return { verified: false, status: updated.status, reason: 'TXT no coincide' };
  }

  // 2) CNAME (opcional / best-effort)
  const cnameOk = await checkCname(domain.hostname);
  if (!cnameOk) {
    const updated = await DomainModel.update(domain.id, {
      status: 'verifying',
      lastCheckedAt: new Date(),
      errorMessage: 'TXT OK, pero CNAME no apunta a redirector.miapp.com',
    });
    return { verified: false, status: updated.status, reason: 'CNAME pendiente' };
  }

  // 3) Activar
  const updated = await DomainModel.update(domain.id, {
    status: 'active',
    verifiedAt: new Date(),
    activatedAt: new Date(),
    lastCheckedAt: new Date(),
    errorMessage: null,
    sslStatus: 'provisioning',
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
    return cnames.some((c) => c.includes(REDIRECTOR_HOST));
  } catch {
    // Sin CNAME (A directo u otro): no bloqueamos
    return true;
  }
}