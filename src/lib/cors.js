const DEFAULT_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

const BASE_HEADERS = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function parseAllowList() {
  const raw = process.env.CORS_ALLOW_ORIGINS || "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLocalOrigin(origin) {
  return (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin === "http://localhost" ||
    origin === "http://127.0.0.1"
  );
}

export function getCorsHeaders(req) {
  const origin = req?.headers?.get?.("origin") || "";
  const allowList = parseAllowList();
  const allowOrigin =
    (origin && (isLocalOrigin(origin) || allowList.includes(origin)) && origin) ||
    DEFAULT_ORIGIN;

  return {
    ...BASE_HEADERS,
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
  };
}

const corsHeaders = getCorsHeaders(null);

export default corsHeaders;
