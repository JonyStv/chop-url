import { DomainModel } from '../models/domain.js';
import { env } from '../config/env.js';

const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';

/**
 * Emite / solicita el aprovisionamiento de un certificado SSL
 * para un dominio personalizado a través de Cloudflare for SaaS (Custom Hostnames).
 * 
 * Si no hay credenciales de Cloudflare en desarrollo, realiza un fallback seguro.
 *
 * @param {string} domainId - ID del dominio en la base de datos
 */
export async function emitirCertificadoSSL(domainId) {
  const domain = await DomainModel.getById(domainId);
  if (!domain) {
    throw new Error(`Dominio con ID ${domainId} no encontrado.`);
  }

  const { hostname } = domain;
  const token = env.cloudflareApiToken;
  const zoneId = env.cloudflareZoneId;

  // Si no hay configuración de Cloudflare (ej. en desarrollo local sin credenciales),
  // simulamos el aprovisionamiento para no bloquear el flujo.
  if (!token || !zoneId) {
    console.warn(
      `[SSL] CLOUDFLARE_API_TOKEN o CLOUDFLARE_ZONE_ID no configurados. Simulando SSL para "${hostname}".`
    );
    await DomainModel.update(domainId, {
      ssl_status: 'active',
      error_message: null,
    });
    return {
      status: 'active',
      simulated: true,
      hostname,
    };
  }

  // 1. Marcar como aprovisionando en base de datos
  await DomainModel.update(domainId, {
    ssl_status: 'provisioning',
    error_message: null,
  });

  try {
    // 2. Comprobar si ya existe en Cloudflare para evitar duplicados
    const searchRes = await fetch(
      `${CLOUDFLARE_API_URL}/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const searchData = await searchRes.json();
    let customHostname = searchData.result?.[0];

    // 3. Si no existe, creamos el Custom Hostname en Cloudflare
    if (!customHostname) {
      const createRes = await fetch(
        `${CLOUDFLARE_API_URL}/zones/${zoneId}/custom_hostnames`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hostname,
            ssl: {
              method: 'http',
              type: 'dv',
              settings: {
                min_tls_version: '1.2',
                http2: 'on',
              },
            },
          }),
        }
      );

      const createData = await createRes.json();

      if (!createRes.ok || !createData.success) {
        const errorMsg =
          createData.errors?.[0]?.message || 'Error al crear el Custom Hostname en Cloudflare.';
        console.error('[SSL] Cloudflare Error:', createData.errors);

        await DomainModel.update(domainId, {
          ssl_status: 'failed',
          error_message: errorMsg,
        });

        throw new Error(errorMsg);
      }

      customHostname = createData.result;
    }

    // 4. Determinar el estado del certificado SSL
    const sslStatusFromCF = customHostname.ssl?.status || 'pending_validation';
    const sslStatusMapped = mapCloudflareSslStatus(sslStatusFromCF);

    await DomainModel.update(domainId, {
      ssl_status: sslStatusMapped,
      error_message: sslStatusMapped === 'failed' ? 'Validación SSL rechazada en Cloudflare.' : null,
    });

    console.info(`[SSL] Hostname "${hostname}" registrado en Cloudflare. Estado SSL: ${sslStatusMapped}`);

    return {
      status: sslStatusMapped,
      customHostnameId: customHostname.id,
      cfStatus: sslStatusFromCF,
      hostname,
    };
  } catch (error) {
    console.error(`[SSL] Error aprovisionando certificado para ${hostname}:`, error);

    await DomainModel.update(domainId, {
      ssl_status: 'failed',
      error_message: error.message,
    });

    throw error;
  }
}

/**
 * Consulta el estado actual del certificado SSL en Cloudflare y actualiza la BD.
 *
 * @param {string} domainId
 */
export async function consultarEstadoSSL(domainId) {
  const domain = await DomainModel.getById(domainId);
  if (!domain) return null;

  const { hostname } = domain;
  const token = env.cloudflareApiToken;
  const zoneId = env.cloudflareZoneId;

  if (!token || !zoneId) {
    return { status: domain.ssl_status, simulated: true };
  }

  try {
    const res = await fetch(
      `${CLOUDFLARE_API_URL}/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await res.json();
    const customHostname = data.result?.[0];

    if (!customHostname) {
      return { status: domain.ssl_status, notFoundInCf: true };
    }

    const sslStatusMapped = mapCloudflareSslStatus(customHostname.ssl?.status);

    if (sslStatusMapped !== domain.ssl_status) {
      await DomainModel.update(domainId, {
        ssl_status: sslStatusMapped,
      });
    }

    return {
      status: sslStatusMapped,
      cfStatus: customHostname.ssl?.status,
      sslDetails: customHostname.ssl,
    };
  } catch (error) {
    console.error(`[SSL] Error consultando estado en Cloudflare para ${hostname}:`, error);
    return { status: domain.ssl_status, error: error.message };
  }
}

/**
 * Mapea los estados de Cloudflare a los estados definidos en el modelo de base de datos
 * ('pending' | 'provisioning' | 'active' | 'failed')
 */
function mapCloudflareSslStatus(cfStatus) {
  switch (cfStatus) {
    case 'active':
      return 'active';
    case 'pending_validation':
    case 'pending_issuance':
    case 'pending_deployment':
    case 'initializing':
      return 'provisioning';
    case 'timed_out':
    case 'expired':
    case 'deleted':
      return 'failed';
    default:
      return 'pending';
  }
}

