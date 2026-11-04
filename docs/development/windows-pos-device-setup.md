# Windows POS device setup and pairing

This guide records the Windows workstation setup and production POS pairing troubleshooting completed in this session. It contains no passwords, device-token cookies, or secret values.

## 1. Install and verify Node.js

### What happened

- `nvm list releases` and `nvm install` timed out fetching `https://nodejs.org/dist/index.tab` with a three-second manifest-fetch budget, even though TCP port 443 was reachable.
- `Invoke-WebRequest` initially failed because Windows PowerShell attempted to use the Internet Explorer parser. Adding `-UseBasicParsing` fixed that.
- `winget` was not installed/available on the machine.
- The release-list script selected Node.js `v26.13.0` (latest LTS at the time). The MSI downloaded successfully.
- Starting the MSI directly with `Start-Process $msi` failed because Windows had no `.msi` file association. `msiexec.exe` is the correct launcher. A subsequent reinstall attempt returned `1602` (cancelled), but Node and npm were already installed and worked from their direct paths.
- `nvm`'s shim took precedence for `node`; direct Node.js installation worked from `C:\Program Files\nodejs`.

### Commands that worked

To check connectivity and fetch Node's release list in Windows PowerShell 5.1:

```powershell
Test-NetConnection nodejs.org -Port 443
Invoke-WebRequest https://nodejs.org/dist/index.tab -TimeoutSec 20 -UseBasicParsing
```

To download the current LTS Windows MSI by parsing the tab-separated release list:

```powershell
$rows = (Invoke-WebRequest https://nodejs.org/dist/index.tab -UseBasicParsing).Content -split "`r?`n"
$release = $rows | ConvertFrom-Csv -Delimiter "`t" |
  Where-Object { $_.lts -and $_.lts -ne "-" } |
  Select-Object -First 1
$version = $release.version.Trim()

$url = "https://nodejs.org/dist/$version/node-$version-x64.msi"
$msi = Join-Path $env:TEMP "node-$version-x64.msi"
Invoke-WebRequest $url -UseBasicParsing -OutFile $msi -ErrorAction Stop
Start-Process msiexec.exe -ArgumentList "/i `"$msi`"" -Wait -Verb RunAs
```

The installed executables were verified directly:

```powershell
& "$env:ProgramFiles\nodejs\node.exe" --version
& "$env:ProgramFiles\nodejs\npm.cmd" --version
```

Observed versions were Node.js `v26.13.0` and npm `11.20.0`.

## 2. Fix PATH and use Windows command shims

PowerShell resolved `npm.ps1` and `vercel.ps1`, which were blocked by the machine's execution policy. No policy change was needed: call the `.cmd` shims instead.

The following was added to the user's persistent PATH:

```powershell
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$add = @("$env:ProgramFiles\nodejs", "$env:APPDATA\npm")
$newPath = (@($userPath -split ';') + $add | Where-Object { $_ } | Select-Object -Unique) -join ';'
[Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
```

For the current session, prepend the same directories when needed:

```powershell
$env:Path = "$env:ProgramFiles\nodejs;$env:APPDATA\npm;$env:Path"
```

Close and reopen PowerShell after a persistent PATH change. Verify with:

```powershell
node --version
npm.cmd --version
vercel.cmd --version
```

If PowerShell still selects `npm.ps1`, explicitly invoke `npm.cmd`:

```powershell
& "$env:ProgramFiles\nodejs\npm.cmd" --version
```

## 3. Install and authenticate Vercel CLI

The CLI was installed globally and authenticated to the `micahjatau` team account. Use the `.cmd` shim in PowerShell:

```powershell
& "$env:ProgramFiles\nodejs\npm.cmd" install --global vercel
& "$env:APPDATA\npm\vercel.cmd" login
& "$env:APPDATA\npm\vercel.cmd" whoami
```

The verified account was `micman009-7846`; the CLI reported version `65.7.0`. Do not paste Vercel tokens or credentials into chat.

## 4. Understand the server key versus a device credential

