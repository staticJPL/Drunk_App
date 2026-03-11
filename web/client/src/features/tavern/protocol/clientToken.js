const CLIENT_TOKEN_KEY = "drunk_app_client_token";

function generateClientToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateClientToken() {
  const existing = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (existing) {
    return existing;
  }

  const token = generateClientToken();
  localStorage.setItem(CLIENT_TOKEN_KEY, token);
  return token;
}

export function clearClientToken() {
  localStorage.removeItem(CLIENT_TOKEN_KEY);
}