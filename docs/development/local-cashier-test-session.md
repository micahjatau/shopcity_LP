# Local cashier test session

This opt-in lets developers exercise cashier earn/redeem workflows locally without pairing a physical POS. It issues a non-refreshable 15-minute smoke session bound to a clearly named `LOCAL DEV TEST POS` device that remains `UNPAIRED`.

## Safety boundary

The backend only enables this path when all of these are true:

- `NODE_ENV=development`
- `DEV_CASHIER_TEST_SESSION_ENABLED=true`
- `VERCEL_ENV` is unset
- `DATABASE_URL` uses `localhost` or `127.0.0.1`
- `SMS_PROVIDER_MODE=deterministic`
- by default, the request Origin is local HTTP (`localhost` or `127.0.0.1`)

For optional private-tailnet access, set `DEV_CASHIER_TEST_SESSION_TAILSCALE_ORIGIN` to one exact canonical HTTPS `*.ts.net` origin. Validation rejects it unless the complete local gate above passes; the cashier-session endpoint accepts only that exact origin in addition to the default loopback origins. When the backend opt-in is requested, its listener binds only to `127.0.0.1`; with the opt-in off, the existing listener behavior is unchanged. Tailnet access requires Tailscale Serve in `tailnet only` mode and a Tailscale ACL restricted to the intended devices. Never use Funnel or expose this unpaired test path to the public internet. HTTPS tailnet sessions receive Secure cookies. The web button also requires `NODE_ENV=development` and `NEXT_PUBLIC_DEV_CASHIER_TEST_SESSION_ENABLED=true`; that frontend flag is presentation-only and does not enable the backend endpoint.

Transactions created with this session are local test data. Do not point the local app at a shared, Preview, or production database. This test session is not device pairing, authenticator qualification, or production approval.

## Enable and use

1. Start the local Postgres and Redis services, and use a local development database.
2. In the backend environment, set:

   ```dotenv
   NODE_ENV=development
   DEV_CASHIER_TEST_SESSION_ENABLED=true
   DATABASE_URL=postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity?schema=public
   SMS_PROVIDER_MODE=deterministic
   ```

   Leave `VERCEL_ENV` unset.

3. In `apps/web/.env.local`, set:

   ```dotenv
   NEXT_PUBLIC_DEV_CASHIER_TEST_SESSION_ENABLED=true
   ```

4. Restart the backend and web development servers so the flags are loaded.
5. Enter an active, branch-assigned cashier email on the local login page and select **Start local cashier test session**. The backend creates or reuses the branch's active, unpaired local test POS and sets the session cookies.
6. Work through earn/redeem using local test records. The session expires after 15 minutes and cannot be refreshed; start another local test session when needed.

### Optional Tailscale-only access

1. Confirm Tailscale is connected and your Tailscale ACL admits only your intended devices.
2. Choose an unused HTTPS Serve port and set the exact browser origin in the backend environment, for example `DEV_CASHIER_TEST_SESSION_TAILSCALE_ORIGIN=https://your-device.your-tailnet.ts.net:8445`. Do not include a path or trailing slash.
3. Start the API with the local-only gates above and start the web app on loopback. Serve only the web app through Tailscale, for example: `tailscale serve --bg --https=8445 http://127.0.0.1:<WEB_PORT>`.
4. Confirm `tailscale serve status` reports `tailnet only` for that port. Do not run `tailscale funnel`; verify the app remains unavailable off-tailnet.
5. Open the exact configured HTTPS origin. This passwordless test login is then available to tailnet devices permitted by your ACL; it is not a general authentication flow.

The API and database remain loopback/local. Do not configure the Tailscale origin unless the local-only backend gates are active. The normal cashier password/WebAuthn login, Preview enrollment, and production qualification gates are unchanged. Keep this opt-in off outside local development.
