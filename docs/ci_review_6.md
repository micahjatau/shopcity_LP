Run npm run test:integration

> shopcity-lp@0.0.1 test:integration
> jest --config ./test/jest-int.json --runInBand

Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32769"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`
┌─────────────────────────────────────────────────────────┐

│ Update available 6.19.3 -> 7.9.1 │
│ │
│ This is a major update - please follow the guide at │
│ https://pris.ly/d/major-version-upgrade │
│ │
│ Run the following to update │
│ npm i --save-dev prisma@latest │
│ npm i @prisma/client@latest │
└─────────────────────────────────────────────────────────┘
The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
[14:01:12.172] INFO (2948): request completed {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41741","accept-encoding":"gzip, deflate","x-device-id":"202f777a-0cc5-4227-ba29-1f137111c147","content-type":"application/json","x-device-attestation":"1785679271995.448090f8-7156-40f1-84e7-56b2ac362ed4.pLijFYV1piF6yj-gjiyBqVvVtCNIl_3KMsEUn0lTNek","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36034},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","set-cookie":["shopcity_session=9fd5b2ce-1dbb-41d7-8ab9-b76d0a4fe181; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=68320d99-8522-49d5-873c-1e7c5b04d4cc; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":131}
[14:01:12.241] INFO (2948): request completed {"req":{"id":"req-2","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:46221","accept-encoding":"gzip, deflate","cookie":"shopcity_session=9fd5b2ce-1dbb-41d7-8ab9-b76d0a4fe181; shopcity_csrf=68320d99-8522-49d5-873c-1e7c5b04d4cc","x-csrf-token":"68320d99-8522-49d5-873c-1e7c5b04d4cc","idempotency-key":"receipt-key-1","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53442},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-2","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":61}
[14:01:12.255] INFO (2948): request completed {"req":{"id":"req-3","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:38295","accept-encoding":"gzip, deflate","cookie":"shopcity_session=9fd5b2ce-1dbb-41d7-8ab9-b76d0a4fe181; shopcity_csrf=68320d99-8522-49d5-873c-1e7c5b04d4cc","x-csrf-token":"68320d99-8522-49d5-873c-1e7c5b04d4cc","idempotency-key":"receipt-key-1","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58852},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-3","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":9}
[14:01:12.303] INFO (2948): request completed {"req":{"id":"req-4","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44939","accept-encoding":"gzip, deflate","x-device-id":"a0049f69-0315-4d9a-94ed-49eef9b77a6d","content-type":"application/json","x-device-attestation":"1785679272289.31f1773a-4b22-4797-aad4-a96298303ca6.xePXRxxTh9_7zJyMuW9Ike1DzW2-Fsr7Lpeb64UEHQY","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":37586},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-4","set-cookie":["shopcity_session=cfa1c624-5634-4bad-8574-3bbf84a6bc49; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=c65f4e6d-49dd-4302-adb7-d9c56d45ca97; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":12}
[14:01:12.341] INFO (2948): request completed {"req":{"id":"req-5","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37943","accept-encoding":"gzip, deflate","cookie":"shopcity_session=cfa1c624-5634-4bad-8574-3bbf84a6bc49; shopcity_csrf=c65f4e6d-49dd-4302-adb7-d9c56d45ca97","x-csrf-token":"c65f4e6d-49dd-4302-adb7-d9c56d45ca97","idempotency-key":"receipt-key-2","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35710},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-5","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":35}
[14:01:12.371] INFO (2948): request completed {"req":{"id":"req-6","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:45791","accept-encoding":"gzip, deflate","cookie":"shopcity_session=cfa1c624-5634-4bad-8574-3bbf84a6bc49; shopcity_csrf=c65f4e6d-49dd-4302-adb7-d9c56d45ca97","x-csrf-token":"c65f4e6d-49dd-4302-adb7-d9c56d45ca97","idempotency-key":"receipt-key-3","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41516},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-6","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":23}
[14:01:12.415] INFO (2948): request completed {"req":{"id":"req-7","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44029","accept-encoding":"gzip, deflate","x-device-id":"c9f31fa7-9e28-4f95-be2f-47df32bd86a3","content-type":"application/json","x-device-attestation":"1785679272398.f75fad36-228c-4c65-8a30-9b630a5fe9eb.i9WM8yuFyvVhzP54kVQsS9vcSw3rpD8M_Lu6DIViv4Y","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36604},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-7","set-cookie":["shopcity_session=de559663-977c-4e02-8796-f52d602a417c; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=c78aa269-a9ca-45a3-8399-aecf51d838f5; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":15}
[14:01:12.433] INFO (2948): request completed {"req":{"id":"req-8","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:46661","accept-encoding":"gzip, deflate","x-device-id":"255c8ea2-4132-4562-b526-57ce29e9340a","content-type":"application/json","x-device-attestation":"1785679272421.a981db33-02de-44c5-818a-3e62104e56b1.jfyL4dua2UBBYMlAZthp26_Ed3xJiLhCikt7oYPdnDk","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52990},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-8","set-cookie":["shopcity_session=c7f246b2-5bfa-47af-8e40-236e1f004bd2; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=9b9a818c-27c0-44b2-bd8b-c43682021309; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"332"}},"responseTime":10}
[14:01:12.462] INFO (2948): request completed {"req":{"id":"req-9","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:38065","accept-encoding":"gzip, deflate","cookie":"shopcity_session=de559663-977c-4e02-8796-f52d602a417c; shopcity_csrf=c78aa269-a9ca-45a3-8399-aecf51d838f5","x-csrf-token":"c78aa269-a9ca-45a3-8399-aecf51d838f5","idempotency-key":"receipt-key-4","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36754},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-9","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":26}
[14:01:12.482] INFO (2948): request completed {"req":{"id":"req-a","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:46257","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c7f246b2-5bfa-47af-8e40-236e1f004bd2; shopcity_csrf=9b9a818c-27c0-44b2-bd8b-c43682021309","x-csrf-token":"9b9a818c-27c0-44b2-bd8b-c43682021309","idempotency-key":"receipt-key-5","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36412},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-a","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":17}
[14:01:12.506] INFO (2948): request completed {"req":{"id":"req-b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39961","accept-encoding":"gzip, deflate","x-device-id":"451f1510-7b2c-4504-af15-ab21921f2e1a","content-type":"application/json","x-device-attestation":"1785679272492.eee57546-4331-40a3-ac25-e1cf529f0cd4.jRvzJGg_fURbuquoQVHN3dLYJW5ZfG6e44RNqVEn1HA","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":37444},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-b","set-cookie":["shopcity_session=87ba49ee-243c-4d48-a97d-d456c8c62428; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=fc14090a-8b73-4715-aca7-f3cc94694cb4; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":13}
[14:01:12.591] INFO (2948): request completed {"req":{"id":"req-c","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:32947","accept-encoding":"gzip, deflate","cookie":"shopcity_session=87ba49ee-243c-4d48-a97d-d456c8c62428; shopcity_csrf=fc14090a-8b73-4715-aca7-f3cc94694cb4","x-csrf-token":"fc14090a-8b73-4715-aca7-f3cc94694cb4","idempotency-key":"receipt-key-4a","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39134},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-c","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":81}
[14:01:12.743] INFO (2948): request completed {"req":{"id":"req-d","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:32947","accept-encoding":"gzip, deflate","cookie":"shopcity_session=87ba49ee-243c-4d48-a97d-d456c8c62428; shopcity_csrf=fc14090a-8b73-4715-aca7-f3cc94694cb4","x-csrf-token":"fc14090a-8b73-4715-aca7-f3cc94694cb4","idempotency-key":"receipt-key-4b","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39144},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-d","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":232}
[14:01:12.773] INFO (2948): request completed {"req":{"id":"req-e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41931","accept-encoding":"gzip, deflate","x-device-id":"fe9fe196-d006-46f2-9779-f56b36d36d6f","content-type":"application/json","x-device-attestation":"1785679272756.24cc808d-0739-4aac-8b7b-c840a74dbcfb.WYuinHfkls2vjZtWRG0FC3dTFUbd6DtcP_X85JYwOcQ","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57324},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-e","set-cookie":["shopcity_session=3def715c-fb1b-4b0f-99f5-c9cc4235123e; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=b5f9a2dc-66b4-4726-83ac-68688bab0bf2; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":15}
[14:01:12.820] INFO (2948): request completed {"req":{"id":"req-f","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:35611","accept-encoding":"gzip, deflate","cookie":"shopcity_session=3def715c-fb1b-4b0f-99f5-c9cc4235123e; shopcity_csrf=b5f9a2dc-66b4-4726-83ac-68688bab0bf2","x-csrf-token":"b5f9a2dc-66b4-4726-83ac-68688bab0bf2","idempotency-key":"receipt-key-6","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38316},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-f","content-type":"application/json; charset=utf-8","content-length":"580"}},"responseTime":42}
[14:01:12.842] INFO (2948): request completed {"req":{"id":"req-g","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:41507","accept-encoding":"gzip, deflate","cookie":"shopcity_session=3def715c-fb1b-4b0f-99f5-c9cc4235123e; shopcity_csrf=b5f9a2dc-66b4-4726-83ac-68688bab0bf2","x-csrf-token":"b5f9a2dc-66b4-4726-83ac-68688bab0bf2","idempotency-key":"receipt-key-7","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53636},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-g","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":20}
[14:01:12.871] INFO (2948): request completed {"req":{"id":"req-h","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34513","accept-encoding":"gzip, deflate","x-device-id":"4337b06b-5164-49c3-8cb3-f5c88ea2890b","content-type":"application/json","x-device-attestation":"1785679272858.2e4d0429-0fc6-4176-9d89-dea7510b814a.jSxxCk1f2LduDZGwD_wFoDndJA_c-3TJzkddTjksScY","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39474},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-h","set-cookie":["shopcity_session=2c8d890e-9115-460e-add8-652d8df480f3; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=3ca8e937-f0d0-4553-a2ad-49842fb714c8; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":12}
[14:01:12.901] INFO (2948): request completed {"req":{"id":"req-i","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37447","accept-encoding":"gzip, deflate","cookie":"shopcity_session=2c8d890e-9115-460e-add8-652d8df480f3; shopcity_csrf=3ca8e937-f0d0-4553-a2ad-49842fb714c8","x-csrf-token":"3ca8e937-f0d0-4553-a2ad-49842fb714c8","idempotency-key":"receipt-key-8","content-type":"application/json","content-length":"175","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33956},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-i","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":28}
[14:01:12.929] INFO (2948): request completed {"req":{"id":"req-j","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:34439","accept-encoding":"gzip, deflate","cookie":"shopcity_session=2c8d890e-9115-460e-add8-652d8df480f3; shopcity_csrf=3ca8e937-f0d0-4553-a2ad-49842fb714c8","x-csrf-token":"3ca8e937-f0d0-4553-a2ad-49842fb714c8","idempotency-key":"receipt-key-9","content-type":"application/json","content-length":"175","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34490},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-j","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":26}
[14:01:12.955] INFO (2948): request completed {"req":{"id":"req-k","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:36135","accept-encoding":"gzip, deflate","x-device-id":"423974c9-627d-4c27-8353-333e0d272502","content-type":"application/json","x-device-attestation":"1785679272943.b37b8f05-0ac8-46bc-870e-35735d886fc5.KGHXlZwBG7W_h-IqAs7MSr5YVB6F4oAAqbvqnSHrY80","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46762},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-k","set-cookie":["shopcity_session=5352b470-19fd-4b6d-855c-7c6304a31341; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=1550a341-42c7-4c09-8d90-205f5350c026; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[14:01:12.988] INFO (2948): request completed {"req":{"id":"req-l","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40931","accept-encoding":"gzip, deflate","cookie":"shopcity_session=5352b470-19fd-4b6d-855c-7c6304a31341; shopcity_csrf=1550a341-42c7-4c09-8d90-205f5350c026","x-csrf-token":"1550a341-42c7-4c09-8d90-205f5350c026","idempotency-key":"receipt-key-8a","content-type":"application/json","content-length":"177","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56292},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-l","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":31}
[14:01:13.025] INFO (2948): request completed {"req":{"id":"req-m","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42541","accept-encoding":"gzip, deflate","x-device-id":"e8371c95-511e-4f2f-8349-bce0832a046d","content-type":"application/json","x-device-attestation":"1785679273011.655cd483-733c-4a17-b23c-04817d4b3828.eO88jsBjRD5fhVgnAVCsrqzc0cAEk20gbkp1iKOg92Y","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35458},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-m","set-cookie":["shopcity_session=3ca3e830-6de4-45db-becd-8fbf63aea95b; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=fabe5485-3e50-4d11-bb57-a0f8902da38d; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":12}
[14:01:13.042] INFO (2948): request completed {"req":{"id":"req-n","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:35153","accept-encoding":"gzip, deflate","cookie":"shopcity_session=3ca3e830-6de4-45db-becd-8fbf63aea95b; shopcity_csrf=fabe5485-3e50-4d11-bb57-a0f8902da38d","x-csrf-token":"fabe5485-3e50-4d11-bb57-a0f8902da38d","idempotency-key":"receipt-key-8b","content-type":"application/json","content-length":"174","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33976},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-n","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":15}
[14:01:13.076] INFO (2948): request completed {"req":{"id":"req-o","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33835","accept-encoding":"gzip, deflate","x-device-id":"276fd89a-3125-4820-bdd3-9da435d174c7","content-type":"application/json","x-device-attestation":"1785679273064.d1272fa5-a745-45a6-97c1-d1fe1764c5d0.h3LMhtOUDq2_byFVPtsjYD8At28vNE77x_rKqsOftw4","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48872},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-o","set-cookie":["shopcity_session=0780b5b1-f55c-4319-8b41-a279f86b07d9; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=0683ef94-22c1-4f1d-ba7d-c277b49fd4c9; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[14:01:13.087] INFO (2948): request completed {"req":{"id":"req-p","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:45129","accept-encoding":"gzip, deflate","x-device-id":"ff9bcf75-692d-480e-89bd-dee16bc38500","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46202},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-p","content-type":"application/json; charset=utf-8","content-length":"283"}},"responseTime":5}
[14:01:13.094] INFO (2948): request completed {"req":{"id":"req-q","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:41109","accept-encoding":"gzip, deflate","cookie":"shopcity_session=0780b5b1-f55c-4319-8b41-a279f86b07d9; shopcity_csrf=0683ef94-22c1-4f1d-ba7d-c277b49fd4c9","x-csrf-token":"0683ef94-22c1-4f1d-ba7d-c277b49fd4c9","idempotency-key":"receipt-key-10","content-type":"application/json","content-length":"179","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38174},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-q","content-type":"application/json; charset=utf-8","content-length":"311"}},"responseTime":5}
[14:01:13.103] INFO (2948): request completed {"req":{"id":"req-r","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34229","accept-encoding":"gzip, deflate","x-device-id":"7a7a9f6d-46f0-42df-bc06-f0f8e3def546","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59588},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-r","content-type":"application/json; charset=utf-8","content-length":"283"}},"responseTime":4}
[14:01:13.123] INFO (2948): request completed {"req":{"id":"req-s","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42247","accept-encoding":"gzip, deflate","x-device-id":"e4ad128c-aece-4e24-97fa-922e59f9717c","content-type":"application/json","x-device-attestation":"1785679273113.133b71db-f850-4efe-8dca-e1aadf15db6b.TLlaUktqOkafN_srxGc1t3h9TfV71aH-yu3g5_8KqKA","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52866},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-s","set-cookie":["shopcity_session=2be7d278-005d-4100-8ee2-3d30808a15da; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=10a48b13-ef72-4d81-814a-117957059ba6; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"301"}},"responseTime":9}
[14:01:13.160] INFO (2948): request completed {"req":{"id":"req-t","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:35107","accept-encoding":"gzip, deflate","cookie":"shopcity_session=2be7d278-005d-4100-8ee2-3d30808a15da; shopcity_csrf=10a48b13-ef72-4d81-814a-117957059ba6","x-csrf-token":"10a48b13-ef72-4d81-814a-117957059ba6","idempotency-key":"receipt-key-10a","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53418},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-t","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":27}
[14:01:13.183] INFO (2948): request completed {"req":{"id":"req-u","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42335","accept-encoding":"gzip, deflate","x-device-id":"b69be132-4c57-45a0-90ee-d1f9809d3a57","content-type":"application/json","x-device-attestation":"1785679273172.c11d9a1d-c030-4116-b3a7-cf9f4fc4b3d6.orH948c-4gWTtF8HjP3co_u1_FjiTQWg6Qb4aUeG8u0","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55328},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-u","set-cookie":["shopcity_session=000a99e0-1842-4dbe-bae9-d118ac164315; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=d5af4ce1-335a-40ff-8d5c-47f8cf3ca3fb; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[14:01:13.197] INFO (2948): request completed {"req":{"id":"req-v","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44085","accept-encoding":"gzip, deflate","x-device-id":"a352eb8a-cd3f-4a86-89b7-96f3fd0d82ea","content-type":"application/json","x-device-attestation":"1785679273186.3658c2c1-e44d-4bf7-9837-cc337d5391d8.nj3m3r-oSLT5sfXu5xDKRY6DJ0tu_OASXNCPjvLu5eY","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52542},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-v","set-cookie":["shopcity_session=c3a14964-41a0-4a10-a211-cbb8ea7cccdd; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=d8f5876a-2438-4e46-98ee-1143b79d6d80; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"332"}},"responseTime":9}
[14:01:13.208] INFO (2948): request completed {"req":{"id":"req-w","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:45851","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c3a14964-41a0-4a10-a211-cbb8ea7cccdd; shopcity_csrf=d8f5876a-2438-4e46-98ee-1143b79d6d80","x-csrf-token":"d8f5876a-2438-4e46-98ee-1143b79d6d80","idempotency-key":"receipt-key-13","content-type":"application/json","content-length":"136","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46352},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-w","content-type":"application/json; charset=utf-8","content-length":"309"}},"responseTime":7}
[14:01:13.217] INFO (2948): request completed {"req":{"id":"req-x","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:33369","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c3a14964-41a0-4a10-a211-cbb8ea7cccdd; shopcity_csrf=d8f5876a-2438-4e46-98ee-1143b79d6d80","x-csrf-token":"d8f5876a-2438-4e46-98ee-1143b79d6d80","idempotency-key":"receipt-key-14","content-type":"application/json","content-length":"135","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49406},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-x","content-type":"application/json; charset=utf-8","content-length":"297"}},"responseTime":6}
[14:01:13.238] INFO (2948): request completed {"req":{"id":"req-y","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:36681","accept-encoding":"gzip, deflate","x-device-id":"8305457c-ae00-4f32-b687-f255835cbd7c","content-type":"application/json","x-device-attestation":"1785679273227.48cc6c20-8b54-48cb-95b0-5e027223bee1.OVHbXBz0Q7RayP2vIQE9mIo7NCSlqpOBu1tK-czdjZQ","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39188},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-y","set-cookie":["shopcity_session=a744defb-059c-49e7-a092-7fdc9935355b; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=152319d8-933b-4795-9f18-75561f57f1e2; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[14:01:13.251] INFO (2948): request completed {"req":{"id":"req-z","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33443","accept-encoding":"gzip, deflate","x-device-id":"8305457c-ae00-4f32-b687-f255835cbd7c","content-type":"application/json","x-device-attestation":"1785679273240.fd73c8b2-cd5b-493a-ac1c-16671ebd961e.ZmnrMcES1ovRGA4fkzGI3O5JTPgyu-cGyCu-wFLp55o","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33140},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-z","set-cookie":["shopcity_session=fa07ad33-22cf-4e11-bf46-5ad3a2aaa114; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=b55c460b-6e27-4683-828d-5901a8d530df; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[14:01:13.278] INFO (2948): request completed {"req":{"id":"req-10","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:34555","accept-encoding":"gzip, deflate","cookie":"shopcity_session=fa07ad33-22cf-4e11-bf46-5ad3a2aaa114; shopcity_csrf=b55c460b-6e27-4683-828d-5901a8d530df","x-csrf-token":"b55c460b-6e27-4683-828d-5901a8d530df","idempotency-key":"receipt-key-15","content-type":"application/json","content-length":"190","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33594},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-10","content-type":"application/json; charset=utf-8","content-length":"589"}},"responseTime":25}
[14:01:13.302] INFO (2948): request completed {"req":{"id":"req-11","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:37829","accept-encoding":"gzip, deflate","x-device-id":"3d59812f-5bd8-4702-882b-770f962db129","content-type":"application/json","x-device-attestation":"1785679273289.b30c46cc-dfdc-4d80-817e-bf99d2332edf.qTHlK2YoY3G2VzbfdriSnCtb8cByeyw7kwFIsO9kUdo","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58866},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-11","set-cookie":["shopcity_session=df2751fe-4f36-4f16-a217-74ae7c04a0c6; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=1582ceb9-cd8c-443a-8819-caecd31cfa00; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":11}
[14:01:13.336] INFO (2948): request completed {"req":{"id":"req-12","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:36051","accept-encoding":"gzip, deflate","cookie":"shopcity_session=df2751fe-4f36-4f16-a217-74ae7c04a0c6; shopcity_csrf=1582ceb9-cd8c-443a-8819-caecd31cfa00","x-csrf-token":"1582ceb9-cd8c-443a-8819-caecd31cfa00","idempotency-key":"receipt-key-16","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48840},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-12","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":32}
[14:01:13.367] INFO (2948): request completed {"req":{"id":"req-13","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:45251","accept-encoding":"gzip, deflate","x-device-id":"9c7ca083-37c2-476f-9d5b-f74e81759609","content-type":"application/json","x-device-attestation":"1785679273350.d36eecf2-db90-4c16-b23c-116d746009ab.9uhPnWi42618hknLt5V7zUJqFVpi-0cfh4qtkuz1tSc","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47128},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-13","set-cookie":["shopcity_session=d5a35192-71a8-4ff1-b2e2-19d3e2d560a5; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=21a6dff2-2524-4908-98bf-4a36a47dfd77; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":16}
[14:01:13.397] INFO (2948): request completed {"req":{"id":"req-14","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:45901","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d5a35192-71a8-4ff1-b2e2-19d3e2d560a5; shopcity_csrf=21a6dff2-2524-4908-98bf-4a36a47dfd77","x-csrf-token":"21a6dff2-2524-4908-98bf-4a36a47dfd77","idempotency-key":"receipt-key-16a","content-type":"application/json","content-length":"138","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34836},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-14","content-type":"application/json; charset=utf-8","content-length":"596"}},"responseTime":27}
[14:01:13.417] INFO (2948): request completed {"req":{"id":"req-15","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:44805","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d5a35192-71a8-4ff1-b2e2-19d3e2d560a5; shopcity_csrf=21a6dff2-2524-4908-98bf-4a36a47dfd77","x-csrf-token":"21a6dff2-2524-4908-98bf-4a36a47dfd77","idempotency-key":"receipt-key-16b","content-type":"application/json","content-length":"136","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60906},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-15","content-type":"application/json; charset=utf-8","content-length":"594"}},"responseTime":17}
[14:01:13.426] INFO (2948): request completed {"req":{"id":"req-16","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37031","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d5a35192-71a8-4ff1-b2e2-19d3e2d560a5; shopcity_csrf=21a6dff2-2524-4908-98bf-4a36a47dfd77","x-csrf-token":"21a6dff2-2524-4908-98bf-4a36a47dfd77","idempotency-key":"receipt-key-16c","content-type":"application/json","content-length":"138","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55844},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-16","content-type":"application/json; charset=utf-8","content-length":"334"}},"responseTime":7}
[14:01:13.445] INFO (2948): request completed {"req":{"id":"req-17","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:36033","accept-encoding":"gzip, deflate","x-device-id":"bc4cb91d-3e46-4c8d-8774-7c9420937201","content-type":"application/json","x-device-attestation":"1785679273434.3953a7c1-0d7c-491a-a6c2-1939ede8e4cc.DQjbVkxm4i-CBdwhF-jYEkagOrWnj6HX4VEfhRrcfxs","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41572},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-17","set-cookie":["shopcity_session=8b8a5881-85d5-4eb3-b970-1a19bec93e34; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=f3bdfaa7-7430-4ad9-851e-ca62eb8051b1; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":10}
[14:01:13.471] INFO (2948): request completed {"req":{"id":"req-18","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:42057","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8b8a5881-85d5-4eb3-b970-1a19bec93e34; shopcity_csrf=f3bdfaa7-7430-4ad9-851e-ca62eb8051b1","x-csrf-token":"f3bdfaa7-7430-4ad9-851e-ca62eb8051b1","idempotency-key":"receipt-key-17","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54996},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-18","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":23}
[14:01:13.483] INFO (2948): request completed {"req":{"id":"req-19","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39639","accept-encoding":"gzip, deflate","x-device-id":"bc4cb91d-3e46-4c8d-8774-7c9420937201","content-type":"application/json","x-device-attestation":"1785679273472.61bfa338-210e-42c7-8708-1071653dd6c2.Qcibi7xKjt39A0We32gToRmw80-kjoWLh6puw5nYuXU","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40554},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-19","set-cookie":["shopcity_session=597d7aed-bd22-4829-b61c-391e798af8e4; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=ef15c692-17d8-4f82-803d-138bd98d7c48; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":9}
[14:01:13.518] INFO (2948): request completed {"req":{"id":"req-1a","method":"POST","url":"/api/v1/receipts/5fe9023c-45a0-42ad-af5c-9a4428049dcb/approve","query":{},"headers":{"host":"127.0.0.1:45919","accept-encoding":"gzip, deflate","cookie":"shopcity_session=597d7aed-bd22-4829-b61c-391e798af8e4; shopcity_csrf=ef15c692-17d8-4f82-803d-138bd98d7c48","x-csrf-token":"ef15c692-17d8-4f82-803d-138bd98d7c48","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51748},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1a","content-type":"application/json; charset=utf-8","content-length":"469"}},"responseTime":33}
[14:01:13.540] INFO (2948): request completed {"req":{"id":"req-1b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:46729","accept-encoding":"gzip, deflate","x-device-id":"d9ec1498-8251-4fb5-bf12-0d50d72bfccb","content-type":"application/json","x-device-attestation":"1785679273529.e522de9a-63c0-4039-9d6f-93ef7f0522ba.-puAIiStSDLz3qa1YjYsLjDUHDFR4wsYWXbBN0IMo2Q","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48770},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1b","set-cookie":["shopcity_session=5954f740-e4a2-4840-9dad-06a614eee7c6; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=2c33ca66-7dac-4c33-9508-056cef0fdad5; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":10}
[14:01:13.560] INFO (2948): request completed {"req":{"id":"req-1c","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:44167","accept-encoding":"gzip, deflate","cookie":"shopcity_session=5954f740-e4a2-4840-9dad-06a614eee7c6; shopcity_csrf=2c33ca66-7dac-4c33-9508-056cef0fdad5","x-csrf-token":"2c33ca66-7dac-4c33-9508-056cef0fdad5","idempotency-key":"receipt-key-18","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50990},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1c","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":18}
[14:01:13.573] INFO (2948): request completed {"req":{"id":"req-1d","method":"POST","url":"/api/v1/receipts/e0b9b0a2-bc99-4453-892d-2aec24730a91/approve","query":{},"headers":{"host":"127.0.0.1:42803","accept-encoding":"gzip, deflate","cookie":"shopcity_session=5954f740-e4a2-4840-9dad-06a614eee7c6; shopcity_csrf=2c33ca66-7dac-4c33-9508-056cef0fdad5","x-csrf-token":"2c33ca66-7dac-4c33-9508-056cef0fdad5","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44884},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1d","content-type":"application/json; charset=utf-8","content-length":"378"}},"responseTime":11}
[14:01:13.592] INFO (2948): request completed {"req":{"id":"req-1e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44069","accept-encoding":"gzip, deflate","x-device-id":"40240ec5-1c31-4f38-84c2-8e309c6c3e39","content-type":"application/json","x-device-attestation":"1785679273581.43193d00-6c5d-4bb8-b3f2-b52336851dc6.VRXg4Q5K4d9ijGgsPQ4JQ0QXz1Ov8ZXlVGwTWauU8dc","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57684},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1e","set-cookie":["shopcity_session=8fbb8f2f-822f-4070-ba47-d0b10d87ae0b; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=42831a71-4b99-44f4-9642-d6090bc189aa; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":10}
[14:01:13.611] INFO (2948): request completed {"req":{"id":"req-1f","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40381","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8fbb8f2f-822f-4070-ba47-d0b10d87ae0b; shopcity_csrf=42831a71-4b99-44f4-9642-d6090bc189aa","x-csrf-token":"42831a71-4b99-44f4-9642-d6090bc189aa","idempotency-key":"receipt-key-19","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33902},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1f","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":18}
[14:01:13.624] INFO (2948): request completed {"req":{"id":"req-1g","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40589","accept-encoding":"gzip, deflate","x-device-id":"40240ec5-1c31-4f38-84c2-8e309c6c3e39","content-type":"application/json","x-device-attestation":"1785679273615.a53bd840-6626-4a60-8cdb-bccb2e4c3d3d.pJY4GTVGzKWhvhIKOhakiO8V1sCr92M0Z4LE9h-hO-U","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42384},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1g","set-cookie":["shopcity_session=951e58e3-b9d5-4a88-864c-7d25a5cf2478; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=bca53425-ef34-40f0-ae51-8950975b0240; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":8}
[14:01:13.649] INFO (2948): request completed {"req":{"id":"req-1h","method":"POST","url":"/api/v1/receipts/c721417c-d992-4256-879d-f1cb80212da3/reject","query":{},"headers":{"host":"127.0.0.1:34641","accept-encoding":"gzip, deflate","cookie":"shopcity_session=951e58e3-b9d5-4a88-864c-7d25a5cf2478; shopcity_csrf=bca53425-ef34-40f0-ae51-8950975b0240","x-csrf-token":"bca53425-ef34-40f0-ae51-8950975b0240","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45540},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1h","content-type":"application/json; charset=utf-8","content-length":"372"}},"responseTime":23}
[14:01:13.679] INFO (2948): request completed {"req":{"id":"req-1i","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38877","accept-encoding":"gzip, deflate","x-device-id":"8eaccf47-02a5-4efe-8b68-2345ba4e285b","content-type":"application/json","x-device-attestation":"1785679273666.65a58972-1d7d-4af8-a6c8-4a3fed8580d2.IMBmqEOOl_KkLxRQbpiOoMFIxEezbSm5QUPnycGYRQQ","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52296},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1i","set-cookie":["shopcity_session=c9aae454-03f6-48fb-a592-0f763a0e66b9; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=885a0c1c-9b3b-4e06-902e-e80d2e038c05; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":11}
[14:01:13.714] INFO (2948): request completed {"req":{"id":"req-1j","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43279","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c9aae454-03f6-48fb-a592-0f763a0e66b9; shopcity_csrf=885a0c1c-9b3b-4e06-902e-e80d2e038c05","x-csrf-token":"885a0c1c-9b3b-4e06-902e-e80d2e038c05","idempotency-key":"expired-completed-key","content-type":"application/json","content-length":"133","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57564},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1j","content-type":"application/json; charset=utf-8","content-length":"584"}},"responseTime":28}
[14:01:13.734] INFO (2948): request completed {"req":{"id":"req-1k","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33223","accept-encoding":"gzip, deflate","x-device-id":"54f10b11-8898-4a5c-9e97-765a364f5bfb","content-type":"application/json","x-device-attestation":"1785679273722.a596af3b-c812-45ad-af0d-cacb677c3682.6is94-JHIFupmKQ-rlL6aj_Mh-ejZL--C74HUzqjmh0","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33908},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1k","set-cookie":["shopcity_session=1c138638-a38c-4a78-968a-65bc9eb2b94a; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=6628396d-a023-41f1-8db0-0617129c0bda; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":10}
[14:01:13.761] INFO (2948): request completed {"req":{"id":"req-1l","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40091","accept-encoding":"gzip, deflate","cookie":"shopcity_session=1c138638-a38c-4a78-968a-65bc9eb2b94a; shopcity_csrf=6628396d-a023-41f1-8db0-0617129c0bda","x-csrf-token":"6628396d-a023-41f1-8db0-0617129c0bda","idempotency-key":"expired-pending-key","content-type":"application/json","content-length":"133","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60808},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1l","content-type":"application/json; charset=utf-8","content-length":"584"}},"responseTime":21}
PASS test/receipts.int-spec.ts (14.538 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32770"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
PASS test/immutable-earn-ledger.int-spec.ts (6.195 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32771"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
[14:01:26.869] INFO (2948): request completed {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33471","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34134},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","set-cookie":["shopcity_session=c707a565-9e56-47b4-8747-0ca8dd115fc0; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=c797418f-ae01-48cf-94ac-1903673257bc; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":233}
[14:01:26.881] INFO (2948): request completed {"req":{"id":"req-2","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:35083","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c707a565-9e56-47b4-8747-0ca8dd115fc0","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55536},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-2","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":7}
[14:01:26.888] INFO (2948): request completed {"req":{"id":"req-3","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:45911","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c707a565-9e56-47b4-8747-0ca8dd115fc0; shopcity_csrf=c797418f-ae01-48cf-94ac-1903673257bc","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40594},"res":{"statusCode":403,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-3","content-type":"application/json; charset=utf-8","content-length":"272"}},"responseTime":5}
[14:01:26.907] INFO (2948): request completed {"req":{"id":"req-4","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:45153","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c707a565-9e56-47b4-8747-0ca8dd115fc0; shopcity_csrf=c797418f-ae01-48cf-94ac-1903673257bc","x-csrf-token":"c797418f-ae01-48cf-94ac-1903673257bc","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45228},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-4","set-cookie":["shopcity_session=d0cbb5f9-ad2a-4583-bc29-2b75d6811d22; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=ecd6d557-b49e-44e3-b4a1-e3e3d5460a1f; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"326"}},"responseTime":17}
[14:01:26.917] INFO (2948): request completed {"req":{"id":"req-5","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:45123","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c707a565-9e56-47b4-8747-0ca8dd115fc0","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33604},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-5","content-type":"application/json; charset=utf-8","content-length":"284"}},"responseTime":3}
[14:01:26.923] INFO (2948): request completed {"req":{"id":"req-6","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:35973","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d0cbb5f9-ad2a-4583-bc29-2b75d6811d22","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46248},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-6","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":4}
[14:01:26.930] INFO (2948): request completed {"req":{"id":"req-7","method":"POST","url":"/api/v1/auth/logout","query":{},"headers":{"host":"127.0.0.1:38211","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d0cbb5f9-ad2a-4583-bc29-2b75d6811d22; shopcity_csrf=ecd6d557-b49e-44e3-b4a1-e3e3d5460a1f","x-csrf-token":"ecd6d557-b49e-44e3-b4a1-e3e3d5460a1f","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56022},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-7","set-cookie":["shopcity_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly","shopcity_csrf=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly"],"content-type":"application/json; charset=utf-8","content-length":"136"}},"responseTime":5}
[14:01:26.936] INFO (2948): request completed {"req":{"id":"req-8","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:38331","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d0cbb5f9-ad2a-4583-bc29-2b75d6811d22","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39570},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-8","content-type":"application/json; charset=utf-8","content-length":"284"}},"responseTime":3}
[14:01:26.956] INFO (2948): request completed {"req":{"id":"req-9","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42829","accept-encoding":"gzip, deflate","x-device-id":"f1121022-5bac-47b5-847e-0e67289ac1e7","x-device-attestation":"1785679286944.e3fb6dc0-4a58-464a-8436-64b257d5f764.Jyyk198jZdwdCdpdFhnc5uJ0-sA7W_bNA0s4-A3i2JM","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53830},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-9","set-cookie":["shopcity_session=926287c8-9957-4db8-a39d-a3d250c064cc; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=90707e82-2b37-4692-a7d1-e680acf4e8a6; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":11}
[14:01:26.976] INFO (2948): request completed {"req":{"id":"req-a","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:45873","accept-encoding":"gzip, deflate","x-device-id":"a0d641bb-2529-42da-9edb-0efb46336ad9","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48458},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-a","content-type":"application/json; charset=utf-8","content-length":"303"}},"responseTime":7}
[14:01:26.986] INFO (2948): request completed {"req":{"id":"req-b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:45307","accept-encoding":"gzip, deflate","x-device-id":"a0d641bb-2529-42da-9edb-0efb46336ad9","x-device-attestation":"1785679286977.540b6854-a4b8-4f63-8519-7a95cc22314e.D5e8VOJ565WHBLo3YBchBW6WwN81IXXgdRd4YCmS7D8","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56468},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-b","content-type":"application/json; charset=utf-8","content-length":"301"}},"responseTime":7}
[14:01:27.032] INFO (2948): request completed {"req":{"id":"req-c","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44103","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40326},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-c","set-cookie":["shopcity_session=c6f3e042-349d-4f40-af35-3e8c4c3dbe6f; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=99d6a0b5-4bda-40af-bf03-10bc07a572e5; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":39}
[14:01:27.053] INFO (2948): request completed {"req":{"id":"req-d","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:40053","accept-encoding":"gzip, deflate","authorization":"_**","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52448},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-d","set-cookie":["shopcity_session=c47ceef2-58b1-4ea7-902c-fe8b787d9a89; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=545cee5f-3653-4674-9710-5fbb750df4b5; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"326"}},"responseTime":19}
[14:01:27.068] INFO (2948): request completed {"req":{"id":"req-e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35975","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52070},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-e","set-cookie":["shopcity_session=76976961-8a08-43ed-932d-5f6348392246; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=b012a1b4-ce3a-4f65-8f28-05cc37c2ff36; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[14:01:27.121] INFO (2948): request completed {"req":{"id":"req-f","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:46537","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42924},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-f","set-cookie":["shopcity_session=f936f09e-ec1e-4cc9-a3d8-313368a007ef; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=7ca9d59f-dba9-4679-8012-97b5885d1a7b; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":8}
[14:01:27.139] INFO (2948): request completed {"req":{"id":"req-g","method":"GET","url":"/api/v1/customers?q=%2B2348020000001&limit=10","query":{"q":"+2348020000001","limit":"10"},"headers":{"host":"127.0.0.1:39797","accept-encoding":"gzip, deflate","cookie":"shopcity_session=f936f09e-ec1e-4cc9-a3d8-313368a007ef","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33468},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-g","content-type":"application/json; charset=utf-8","content-length":"367"}},"responseTime":15}
[14:01:27.152] INFO (2948): request completed {"req":{"id":"req-h","method":"GET","url":"/api/v1/customers/0b376e64-5af3-45bb-b0ce-2c5a2c32fab9","query":{},"headers":{"host":"127.0.0.1:36965","accept-encoding":"gzip, deflate","cookie":"shopcity_session=f936f09e-ec1e-4cc9-a3d8-313368a007ef","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33670},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-h","content-type":"application/json; charset=utf-8","content-length":"330"}},"responseTime":11}
[14:01:27.187] INFO (2948): request completed {"req":{"id":"req-i","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:46451","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39242},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-i","set-cookie":["shopcity_session=57a3e8cf-f339-428c-bef2-7bc5b86a71c7; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=63c34a36-8a5a-4095-a122-2c316f172b02; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[14:01:27.199] INFO (2948): request completed {"req":{"id":"req-j","method":"GET","url":"/api/v1/customers?q=read-model-supervisor-http%40shopcity.local&limit=10","query":{"q":"read-model-supervisor-http@shopcity.local","limit":"10"},"headers":{"host":"127.0.0.1:33367","accept-encoding":"gzip, deflate","cookie":"shopcity_session=57a3e8cf-f339-428c-bef2-7bc5b86a71c7","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58212},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-j","content-type":"application/json; charset=utf-8","content-length":"787"}},"responseTime":9}
[14:01:27.210] INFO (2948): request completed {"req":{"id":"req-k","method":"GET","url":"/api/v1/customers/af2602d1-f874-4986-b3a4-61ad7e5b8f8e","query":{},"headers":{"host":"127.0.0.1:33315","accept-encoding":"gzip, deflate","cookie":"shopcity_session=57a3e8cf-f339-428c-bef2-7bc5b86a71c7","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54208},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-k","content-type":"application/json; charset=utf-8","content-length":"723"}},"responseTime":8}
[14:01:27.243] INFO (2948): request completed {"req":{"id":"req-l","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39921","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55590},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-l","set-cookie":["shopcity_session=2b090d5a-94c4-4ba8-96b5-1c079d60120f; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=32f33297-47ee-4f69-9a18-67424dc80d43; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":9}
[14:01:27.252] INFO (2948): request completed {"req":{"id":"req-m","method":"GET","url":"/api/v1/cards/lookup/CARD-card-http","query":{},"headers":{"host":"127.0.0.1:41357","accept-encoding":"gzip, deflate","cookie":"shopcity_session=2b090d5a-94c4-4ba8-96b5-1c079d60120f","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40564},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-m","content-type":"application/json; charset=utf-8","content-length":"517"}},"responseTime":8}
[14:01:27.299] INFO (2948): request completed {"req":{"id":"req-n","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33847","accept-encoding":"gzip, deflate","x-device-id":"0c9f2e3d-0d21-488f-a014-18c4b0c2e639","x-device-attestation":"1785679287279.592ff56e-4850-435c-9429-5d5299208fd5.quWzU-kg7_Cj5-CxJbXHogyTfHozHZmlzQk3zsSm25Y","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55746},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-n","set-cookie":["shopcity_session=5dee940e-fc5b-49a3-81a3-b607acce54bb; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=47a8dd00-5d25-4859-8983-cd1f731d0468; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":19}
[14:01:27.363] INFO (2948): request completed {"req":{"id":"req-o","method":"POST","url":"/api/v1/transactions/redeem","query":{},"headers":{"host":"127.0.0.1:34999","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"redeem-http-pending","content-type":"application/json","content-length":"184","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59668},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-o","content-type":"application/json; charset=utf-8","content-length":"1004"}},"responseTime":62}
[14:01:27.420] INFO (2948): request completed {"req":{"id":"req-p","method":"POST","url":"/api/v1/transactions/redeem","query":{},"headers":{"host":"127.0.0.1:44463","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"redeem-http-confirmed","content-type":"application/json","content-length":"186","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54796},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-p","content-type":"application/json; charset=utf-8","content-length":"1140"}},"responseTime":55}
[14:01:27.440] INFO (2948): request completed {"req":{"id":"req-q","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40227","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53464},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-q","set-cookie":["shopcity_session=5975ba62-5065-4346-90d2-52efafc085b0; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=f47ea790-0334-4773-8151-a79aa9c30035; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":9}
[14:01:27.448] INFO (2948): request completed {"req":{"id":"req-r","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:38461","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-0","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57178},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-r","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":6}
[14:01:27.454] INFO (2948): request completed {"req":{"id":"req-s","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:35301","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-1","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35534},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-s","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[14:01:27.461] INFO (2948): request completed {"req":{"id":"req-t","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:38237","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-2","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49838},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-t","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[14:01:27.467] INFO (2948): request completed {"req":{"id":"req-u","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:38265","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-3","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34872},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-u","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[14:01:27.473] INFO (2948): request completed {"req":{"id":"req-v","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:43599","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-4","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47470},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-v","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[14:01:27.481] INFO (2948): request completed {"req":{"id":"req-w","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:38711","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-5","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47476},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-w","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[14:01:27.486] INFO (2948): request completed {"req":{"id":"req-x","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:34479","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-6","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54230},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-x","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":4}
[14:01:27.493] INFO (2948): request completed {"req":{"id":"req-y","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:42569","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-7","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40972},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-y","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[14:01:27.499] INFO (2948): request completed {"req":{"id":"req-z","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:43931","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-8","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38304},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-z","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":4}
[14:01:27.506] INFO (2948): request completed {"req":{"id":"req-10","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:44817","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-9","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52232},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-10","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[14:01:27.513] INFO (2948): request completed {"req":{"id":"req-11","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:37029","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-10","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33470},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-11","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.519] INFO (2948): request completed {"req":{"id":"req-12","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:37831","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-11","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35226},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-12","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.526] INFO (2948): request completed {"req":{"id":"req-13","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:46605","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-12","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35132},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-13","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.532] INFO (2948): request completed {"req":{"id":"req-14","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33987","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-13","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50464},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-14","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.538] INFO (2948): request completed {"req":{"id":"req-15","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:45801","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-14","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49060},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-15","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.544] INFO (2948): request completed {"req":{"id":"req-16","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33537","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-15","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45232},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-16","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.550] INFO (2948): request completed {"req":{"id":"req-17","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39981","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-16","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43348},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-17","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.557] INFO (2948): request completed {"req":{"id":"req-18","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:45247","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-17","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33030},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-18","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.563] INFO (2948): request completed {"req":{"id":"req-19","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40787","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-18","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44906},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-19","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.571] INFO (2948): request completed {"req":{"id":"req-1a","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40823","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-19","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45414},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1a","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":6}
[14:01:27.578] INFO (2948): request completed {"req":{"id":"req-1b","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:41091","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-20","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44074},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1b","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":6}
[14:01:27.584] INFO (2948): request completed {"req":{"id":"req-1c","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:42413","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-21","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33226},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1c","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[14:01:27.590] INFO (2948): request completed {"req":{"id":"req-1d","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:46805","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-22","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50010},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1d","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[14:01:27.597] INFO (2948): request completed {"req":{"id":"req-1e","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:36411","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-23","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57628},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1e","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.604] INFO (2948): request completed {"req":{"id":"req-1f","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:46589","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-24","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40404},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1f","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.613] INFO (2948): request completed {"req":{"id":"req-1g","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40857","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-25","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34742},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1g","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":7}
[14:01:27.625] INFO (2948): request completed {"req":{"id":"req-1h","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:42305","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-26","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38564},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1h","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":8}
[14:01:27.633] INFO (2948): request completed {"req":{"id":"req-1i","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:35249","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-27","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53880},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1i","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":6}
[14:01:27.641] INFO (2948): request completed {"req":{"id":"req-1j","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:42213","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-28","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42004},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1j","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.648] INFO (2948): request completed {"req":{"id":"req-1k","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33585","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-29","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42664},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1k","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[14:01:27.655] INFO (2948): request completed {"req":{"id":"req-1l","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:41117","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-over-limit","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39102},"res":{"statusCode":429,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1l","content-type":"application/json; charset=utf-8","content-length":"264"}},"responseTime":5}
[14:01:27.669] INFO (2948): request completed {"req":{"id":"req-1m","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35283","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33862},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1m","set-cookie":["shopcity_session=c5e1899a-521e-4893-a7d9-6e04458705bb; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=893bd24d-a974-4038-bd6a-5fefac0a273a; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":9}
[14:01:27.680] INFO (2948): request completed {"req":{"id":"req-1n","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:37003","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c5e1899a-521e-4893-a7d9-6e04458705bb","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42364},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1n","content-type":"application/json; charset=utf-8","content-length":"285"}},"responseTime":4}
[14:01:27.693] INFO (2948): request completed {"req":{"id":"req-1o","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:41729","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c5e1899a-521e-4893-a7d9-6e04458705bb","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41114},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1o","content-type":"application/json; charset=utf-8","content-length":"285"}},"responseTime":5}
[14:01:27.712] INFO (2948): request completed {"req":{"id":"req-1p","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:38191","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39292},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1p","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":3}
[14:01:27.720] INFO (2948): request errored {"req":{"id":"req-1q","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:45267","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51418},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1q","content-type":"application/json; charset=utf-8","content-length":"331"}},"responseTime":3}
err: {
"type": "Error",
"message": "failed with status code 503",
"stack":
Error: failed with status code 503
at onResFinished (/home/runner/work/shopcity_LP/shopcity_LP/node_modules/pino-http/logger.js:115:39)
at ServerResponse.onResponseComplete (/home/runner/work/shopcity_LP/shopcity_LP/node_modules/pino-http/logger.js:178:14)
at ServerResponse.emit (node:events:531:35)
at onFinish (node:_http_outgoing:1084:10)
at callback (node:internal/streams/writable:766:21)
at afterWrite (node:internal/streams/writable:710:5)
at afterWriteTick (node:internal/streams/writable:696:10)
at processTicksAndRejections (node:internal/process/task_queues:88:21)
}
[14:01:27.728] INFO (2948): request errored {"req":{"id":"req-1r","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:39393","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56982},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1r","content-type":"application/json; charset=utf-8","content-length":"331"}},"responseTime":3}
err: {
"type": "Error",
"message": "failed with status code 503",
"stack":
Error: failed with status code 503
at onResFinished (/home/runner/work/shopcity_LP/shopcity_LP/node_modules/pino-http/logger.js:115:39)
at ServerResponse.onResponseComplete (/home/runner/work/shopcity_LP/shopcity_LP/node_modules/pino-http/logger.js:178:14)
at ServerResponse.emit (node:events:531:35)
at onFinish (node:_http_outgoing:1084:10)
at callback (node:internal/streams/writable:766:21)
at afterWrite (node:internal/streams/writable:710:5)
at afterWriteTick (node:internal/streams/writable:696:10)
at processTicksAndRejections (node:internal/process/task_queues:88:21)
}
PASS test/auth-http.int-spec.ts (7.654 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32772"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
PASS test/redemption-approval.int-spec.ts (6.266 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32773"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32774"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32775"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
PASS test/financial-repair-restore.int-spec.ts (17.013 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32776"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
PASS test/outbox-worker-recovery.int-spec.ts (25.347 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32777"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
PASS test/redemption-allocation-invariants.int-spec.ts (5.753 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32778"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
FAIL test/lot-allocation-ordering.int-spec.ts (5.682 s)
● lot allocation ordering (int) › allocates FIFO by expiry, earned-at, and id while ignoring ineligible lots

    PrismaClientUnknownRequestError:
    Invalid `tx.adjustment.update()` invocation in
    /home/runner/work/shopcity_LP/shopcity_LP/test/lot-allocation-ordering.int-spec.ts:58:27

      55   },
      56 });
      57
    → 58 await tx.adjustment.update(
    Error occurred during query execution:
    ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "P0001", message: "adjustment evidence fields are immutable", severity: "ERROR", detail: None, column: None, hint: None }), transient: false })

      56 |       });
      57 |
    > 58 |       await tx.adjustment.update({
         |       ^
      59 |         where: {
      60 |           tenantId_id: { tenantId: fixture.tenantId, id: fixture.adjustmentId },
      61 |         },

      at ei.handleRequestError (../node_modules/@prisma/client/src/runtime/RequestHandler.ts:237:13)
      at ei.handleAndLogRequestError (../node_modules/@prisma/client/src/runtime/RequestHandler.ts:174:12)
      at ei.request (../node_modules/@prisma/client/src/runtime/RequestHandler.ts:143:12)
      at a (../node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24)
      at lot-allocation-ordering.int-spec.ts:58:7
      at Proxy._transactionWithCallback (../node_modules/@prisma/client/src/runtime/getPrismaClient.ts:722:18)
      at Object.<anonymous> (lot-allocation-ordering.int-spec.ts:41:25)

Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-J8lKRe/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32779"

6 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql

All migrations have been successfully applied.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-nR2XAd/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32780"

6 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql

All migrations have been successfully applied.
Script executed successfully.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-nR2XAd/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32780"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`

The following migration(s) have been applied:

migrations/
└─ 20260720_receipt_integrity_gate/
└─ migration.sql

All migrations have been successfully applied.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-Yk73MV/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32781"

6 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql

All migrations have been successfully applied.
Script executed successfully.
Script executed successfully.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-Yk73MV/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32781"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260720_receipt_integrity_gate

Database error code: P0001

Database error:
ERROR: Receipt legacy POS references are missing

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(EP0001), message: "Receipt legacy POS references are missing", detail: None, hint: None, position: None, where_: Some("PL/pgSQL function inline_code_block line 24 at RAISE"), schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("pl_exec.c"), line: Some(3897), routine: Some("exec_stmt_raise") }

Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-l40v1k/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32782"

6 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql

All migrations have been successfully applied.
Script executed successfully.
Script executed successfully.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-l40v1k/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32782"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260720_receipt_integrity_gate

Database error code: P0001

Database error:
ERROR: Duplicate legacy POS receipt identities require resolution

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(EP0001), message: "Duplicate legacy POS receipt identities require resolution", detail: None, hint: None, position: None, where_: Some("PL/pgSQL function inline_code_block line 15 at RAISE"), schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("pl_exec.c"), line: Some(3897), routine: Some("exec_stmt_raise") }

PASS test/receipt-migration-upgrade.int-spec.ts (33.591 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32783"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
PASS test/financial-state-invariants.int-spec.ts (5.79 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32784"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
PASS test/sms-reference-backfill.int-spec.ts (5.658 s)
PASS test/openapi.int-spec.ts
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32785"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
PASS test/phase-1.int-spec.ts (5.891 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32786"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
[14:03:29.751] INFO (2948): request errored {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42265","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54720},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","content-type":"application/json; charset=utf-8","content-length":"319"}},"responseTime":3195}
err: {
"type": "Error",
"message": "failed with status code 503",
"stack":
Error: failed with status code 503
at onResFinished (/home/runner/work/shopcity_LP/shopcity_LP/node_modules/pino-http/logger.js:115:39)
at ServerResponse.onResponseComplete (/home/runner/work/shopcity_LP/shopcity_LP/node_modules/pino-http/logger.js:178:14)
at ServerResponse.emit (node:events:531:35)
at onFinish (node:_http_outgoing:1084:10)
at callback (node:internal/streams/writable:766:21)
at afterWrite (node:internal/streams/writable:710:5)
at afterWriteTick (node:internal/streams/writable:696:10)
at processTicksAndRejections (node:internal/process/task_queues:88:21)
}
PASS test/redis-throttle-fail-closed.int-spec.ts (9.447 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32787"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
PASS test/tenant-ownership.int-spec.ts (5.649 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32788"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
PASS test/customer-email.int-spec.ts (5.321 s)
PASS test/health.int-spec.ts
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32789"

26 migrations found in prisma/migrations

Applying migration `20260719_phase_1_integrity_hardening`
Applying migration `20260719_phase_1_trust_and_integrity_hardening`
Applying migration `20260720_fix_audit_actor_fk_name`
Applying migration `20260720_phase_1_5_foundation_hardening`
Applying migration `20260720_phase_1_6_tenant_ownership_alignment`
Applying migration `20260720_receipt_capture_endpoint`
Applying migration `20260720_receipt_integrity_gate`
Applying migration `20260721_pre_ledger_hardening`
Applying migration `20260721_receipt_review_workflow`
Applying migration `20260722_immutable_earn_ledger`
Applying migration `20260722_immutable_earn_ledger_hardening`
Applying migration `20260722_outbox_worker_recovery`
Applying migration `20260722_sms_delivery_reliability`
Applying migration `20260724_approval_policy_and_outbox_terminalization`
Applying migration `20260725_sprint_2_financial_integrity_closure`
Applying migration `20260725_sprint_2_financial_integrity_lifecycle_closure`
Applying migration `20260726_sprint_3_redemption_foundation`
Applying migration `20260727_redemption_allocation_invariant_hardening`
Applying migration `20260728_sms_transaction_ownership`
Applying migration `20260729_redeem_approval_receipt_nullable`
Applying migration `20260730_financial_state_invariants`
Applying migration `20260731_approval_expiry_index`
Applying migration `20260731_financial_ledger_pair_guard`
Applying migration `20260731_sms_reference_backfill`
Applying migration `20260801_financial_guardrail_updates`
Applying migration `20260802_financial_guardrail_repair`

The following migration(s) have been applied:

migrations/
└─ 20260719_phase_1_integrity_hardening/
└─ migration.sql
└─ 20260719_phase_1_trust_and_integrity_hardening/
└─ migration.sql
└─ 20260720_fix_audit_actor_fk_name/
└─ migration.sql
└─ 20260720_phase_1_5_foundation_hardening/
└─ migration.sql
└─ 20260720_phase_1_6_tenant_ownership_alignment/
└─ migration.sql
└─ 20260720_receipt_capture_endpoint/
└─ migration.sql
└─ 20260720_receipt_integrity_gate/
└─ migration.sql
└─ 20260721_pre_ledger_hardening/
└─ migration.sql
└─ 20260721_receipt_review_workflow/
└─ migration.sql
└─ 20260722_immutable_earn_ledger/
└─ migration.sql
└─ 20260722_immutable_earn_ledger_hardening/
└─ migration.sql
└─ 20260722_outbox_worker_recovery/
└─ migration.sql
└─ 20260722_sms_delivery_reliability/
└─ migration.sql
└─ 20260724_approval_policy_and_outbox_terminalization/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_closure/
└─ migration.sql
└─ 20260725_sprint_2_financial_integrity_lifecycle_closure/
└─ migration.sql
└─ 20260726_sprint_3_redemption_foundation/
└─ migration.sql
└─ 20260727_redemption_allocation_invariant_hardening/
└─ migration.sql
└─ 20260728_sms_transaction_ownership/
└─ migration.sql
└─ 20260729_redeem_approval_receipt_nullable/
└─ migration.sql
└─ 20260730_financial_state_invariants/
└─ migration.sql
└─ 20260731_approval_expiry_index/
└─ migration.sql
└─ 20260731_financial_ledger_pair_guard/
└─ migration.sql
└─ 20260731_sms_reference_backfill/
└─ migration.sql
└─ 20260801_financial_guardrail_updates/
└─ migration.sql
└─ 20260802_financial_guardrail_repair/
└─ migration.sql

All migrations have been successfully applied.
PASS test/outbox-migration-deploy.int-spec.ts (5.248 s)
PASS test/bootstrap-credential.int-spec.ts
PASS test/prisma.int-spec.ts

Test Suites: 1 failed, 19 passed, 20 total
Tests: 1 failed, 98 passed, 99 total
Snapshots: 0 total
Time: 170.675 s
Ran all test suites.
Error: Process completed with exit code 1.