- `POS_DEVICE_TOKEN_HMAC_KEY` is a server-side key, not a value to type into the POS or into the pairing page. The API uses it to hash/verify credentials.
- Each paired browser receives a separate random device credential in a Secure, HttpOnly cookie. It is not displayed and must not be copied or exported.
- The deployment uses one active HMAC key for all device-token credentials; it is not one key per device.
- The production API already had `POS_DEVICE_TOKEN_HMAC_KEY` configured when a later add attempt returned “already exists.” Do not add `--force`, generate a replacement, or rotate it just to pair another device. Key replacement invalidates existing device credentials; see [`../runbooks/pos-device-token-credentials.md`](../runbooks/pos-device-token-credentials.md).

The earlier attempts to add the key failed because a Preview variable was incorrectly scoped to `master`, and a Production variable was given `--git-branch master`. Vercel does not allow a production branch as a Preview-only branch variable, and Production variables must not have `--git-branch`.

## 5. Production configuration and pairing-origin fix

Production projects involved:

- Frontend: `shopcity-lp` (`https://shopcity-lp.vercel.app`)
- API: `shopcity-api` (`https://shopcity-api.vercel.app`)

Pairing requests were reaching the frontend but returning HTTP 403. The API's pairing-origin check allowed the staging frontend origin, not the production frontend origin. The production API was fixed by setting this production environment variable:

```text
POS_DEVICE_TOKEN_PAIRING_ORIGINS=https://shopcity-lp.vercel.app
```

The existing production API artifact was redeployed with Vercel CLI; no app code commit or push was needed for this configuration fix. Deployment became Ready and `/health/ready` reported the database and Redis as up.

If an API redeploy is needed after an environment change, use:

```powershell
& "$env:APPDATA\npm\vercel.cmd" redeploy https://shopcity-api.vercel.app --target production
```

Do not use this command to rotate the HMAC key. Environment changes apply to new/redeployed deployments, not already running ones.

## 6. Pair the Windows POS browser

Pairing is performed in the ShopCity UI, not with a command-line-generated device token:

1. Open `https://shopcity-lp.vercel.app` in the actual Windows POS browser.
2. Sign in as an active same-tenant Admin, or a Supervisor assigned to the device's branch.
3. Open **Devices** from the supervisor/admin interface.
4. Create an unpaired device for the correct branch if one does not already exist. Otherwise select the intended active, unpaired device.
5. Click **Pair this target POS browser** and confirm that this is the authorized target browser.
6. Keep the same browser and site data. The browser receives its credential in the HttpOnly cookie; there is no token to copy. Pairing an already paired device replaces the credential and invalidates its prior device sessions.
7. Sign in as the cashier on that same Windows browser.

There is no Device Token/WebAuthn selector for a new unpaired device. The ordinary pairing action uses **Device Token** by default. Separate WebAuthn migration/rotation actions appear only for devices already in the applicable legacy/WebAuthn mode. The repository's WebAuthn qualification register says production WebAuthn remains NO-GO; do not choose WebAuthn for this production setup.

## 7. Result

The production pairing-origin setting was deployed, the API readiness check passed, the user confirmed device pairing succeeded, and the user subsequently confirmed logging in as a cashier. No device cookie or secret value was recorded here.

## Troubleshooting reminders

- If `nvm` reports a short manifest-fetch timeout but `Invoke-WebRequest -UseBasicParsing` succeeds, use the official Windows MSI path rather than repeatedly running `nvm install`.
- If `npm` or `vercel` is blocked by PowerShell policy, invoke `npm.cmd` or `vercel.cmd`; do not weaken the machine's execution policy for this task.
- If pairing returns 403, inspect the exact browser Origin and API `POS_DEVICE_TOKEN_PAIRING_ORIGINS`/`CORS_ORIGIN_ALLOWLIST` configuration before rotating any key.
- A successful `/health/ready` confirms configured dependencies, not that a device has been paired. Pairing and cashier login must be verified in the target browser.
