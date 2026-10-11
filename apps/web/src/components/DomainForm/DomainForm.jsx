import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { apiJson, apiFetch } from "../../config/api";
import "./DomainForm.css";

const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,11}$/;

export default function DomainForm() {
  const { user, accessToken } = useAuthStore();
  const notify = useNotificationStore((s) => s.notify);

  const [domain, setDomain] = useState(null);
  const [hostnameInput, setHostnameInput] = useState("");
  const [dnsInstructions, setDnsInstructions] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchUserDomain = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const domains = await apiJson(`/domains/user/${user.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (Array.isArray(domains) && domains.length > 0) {
        setDomain(domains[0]);
      } else {
        setDomain(null);
      }
    } catch (error) {
      console.error("Error al cargar dominio:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, accessToken]);

  useEffect(() => {
    fetchUserDomain();
  }, [fetchUserDomain]);

  const handleCopy = (text, key) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleCreateDomain = async (e) => {
    e.preventDefault();
    const cleanHostname = hostnameInput
      .trim()
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .replace(/\/$/, "");

    if (!cleanHostname) {
      notify("Por favor, introduce un nombre de dominio.", "error");
      return;
    }

    if (!DOMAIN_REGEX.test(cleanHostname)) {
      notify("El formato del dominio no es válido (ej: enlaces.midominio.com).", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch("/domains", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          hostname: cleanHostname,
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Error al crear el dominio");
      }

      setDomain(data.domain);
      if (data.dnsInstructions) {
        setDnsInstructions(data.dnsInstructions);
      }
      setHostnameInput("");
      notify("Dominio registrado. Ahora debes configurar tus registros DNS.", "success");
    } catch (error) {
      console.error("Error creando dominio:", error);
      notify(error.message || "Error al registrar el dominio.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!domain?.id) return;
    setIsVerifying(true);
    try {
      const response = await apiFetch(`/domains/${domain.id}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();

      if (response.status === 200 && data.verified) {
        notify("¡Dominio verificado y activado con éxito!", "success");
        setDomain(data.domain || { ...domain, status: "active" });
      } else if (response.status === 202 || !data.verified) {
        const reason = data.reason || data.message || "Registros DNS aún no detectados.";
        notify(`Verificación pendiente: ${reason}`, "info");
        await checkStatus();
      } else {
        notify(data.message || "No se pudo verificar el dominio.", "error");
      }
    } catch (error) {
      console.error("Error verificando dominio:", error);
      notify(error.message || "Error al intentar verificar el dominio.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const checkStatus = async () => {
    if (!domain?.id) return;
    try {
      const statusData = await apiJson(`/domains/${domain.id}/status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setDomain((prev) => ({
        ...prev,
        status: statusData.status,
        sslStatus: statusData.sslStatus,
      }));
    } catch (error) {
      console.error("Error al consultar estado:", error);
    }
  };

  const handleDelete = async () => {
    if (!domain?.id) return;
    const confirmed = await notify.confirm(
      `¿Estás seguro de que deseas eliminar el dominio "${domain.hostname}"? Los enlaces asociados dejarán de funcionar.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/domains/${domain.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error al eliminar el dominio");
      }

      setDomain(null);
      setDnsInstructions(null);
      notify("Dominio eliminado correctamente.", "success");
    } catch (error) {
      console.error("Error eliminando dominio:", error);
      notify(error.message || "No se pudo eliminar el dominio.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (status) => {
    const s = String(status || "pending").toLowerCase();
    switch (s) {
      case "active":
        return <span className="domain-badge domain-badge-success">Activo</span>;
      case "verifying":
        return <span className="domain-badge domain-badge-warning">Propagando DNS</span>;
      case "error":
        return <span className="domain-badge domain-badge-danger">Error DNS</span>;
      default:
        return <span className="domain-badge domain-badge-pending">Pendiente de verificación</span>;
    }
  };

  const renderSslBadge = (ssl) => {
    const s = String(ssl || "pending").toLowerCase();
    switch (s) {
      case "active":
        return <span className="domain-badge domain-badge-success">SSL Activo</span>;
      case "provisioning":
        return <span className="domain-badge domain-badge-warning">SSL Generando</span>;
      case "failed":
        return <span className="domain-badge domain-badge-danger">SSL Fallido</span>;
      default:
        return <span className="domain-badge domain-badge-pending">SSL Pendiente</span>;
    }
  };

  if (loading) {
    return (
      <div className="domain-form-wrapper">
        <div className="domain-loading">Cargando configuración de dominio...</div>
      </div>
    );
  }

  const verificationToken = domain?.verification_token || domain?.verificationToken;
  const hostname = domain?.hostname;

  return (
    <div className="domain-form-wrapper">
      <header className="domain-header">
        <div className="domain-header-titles">
          <h3>Dominio Personalizado</h3>
          <p>
            Usa tu propia marca y dominio personalizado para acortar y redirigir tus enlaces.
          </p>
        </div>
      </header>

      {!domain ? (
        <div className="domain-create-card">
          <form onSubmit={handleCreateDomain} className="domain-input-form">
            <div className="domain-input-group">
              <div className="domain-input-row">
                <input
                  type="text"
                  id="customDomain"
                  name="customDomain"
                  placeholder="dominio.tuweb.com"
                  value={hostnameInput}
                  onChange={(e) => setHostnameInput(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="domain-button domain-button-primary"
                  disabled={isSubmitting || !hostnameInput.trim()}
                >
                  {isSubmitting ? "Registrando..." : "Añadir Dominio"}
                </button>
              </div>
            </div>
          </form>
          <div className="domain-help-box">
            <span className="domain-help-icon">ℹ</span>
            <p>
              Recomendamos usar un subdominio como <strong>link.tudominio.com</strong> o <strong>go.tudominio.com</strong> para apuntar tus enlaces sin interferir con tu web principal.
            </p>
          </div>
        </div>
      ) : (
        <div className="domain-management-card">
          <div className="domain-overview-header">
            <div className="domain-main-info">
              <div className="domain-title-row">
                <span className="domain-hostname">{domain.hostname}</span>
                {renderStatusBadge(domain.status)}
                {renderSslBadge(domain.sslStatus || domain.ssl_status)}
              </div>
              <p className="domain-subtext">
                {domain.status === "active"
                  ? "Tu dominio está verificado y listo para redirigir enlaces acortados."
                  : "Configura los siguientes registros en el panel DNS de tu proveedor de dominio para completar la validación."}
              </p>
            </div>

            <div className="domain-card-actions">
              <button
                type="button"
                className="domain-button domain-button-secondary"
                onClick={checkStatus}
                title="Comprobar estado actual en el sistema"
              >
                Actualizar Estado
              </button>
              <button
                type="button"
                className="domain-button domain-button-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>

          {domain.status !== "active" && (
            <div className="domain-dns-instructions">
              <h4 className="domain-dns-title">Registros DNS requeridos</h4>
              <p className="domain-dns-desc">
                Accede al panel de control de tu registrador DNS (ej: Cloudflare, GoDaddy, Namecheap) y añade estos registros:
              </p>

              <div className="dns-records-table">
                <div className="dns-record-row dns-record-header">
                  <span>Tipo</span>
                  <span>Nombre / Host</span>
                  <span>Valor / Destino</span>
                  <span></span>
                </div>

                {/* TXT Record */}
                <div className="dns-record-row">
                  <span className="dns-type">TXT</span>
                  <div className="dns-cell-with-copy">
                    <code>{dnsInstructions?.step1_txt?.name || `chop-url.${hostname}`}</code>
                    <button
                      type="button"
                      className="dns-copy-btn"
                      onClick={() =>
                        handleCopy(
                          dnsInstructions?.step1_txt?.name || `chop-url.${hostname}`,
                          "txt-name"
                        )
                      }
                    >
                      {copiedKey === "txt-name" ? "✓" : "Copiar"}
                    </button>
                  </div>
                  <div className="dns-cell-with-copy">
                    <code className="dns-token-code">
                      {dnsInstructions?.step1_txt?.value || verificationToken}
                    </code>
                    <button
                      type="button"
                      className="dns-copy-btn"
                      onClick={() =>
                        handleCopy(
                          dnsInstructions?.step1_txt?.value || verificationToken,
                          "txt-val"
                        )
                      }
                    >
                      {copiedKey === "txt-val" ? "✓" : "Copiar"}
                    </button>
                  </div>
                </div>

                {/* CNAME Record */}
                <div className="dns-record-row">
                  <span className="dns-type">CNAME</span>
                  <div className="dns-cell-with-copy">
                    <code>{dnsInstructions?.step2_cname?.name || hostname}</code>
                    <button
                      type="button"
                      className="dns-copy-btn"
                      onClick={() =>
                        handleCopy(dnsInstructions?.step2_cname?.name || hostname, "cname-name")
                      }
                    >
                      {copiedKey === "cname-name" ? "✓" : "Copiar"}
                    </button>
                  </div>
                  <div className="dns-cell-with-copy">
                    <code>{dnsInstructions?.step2_cname?.value || "chop-url.com"}</code>
                    <button
                      type="button"
                      className="dns-copy-btn"
                      onClick={() =>
                        handleCopy(
                          dnsInstructions?.step2_cname?.value || "chop-url.com",
                          "cname-val"
                        )
                      }
                    >
                      {copiedKey === "cname-val" ? "✓" : "Copiar"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="domain-verify-footer">
                <p className="domain-verify-note">
                  La propagación de DNS puede demorar desde unos minutos hasta 48 horas según el proveedor.
                </p>
                <button
                  type="button"
                  className="domain-button domain-button-primary domain-verify-action-btn"
                  onClick={handleVerify}
                  disabled={isVerifying}
                >
                  {isVerifying ? "Verificando DNS..." : "Verificar Dominio"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}