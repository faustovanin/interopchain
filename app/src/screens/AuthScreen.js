import { useState } from "react";

import { api, TOKEN_KEY } from "../lib/api";

export default function AuthScreen({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({
    patientIdentifier: "",
    fullName: "",
    cpf: "",
    cns: "",
    birthDate: "",
    sexAtBirth: "",
    genderIdentity: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const change = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const body = register ? form : { email: form.email, password: form.password };
      const data = await api(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin(data.patient);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const input = (name, label, type = "text", required = false) => (
    <label className="field" key={name}>
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input name={name} type={type} value={form[name]} onChange={change} required={required} />
    </label>
  );

  return (
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">INTEROPCHAIN / SAÚDE CONECTADA</p>
        <h1>Seus dados clínicos, sob seu controle.</h1>
        <p>Uma identidade segura para acessar recursos FHIR com rastreabilidade.</p>
        <div className="signal">
          <span>●</span> Infraestrutura protegida por KMS
        </div>
      </section>

      <section className="panel">
        <div className="tabs">
          <button className={!register ? "active" : ""} onClick={() => setRegister(false)}>
            Entrar
          </button>
          <button className={register ? "active" : ""} onClick={() => setRegister(true)}>
            Criar cadastro
          </button>
        </div>

        <h2>{register ? "Crie seu perfil clínico" : "Acesse sua conta"}</h2>
        <p className="hint">
          {register ? "Os campos com * são necessários." : "Use seu e-mail cadastrado para continuar."}
        </p>

        <form onSubmit={submit}>
          {register && (
            <div className="form-grid">
              {input("patientIdentifier", "Identificador do paciente", "text", true)}
              {input("fullName", "Nome completo", "text", true)}
              {input("cpf", "CPF (11 dígitos)")}
              {input("cns", "CNS (15 dígitos)")}
              {input("birthDate", "Data de nascimento", "date")}
              <label className="field">
                <span>Sexo ao nascer</span>
                <select name="sexAtBirth" value={form.sexAtBirth} onChange={change}>
                  <option value="">Selecione</option>
                  <option value="feminino">feminino</option>
                  <option value="masculino">masculino</option>
                  <option value="intersexo">intersexo</option>
                </select>
              </label>
              {input("genderIdentity", "Identidade de gênero")}
              {input("phone", "Telefone")}
            </div>
          )}

          <div className="form-grid">
            {input("email", "E-mail", "email", true)}
            {input("password", "Senha", "password", true)}
          </div>

          {error && <p className="error">{error}</p>}

          <button className="primary" type="submit">
            {register ? "Criar identidade segura" : "Entrar na conta"}
          </button>
        </form>

        <p className="privacy">Senha protegida por hash. Chave KMS criada no servidor AWS.</p>
      </section>
    </main>
  );
}
