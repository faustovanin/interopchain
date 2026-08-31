import { useEffect, useMemo, useState } from "react";

import { api, TOKEN_KEY } from "../lib/api";

const MENU_ITEMS = [
  { key: "profile", label: "Perfil" },
  { key: "data", label: "Dados" },
  { key: "consent", label: "Consentimento" },
];

function formatResourceTitle(resource) {
  if (!resource || typeof resource !== "object") return "Dado clínico";

  if (resource.resourceType) {
    return resource.resourceType;
  }

  if (resource.type) {
    return resource.type;
  }

  if (resource.code?.text) {
    return resource.code.text;
  }

  if (resource.identifier?.value) {
    return resource.identifier.value;
  }

  return "Dado clínico";
}

function SafeJsonViewer({ value, title }) {
  const parsed = useMemo(() => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  }, [value]);

  const text = typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);

  return (
    <div className="modal-panel">
      <div className="modal-header">
        <div>
          <p className="eyebrow">DETALHE DO DADO</p>
          <h3>{title}</h3>
        </div>
      </div>
      <pre className="resource-detail">{text}</pre>
    </div>
  );
}

export default function DashboardScreen({ patient, onLogout }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [consent, setConsent] = useState(patient.consent_status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const headers = { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` };

  useEffect(() => {
    api("/api/patients/me/resources", { headers })
      .then(async (data) => {
        const nextResources = await Promise.all(
          data.resources.map(async (item) => {
            const decrypted = await api(`/api/patients/me/resources/${item.id}`, { headers });
            return {
              ...item,
              resource_identifier: JSON.stringify(decrypted.resource ?? decrypted),
              resource_title: formatResourceTitle(decrypted.resource ?? decrypted),
            };
          })
        );

        setResources(nextResources);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateConsent = async (status) => {
    try {
      const data = await api("/api/patients/me/consent", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      setConsent(data.consent.consent_status);
      setMessage("Consentimento atualizado.");
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCloseModal = () => setSelectedResource(null);

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <p className="eyebrow">INTEROPCHAIN</p>
          <h2>Meu espaço</h2>
        </div>

        <nav className="side-nav" aria-label="Menu do dashboard">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activeTab === item.key ? "nav-item active" : "nav-item"}
              onClick={() => setActiveTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="logout" type="button" onClick={onLogout}>
          Sair
        </button>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">ÁREA SEGURA</p>
            <strong>Meu espaço clínico</strong>
          </div>
        </header>

        {activeTab === "profile" && (
          <div className="content-panel profile-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">VISÃO GERAL</p>
                <h1>Olá, {patient.full_name.split(" ")[0]}.</h1>
              </div>
              <div className="identity-box">
                <span>IDENTIDADE</span>
                <strong>{patient.patient_identifier}</strong>
                <small>{patient.email}</small>
              </div>
            </div>

            <div className="profile-details">
              <div>
                <span>Nome completo</span>
                <strong>{patient.full_name}</strong>
              </div>
              <div>
                <span>E-mail</span>
                <strong>{patient.email}</strong>
              </div>
              <div>
                <span>CPF</span>
                <strong>{patient.cpf || "Não informado"}</strong>
              </div>
              <div>
                <span>CNS</span>
                <strong>{patient.cns || "Não informado"}</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === "data" && (
          <div className="content-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">SEUS DADOS</p>
                <h2>Recursos clínicos</h2>
              </div>
              <span className="count">{resources.length} recursos</span>
            </div>

            {loading && <p className="empty">Carregando seus recursos...</p>}

            {!loading && !resources.length && (
              <div className="empty-state">
                <strong>Nenhum recurso disponível ainda.</strong>
                <p>Recursos processados para sua identidade aparecerão aqui.</p>
              </div>
            )}

            {!loading && resources.length > 0 && (
              <div className="resource-list">
                {resources.map((item) => (
                  <button
                    type="button"
                    className="resource-row"
                    key={item.id}
                    onClick={() => setSelectedResource(item)}
                  >
                    <span className="resource-icon">{item.resource_type ? item.resource_type[0] : "D"}</span>
                    <span className="resource-name">{item.resource_title || item.resource_type || "Dado clínico"}</span>
                    <span className="resource-meta">Abrir</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "consent" && (
          <div className="content-panel consent-panel">
            <p className="eyebrow">PRIVACIDADE</p>
            <h2>Consentimento</h2>
            <p>Escolha se seus recursos podem participar dos fluxos autorizados.</p>

            <div className="consent-state">
              <span></span>
              <strong>
                {consent === "granted"
                  ? "Consentimento concedido"
                  : consent === "revoked"
                    ? "Consentimento revogado"
                    : "Aguardando decisão"}
              </strong>
            </div>

            <div className="consent-actions">
              <button type="button" className={consent === "granted" ? "selected" : ""} onClick={() => updateConsent("granted")}>
                Conceder
              </button>
              <button type="button" className={consent === "revoked" ? "selected" : ""} onClick={() => updateConsent("revoked")}>
                Revogar
              </button>
            </div>

            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}
            <small>Você pode alterar essa escolha a qualquer momento.</small>
          </div>
        )}
      </section>

      {selectedResource && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-button" onClick={handleCloseModal} aria-label="Fechar detalhamento">
              ×
            </button>
            <SafeJsonViewer value={selectedResource.resource_identifier} title={selectedResource.resource_title || selectedResource.resource_type || "Dado clínico"} />
          </div>
        </div>
      )}
    </main>
  );
}
