import { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
const TOKEN_KEY = "interopchain_token";

async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : null;
    if (!data) throw new Error(`A API não retornou JSON (HTTP ${response.status}). Verifique se o backend está em ${API_URL}.`);
    if (!response.ok) throw new Error(data.error || "Ocorreu um erro.");
    return data;
}

function Auth({ onLogin }) {
    const [register, setRegister] = useState(false);
    const [form, setForm] = useState({ patientIdentifier: "", fullName: "", cpf: "", cns: "", birthDate: "", sexAtBirth: "", genderIdentity: "", phone: "", email: "", password: "" });
    const [error, setError] = useState("");
    const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
    const submit = async (event) => {
        event.preventDefault(); setError("");
        try { const body = register ? form : { email: form.email, password: form.password }; const data = await api(`/api/auth/${register ? "register" : "login"}`, { method: "POST", body: JSON.stringify(body) }); localStorage.setItem(TOKEN_KEY, data.token); onLogin(data.patient); }
        catch (requestError) { setError(requestError.message); }
    };
    const input = (name, label, type = "text", required = false) => <label className="field"><span>{label}{required ? " *" : ""}</span><input name={name} type={type} value={form[name]} onChange={change} required={required} /></label>;
    return <main className="shell"><section className="intro"><p className="eyebrow">INTEROPCHAIN / SAÚDE CONECTADA</p><h1>Seus dados clínicos, sob seu controle.</h1><p>Uma identidade segura para acessar recursos FHIR com rastreabilidade.</p><div className="signal"><span>●</span> Infraestrutura protegida por KMS</div></section><section className="panel"><div className="tabs"><button className={!register ? "active" : ""} onClick={() => setRegister(false)}>Entrar</button><button className={register ? "active" : ""} onClick={() => setRegister(true)}>Criar cadastro</button></div><h2>{register ? "Crie seu perfil clínico" : "Acesse sua conta"}</h2><p className="hint">{register ? "Os campos com * são necessários." : "Use seu e-mail cadastrado para continuar."}</p><form onSubmit={submit}>{register && <div className="form-grid">{input("patientIdentifier", "Identificador do paciente", "text", true)}{input("fullName", "Nome completo", "text", true)}{input("cpf", "CPF (11 dígitos)")}{input("cns", "CNS (15 dígitos)")}{input("birthDate", "Data de nascimento", "date")}<label className="field"><span>Sexo ao nascer</span><select name="sexAtBirth" value={form.sexAtBirth} onChange={change}><option value="">Selecione</option><option>feminino</option><option>masculino</option><option>intersexo</option></select></label>{input("genderIdentity", "Identidade de gênero")}{input("phone", "Telefone")}</div>}<div className="form-grid">{input("email", "E-mail", "email", true)}{input("password", "Senha", "password", true)}</div>{error && <p className="error">{error}</p>}<button className="primary">{register ? "Criar identidade segura" : "Entrar na conta"}</button></form><p className="privacy">Senha protegida por hash. Chave KMS criada no servidor AWS.</p></section></main>;
}

function Dashboard({ patient, logout }) {
    const [resources, setResources] = useState([]);
    const [consent, setConsent] = useState(patient.consent_status);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const headers = { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` };
    useEffect(() => {
        api("/api/patients/me/resources", { headers })
            .then(async (data) => {
                const resources = await Promise.all(data.resources.map(async (item) => {
                    const decrypted = await api(`/api/patients/me/resources/${item.id}`, { headers });
                    return { ...item, resource_identifier: JSON.stringify(decrypted.resource) };
                }));
                setResources(resources);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    const updateConsent = async (status) => { try { const data = await api("/api/patients/me/consent", { method: "PATCH", headers, body: JSON.stringify({ status }) }); setConsent(data.consent.consent_status); setMessage("Consentimento atualizado."); } catch (e) { setError(e.message); } };
    return <main className="dashboard"><header className="topbar"><div><p className="eyebrow">INTEROPCHAIN / ÁREA SEGURA</p><strong>Meu espaço clínico</strong></div><button className="logout" onClick={logout}>Sair</button></header><section className="dashboard-intro"><div><p className="eyebrow">VISÃO GERAL</p><h1>Olá, {patient.full_name.split(" ")[0]}.</h1><p>Seus recursos e preferências de privacidade em um só lugar.</p></div><div className="identity"><span>IDENTIDADE</span><strong>{patient.patient_identifier}</strong><small>{patient.email}</small></div></section><section className="dashboard-grid"><div className="resources-section"><div className="section-heading"><div><p className="eyebrow">SEUS DADOS</p><h2>Recursos clínicos</h2></div><span className="count">{resources.length} recursos</span></div>{loading && <p className="empty">Carregando seus recursos...</p>}{!loading && !resources.length && <div className="empty"><strong>Nenhum recurso disponível ainda.</strong><p>Recursos processados para sua identidade aparecerão aqui.</p></div>}{resources.map((item) => <article className="resource-card" key={item.id}><div className="resource-icon">{item.resource_type[0]}</div><div className="resource-content"><div className="resource-heading"><h3>{item.resource_type}</h3><span className="status">{item.status}</span></div><p>{item.resource_identifier}</p><small>Adicionado em {new Date(item.created_at).toLocaleDateString("pt-BR")}</small></div></article>)}</div><aside className="consent-panel"><p className="eyebrow">PRIVACIDADE</p><h2>Consentimento</h2><p>Escolha se seus recursos podem participar dos fluxos autorizados.</p><div className="consent-state"><span></span><strong>{consent === "granted" ? "Consentimento concedido" : consent === "revoked" ? "Consentimento revogado" : "Aguardando decisão"}</strong></div><div className="consent-actions"><button className={consent === "granted" ? "selected" : ""} onClick={() => updateConsent("granted")}>Conceder</button><button className={consent === "revoked" ? "selected" : ""} onClick={() => updateConsent("revoked")}>Revogar</button></div>{message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}<small>Você pode alterar essa escolha a qualquer momento.</small></aside></section></main>;
}

export default function App() {
    const [patient, setPatient] = useState(null);
    const token = localStorage.getItem(TOKEN_KEY);
    useEffect(() => { if (token) api("/api/patients/me", { headers: { Authorization: `Bearer ${token}` } }).then((data) => setPatient(data.patient)).catch(() => localStorage.removeItem(TOKEN_KEY)); }, [token]);
    return patient ? <Dashboard patient={patient} logout={() => { localStorage.removeItem(TOKEN_KEY); setPatient(null); }} /> : <Auth onLogin={setPatient} />;
}
