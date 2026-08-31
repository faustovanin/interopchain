import { useEffect, useState } from "react";

import { api, TOKEN_KEY } from "./lib/api";
import AuthScreen from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";

export default function App() {
  const [patient, setPatient] = useState(null);
  const token = localStorage.getItem(TOKEN_KEY);

  useEffect(() => {
    if (!token) return;

    api("/api/patients/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setPatient(data.patient))
      .catch(() => localStorage.removeItem(TOKEN_KEY));
  }, [token]);

  return patient ? (
    <DashboardScreen
      patient={patient}
      onLogout={() => {
        localStorage.removeItem(TOKEN_KEY);
        setPatient(null);
      }}
    />
  ) : (
    <AuthScreen onLogin={setPatient} />
  );
}
