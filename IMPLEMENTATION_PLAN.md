# CEE Online — initial implementation plan

Independent of Maison Aurea and Telegram. The confirmed product rules are in `README.md`.

## Scaffold delivered

- `server/`: Node control server with one-time code issuance, first-device binding, 1–7 day durations, server-side session ticking, pause/resume based on both provider flags, and a configurable 100-session ceiling.
- Private server endpoints require a short-lived bearer token obtained by `POST /api/private/unlock`; the PIN must be a six-digit value and is never stored in source. Configure only a scrypt hash in `CEE_CREATOR_PIN_HASH`.
- `android-client/`: Android/Kotlin starter with blue/gold CEE branding, access-code entry, five-tap private-access reveal, and a provider state model that reports CEE/connection availability. The app does not expose capacity to customers.
- `server/test/`: automated tests for code lifecycle, phone binding, pause/resume, and capacity enforcement.

## API starter

- `GET /health`
- `POST /api/activate` body `{codeValue, phoneId}`
- `GET /api/sessions/:id`
- Private: `POST /api/private/unlock`, `POST /api/private/codes` body `{days}`, `POST /api/private/provider` body `{enabled, connected}`, `GET /api/private/overview`.

`provider.enabled && provider.connected` is the only condition that advances a session clock. A voluntary client disconnect does not stop the clock; the eventual transport layer must keep reporting provider state separately.

## Next phases

1. Replace the in-memory store with durable storage and creator audit records; add rate limiting, authenticated device identity, and encrypted transport.
2. Complete Android foreground-service/session polling and provider controls, with MagicOS/HONOR X5b battery/background testing.
3. Implement a real, authorized tunnel transport and test two physical Android devices end-to-end. This must not be represented as working by the scaffold.
4. Add public download page, then connect manual WhatsApp payment review and code issuance without collecting passwords, OTPs, PINs, CVVs, or payment credentials.

## Explicit boundary

No VPN/tunnel is implemented or claimed to work. A real VPS/public server or a physical second Android device is required to validate remote reachability and a two-device session; this workspace alone cannot prove that integration.
