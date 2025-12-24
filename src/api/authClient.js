// the api

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function apiRequest(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const errorMessage = data?.detail || `Error: ${res.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (err) {
    if (err.message === "Failed to fetch") {
      throw new Error("Cannot connect to server. Is the backend running?");
    }
    throw err;
  }
}

export async function signup(email, password) {
  return apiRequest("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email, password) {
  const body = new URLSearchParams();
  body.set("username", email); // OAuth2 uses 'username' even for emails
  body.set("password", password);

  const data = await apiRequest("/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (data?.access_token) {
    localStorage.setItem("token", data.access_token);
  }

  return data;
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}