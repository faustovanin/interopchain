const { LogController, LogLevel_e } = require("../log/log-controller.js");

const logController = new LogController(process.env.LOG_LEVEL === "all" ? LogLevel_e.All : LogLevel_e.Error);

export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3002";
export const TOKEN_KEY = "interopchain_token";

export async function api(path, options = {}) {
    logController.logInfo(`API request: ${path} with options: ${JSON.stringify(options)}`);
    const response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    logController.logInfo(`API response: ${response.status} for request: ${path}`);

    const contentType = response.headers.get("content-type") || "";
    logController.logInfo(`API response content-type: ${contentType} for request: ${path}`);

    const data = contentType.includes("application/json") ? await response.json() : null;
    logController.logInfo(`API response data: ${JSON.stringify(data)} for request: ${path}`);

    if (!data) {
      logController.logError(`API request failed: ${path} with options: ${JSON.stringify(options)}`);
      throw new Error(`A API não retornou JSON (HTTP ${response.status}). Verifique se o backend está em ${API_URL}.`);
    }

    if (!response.ok) {
      logController.logError(`API request failed: ${path} with options: ${JSON.stringify(options)}`);
      throw new Error(data.error || "Ocorreu um erro.");
    }

    return data;
}
