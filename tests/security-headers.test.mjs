import assert from "node:assert/strict";
import test from "node:test";

import { getSecurityHeaders } from "../utils/security-headers.ts";

test("getSecurityHeaders sets baseline headers and same-origin CORP for app routes", () => {
  const headers = getSecurityHeaders("/search?q=%E9%A3%B2%E8%8C%B6");

  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(
    headers["Permissions-Policy"],
    "camera=(), geolocation=(), microphone=()",
  );
  assert.equal(
    headers["Cross-Origin-Opener-Policy"],
    "same-origin-allow-popups",
  );
  assert.equal(headers["Cross-Origin-Resource-Policy"], "same-origin");
  assert.equal(
    headers["Content-Security-Policy"],
    "frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
  );
});

test("getSecurityHeaders sets cross-origin CORP for shared assets and TTS paths", () => {
  assert.equal(
    getSecurityHeaders("/og.png?v=1")["Cross-Origin-Resource-Policy"],
    "cross-origin",
  );
  assert.equal(
    getSecurityHeaders("/favicon.svg")["Cross-Origin-Resource-Policy"],
    "cross-origin",
  );
  assert.equal(
    getSecurityHeaders("/tts/manifest.v1.json")["Cross-Origin-Resource-Policy"],
    "cross-origin",
  );
});
