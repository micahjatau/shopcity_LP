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
[13:37:39.989] INFO (2948): request completed {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42247","accept-encoding":"gzip, deflate","x-device-id":"c19813e9-aa7a-40bf-838e-009a29af4543","content-type":"application/json","x-device-attestation":"1785677859823.56abe41a-dc29-4635-ac26-d00d8ce8939d.Exw2MdY4eTTfsak7sothQJRkfNYzWdvUWpyi_lX0jjE","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60350},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","set-cookie":["shopcity_session=0366a598-afcb-4b84-9a86-cd673e13331d; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e9d6c941-c8e6-40a2-bbca-ea117c592342; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":109}
[13:37:40.056] INFO (2948): request completed {"req":{"id":"req-2","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37625","accept-encoding":"gzip, deflate","cookie":"shopcity_session=0366a598-afcb-4b84-9a86-cd673e13331d; shopcity_csrf=e9d6c941-c8e6-40a2-bbca-ea117c592342","x-csrf-token":"e9d6c941-c8e6-40a2-bbca-ea117c592342","idempotency-key":"receipt-key-1","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57000},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-2","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":60}
[13:37:40.070] INFO (2948): request completed {"req":{"id":"req-3","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:35309","accept-encoding":"gzip, deflate","cookie":"shopcity_session=0366a598-afcb-4b84-9a86-cd673e13331d; shopcity_csrf=e9d6c941-c8e6-40a2-bbca-ea117c592342","x-csrf-token":"e9d6c941-c8e6-40a2-bbca-ea117c592342","idempotency-key":"receipt-key-1","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51976},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-3","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":11}
[13:37:40.124] INFO (2948): request completed {"req":{"id":"req-4","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:43053","accept-encoding":"gzip, deflate","x-device-id":"1570b166-b464-4def-b348-b38a769b8529","content-type":"application/json","x-device-attestation":"1785677860091.f2e6b673-3c8b-4deb-8db1-1669bc1252d4.s54voCCIWHMN0r51ZfYDXciiLXYGUFfRsxfDKzH7jjo","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43616},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-4","set-cookie":["shopcity_session=bf492636-7ab5-44f3-b902-a17bf0c9c82f; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=21740ef4-68ae-4619-bd15-bf2d92e98ff2; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":31}
[13:37:40.214] INFO (2948): request completed {"req":{"id":"req-5","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:41839","accept-encoding":"gzip, deflate","cookie":"shopcity_session=bf492636-7ab5-44f3-b902-a17bf0c9c82f; shopcity_csrf=21740ef4-68ae-4619-bd15-bf2d92e98ff2","x-csrf-token":"21740ef4-68ae-4619-bd15-bf2d92e98ff2","idempotency-key":"receipt-key-2","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38492},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-5","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":84}
[13:37:40.232] INFO (2948): request completed {"req":{"id":"req-6","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43413","accept-encoding":"gzip, deflate","cookie":"shopcity_session=bf492636-7ab5-44f3-b902-a17bf0c9c82f; shopcity_csrf=21740ef4-68ae-4619-bd15-bf2d92e98ff2","x-csrf-token":"21740ef4-68ae-4619-bd15-bf2d92e98ff2","idempotency-key":"receipt-key-3","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41050},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-6","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":15}
[13:37:40.260] INFO (2948): request completed {"req":{"id":"req-7","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35361","accept-encoding":"gzip, deflate","x-device-id":"93ea2229-302d-44cf-9ccd-5bdb6fc0752c","content-type":"application/json","x-device-attestation":"1785677860247.b8c2a832-027a-4a65-9357-f280aa36f731.I09DtsM7iZ_PO7aTWHVKpv6ZqYBAoanef935aqJShFU","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34586},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-7","set-cookie":["shopcity_session=c8712259-c6c9-41c5-87fa-02781e71c0d7; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=7bca4a88-09ce-4538-a472-292ae76ba2f2; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":11}
[13:37:40.276] INFO (2948): request completed {"req":{"id":"req-8","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35851","accept-encoding":"gzip, deflate","x-device-id":"814bb40e-345f-42cb-b357-a08c9929403a","content-type":"application/json","x-device-attestation":"1785677860264.063b370d-282d-4bc4-a757-d38112d9374b.b3ec6KI9Lw1ulSGp2RhxUU-qmr2EoOTOWhvzQf97DY4","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46004},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-8","set-cookie":["shopcity_session=a1b8422d-ed6a-4d37-af79-bbe0e246d0ad; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=158cd92a-a7a7-4793-aaf5-d54efb017912; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"332"}},"responseTime":10}
[13:37:40.305] INFO (2948): request completed {"req":{"id":"req-9","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37637","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c8712259-c6c9-41c5-87fa-02781e71c0d7; shopcity_csrf=7bca4a88-09ce-4538-a472-292ae76ba2f2","x-csrf-token":"7bca4a88-09ce-4538-a472-292ae76ba2f2","idempotency-key":"receipt-key-4","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49018},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-9","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":25}
[13:37:40.325] INFO (2948): request completed {"req":{"id":"req-a","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:36973","accept-encoding":"gzip, deflate","cookie":"shopcity_session=a1b8422d-ed6a-4d37-af79-bbe0e246d0ad; shopcity_csrf=158cd92a-a7a7-4793-aaf5-d54efb017912","x-csrf-token":"158cd92a-a7a7-4793-aaf5-d54efb017912","idempotency-key":"receipt-key-5","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58860},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-a","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":17}
[13:37:40.346] INFO (2948): request completed {"req":{"id":"req-b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44505","accept-encoding":"gzip, deflate","x-device-id":"d4b3dae4-82b3-4842-8da2-5511323cf936","content-type":"application/json","x-device-attestation":"1785677860335.65f6c3aa-3763-4dae-a756-45772731b6cb.jkXlwLlISIu9lGIla0bzfRIr6GwsQElwZuA9GXKj0xs","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42170},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-b","set-cookie":["shopcity_session=c61ce946-2233-4d88-a2db-be38e6542f9b; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=2cd2b097-572e-4046-a6a5-c15a49b2b74e; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[13:37:40.379] INFO (2948): request completed {"req":{"id":"req-c","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:34035","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c61ce946-2233-4d88-a2db-be38e6542f9b; shopcity_csrf=2cd2b097-572e-4046-a6a5-c15a49b2b74e","x-csrf-token":"2cd2b097-572e-4046-a6a5-c15a49b2b74e","idempotency-key":"receipt-key-4a","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54804},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-c","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":30}
[13:37:40.541] INFO (2948): request completed {"req":{"id":"req-d","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:34035","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c61ce946-2233-4d88-a2db-be38e6542f9b; shopcity_csrf=2cd2b097-572e-4046-a6a5-c15a49b2b74e","x-csrf-token":"2cd2b097-572e-4046-a6a5-c15a49b2b74e","idempotency-key":"receipt-key-4b","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54820},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-d","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":191}
[13:37:40.565] INFO (2948): request completed {"req":{"id":"req-e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38655","accept-encoding":"gzip, deflate","x-device-id":"c3c6ad7e-83a1-4cd3-a170-e65384322dc7","content-type":"application/json","x-device-attestation":"1785677860553.b93398e8-f334-4691-b24c-c3695f326194.k3d_8L99oqzUPU2KaMq39oMZJboEC0vfYqbzdea5jIU","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47628},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-e","set-cookie":["shopcity_session=382073f8-0147-41f6-90b3-abd0ade79990; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=85360e72-ba88-40c6-973a-d6b6c07881f0; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[13:37:40.595] INFO (2948): request completed {"req":{"id":"req-f","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:33113","accept-encoding":"gzip, deflate","cookie":"shopcity_session=382073f8-0147-41f6-90b3-abd0ade79990; shopcity_csrf=85360e72-ba88-40c6-973a-d6b6c07881f0","x-csrf-token":"85360e72-ba88-40c6-973a-d6b6c07881f0","idempotency-key":"receipt-key-6","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39230},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-f","content-type":"application/json; charset=utf-8","content-length":"580"}},"responseTime":23}
[13:37:40.617] INFO (2948): request completed {"req":{"id":"req-g","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:35499","accept-encoding":"gzip, deflate","cookie":"shopcity_session=382073f8-0147-41f6-90b3-abd0ade79990; shopcity_csrf=85360e72-ba88-40c6-973a-d6b6c07881f0","x-csrf-token":"85360e72-ba88-40c6-973a-d6b6c07881f0","idempotency-key":"receipt-key-7","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54088},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-g","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":20}
[13:37:40.642] INFO (2948): request completed {"req":{"id":"req-h","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:45051","accept-encoding":"gzip, deflate","x-device-id":"8f015930-864a-49d8-b69a-339f48762ef6","content-type":"application/json","x-device-attestation":"1785677860628.b5030793-235f-4003-84cc-9aa7e348c933.vg0oO_8uQoKSqKzGDaI8byyEXO3KwVSIMzm1WCcsE9o","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50882},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-h","set-cookie":["shopcity_session=f161b69d-6c70-4b8a-be73-28b1674b1f66; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=5b2abbd8-4a5c-4fa1-9087-3870f7ccff08; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":13}
[13:37:40.670] INFO (2948): request completed {"req":{"id":"req-i","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:41609","accept-encoding":"gzip, deflate","cookie":"shopcity_session=f161b69d-6c70-4b8a-be73-28b1674b1f66; shopcity_csrf=5b2abbd8-4a5c-4fa1-9087-3870f7ccff08","x-csrf-token":"5b2abbd8-4a5c-4fa1-9087-3870f7ccff08","idempotency-key":"receipt-key-8","content-type":"application/json","content-length":"175","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56944},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-i","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":26}
[13:37:40.698] INFO (2948): request completed {"req":{"id":"req-j","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37035","accept-encoding":"gzip, deflate","cookie":"shopcity_session=f161b69d-6c70-4b8a-be73-28b1674b1f66; shopcity_csrf=5b2abbd8-4a5c-4fa1-9087-3870f7ccff08","x-csrf-token":"5b2abbd8-4a5c-4fa1-9087-3870f7ccff08","idempotency-key":"receipt-key-9","content-type":"application/json","content-length":"175","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50046},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-j","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":24}
[13:37:40.726] INFO (2948): request completed {"req":{"id":"req-k","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41679","accept-encoding":"gzip, deflate","x-device-id":"ea34965a-467a-4383-8499-45ba86437a48","content-type":"application/json","x-device-attestation":"1785677860715.2523d8e2-4cde-4821-990a-fe78cacf043c.TSeufkQA809wzwRoaItJvbDZsNhBAvxZ3_Jyf0fOp4w","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60940},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-k","set-cookie":["shopcity_session=9635abe2-3313-4b37-95e9-6dc85b60ffcf; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e1e076d4-2705-43fb-a47a-4c1522e562a1; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[13:37:40.755] INFO (2948): request completed {"req":{"id":"req-l","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:39323","accept-encoding":"gzip, deflate","cookie":"shopcity_session=9635abe2-3313-4b37-95e9-6dc85b60ffcf; shopcity_csrf=e1e076d4-2705-43fb-a47a-4c1522e562a1","x-csrf-token":"e1e076d4-2705-43fb-a47a-4c1522e562a1","idempotency-key":"receipt-key-8a","content-type":"application/json","content-length":"177","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50498},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-l","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":28}
[13:37:40.788] INFO (2948): request completed {"req":{"id":"req-m","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41379","accept-encoding":"gzip, deflate","x-device-id":"4c2eaa33-ced6-47ec-904a-ab9e5bf7596b","content-type":"application/json","x-device-attestation":"1785677860771.f05c566b-50be-49c5-a473-2e8b57e99409.DQ-fUIg1bkbXYAR9KbQLWmT1QpQ1o1FIeCSODpaQe8Y","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58500},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-m","set-cookie":["shopcity_session=0d3dca4b-b9c7-406d-9893-5bc011cd33f1; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=15b8d7a3-1652-4a73-b3bc-e317dbd845d2; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":16}
[13:37:40.803] INFO (2948): request completed {"req":{"id":"req-n","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:38309","accept-encoding":"gzip, deflate","cookie":"shopcity_session=0d3dca4b-b9c7-406d-9893-5bc011cd33f1; shopcity_csrf=15b8d7a3-1652-4a73-b3bc-e317dbd845d2","x-csrf-token":"15b8d7a3-1652-4a73-b3bc-e317dbd845d2","idempotency-key":"receipt-key-8b","content-type":"application/json","content-length":"174","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54672},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-n","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":13}
[13:37:40.856] INFO (2948): request completed {"req":{"id":"req-o","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41645","accept-encoding":"gzip, deflate","x-device-id":"7f0f7232-a413-4253-b528-e7a3da361a1f","content-type":"application/json","x-device-attestation":"1785677860840.1fc9bf93-ca9f-444f-9192-b566dc6643b9.xw0ywkxBy7R2eeHXej8kSProvcmWgnZeS8LOdPhEiR0","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35064},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-o","set-cookie":["shopcity_session=5c3b032c-c334-4718-98ac-1d7beeb5a824; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=1fe538f1-16a9-4503-aa3c-9ae5018df1fa; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":13}
[13:37:40.866] INFO (2948): request completed {"req":{"id":"req-p","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42105","accept-encoding":"gzip, deflate","x-device-id":"0efe93d5-5230-4d41-8ba2-4ae095c7bdb5","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50220},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-p","content-type":"application/json; charset=utf-8","content-length":"283"}},"responseTime":5}
[13:37:40.876] INFO (2948): request completed {"req":{"id":"req-q","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:44989","accept-encoding":"gzip, deflate","cookie":"shopcity_session=5c3b032c-c334-4718-98ac-1d7beeb5a824; shopcity_csrf=1fe538f1-16a9-4503-aa3c-9ae5018df1fa","x-csrf-token":"1fe538f1-16a9-4503-aa3c-9ae5018df1fa","idempotency-key":"receipt-key-10","content-type":"application/json","content-length":"179","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39246},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-q","content-type":"application/json; charset=utf-8","content-length":"311"}},"responseTime":7}
[13:37:40.886] INFO (2948): request completed {"req":{"id":"req-r","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:45035","accept-encoding":"gzip, deflate","x-device-id":"8e5f8845-f1dd-409d-bf19-45b396937634","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39980},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-r","content-type":"application/json; charset=utf-8","content-length":"283"}},"responseTime":5}
[13:37:40.911] INFO (2948): request completed {"req":{"id":"req-s","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42909","accept-encoding":"gzip, deflate","x-device-id":"aa3ad0a4-44ab-46ec-bbcd-b548e9c6674f","content-type":"application/json","x-device-attestation":"1785677860901.68027011-756d-43d6-8d8f-00a5c0abd7c2.CCK2M3D5AF5bJiahM8SDlOdF_o7TqY7ZXqFI0hk2kjQ","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53888},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-s","set-cookie":["shopcity_session=9a383627-1145-4fd1-8982-b2acc87b086b; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=5cb4ecdc-848e-4c41-b646-0bc8a273ba2c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"301"}},"responseTime":9}
[13:37:40.949] INFO (2948): request completed {"req":{"id":"req-t","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40231","accept-encoding":"gzip, deflate","cookie":"shopcity_session=9a383627-1145-4fd1-8982-b2acc87b086b; shopcity_csrf=5cb4ecdc-848e-4c41-b646-0bc8a273ba2c","x-csrf-token":"5cb4ecdc-848e-4c41-b646-0bc8a273ba2c","idempotency-key":"receipt-key-10a","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56144},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-t","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":28}
[13:37:40.971] INFO (2948): request completed {"req":{"id":"req-u","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:43471","accept-encoding":"gzip, deflate","x-device-id":"c0c53810-a8ad-4bb2-a126-479ab03dab44","content-type":"application/json","x-device-attestation":"1785677860960.c9645962-b53e-4f53-aa2c-5cfa258d5df1.nHTW2pAQtmnTMROBxtCdXSrkBMofGvO-cfLHhSwv8u4","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46730},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-u","set-cookie":["shopcity_session=4892091c-cba1-47d7-875c-b6f149d7a4e4; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=effbc2ec-f047-4e3e-bf21-fbeeb79383ed; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[13:37:40.984] INFO (2948): request completed {"req":{"id":"req-v","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33423","accept-encoding":"gzip, deflate","x-device-id":"0ab72c68-a7c9-44eb-ac61-144e2f123720","content-type":"application/json","x-device-attestation":"1785677860974.f3a8ee9a-c4f8-4e85-966d-08a474a4c566.RIMViQfNqVftwqlGla8n0IHUDIwCWTFTae9zeTG3ge0","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46478},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-v","set-cookie":["shopcity_session=1db9d9b7-9762-470e-b912-afcc06b1065c; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=c6bb695f-de44-4d7d-8b9f-9b02376fadd5; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"332"}},"responseTime":9}
[13:37:40.993] INFO (2948): request completed {"req":{"id":"req-w","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:33269","accept-encoding":"gzip, deflate","cookie":"shopcity_session=1db9d9b7-9762-470e-b912-afcc06b1065c; shopcity_csrf=c6bb695f-de44-4d7d-8b9f-9b02376fadd5","x-csrf-token":"c6bb695f-de44-4d7d-8b9f-9b02376fadd5","idempotency-key":"receipt-key-13","content-type":"application/json","content-length":"136","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44062},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-w","content-type":"application/json; charset=utf-8","content-length":"309"}},"responseTime":6}
[13:37:41.006] INFO (2948): request completed {"req":{"id":"req-x","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:46519","accept-encoding":"gzip, deflate","cookie":"shopcity_session=1db9d9b7-9762-470e-b912-afcc06b1065c; shopcity_csrf=c6bb695f-de44-4d7d-8b9f-9b02376fadd5","x-csrf-token":"c6bb695f-de44-4d7d-8b9f-9b02376fadd5","idempotency-key":"receipt-key-14","content-type":"application/json","content-length":"135","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60160},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-x","content-type":"application/json; charset=utf-8","content-length":"297"}},"responseTime":9}
[13:37:41.026] INFO (2948): request completed {"req":{"id":"req-y","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:36933","accept-encoding":"gzip, deflate","x-device-id":"e0876c92-2850-442f-aede-26320b0d2e3d","content-type":"application/json","x-device-attestation":"1785677861015.2c603747-050c-4d67-b5ee-b2dea40f2489._soa6ceFkbjDGRtuDbZTum14kb-E2ZhJi2J65iVwhhQ","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44974},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-y","set-cookie":["shopcity_session=ee56f6d2-c380-4761-a0b6-0be7e2252685; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e81821ae-b084-497a-9017-ecae66d337a3; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[13:37:41.040] INFO (2948): request completed {"req":{"id":"req-z","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34187","accept-encoding":"gzip, deflate","x-device-id":"e0876c92-2850-442f-aede-26320b0d2e3d","content-type":"application/json","x-device-attestation":"1785677861030.d5adaa79-476b-455b-a03a-e1241d2ba531.PKpcRTvf9P610eh1EZ7MtevAvn0XtuUmPQFEsfju_UQ","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40932},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-z","set-cookie":["shopcity_session=52275037-3744-4d78-b7f3-35b0a9636f7c; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=0bcfbf17-74cd-4229-b950-87ffcc9e6445; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[13:37:41.068] INFO (2948): request completed {"req":{"id":"req-10","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:44381","accept-encoding":"gzip, deflate","cookie":"shopcity_session=52275037-3744-4d78-b7f3-35b0a9636f7c; shopcity_csrf=0bcfbf17-74cd-4229-b950-87ffcc9e6445","x-csrf-token":"0bcfbf17-74cd-4229-b950-87ffcc9e6445","idempotency-key":"receipt-key-15","content-type":"application/json","content-length":"190","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50148},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-10","content-type":"application/json; charset=utf-8","content-length":"589"}},"responseTime":26}
[13:37:41.091] INFO (2948): request completed {"req":{"id":"req-11","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40483","accept-encoding":"gzip, deflate","x-device-id":"7dfedb6f-f6cf-467e-a2d2-140cfe118acf","content-type":"application/json","x-device-attestation":"1785677861080.b6c0fec8-f057-4bbc-b141-d5f6d67a4c70.WONfesB-BUZsfOYPte6FMY2IweuPUTeoTG8lNuJ4uE0","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57846},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-11","set-cookie":["shopcity_session=0c4ecfa3-a947-4d28-9a29-021e37383d49; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=f21d4ab7-6d57-48c0-9765-00ab30653f9c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":10}
[13:37:41.127] INFO (2948): request completed {"req":{"id":"req-12","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:38593","accept-encoding":"gzip, deflate","cookie":"shopcity_session=0c4ecfa3-a947-4d28-9a29-021e37383d49; shopcity_csrf=f21d4ab7-6d57-48c0-9765-00ab30653f9c","x-csrf-token":"f21d4ab7-6d57-48c0-9765-00ab30653f9c","idempotency-key":"receipt-key-16","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50726},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-12","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":34}
[13:37:41.154] INFO (2948): request completed {"req":{"id":"req-13","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40545","accept-encoding":"gzip, deflate","x-device-id":"ddc61482-64b9-40d0-8c7e-2f27918f6b0e","content-type":"application/json","x-device-attestation":"1785677861140.7e8b787e-7d7e-4785-a3d0-666e5c3a393b.dD_jkHCqteryPsVNQYrhJ5f3AmwpRFRRTodIXpo0724","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40718},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-13","set-cookie":["shopcity_session=64483083-f9aa-45f3-baaa-94fbef309283; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=02c18d32-afc0-4c74-b3c5-878329f910b3; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":13}
[13:37:41.182] INFO (2948): request completed {"req":{"id":"req-14","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43809","accept-encoding":"gzip, deflate","cookie":"shopcity_session=64483083-f9aa-45f3-baaa-94fbef309283; shopcity_csrf=02c18d32-afc0-4c74-b3c5-878329f910b3","x-csrf-token":"02c18d32-afc0-4c74-b3c5-878329f910b3","idempotency-key":"receipt-key-16a","content-type":"application/json","content-length":"138","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54382},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-14","content-type":"application/json; charset=utf-8","content-length":"596"}},"responseTime":24}
[13:37:41.202] INFO (2948): request completed {"req":{"id":"req-15","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:39639","accept-encoding":"gzip, deflate","cookie":"shopcity_session=64483083-f9aa-45f3-baaa-94fbef309283; shopcity_csrf=02c18d32-afc0-4c74-b3c5-878329f910b3","x-csrf-token":"02c18d32-afc0-4c74-b3c5-878329f910b3","idempotency-key":"receipt-key-16b","content-type":"application/json","content-length":"136","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41282},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-15","content-type":"application/json; charset=utf-8","content-length":"594"}},"responseTime":18}
[13:37:41.211] INFO (2948): request completed {"req":{"id":"req-16","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40903","accept-encoding":"gzip, deflate","cookie":"shopcity_session=64483083-f9aa-45f3-baaa-94fbef309283; shopcity_csrf=02c18d32-afc0-4c74-b3c5-878329f910b3","x-csrf-token":"02c18d32-afc0-4c74-b3c5-878329f910b3","idempotency-key":"receipt-key-16c","content-type":"application/json","content-length":"138","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51866},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-16","content-type":"application/json; charset=utf-8","content-length":"334"}},"responseTime":7}
[13:37:41.229] INFO (2948): request completed {"req":{"id":"req-17","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39121","accept-encoding":"gzip, deflate","x-device-id":"3cb3d7e1-c829-4d2e-9bac-982ffa8a8cb4","content-type":"application/json","x-device-attestation":"1785677861219.1a9bafb5-ed2a-4ac4-9bd7-6b887a12f1d0.77wUwj2-Ocq5Ek_h7ORILOcEIPiqigHqCuaCCx5YTuA","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40304},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-17","set-cookie":["shopcity_session=2684fe91-bfba-4e4b-b509-50cc51a109c7; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=fb2934df-7acc-49bf-a863-3715079a7a8e; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":9}
[13:37:41.249] INFO (2948): request completed {"req":{"id":"req-18","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:41283","accept-encoding":"gzip, deflate","cookie":"shopcity_session=2684fe91-bfba-4e4b-b509-50cc51a109c7; shopcity_csrf=fb2934df-7acc-49bf-a863-3715079a7a8e","x-csrf-token":"fb2934df-7acc-49bf-a863-3715079a7a8e","idempotency-key":"receipt-key-17","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60858},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-18","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":18}
[13:37:41.266] INFO (2948): request completed {"req":{"id":"req-19","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38461","accept-encoding":"gzip, deflate","x-device-id":"3cb3d7e1-c829-4d2e-9bac-982ffa8a8cb4","content-type":"application/json","x-device-attestation":"1785677861250.c08abc7f-6a85-4b87-abf5-8ef52ff57fcf.cdOZnrrgaQ_45oxYG189pNKdblwMkxEaC7sb7W_iqa0","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52646},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-19","set-cookie":["shopcity_session=db96c7b8-4d0e-45d7-86f5-0c4663354e4b; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=59fc56de-0c7f-4998-8211-e7d423d402c2; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":14}
[13:37:41.300] INFO (2948): request completed {"req":{"id":"req-1a","method":"POST","url":"/api/v1/receipts/b3e0fb21-044d-4585-938c-e77d08e2047d/approve","query":{},"headers":{"host":"127.0.0.1:38661","accept-encoding":"gzip, deflate","cookie":"shopcity_session=db96c7b8-4d0e-45d7-86f5-0c4663354e4b; shopcity_csrf=59fc56de-0c7f-4998-8211-e7d423d402c2","x-csrf-token":"59fc56de-0c7f-4998-8211-e7d423d402c2","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38462},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1a","content-type":"application/json; charset=utf-8","content-length":"469"}},"responseTime":32}
[13:37:41.323] INFO (2948): request completed {"req":{"id":"req-1b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34483","accept-encoding":"gzip, deflate","x-device-id":"1d6e9a7f-da0b-48be-ba82-92524da26dbb","content-type":"application/json","x-device-attestation":"1785677861311.7b4cf2de-e5c8-462a-8949-6682f21e1ea2.4RfApRwR7iVBmSsKEDaYR6YcDWgS3tiDiarhlc5V5vA","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57218},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1b","set-cookie":["shopcity_session=d7c8d845-d1ed-4fd4-871a-4189e831e09d; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=4c9cc049-7647-4acd-8df7-898d81b54a2e; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":10}
[13:37:41.341] INFO (2948): request completed {"req":{"id":"req-1c","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:33317","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d7c8d845-d1ed-4fd4-871a-4189e831e09d; shopcity_csrf=4c9cc049-7647-4acd-8df7-898d81b54a2e","x-csrf-token":"4c9cc049-7647-4acd-8df7-898d81b54a2e","idempotency-key":"receipt-key-18","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53224},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1c","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":16}
[13:37:41.354] INFO (2948): request completed {"req":{"id":"req-1d","method":"POST","url":"/api/v1/receipts/38be214e-1fec-458f-b4be-7db154e6d58a/approve","query":{},"headers":{"host":"127.0.0.1:34975","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d7c8d845-d1ed-4fd4-871a-4189e831e09d; shopcity_csrf=4c9cc049-7647-4acd-8df7-898d81b54a2e","x-csrf-token":"4c9cc049-7647-4acd-8df7-898d81b54a2e","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56126},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1d","content-type":"application/json; charset=utf-8","content-length":"378"}},"responseTime":11}
[13:37:41.373] INFO (2948): request completed {"req":{"id":"req-1e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41453","accept-encoding":"gzip, deflate","x-device-id":"6f148e09-53ec-47bf-b8ed-d799d0b9db62","content-type":"application/json","x-device-attestation":"1785677861362.2c94f8cf-8d41-4e64-af80-0d3b00ba9064.nEwaZJgxvs8JCt5JyuDLihcjs_1BSbEzbt-sLq3VOIk","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52008},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1e","set-cookie":["shopcity_session=25cbc75a-a4db-4fae-9714-e5d78532ec12; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=3618503e-f49f-4d68-a8ef-89ab3893d66c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":9}
[13:37:41.392] INFO (2948): request completed {"req":{"id":"req-1f","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:33383","accept-encoding":"gzip, deflate","cookie":"shopcity_session=25cbc75a-a4db-4fae-9714-e5d78532ec12; shopcity_csrf=3618503e-f49f-4d68-a8ef-89ab3893d66c","x-csrf-token":"3618503e-f49f-4d68-a8ef-89ab3893d66c","idempotency-key":"receipt-key-19","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53158},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1f","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":17}
[13:37:41.405] INFO (2948): request completed {"req":{"id":"req-1g","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:36109","accept-encoding":"gzip, deflate","x-device-id":"6f148e09-53ec-47bf-b8ed-d799d0b9db62","content-type":"application/json","x-device-attestation":"1785677861395.2faaed27-8bb3-4fce-a257-72c64dd8c2ed.O6IJHy_1DVqEuuzNR2MZrTj0GYnNc6Mwk4o4i1SywuY","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":32790},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1g","set-cookie":["shopcity_session=a65f74e4-c37a-4541-bc66-1178f5f21a93; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e57e9321-d6c7-4a1c-98e7-ef00b61bc44b; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":9}
[13:37:41.427] INFO (2948): request completed {"req":{"id":"req-1h","method":"POST","url":"/api/v1/receipts/1c954954-1c89-4563-8c55-05d84dba3844/reject","query":{},"headers":{"host":"127.0.0.1:37517","accept-encoding":"gzip, deflate","cookie":"shopcity_session=a65f74e4-c37a-4541-bc66-1178f5f21a93; shopcity_csrf=e57e9321-d6c7-4a1c-98e7-ef00b61bc44b","x-csrf-token":"e57e9321-d6c7-4a1c-98e7-ef00b61bc44b","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47446},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1h","content-type":"application/json; charset=utf-8","content-length":"372"}},"responseTime":20}
[13:37:41.455] INFO (2948): request completed {"req":{"id":"req-1i","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34977","accept-encoding":"gzip, deflate","x-device-id":"debdccc0-f4bc-4228-a8bd-be55193271b3","content-type":"application/json","x-device-attestation":"1785677861441.a5ac0133-1c89-44d7-ac92-b6b984df0837.6axrhztLhRN5TDpznS6e061C36p8-kO0cS8ffQxRsS0","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43510},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1i","set-cookie":["shopcity_session=e1045d7d-0a6a-4b55-bf2b-f9f45d8b6f0c; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=ad106ef9-4ce2-4f28-b3ea-29b5eac3b85d; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":13}
[13:37:41.495] INFO (2948): request completed {"req":{"id":"req-1j","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:42071","accept-encoding":"gzip, deflate","cookie":"shopcity_session=e1045d7d-0a6a-4b55-bf2b-f9f45d8b6f0c; shopcity_csrf=ad106ef9-4ce2-4f28-b3ea-29b5eac3b85d","x-csrf-token":"ad106ef9-4ce2-4f28-b3ea-29b5eac3b85d","idempotency-key":"expired-completed-key","content-type":"application/json","content-length":"133","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41766},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1j","content-type":"application/json; charset=utf-8","content-length":"584"}},"responseTime":33}
[13:37:41.515] INFO (2948): request completed {"req":{"id":"req-1k","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39393","accept-encoding":"gzip, deflate","x-device-id":"0dbb79d0-f5cc-4792-900f-dd359ac8d6fa","content-type":"application/json","x-device-attestation":"1785677861503.57aa9b76-759f-49f3-8167-d98cd0e7e838.gJt1ApbdjpOADAdf8PU5Gjgeuej1f1me-VFQ3Mmo9To","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41858},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1k","set-cookie":["shopcity_session=29b4d845-81dc-4d56-9c27-0350a3c14700; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=edeca207-be9b-4384-82b8-baa72ce9fff0; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":11}
[13:37:41.543] INFO (2948): request completed {"req":{"id":"req-1l","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:38997","accept-encoding":"gzip, deflate","cookie":"shopcity_session=29b4d845-81dc-4d56-9c27-0350a3c14700; shopcity_csrf=edeca207-be9b-4384-82b8-baa72ce9fff0","x-csrf-token":"edeca207-be9b-4384-82b8-baa72ce9fff0","idempotency-key":"expired-pending-key","content-type":"application/json","content-length":"133","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44698},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1l","content-type":"application/json; charset=utf-8","content-length":"584"}},"responseTime":21}
PASS test/receipts.int-spec.ts (12.894 s)
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
PASS test/immutable-earn-ledger.int-spec.ts (6.08 s)
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
[13:37:54.711] INFO (2948): request completed {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44835","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52962},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","set-cookie":["shopcity_session=8f1b80fb-9e52-4a41-84f5-307e0cf10bc3; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=185a55f4-196e-45bd-9349-3dae1cc9248e; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":248}
[13:37:54.724] INFO (2948): request completed {"req":{"id":"req-2","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:36469","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8f1b80fb-9e52-4a41-84f5-307e0cf10bc3","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44128},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-2","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":6}
[13:37:54.731] INFO (2948): request completed {"req":{"id":"req-3","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:33557","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8f1b80fb-9e52-4a41-84f5-307e0cf10bc3; shopcity_csrf=185a55f4-196e-45bd-9349-3dae1cc9248e","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51276},"res":{"statusCode":403,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-3","content-type":"application/json; charset=utf-8","content-length":"272"}},"responseTime":5}
[13:37:54.749] INFO (2948): request completed {"req":{"id":"req-4","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:36047","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8f1b80fb-9e52-4a41-84f5-307e0cf10bc3; shopcity_csrf=185a55f4-196e-45bd-9349-3dae1cc9248e","x-csrf-token":"185a55f4-196e-45bd-9349-3dae1cc9248e","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41194},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-4","set-cookie":["shopcity_session=d2f553c0-f0a5-4b66-a2a7-ced96f9541bf; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=d18ea76f-3feb-4b68-96d5-692c8708e618; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"326"}},"responseTime":16}
[13:37:54.759] INFO (2948): request completed {"req":{"id":"req-5","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:38477","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8f1b80fb-9e52-4a41-84f5-307e0cf10bc3","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48158},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-5","content-type":"application/json; charset=utf-8","content-length":"284"}},"responseTime":3}
[13:37:54.766] INFO (2948): request completed {"req":{"id":"req-6","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:35805","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d2f553c0-f0a5-4b66-a2a7-ced96f9541bf","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56694},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-6","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":4}
[13:37:54.775] INFO (2948): request completed {"req":{"id":"req-7","method":"POST","url":"/api/v1/auth/logout","query":{},"headers":{"host":"127.0.0.1:45851","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d2f553c0-f0a5-4b66-a2a7-ced96f9541bf; shopcity_csrf=d18ea76f-3feb-4b68-96d5-692c8708e618","x-csrf-token":"d18ea76f-3feb-4b68-96d5-692c8708e618","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35498},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-7","set-cookie":["shopcity_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly","shopcity_csrf=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly"],"content-type":"application/json; charset=utf-8","content-length":"136"}},"responseTime":6}
[13:37:54.782] INFO (2948): request completed {"req":{"id":"req-8","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:42673","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d2f553c0-f0a5-4b66-a2a7-ced96f9541bf","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36756},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-8","content-type":"application/json; charset=utf-8","content-length":"284"}},"responseTime":2}
[13:37:54.804] INFO (2948): request completed {"req":{"id":"req-9","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34883","accept-encoding":"gzip, deflate","x-device-id":"e3188af7-7a8b-4f1f-83bf-60d6344b1a76","x-device-attestation":"1785677874790.1bc026a9-ca0c-495e-ab11-3eb523fcdd5c.6Udk_r5bgZkyhfb49QEadkX25b09gBsf6DrVlBSy9E0","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51368},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-9","set-cookie":["shopcity_session=48fa13fa-b09e-47d7-aa2d-a00398434093; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=7899144c-6773-4743-b121-b42ee6fe9dad; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":13}
[13:37:54.817] INFO (2948): request completed {"req":{"id":"req-a","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35627","accept-encoding":"gzip, deflate","x-device-id":"0f3a889b-4267-4a97-89c3-bea5f0bbf9b4","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49320},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-a","content-type":"application/json; charset=utf-8","content-length":"303"}},"responseTime":4}
[13:37:54.823] INFO (2948): request completed {"req":{"id":"req-b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40585","accept-encoding":"gzip, deflate","x-device-id":"0f3a889b-4267-4a97-89c3-bea5f0bbf9b4","x-device-attestation":"1785677874818.d7baa4b3-83e2-4d96-aef0-e895aa3e7bef.49UxUg7ugUzNNLMZo7MHVu9N-Hp4zjG57qB6r9ynLEk","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44204},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-b","content-type":"application/json; charset=utf-8","content-length":"301"}},"responseTime":4}
[13:37:54.835] INFO (2948): request completed {"req":{"id":"req-c","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35833","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34752},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-c","set-cookie":["shopcity_session=8da1c5de-d49f-4702-a388-dbc905b1668b; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=f1984f75-c16c-47ac-aa79-c1facb8ec57f; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":8}
[13:37:54.852] INFO (2948): request completed {"req":{"id":"req-d","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:35727","accept-encoding":"gzip, deflate","authorization":"_**","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53242},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-d","set-cookie":["shopcity_session=20306c86-971b-4ad5-a693-a74ad1b246ec; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=239b83e3-c800-4fb7-96f5-b02a1fe48020; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"326"}},"responseTime":13}
[13:37:54.867] INFO (2948): request completed {"req":{"id":"req-e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:37983","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51082},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-e","set-cookie":["shopcity_session=4720559e-f620-4fe6-b61d-9c7d61af9634; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=eab019c4-edc1-4876-9173-1d1cb4d4de2c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[13:37:54.925] INFO (2948): request completed {"req":{"id":"req-f","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40779","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38120},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-f","set-cookie":["shopcity_session=ffad7542-a6c7-41e7-9d73-bae0b269d221; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=1bb35695-8e7a-4350-8d29-e448818fd688; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":9}
[13:37:54.946] INFO (2948): request completed {"req":{"id":"req-g","method":"GET","url":"/api/v1/customers?q=%2B2348020000001&limit=10","query":{"q":"+2348020000001","limit":"10"},"headers":{"host":"127.0.0.1:46265","accept-encoding":"gzip, deflate","cookie":"shopcity_session=ffad7542-a6c7-41e7-9d73-bae0b269d221","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45956},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-g","content-type":"application/json; charset=utf-8","content-length":"367"}},"responseTime":17}
[13:37:54.958] INFO (2948): request completed {"req":{"id":"req-h","method":"GET","url":"/api/v1/customers/62db7f88-7737-4f5f-a235-aff79a9e9cbf","query":{},"headers":{"host":"127.0.0.1:35791","accept-encoding":"gzip, deflate","cookie":"shopcity_session=ffad7542-a6c7-41e7-9d73-bae0b269d221","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57732},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-h","content-type":"application/json; charset=utf-8","content-length":"330"}},"responseTime":9}
[13:37:55.035] INFO (2948): request completed {"req":{"id":"req-i","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42253","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39244},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-i","set-cookie":["shopcity_session=423593e8-e75e-4861-933c-52f77437d689; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e6ff1c07-aa77-4b98-bfb8-7ec6ff38863c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":35}
[13:37:55.055] INFO (2948): request completed {"req":{"id":"req-j","method":"GET","url":"/api/v1/customers?q=read-model-supervisor-http%40shopcity.local&limit=10","query":{"q":"read-model-supervisor-http@shopcity.local","limit":"10"},"headers":{"host":"127.0.0.1:40163","accept-encoding":"gzip, deflate","cookie":"shopcity_session=423593e8-e75e-4861-933c-52f77437d689","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35664},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-j","content-type":"application/json; charset=utf-8","content-length":"787"}},"responseTime":18}
[13:37:55.068] INFO (2948): request completed {"req":{"id":"req-k","method":"GET","url":"/api/v1/customers/fbefb7f6-3e81-4655-885a-936911d6cfbf","query":{},"headers":{"host":"127.0.0.1:37175","accept-encoding":"gzip, deflate","cookie":"shopcity_session=423593e8-e75e-4861-933c-52f77437d689","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52878},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-k","content-type":"application/json; charset=utf-8","content-length":"723"}},"responseTime":9}
[13:37:55.107] INFO (2948): request completed {"req":{"id":"req-l","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41159","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39546},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-l","set-cookie":["shopcity_session=e7ad545e-9399-4d3c-8b8d-a4abdb5f74aa; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e984f772-5432-4c88-b3a7-42c172d46f65; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":9}
[13:37:55.117] INFO (2948): request completed {"req":{"id":"req-m","method":"GET","url":"/api/v1/cards/lookup/CARD-card-http","query":{},"headers":{"host":"127.0.0.1:33489","accept-encoding":"gzip, deflate","cookie":"shopcity_session=e7ad545e-9399-4d3c-8b8d-a4abdb5f74aa","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52026},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-m","content-type":"application/json; charset=utf-8","content-length":"517"}},"responseTime":8}
[13:37:55.156] INFO (2948): request completed {"req":{"id":"req-n","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:37901","accept-encoding":"gzip, deflate","x-device-id":"051aa5db-1604-4d03-aea3-e50cfa4c761e","x-device-attestation":"1785677875143.abbf3658-faa0-4c52-b9ed-0ed3993f513d.AT3Ry7NLLBx_JdYq_C9kx7OXm7u-uFmd6yfg6YARrN4","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":37622},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-n","set-cookie":["shopcity_session=7b5a96e0-1a0b-4ef7-99f5-349d2599b5d9; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=48b376b9-c65c-4323-907d-d9d6e0b7d86d; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":12}
[13:37:55.195] INFO (2948): request completed {"req":{"id":"req-o","method":"POST","url":"/api/v1/transactions/redeem","query":{},"headers":{"host":"127.0.0.1:40705","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"redeem-http-pending","content-type":"application/json","content-length":"184","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51898},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-o","content-type":"application/json; charset=utf-8","content-length":"1004"}},"responseTime":37}
[13:37:55.255] INFO (2948): request completed {"req":{"id":"req-p","method":"POST","url":"/api/v1/transactions/redeem","query":{},"headers":{"host":"127.0.0.1:45871","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"redeem-http-confirmed","content-type":"application/json","content-length":"186","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50962},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-p","content-type":"application/json; charset=utf-8","content-length":"1140"}},"responseTime":57}
[13:37:55.270] INFO (2948): request completed {"req":{"id":"req-q","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42227","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54052},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-q","set-cookie":["shopcity_session=656c7d6b-c31b-41aa-aa01-d024a9a606c7; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=7256a52e-9325-4a49-8134-03642fd4eaaf; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":9}
[13:37:55.290] INFO (2948): request completed {"req":{"id":"req-r","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:41343","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-0","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49008},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-r","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":12}
[13:37:55.303] INFO (2948): request completed {"req":{"id":"req-s","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33409","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-1","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45074},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-s","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":11}
[13:37:55.315] INFO (2948): request completed {"req":{"id":"req-t","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40895","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-2","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56172},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-t","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":9}
[13:37:55.332] INFO (2948): request completed {"req":{"id":"req-u","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:41285","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-3","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34740},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-u","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":15}
[13:37:55.345] INFO (2948): request completed {"req":{"id":"req-v","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:45241","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-4","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53468},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-v","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":11}
[13:37:55.354] INFO (2948): request completed {"req":{"id":"req-w","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33859","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-5","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57232},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-w","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":7}
[13:37:55.361] INFO (2948): request completed {"req":{"id":"req-x","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40621","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-6","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40466},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-x","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[13:37:55.370] INFO (2948): request completed {"req":{"id":"req-y","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33997","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-7","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51148},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-y","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[13:37:55.378] INFO (2948): request completed {"req":{"id":"req-z","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:45615","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-8","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55016},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-z","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[13:37:55.385] INFO (2948): request completed {"req":{"id":"req-10","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:37001","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-9","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55482},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-10","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.392] INFO (2948): request completed {"req":{"id":"req-11","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33175","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-10","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33916},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-11","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.398] INFO (2948): request completed {"req":{"id":"req-12","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:41707","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-11","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35136},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-12","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.404] INFO (2948): request completed {"req":{"id":"req-13","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:46591","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-12","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55426},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-13","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.411] INFO (2948): request completed {"req":{"id":"req-14","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40829","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-13","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54976},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-14","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.418] INFO (2948): request completed {"req":{"id":"req-15","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:35587","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-14","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59988},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-15","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.430] INFO (2948): request completed {"req":{"id":"req-16","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39561","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-15","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39740},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-16","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":11}
[13:37:55.437] INFO (2948): request completed {"req":{"id":"req-17","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:36919","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-16","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57602},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-17","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.444] INFO (2948): request completed {"req":{"id":"req-18","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33433","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-17","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58482},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-18","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.450] INFO (2948): request completed {"req":{"id":"req-19","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:36935","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-18","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59470},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-19","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[13:37:55.458] INFO (2948): request completed {"req":{"id":"req-1a","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:42497","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-19","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55420},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1a","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.467] INFO (2948): request completed {"req":{"id":"req-1b","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:41599","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-20","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38670},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1b","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":6}
[13:37:55.473] INFO (2948): request completed {"req":{"id":"req-1c","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39113","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-21","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56524},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1c","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.482] INFO (2948): request completed {"req":{"id":"req-1d","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:44247","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-22","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34860},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1d","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.491] INFO (2948): request completed {"req":{"id":"req-1e","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:36999","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-23","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":32896},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1e","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":7}
[13:37:55.498] INFO (2948): request completed {"req":{"id":"req-1f","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:34829","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-24","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60260},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1f","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.507] INFO (2948): request completed {"req":{"id":"req-1g","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:43009","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-25","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49604},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1g","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.514] INFO (2948): request completed {"req":{"id":"req-1h","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:44785","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-26","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51980},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1h","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.521] INFO (2948): request completed {"req":{"id":"req-1i","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:45021","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-27","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47280},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1i","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.528] INFO (2948): request completed {"req":{"id":"req-1j","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:42565","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-28","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":37020},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1j","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.535] INFO (2948): request completed {"req":{"id":"req-1k","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:42083","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-29","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60012},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1k","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:37:55.542] INFO (2948): request completed {"req":{"id":"req-1l","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40403","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-over-limit","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45394},"res":{"statusCode":429,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1l","content-type":"application/json; charset=utf-8","content-length":"264"}},"responseTime":4}
[13:37:55.556] INFO (2948): request completed {"req":{"id":"req-1m","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35555","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42680},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1m","set-cookie":["shopcity_session=326b95eb-da2f-4e2b-9de4-4610f90f57b0; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=a412f443-1b28-414c-8455-fde02c0bd3ab; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":9}
[13:37:55.563] INFO (2948): request completed {"req":{"id":"req-1n","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:46829","accept-encoding":"gzip, deflate","cookie":"shopcity_session=326b95eb-da2f-4e2b-9de4-4610f90f57b0","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43952},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1n","content-type":"application/json; charset=utf-8","content-length":"285"}},"responseTime":3}
[13:37:55.570] INFO (2948): request completed {"req":{"id":"req-1o","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:45609","accept-encoding":"gzip, deflate","cookie":"shopcity_session=326b95eb-da2f-4e2b-9de4-4610f90f57b0","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47944},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1o","content-type":"application/json; charset=utf-8","content-length":"285"}},"responseTime":3}
[13:37:55.581] INFO (2948): request completed {"req":{"id":"req-1p","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:40039","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52422},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1p","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":3}
[13:37:55.590] INFO (2948): request errored {"req":{"id":"req-1q","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:32861","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58670},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1q","content-type":"application/json; charset=utf-8","content-length":"331"}},"responseTime":4}
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
[13:37:55.609] INFO (2948): request errored {"req":{"id":"req-1r","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:42347","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57002},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1r","content-type":"application/json; charset=utf-8","content-length":"331"}},"responseTime":5}
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
PASS test/auth-http.int-spec.ts (7.896 s)
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
PASS test/redemption-approval.int-spec.ts (6.041 s)
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
PASS test/financial-repair-restore.int-spec.ts (17.2 s)
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
PASS test/outbox-worker-recovery.int-spec.ts (24.949 s)
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
PASS test/redemption-allocation-invariants.int-spec.ts (5.566 s)
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
FAIL test/lot-allocation-ordering.int-spec.ts (5.497 s)
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

Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32779"

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
PASS test/financial-state-invariants.int-spec.ts (5.584 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32780"

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
PASS test/sms-reference-backfill.int-spec.ts (5.516 s)
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-gQMlUk/prisma/schema.prisma
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
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-gQMlUk/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32781"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`

The following migration(s) have been applied:

migrations/
└─ 20260720_receipt_integrity_gate/
└─ migration.sql

All migrations have been successfully applied.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-94kno2/prisma/schema.prisma
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
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-94kno2/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32782"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260720_receipt_integrity_gate

Database error code: P0001

Database error:
ERROR: Receipt legacy POS references are missing

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(EP0001), message: "Receipt legacy POS references are missing", detail: None, hint: None, position: None, where_: Some("PL/pgSQL function inline_code_block line 24 at RAISE"), schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("pl_exec.c"), line: Some(3897), routine: Some("exec_stmt_raise") }

Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-gFKE5Q/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32783"

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
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-gFKE5Q/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32783"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260720_receipt_integrity_gate

Database error code: P0001

Database error:
ERROR: Duplicate legacy POS receipt identities require resolution

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(EP0001), message: "Duplicate legacy POS receipt identities require resolution", detail: None, hint: None, position: None, where_: Some("PL/pgSQL function inline_code_block line 15 at RAISE"), schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("pl_exec.c"), line: Some(3897), routine: Some("exec_stmt_raise") }

PASS test/receipt-migration-upgrade.int-spec.ts (27.451 s)
PASS test/openapi.int-spec.ts
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
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
PASS test/phase-1.int-spec.ts (5.51 s)
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
[13:39:49.591] INFO (2948): request errored {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:46505","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47694},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","content-type":"application/json; charset=utf-8","content-length":"319"}},"responseTime":3167}
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
PASS test/redis-throttle-fail-closed.int-spec.ts (9.244 s)
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
PASS test/tenant-ownership.int-spec.ts (5.339 s)
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
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
PASS test/customer-email.int-spec.ts (5.368 s)
PASS test/health.int-spec.ts
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
PASS test/outbox-migration-deploy.int-spec.ts (5.23 s)
PASS test/bootstrap-credential.int-spec.ts
PASS test/prisma.int-spec.ts

Test Suites: 1 failed, 19 passed, 20 total
Tests: 1 failed, 97 passed, 98 total
Snapshots: 0 total
Time: 160.32 s
Ran all test suites.
Error: Process completed with exit code 1.
