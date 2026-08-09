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
The following migration(s) have been applied:
│ Update available 6.19.3 -> 7.9.1 │

migrations/
│ │
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
│ This is a major update - please follow the guide at │
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
│ https://pris.ly/d/major-version-upgrade │
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
│ │
│ Run the following to update │
│ npm i --save-dev prisma@latest │
│ npm i @prisma/client@latest │
└─────────────────────────────────────────────────────────┘
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
[13:01:34.186] INFO (2939): request completed {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35423","accept-encoding":"gzip, deflate","x-device-id":"83cc60ec-eb65-443e-96ca-9f6ab4e56651","content-type":"application/json","x-device-attestation":"1785675694044.b7400992-5b5a-4cbe-9cf0-75d8ef672069.6PaHFRrl-Wni9nu0W81caTwntFhLyxENPqPGM3lhtEc","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42844},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","set-cookie":["shopcity_session=08f54b5c-e663-457a-a827-abe6a7683686; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=8ba82677-5999-4524-81b9-6e03a08acb64; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":105}
[13:01:34.249] INFO (2939): request completed {"req":{"id":"req-2","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37187","accept-encoding":"gzip, deflate","cookie":"shopcity_session=08f54b5c-e663-457a-a827-abe6a7683686; shopcity_csrf=8ba82677-5999-4524-81b9-6e03a08acb64","x-csrf-token":"8ba82677-5999-4524-81b9-6e03a08acb64","idempotency-key":"receipt-key-1","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56372},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-2","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":57}
[13:01:34.266] INFO (2939): request completed {"req":{"id":"req-3","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:35517","accept-encoding":"gzip, deflate","cookie":"shopcity_session=08f54b5c-e663-457a-a827-abe6a7683686; shopcity_csrf=8ba82677-5999-4524-81b9-6e03a08acb64","x-csrf-token":"8ba82677-5999-4524-81b9-6e03a08acb64","idempotency-key":"receipt-key-1","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57374},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-3","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":14}
[13:01:34.341] INFO (2939): request completed {"req":{"id":"req-4","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40015","accept-encoding":"gzip, deflate","x-device-id":"d3c3027e-868d-44a6-b1f3-3afd21572041","content-type":"application/json","x-device-attestation":"1785675694299.ce4821fa-edf6-4d87-bb27-651835eacfce.wEP2ZiNN9qYf-kuLqyHTKhFUSnqt21breYR39GmReLg","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41882},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-4","set-cookie":["shopcity_session=d2e2e764-2fe2-48cb-85fc-76d7f9aa825a; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=643a8efa-803f-4d89-94c2-6d79c4ba8c82; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":41}
[13:01:34.391] INFO (2939): request completed {"req":{"id":"req-5","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:35463","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d2e2e764-2fe2-48cb-85fc-76d7f9aa825a; shopcity_csrf=643a8efa-803f-4d89-94c2-6d79c4ba8c82","x-csrf-token":"643a8efa-803f-4d89-94c2-6d79c4ba8c82","idempotency-key":"receipt-key-2","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35706},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-5","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":47}
[13:01:34.408] INFO (2939): request completed {"req":{"id":"req-6","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:35063","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d2e2e764-2fe2-48cb-85fc-76d7f9aa825a; shopcity_csrf=643a8efa-803f-4d89-94c2-6d79c4ba8c82","x-csrf-token":"643a8efa-803f-4d89-94c2-6d79c4ba8c82","idempotency-key":"receipt-key-3","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54602},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-6","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":14}
[13:01:34.432] INFO (2939): request completed {"req":{"id":"req-7","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34937","accept-encoding":"gzip, deflate","x-device-id":"3bd42754-f70f-455d-afb7-bb0a78d19100","content-type":"application/json","x-device-attestation":"1785675694420.39033ce5-2f8e-4e4d-bad8-db40346db2ae.OC-1s1DXawOyRi2kFA2XG7q-s821ZtPrDb_vYZQIiaA","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42880},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-7","set-cookie":["shopcity_session=11a60596-8c16-4f17-891f-e729f17c483d; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=f9bdd5de-0413-45e9-bbb6-ffd083ace5b7; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[13:01:34.446] INFO (2939): request completed {"req":{"id":"req-8","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39139","accept-encoding":"gzip, deflate","x-device-id":"faae65ff-3cfd-4b79-a932-8f25a401a8ef","content-type":"application/json","x-device-attestation":"1785675694435.0a7ac046-9bc2-476c-93d3-93e125c31155.Izv1e_1ZtsacIY2nGL_-7fqi12wA9NAa0DO1XC1mlIw","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51682},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-8","set-cookie":["shopcity_session=7d915688-363d-4357-b2f3-85d5be506e5a; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=b9fadda4-e9d1-49f5-8231-844c05074668; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"332"}},"responseTime":10}
[13:01:34.472] INFO (2939): request completed {"req":{"id":"req-9","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:44659","accept-encoding":"gzip, deflate","cookie":"shopcity_session=11a60596-8c16-4f17-891f-e729f17c483d; shopcity_csrf=f9bdd5de-0413-45e9-bbb6-ffd083ace5b7","x-csrf-token":"f9bdd5de-0413-45e9-bbb6-ffd083ace5b7","idempotency-key":"receipt-key-4","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35438},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-9","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":23}
[13:01:34.491] INFO (2939): request completed {"req":{"id":"req-a","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:44733","accept-encoding":"gzip, deflate","cookie":"shopcity_session=7d915688-363d-4357-b2f3-85d5be506e5a; shopcity_csrf=b9fadda4-e9d1-49f5-8231-844c05074668","x-csrf-token":"b9fadda4-e9d1-49f5-8231-844c05074668","idempotency-key":"receipt-key-5","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44434},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-a","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":14}
[13:01:34.512] INFO (2939): request completed {"req":{"id":"req-b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38317","accept-encoding":"gzip, deflate","x-device-id":"075586b6-6d2c-445f-8968-1b79ab2806db","content-type":"application/json","x-device-attestation":"1785675694500.439e2c95-fd2a-416e-8bc9-177cabd2bfb7.T0DrKlQPENHCKqHbJ9qJeimJXiviZNnOGWCz-x_K7Vk","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39110},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-b","set-cookie":["shopcity_session=112b1162-333b-4764-ab51-1c852cfd9efd; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=3713bfb2-a871-4a4e-bef3-7617f14ea665; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":11}
[13:01:34.687] INFO (2939): request completed {"req":{"id":"req-c","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40143","accept-encoding":"gzip, deflate","cookie":"shopcity_session=112b1162-333b-4764-ab51-1c852cfd9efd; shopcity_csrf=3713bfb2-a871-4a4e-bef3-7617f14ea665","x-csrf-token":"3713bfb2-a871-4a4e-bef3-7617f14ea665","idempotency-key":"receipt-key-4a","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50018},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-c","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":167}
[13:01:34.702] INFO (2939): request completed {"req":{"id":"req-d","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40143","accept-encoding":"gzip, deflate","cookie":"shopcity_session=112b1162-333b-4764-ab51-1c852cfd9efd; shopcity_csrf=3713bfb2-a871-4a4e-bef3-7617f14ea665","x-csrf-token":"3713bfb2-a871-4a4e-bef3-7617f14ea665","idempotency-key":"receipt-key-4b","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50032},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-d","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":181}
[13:01:34.722] INFO (2939): request completed {"req":{"id":"req-e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:43325","accept-encoding":"gzip, deflate","x-device-id":"ac4c920e-9388-438a-804f-39a10c5b0336","content-type":"application/json","x-device-attestation":"1785675694712.8d132167-9ac9-47b8-9946-984c1913fdde.gcQmg0guBr5WM4LtPsBYTlTwk2ZART-XMsTuYaApfLQ","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46188},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-e","set-cookie":["shopcity_session=9d802b28-2d9f-4434-8321-0becf7a4b152; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=f821ab1b-0083-4851-bc0d-e0d43a1d5445; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[13:01:34.749] INFO (2939): request completed {"req":{"id":"req-f","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:35201","accept-encoding":"gzip, deflate","cookie":"shopcity_session=9d802b28-2d9f-4434-8321-0becf7a4b152; shopcity_csrf=f821ab1b-0083-4851-bc0d-e0d43a1d5445","x-csrf-token":"f821ab1b-0083-4851-bc0d-e0d43a1d5445","idempotency-key":"receipt-key-6","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56888},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-f","content-type":"application/json; charset=utf-8","content-length":"580"}},"responseTime":22}
[13:01:34.762] INFO (2939): request completed {"req":{"id":"req-g","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:45363","accept-encoding":"gzip, deflate","cookie":"shopcity_session=9d802b28-2d9f-4434-8321-0becf7a4b152; shopcity_csrf=f821ab1b-0083-4851-bc0d-e0d43a1d5445","x-csrf-token":"f821ab1b-0083-4851-bc0d-e0d43a1d5445","idempotency-key":"receipt-key-7","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58590},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-g","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":12}
[13:01:34.785] INFO (2939): request completed {"req":{"id":"req-h","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41935","accept-encoding":"gzip, deflate","x-device-id":"3dc9797e-1361-4cb0-a794-f4331171f3e5","content-type":"application/json","x-device-attestation":"1785675694772.da5adf05-1bf3-470d-8fb4-8e7dc0f195dd.ua6k43frkIH9m8tqdDVnz7NXmajqIR7IdlpsA1DGqkE","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35184},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-h","set-cookie":["shopcity_session=d995ae89-aab7-4212-a329-bd33f61b57a3; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=6192e528-c7f3-4212-85f6-221b68eb53c5; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":12}
[13:01:34.812] INFO (2939): request completed {"req":{"id":"req-i","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37969","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d995ae89-aab7-4212-a329-bd33f61b57a3; shopcity_csrf=6192e528-c7f3-4212-85f6-221b68eb53c5","x-csrf-token":"6192e528-c7f3-4212-85f6-221b68eb53c5","idempotency-key":"receipt-key-8","content-type":"application/json","content-length":"175","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56268},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-i","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":25}
[13:01:34.837] INFO (2939): request completed {"req":{"id":"req-j","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43899","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d995ae89-aab7-4212-a329-bd33f61b57a3; shopcity_csrf=6192e528-c7f3-4212-85f6-221b68eb53c5","x-csrf-token":"6192e528-c7f3-4212-85f6-221b68eb53c5","idempotency-key":"receipt-key-9","content-type":"application/json","content-length":"175","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48634},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-j","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":23}
[13:01:34.860] INFO (2939): request completed {"req":{"id":"req-k","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:43063","accept-encoding":"gzip, deflate","x-device-id":"d59c0357-a4e4-43f3-b4ba-ae535e43640b","content-type":"application/json","x-device-attestation":"1785675694850.f5388e20-625e-44cf-8cf7-8636664e099e.2HCQFv1LHuSitZRAqmXJ382O_Z0PjPp68Ze6VEY5dP0","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53510},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-k","set-cookie":["shopcity_session=4f68a4b4-072f-45a0-8720-f43ab9553af8; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=0e80d55d-1afd-41c9-99cd-125b34852b31; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[13:01:34.894] INFO (2939): request completed {"req":{"id":"req-l","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:36081","accept-encoding":"gzip, deflate","cookie":"shopcity_session=4f68a4b4-072f-45a0-8720-f43ab9553af8; shopcity_csrf=0e80d55d-1afd-41c9-99cd-125b34852b31","x-csrf-token":"0e80d55d-1afd-41c9-99cd-125b34852b31","idempotency-key":"receipt-key-8a","content-type":"application/json","content-length":"177","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35134},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-l","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":33}
[13:01:34.937] INFO (2939): request completed {"req":{"id":"req-m","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42793","accept-encoding":"gzip, deflate","x-device-id":"b0df294f-f502-4ae3-a0ff-1c1365afd103","content-type":"application/json","x-device-attestation":"1785675694924.32912354-ccd0-4335-b282-49efefd48477.KISZj1ASudX7rU1BOt_xiugOjAP9chJSoZWl0KGKcc0","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41252},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-m","set-cookie":["shopcity_session=5a60c9c7-ffca-4523-bd04-2e408131507b; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=7fb1fbad-e508-4ec8-abdc-9ed677853b08; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":12}
[13:01:34.954] INFO (2939): request completed {"req":{"id":"req-n","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43055","accept-encoding":"gzip, deflate","cookie":"shopcity_session=5a60c9c7-ffca-4523-bd04-2e408131507b; shopcity_csrf=7fb1fbad-e508-4ec8-abdc-9ed677853b08","x-csrf-token":"7fb1fbad-e508-4ec8-abdc-9ed677853b08","idempotency-key":"receipt-key-8b","content-type":"application/json","content-length":"174","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45024},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-n","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":16}
[13:01:34.980] INFO (2939): request completed {"req":{"id":"req-o","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34953","accept-encoding":"gzip, deflate","x-device-id":"62418ee1-8d19-4522-a14e-a43267acffcb","content-type":"application/json","x-device-attestation":"1785675694966.cfd61a8d-aec8-4ec6-a0a9-d63547ade5b7.eSsOzBUdyWU3pyRHLBm1-UBW6f6e-6YQOJX2AuCtO5I","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58516},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-o","set-cookie":["shopcity_session=e0b6bf9a-2713-4030-bf59-e5258f2c6ebc; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=a6c125c7-8896-4581-a733-ebe6efdfb09f; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":13}
[13:01:34.988] INFO (2939): request completed {"req":{"id":"req-p","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42387","accept-encoding":"gzip, deflate","x-device-id":"339f205c-b6af-40c0-a09d-67ba144b8474","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33202},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-p","content-type":"application/json; charset=utf-8","content-length":"283"}},"responseTime":4}
[13:01:34.995] INFO (2939): request completed {"req":{"id":"req-q","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:34993","accept-encoding":"gzip, deflate","cookie":"shopcity_session=e0b6bf9a-2713-4030-bf59-e5258f2c6ebc; shopcity_csrf=a6c125c7-8896-4581-a733-ebe6efdfb09f","x-csrf-token":"a6c125c7-8896-4581-a733-ebe6efdfb09f","idempotency-key":"receipt-key-10","content-type":"application/json","content-length":"179","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42822},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-q","content-type":"application/json; charset=utf-8","content-length":"311"}},"responseTime":5}
[13:01:35.003] INFO (2939): request completed {"req":{"id":"req-r","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42143","accept-encoding":"gzip, deflate","x-device-id":"b8c7aece-db0e-400b-b89e-cf83d9df3a91","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53880},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-r","content-type":"application/json; charset=utf-8","content-length":"283"}},"responseTime":4}
[13:01:35.020] INFO (2939): request completed {"req":{"id":"req-s","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33827","accept-encoding":"gzip, deflate","x-device-id":"f233f872-09a4-42b0-91ca-98d9ebefd45d","content-type":"application/json","x-device-attestation":"1785675695011.9339bb07-e987-4818-95f3-6569370ed1fe.fmRKv2SW_eszXmNuWToo47Hn2DGcqNST22mTLd7eFcs","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59620},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-s","set-cookie":["shopcity_session=805acce7-a1ab-482d-b0ec-5c13838b8013; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=ea1ed5f9-7c5b-4de2-b62b-ff78f66f4b6d; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"301"}},"responseTime":8}
[13:01:35.050] INFO (2939): request completed {"req":{"id":"req-t","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:33271","accept-encoding":"gzip, deflate","cookie":"shopcity_session=805acce7-a1ab-482d-b0ec-5c13838b8013; shopcity_csrf=ea1ed5f9-7c5b-4de2-b62b-ff78f66f4b6d","x-csrf-token":"ea1ed5f9-7c5b-4de2-b62b-ff78f66f4b6d","idempotency-key":"receipt-key-10a","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54872},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-t","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":21}
[13:01:35.070] INFO (2939): request completed {"req":{"id":"req-u","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33537","accept-encoding":"gzip, deflate","x-device-id":"1b1e73fa-2bfb-4f4c-a61b-46e3c73c0180","content-type":"application/json","x-device-attestation":"1785675695060.9e439e6b-56f7-4c0f-b08c-a041ff6eb3df.mAk8ZHiepDvwLuBoIbO7RV_Jp8EKV0YCwTwb3BT2jWs","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55270},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-u","set-cookie":["shopcity_session=1f673908-eb0b-4ef4-91b5-5132a7c9a70f; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=f0ce80a3-06e4-477b-8725-457f100eb66d; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[13:01:35.083] INFO (2939): request completed {"req":{"id":"req-v","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33707","accept-encoding":"gzip, deflate","x-device-id":"ca2e101a-66c4-42d9-a220-0bb669333c34","content-type":"application/json","x-device-attestation":"1785675695074.11c8767d-70c7-4c3e-b5b6-8c20de5fc1bc.9w2PYUcc2h5aAib_3ZKaO7upPJ9rrSEalqm36IXvM5c","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52818},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-v","set-cookie":["shopcity_session=4ec17640-a3f1-4551-aa43-a123776f06e3; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=d4f05463-4ad8-46c1-950e-d87ecc672931; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"332"}},"responseTime":8}
[13:01:35.092] INFO (2939): request completed {"req":{"id":"req-w","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:36133","accept-encoding":"gzip, deflate","cookie":"shopcity_session=4ec17640-a3f1-4551-aa43-a123776f06e3; shopcity_csrf=d4f05463-4ad8-46c1-950e-d87ecc672931","x-csrf-token":"d4f05463-4ad8-46c1-950e-d87ecc672931","idempotency-key":"receipt-key-13","content-type":"application/json","content-length":"136","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47960},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-w","content-type":"application/json; charset=utf-8","content-length":"309"}},"responseTime":7}
[13:01:35.099] INFO (2939): request completed {"req":{"id":"req-x","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43475","accept-encoding":"gzip, deflate","cookie":"shopcity_session=4ec17640-a3f1-4551-aa43-a123776f06e3; shopcity_csrf=d4f05463-4ad8-46c1-950e-d87ecc672931","x-csrf-token":"d4f05463-4ad8-46c1-950e-d87ecc672931","idempotency-key":"receipt-key-14","content-type":"application/json","content-length":"135","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38900},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-x","content-type":"application/json; charset=utf-8","content-length":"297"}},"responseTime":5}
[13:01:35.117] INFO (2939): request completed {"req":{"id":"req-y","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39381","accept-encoding":"gzip, deflate","x-device-id":"0a97df7b-d521-422d-b586-0cc4d55c30af","content-type":"application/json","x-device-attestation":"1785675695108.70e3e472-51fd-47be-ad25-b6151565cc3f.QUtpBVVeaKpGe0AdjiBVdYmvRNoUMydFyyvcvZuC3dQ","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35522},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-y","set-cookie":["shopcity_session=9ff15066-90d5-4e9f-82a5-30909fcfd133; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=04b09818-4935-4d81-8cdc-3d7f90862384; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":8}
[13:01:35.129] INFO (2939): request completed {"req":{"id":"req-z","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:45573","accept-encoding":"gzip, deflate","x-device-id":"0a97df7b-d521-422d-b586-0cc4d55c30af","content-type":"application/json","x-device-attestation":"1785675695120.93b6ee17-1aec-4229-9f33-d41d1e03a344.AWkYXi1FdaPvMGJQJ6NmlaJGtnzwUkMqsvt_9o3Dre8","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50046},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-z","set-cookie":["shopcity_session=ed7fe3ab-ccdd-4cbf-9e72-a79a20232616; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=578f4160-1be3-473c-8f41-c4f001f71337; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":8}
[13:01:35.152] INFO (2939): request completed {"req":{"id":"req-10","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:46419","accept-encoding":"gzip, deflate","cookie":"shopcity_session=ed7fe3ab-ccdd-4cbf-9e72-a79a20232616; shopcity_csrf=578f4160-1be3-473c-8f41-c4f001f71337","x-csrf-token":"578f4160-1be3-473c-8f41-c4f001f71337","idempotency-key":"receipt-key-15","content-type":"application/json","content-length":"190","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33194},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-10","content-type":"application/json; charset=utf-8","content-length":"589"}},"responseTime":20}
[13:01:35.171] INFO (2939): request completed {"req":{"id":"req-11","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38311","accept-encoding":"gzip, deflate","x-device-id":"740d125a-6a62-4ef3-b93f-72a5f55dcae7","content-type":"application/json","x-device-attestation":"1785675695162.d12b5368-2b84-4241-8b4a-b684c9a9d439._4GT88A0Gopf7zHiah67wDXW9Mgexj6kwrZfLlCs8xs","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60904},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-11","set-cookie":["shopcity_session=9b4af665-1652-46bf-9e30-4d98cbdf1c14; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=f9eb3f6a-cd4a-4845-8643-d5f5f31f0ed7; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":8}
[13:01:35.197] INFO (2939): request completed {"req":{"id":"req-12","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:34041","accept-encoding":"gzip, deflate","cookie":"shopcity_session=9b4af665-1652-46bf-9e30-4d98cbdf1c14; shopcity_csrf=f9eb3f6a-cd4a-4845-8643-d5f5f31f0ed7","x-csrf-token":"f9eb3f6a-cd4a-4845-8643-d5f5f31f0ed7","idempotency-key":"receipt-key-16","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56176},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-12","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":24}
[13:01:35.214] INFO (2939): request completed {"req":{"id":"req-13","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:37997","accept-encoding":"gzip, deflate","x-device-id":"7eeec585-04e8-4558-997e-aec567eec522","content-type":"application/json","x-device-attestation":"1785675695205.c19411c4-8176-49e8-9e37-f613c5b041f8.V5wHSXS47QUOGeW0y6V-x6EB4u814OJziOF-sLkmvqo","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41034},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-13","set-cookie":["shopcity_session=fac7de4a-7efc-4ead-a16b-53f913f0e7b4; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=34e80b18-ce30-4687-b4b5-f2c8b2416901; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":8}
[13:01:35.237] INFO (2939): request completed {"req":{"id":"req-14","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:45327","accept-encoding":"gzip, deflate","cookie":"shopcity_session=fac7de4a-7efc-4ead-a16b-53f913f0e7b4; shopcity_csrf=34e80b18-ce30-4687-b4b5-f2c8b2416901","x-csrf-token":"34e80b18-ce30-4687-b4b5-f2c8b2416901","idempotency-key":"receipt-key-16a","content-type":"application/json","content-length":"138","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41222},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-14","content-type":"application/json; charset=utf-8","content-length":"596"}},"responseTime":21}
[13:01:35.262] INFO (2939): request completed {"req":{"id":"req-15","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:36095","accept-encoding":"gzip, deflate","cookie":"shopcity_session=fac7de4a-7efc-4ead-a16b-53f913f0e7b4; shopcity_csrf=34e80b18-ce30-4687-b4b5-f2c8b2416901","x-csrf-token":"34e80b18-ce30-4687-b4b5-f2c8b2416901","idempotency-key":"receipt-key-16b","content-type":"application/json","content-length":"136","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54258},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-15","content-type":"application/json; charset=utf-8","content-length":"594"}},"responseTime":23}
[13:01:35.274] INFO (2939): request completed {"req":{"id":"req-16","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43121","accept-encoding":"gzip, deflate","cookie":"shopcity_session=fac7de4a-7efc-4ead-a16b-53f913f0e7b4; shopcity_csrf=34e80b18-ce30-4687-b4b5-f2c8b2416901","x-csrf-token":"34e80b18-ce30-4687-b4b5-f2c8b2416901","idempotency-key":"receipt-key-16c","content-type":"application/json","content-length":"138","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55632},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-16","content-type":"application/json; charset=utf-8","content-length":"334"}},"responseTime":10}
[13:01:35.303] INFO (2939): request completed {"req":{"id":"req-17","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:37095","accept-encoding":"gzip, deflate","x-device-id":"b0ffb7c8-9250-45ab-8ee2-5f9ea22a2d6d","content-type":"application/json","x-device-attestation":"1785675695288.4cf17eba-fe1b-41db-8b07-3e39d6847331.WYheraOSZdHs0rheTH32j46HVsCtgtWkgpWWssIOdTg","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44406},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-17","set-cookie":["shopcity_session=53820ddb-3912-42c5-b9a3-442852f7c0c5; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=79704824-d374-4b84-81ce-a3c21f32e114; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":13}
[13:01:35.324] INFO (2939): request completed {"req":{"id":"req-18","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:44977","accept-encoding":"gzip, deflate","cookie":"shopcity_session=53820ddb-3912-42c5-b9a3-442852f7c0c5; shopcity_csrf=79704824-d374-4b84-81ce-a3c21f32e114","x-csrf-token":"79704824-d374-4b84-81ce-a3c21f32e114","idempotency-key":"receipt-key-17","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53592},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-18","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":18}
[13:01:35.336] INFO (2939): request completed {"req":{"id":"req-19","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33171","accept-encoding":"gzip, deflate","x-device-id":"b0ffb7c8-9250-45ab-8ee2-5f9ea22a2d6d","content-type":"application/json","x-device-attestation":"1785675695327.902f6303-2fb6-42e9-aa30-94a2ac31a127.SKzfm4v5_vvi5cM53VRRz0BuLG7mliOrCzyAv3z5Cng","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36046},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-19","set-cookie":["shopcity_session=fbe67aa4-f8cc-470a-b960-23f573c20990; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=2f71d0e2-85de-4a52-a22a-5ec8df0592bb; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":9}
[13:01:35.367] INFO (2939): request completed {"req":{"id":"req-1a","method":"POST","url":"/api/v1/receipts/54c2d5b2-5527-4d8e-8745-7b11ce4fa00f/approve","query":{},"headers":{"host":"127.0.0.1:44587","accept-encoding":"gzip, deflate","cookie":"shopcity_session=fbe67aa4-f8cc-470a-b960-23f573c20990; shopcity_csrf=2f71d0e2-85de-4a52-a22a-5ec8df0592bb","x-csrf-token":"2f71d0e2-85de-4a52-a22a-5ec8df0592bb","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35750},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1a","content-type":"application/json; charset=utf-8","content-length":"469"}},"responseTime":29}
[13:01:35.387] INFO (2939): request completed {"req":{"id":"req-1b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40453","accept-encoding":"gzip, deflate","x-device-id":"68103b37-741d-4857-a29d-275589fbf900","content-type":"application/json","x-device-attestation":"1785675695377.c75776b8-d353-4ec7-a5fc-3370ed4e5ae8.hFt5a-PRoXHqpubBM2JwgNTInWwTebWW0GKcqewXy2s","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38734},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1b","set-cookie":["shopcity_session=504d47f9-1253-4279-9c5f-15099b2fc8cc; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=916b80ac-a698-46f8-b152-4c8fc6c285e4; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":9}
[13:01:35.405] INFO (2939): request completed {"req":{"id":"req-1c","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:45803","accept-encoding":"gzip, deflate","cookie":"shopcity_session=504d47f9-1253-4279-9c5f-15099b2fc8cc; shopcity_csrf=916b80ac-a698-46f8-b152-4c8fc6c285e4","x-csrf-token":"916b80ac-a698-46f8-b152-4c8fc6c285e4","idempotency-key":"receipt-key-18","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33946},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1c","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":17}
[13:01:35.417] INFO (2939): request completed {"req":{"id":"req-1d","method":"POST","url":"/api/v1/receipts/cf486f76-b61f-4095-9cd6-cabccb1a8d11/approve","query":{},"headers":{"host":"127.0.0.1:36661","accept-encoding":"gzip, deflate","cookie":"shopcity_session=504d47f9-1253-4279-9c5f-15099b2fc8cc; shopcity_csrf=916b80ac-a698-46f8-b152-4c8fc6c285e4","x-csrf-token":"916b80ac-a698-46f8-b152-4c8fc6c285e4","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36096},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1d","content-type":"application/json; charset=utf-8","content-length":"378"}},"responseTime":10}
[13:01:35.434] INFO (2939): request completed {"req":{"id":"req-1e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34985","accept-encoding":"gzip, deflate","x-device-id":"d46483e1-3e32-4e75-9f5f-8974f755adc1","content-type":"application/json","x-device-attestation":"1785675695424.704a9cc2-27a2-4a10-b2c6-ae21e6c10db6.20joOppR9POniuruPgCajkPnDTSWzLe1ZGIPmcKCw94","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59114},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1e","set-cookie":["shopcity_session=99a7387a-1fa7-4bce-afff-c3f33e0f94d1; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=1e46ec8c-a5cd-466e-ac64-48bdfa398dea; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":9}
[13:01:35.457] INFO (2939): request completed {"req":{"id":"req-1f","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43907","accept-encoding":"gzip, deflate","cookie":"shopcity_session=99a7387a-1fa7-4bce-afff-c3f33e0f94d1; shopcity_csrf=1e46ec8c-a5cd-466e-ac64-48bdfa398dea","x-csrf-token":"1e46ec8c-a5cd-466e-ac64-48bdfa398dea","idempotency-key":"receipt-key-19","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58872},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1f","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":22}
[13:01:35.468] INFO (2939): request completed {"req":{"id":"req-1g","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33717","accept-encoding":"gzip, deflate","x-device-id":"d46483e1-3e32-4e75-9f5f-8974f755adc1","content-type":"application/json","x-device-attestation":"1785675695458.f6cc2700-866a-43af-bca8-1d66bbcced96.KnU8mGIuN6Iqr0B_w9EIrTP6GReNsqHntFkc7Ax6kGI","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60570},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1g","set-cookie":["shopcity_session=f3853bf3-5de2-4742-8870-bdb65f1e9ca2; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=7df4c18c-9695-4c8f-a409-9ec741aec752; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":8}
[13:01:35.492] INFO (2939): request completed {"req":{"id":"req-1h","method":"POST","url":"/api/v1/receipts/a2966928-a249-4d43-8961-a14b50b4fad7/reject","query":{},"headers":{"host":"127.0.0.1:35435","accept-encoding":"gzip, deflate","cookie":"shopcity_session=f3853bf3-5de2-4742-8870-bdb65f1e9ca2; shopcity_csrf=7df4c18c-9695-4c8f-a409-9ec741aec752","x-csrf-token":"7df4c18c-9695-4c8f-a409-9ec741aec752","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38198},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1h","content-type":"application/json; charset=utf-8","content-length":"372"}},"responseTime":23}
[13:01:35.511] INFO (2939): request completed {"req":{"id":"req-1i","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:45395","accept-encoding":"gzip, deflate","x-device-id":"8647131d-5e20-4d52-91fd-3b0e4cdd8961","content-type":"application/json","x-device-attestation":"1785675695501.4b830125-1871-452a-bd32-bc2cd39da315.cNWQDIZd2XvkMzz-uNW1oTKwpPC0-VMGebIOAKeWMI4","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40870},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1i","set-cookie":["shopcity_session=6ed1ef01-d3cb-4e38-9909-4b7e7eaa57fa; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=9734db7a-447d-4d45-9f0e-fe7a6aaf06b2; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":9}
[13:01:35.537] INFO (2939): request completed {"req":{"id":"req-1j","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40861","accept-encoding":"gzip, deflate","cookie":"shopcity_session=6ed1ef01-d3cb-4e38-9909-4b7e7eaa57fa; shopcity_csrf=9734db7a-447d-4d45-9f0e-fe7a6aaf06b2","x-csrf-token":"9734db7a-447d-4d45-9f0e-fe7a6aaf06b2","idempotency-key":"expired-completed-key","content-type":"application/json","content-length":"133","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":32928},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1j","content-type":"application/json; charset=utf-8","content-length":"584"}},"responseTime":21}
[13:01:35.563] INFO (2939): request completed {"req":{"id":"req-1k","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33205","accept-encoding":"gzip, deflate","x-device-id":"9d337231-1b32-4be5-968b-a24f635468ff","content-type":"application/json","x-device-attestation":"1785675695546.876cfca2-7bf1-4c72-9a44-726fff7c3d64.YDVA-5mRCpOcTOKOjupgGEAIYl_w4rEpgcbkO5qWCwU","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60390},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1k","set-cookie":["shopcity_session=7a3432ac-6fb0-4cae-a150-4411726bd665; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=12a8f380-067c-4c12-8b4f-08ed50dab110; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":16}
[13:01:35.604] INFO (2939): request completed {"req":{"id":"req-1l","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:41403","accept-encoding":"gzip, deflate","cookie":"shopcity_session=7a3432ac-6fb0-4cae-a150-4411726bd665; shopcity_csrf=12a8f380-067c-4c12-8b4f-08ed50dab110","x-csrf-token":"12a8f380-067c-4c12-8b4f-08ed50dab110","idempotency-key":"expired-pending-key","content-type":"application/json","content-length":"133","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40352},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1l","content-type":"application/json; charset=utf-8","content-length":"584"}},"responseTime":32}
PASS test/receipts.int-spec.ts (13.733 s)
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
PASS test/immutable-earn-ledger.int-spec.ts (6.034 s)
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
[13:01:48.469] INFO (2939): request completed {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35189","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39886},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","set-cookie":["shopcity_session=8930b52e-c7ea-40e2-871d-0b036349f852; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=84376ed1-cea1-45b9-ba8a-7cf7ee249f31; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":189}
[13:01:48.480] INFO (2939): request completed {"req":{"id":"req-2","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:45019","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8930b52e-c7ea-40e2-871d-0b036349f852","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50922},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-2","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":6}
[13:01:48.486] INFO (2939): request completed {"req":{"id":"req-3","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:44143","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8930b52e-c7ea-40e2-871d-0b036349f852; shopcity_csrf=84376ed1-cea1-45b9-ba8a-7cf7ee249f31","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47338},"res":{"statusCode":403,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-3","content-type":"application/json; charset=utf-8","content-length":"272"}},"responseTime":4}
[13:01:48.502] INFO (2939): request completed {"req":{"id":"req-4","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:42257","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8930b52e-c7ea-40e2-871d-0b036349f852; shopcity_csrf=84376ed1-cea1-45b9-ba8a-7cf7ee249f31","x-csrf-token":"84376ed1-cea1-45b9-ba8a-7cf7ee249f31","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53578},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-4","set-cookie":["shopcity_session=18aa964b-9e89-4636-b770-d375cfadd2bb; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=9fc16138-353b-464c-b352-c3fcadc5bef8; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"326"}},"responseTime":14}
[13:01:48.510] INFO (2939): request completed {"req":{"id":"req-5","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:40957","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8930b52e-c7ea-40e2-871d-0b036349f852","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52768},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-5","content-type":"application/json; charset=utf-8","content-length":"284"}},"responseTime":2}
[13:01:48.517] INFO (2939): request completed {"req":{"id":"req-6","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:35707","accept-encoding":"gzip, deflate","cookie":"shopcity_session=18aa964b-9e89-4636-b770-d375cfadd2bb","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39386},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-6","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":4}
[13:01:48.524] INFO (2939): request completed {"req":{"id":"req-7","method":"POST","url":"/api/v1/auth/logout","query":{},"headers":{"host":"127.0.0.1:33031","accept-encoding":"gzip, deflate","cookie":"shopcity_session=18aa964b-9e89-4636-b770-d375cfadd2bb; shopcity_csrf=9fc16138-353b-464c-b352-c3fcadc5bef8","x-csrf-token":"9fc16138-353b-464c-b352-c3fcadc5bef8","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38422},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-7","set-cookie":["shopcity_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly","shopcity_csrf=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly"],"content-type":"application/json; charset=utf-8","content-length":"136"}},"responseTime":6}
[13:01:48.530] INFO (2939): request completed {"req":{"id":"req-8","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:37925","accept-encoding":"gzip, deflate","cookie":"shopcity_session=18aa964b-9e89-4636-b770-d375cfadd2bb","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43942},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-8","content-type":"application/json; charset=utf-8","content-length":"284"}},"responseTime":3}
[13:01:48.548] INFO (2939): request completed {"req":{"id":"req-9","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:43621","accept-encoding":"gzip, deflate","x-device-id":"eb75da59-d013-4d92-b8fe-15fb54725e1f","x-device-attestation":"1785675708536.6178a289-da31-4d6c-b3f0-a6a1be16a14d.TlfImAyuuMqwZfLN9PYhJKWdAX0EjO1l1_U3u2y4UqQ","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48500},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-9","set-cookie":["shopcity_session=f96193b7-fb7c-4fe6-885e-31d803b49722; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=4786ddac-31b0-4ae4-8246-7677e8fc3943; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":11}
[13:01:48.560] INFO (2939): request completed {"req":{"id":"req-a","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34693","accept-encoding":"gzip, deflate","x-device-id":"efb83369-6704-42dc-82ae-ee2b13f4480e","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54766},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-a","content-type":"application/json; charset=utf-8","content-length":"303"}},"responseTime":4}
[13:01:48.567] INFO (2939): request completed {"req":{"id":"req-b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33033","accept-encoding":"gzip, deflate","x-device-id":"efb83369-6704-42dc-82ae-ee2b13f4480e","x-device-attestation":"1785675708560.672f5ef7-1f7d-4708-9f9e-5e198feb1732.-pI6hGs0Es0Mq2t4Nz6VS4QnJeu9rkzArD5hBiCClZ0","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56822},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-b","content-type":"application/json; charset=utf-8","content-length":"301"}},"responseTime":6}
[13:01:48.578] INFO (2939): request completed {"req":{"id":"req-c","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:46393","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39272},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-c","set-cookie":["shopcity_session=ff06f7fc-36f3-4ec7-bb72-a42c249479e8; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=aab11d17-47a4-4ce9-9875-196427bedec0; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":7}
[13:01:48.591] INFO (2939): request completed {"req":{"id":"req-d","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:45561","accept-encoding":"gzip, deflate","authorization":"_**","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46386},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-d","set-cookie":["shopcity_session=04b71bb2-eb3d-4dfe-b10c-7144ff539338; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e0aa2fab-b31c-4d43-b06f-69106ece31db; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"326"}},"responseTime":12}
[13:01:48.606] INFO (2939): request completed {"req":{"id":"req-e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:43171","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35304},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-e","set-cookie":["shopcity_session=28dd39d7-2d71-4e43-ad00-aa1e36686288; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=5c1c8310-c2cb-4519-8f54-56f55776b29f; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[13:01:48.678] INFO (2939): request completed {"req":{"id":"req-f","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35883","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53218},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-f","set-cookie":["shopcity_session=188ad2f0-8a1e-4c4f-8e1d-34e3522ea701; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=360c6623-ed49-40f4-9188-93438f975618; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":11}
[13:01:48.717] INFO (2939): request completed {"req":{"id":"req-g","method":"GET","url":"/api/v1/customers?q=%2B2348020000001&limit=10","query":{"q":"+2348020000001","limit":"10"},"headers":{"host":"127.0.0.1:34415","accept-encoding":"gzip, deflate","cookie":"shopcity_session=188ad2f0-8a1e-4c4f-8e1d-34e3522ea701","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60976},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-g","content-type":"application/json; charset=utf-8","content-length":"367"}},"responseTime":35}
[13:01:48.732] INFO (2939): request completed {"req":{"id":"req-h","method":"GET","url":"/api/v1/customers/4be9205c-f30f-48e9-962b-3cce61d07b6a","query":{},"headers":{"host":"127.0.0.1:41199","accept-encoding":"gzip, deflate","cookie":"shopcity_session=188ad2f0-8a1e-4c4f-8e1d-34e3522ea701","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52328},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-h","content-type":"application/json; charset=utf-8","content-length":"330"}},"responseTime":12}
[13:01:48.765] INFO (2939): request completed {"req":{"id":"req-i","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42239","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39010},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-i","set-cookie":["shopcity_session=57aef87c-a463-4dcb-9a23-5eae1a28d03b; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=494b90ce-3a02-470d-aee4-a47cb0cd1aec; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[13:01:48.776] INFO (2939): request completed {"req":{"id":"req-j","method":"GET","url":"/api/v1/customers?q=read-model-supervisor-http%40shopcity.local&limit=10","query":{"q":"read-model-supervisor-http@shopcity.local","limit":"10"},"headers":{"host":"127.0.0.1:35765","accept-encoding":"gzip, deflate","cookie":"shopcity_session=57aef87c-a463-4dcb-9a23-5eae1a28d03b","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47222},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-j","content-type":"application/json; charset=utf-8","content-length":"787"}},"responseTime":9}
[13:01:48.791] INFO (2939): request completed {"req":{"id":"req-k","method":"GET","url":"/api/v1/customers/8bd2c0fc-d65a-4ad5-be73-202166fccf88","query":{},"headers":{"host":"127.0.0.1:42841","accept-encoding":"gzip, deflate","cookie":"shopcity_session=57aef87c-a463-4dcb-9a23-5eae1a28d03b","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59932},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-k","content-type":"application/json; charset=utf-8","content-length":"723"}},"responseTime":13}
[13:01:48.825] INFO (2939): request completed {"req":{"id":"req-l","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:36645","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57448},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-l","set-cookie":["shopcity_session=00320805-5903-4379-9e48-cb32e9eb5f07; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=a44abd49-da74-4574-b6d9-8ce9f7254fc9; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":7}
[13:01:48.835] INFO (2939): request completed {"req":{"id":"req-m","method":"GET","url":"/api/v1/cards/lookup/CARD-card-http","query":{},"headers":{"host":"127.0.0.1:38049","accept-encoding":"gzip, deflate","cookie":"shopcity_session=00320805-5903-4379-9e48-cb32e9eb5f07","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46994},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-m","content-type":"application/json; charset=utf-8","content-length":"517"}},"responseTime":8}
[13:01:48.871] INFO (2939): request completed {"req":{"id":"req-n","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33739","accept-encoding":"gzip, deflate","x-device-id":"302058fe-0a5a-4e22-92a4-fb8e1e87621e","x-device-attestation":"1785675708860.e4440d9a-2882-40b7-9ac9-f576b13e2a40.eEUIihfoRZmkr0GkuZpzK5G_ftzI_NBqnuPuQ-i_QPM","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56104},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-n","set-cookie":["shopcity_session=59c17631-2d1d-4a61-8d57-dee30f02e562; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=c6de7917-db8c-4947-bd14-5afbb80acc27; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":10}
[13:01:48.908] INFO (2939): request completed {"req":{"id":"req-o","method":"POST","url":"/api/v1/transactions/redeem","query":{},"headers":{"host":"127.0.0.1:43403","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"redeem-http-pending","content-type":"application/json","content-length":"184","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34202},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-o","content-type":"application/json; charset=utf-8","content-length":"1004"}},"responseTime":34}
[13:01:48.973] INFO (2939): request completed {"req":{"id":"req-p","method":"POST","url":"/api/v1/transactions/redeem","query":{},"headers":{"host":"127.0.0.1:41325","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"redeem-http-confirmed","content-type":"application/json","content-length":"186","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58368},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-p","content-type":"application/json; charset=utf-8","content-length":"1140"}},"responseTime":64}
[13:01:48.997] INFO (2939): request completed {"req":{"id":"req-q","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41625","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50272},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-q","set-cookie":["shopcity_session=14fcfed5-d043-471c-ac75-cf7db26e5aec; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=bcc81e8f-69a4-4554-8dcb-83bd267f8c5d; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":14}
[13:01:49.014] INFO (2939): request completed {"req":{"id":"req-r","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:43607","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-0","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52948},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-r","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":14}
[13:01:49.023] INFO (2939): request completed {"req":{"id":"req-s","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40579","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-1","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56868},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-s","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":7}
[13:01:49.029] INFO (2939): request completed {"req":{"id":"req-t","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:42071","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-2","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":37576},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-t","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[13:01:49.035] INFO (2939): request completed {"req":{"id":"req-u","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:38249","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-3","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49272},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-u","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":4}
[13:01:49.042] INFO (2939): request completed {"req":{"id":"req-v","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:34545","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-4","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53526},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-v","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[13:01:49.048] INFO (2939): request completed {"req":{"id":"req-w","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:41415","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-5","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52764},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-w","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[13:01:49.055] INFO (2939): request completed {"req":{"id":"req-x","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39083","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-6","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52878},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-x","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":6}
[13:01:49.061] INFO (2939): request completed {"req":{"id":"req-y","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:46429","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-7","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42478},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-y","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[13:01:49.067] INFO (2939): request completed {"req":{"id":"req-z","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39873","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-8","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53766},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-z","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[13:01:49.074] INFO (2939): request completed {"req":{"id":"req-10","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:43933","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-9","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57172},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-10","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":6}
[13:01:49.080] INFO (2939): request completed {"req":{"id":"req-11","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40965","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-10","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54214},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-11","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:01:49.086] INFO (2939): request completed {"req":{"id":"req-12","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40843","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-11","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33506},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-12","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:01:49.092] INFO (2939): request completed {"req":{"id":"req-13","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:32963","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-12","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":32774},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-13","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:01:49.098] INFO (2939): request completed {"req":{"id":"req-14","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:35057","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-13","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39206},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-14","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:01:49.103] INFO (2939): request completed {"req":{"id":"req-15","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:44249","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-14","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38350},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-15","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[13:01:49.115] INFO (2939): request completed {"req":{"id":"req-16","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:34831","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-15","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57874},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-16","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[13:01:49.121] INFO (2939): request completed {"req":{"id":"req-17","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:45323","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-16","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40110},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-17","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:01:49.127] INFO (2939): request completed {"req":{"id":"req-18","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:36631","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-17","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36798},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-18","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:01:49.133] INFO (2939): request completed {"req":{"id":"req-19","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33989","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-18","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53646},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-19","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:01:49.138] INFO (2939): request completed {"req":{"id":"req-1a","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39601","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-19","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46120},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1a","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[13:01:49.146] INFO (2939): request completed {"req":{"id":"req-1b","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:36289","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-20","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39012},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1b","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":6}
[13:01:49.152] INFO (2939): request completed {"req":{"id":"req-1c","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39865","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-21","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45424},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1c","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:01:49.158] INFO (2939): request completed {"req":{"id":"req-1d","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33943","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-22","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41288},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1d","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[13:01:49.166] INFO (2939): request completed {"req":{"id":"req-1e","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40595","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-23","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50994},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1e","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":6}
[13:01:49.172] INFO (2939): request completed {"req":{"id":"req-1f","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:35169","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-24","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50946},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1f","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[13:01:49.180] INFO (2939): request completed {"req":{"id":"req-1g","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:37809","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-25","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56856},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1g","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":7}
[13:01:49.186] INFO (2939): request completed {"req":{"id":"req-1h","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39531","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-26","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33682},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1h","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[13:01:49.193] INFO (2939): request completed {"req":{"id":"req-1i","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:37175","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-27","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55906},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1i","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[13:01:49.199] INFO (2939): request completed {"req":{"id":"req-1j","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:42727","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-28","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46464},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1j","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[13:01:49.204] INFO (2939): request completed {"req":{"id":"req-1k","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:37841","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-29","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59954},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1k","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[13:01:49.210] INFO (2939): request completed {"req":{"id":"req-1l","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:45441","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-over-limit","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47244},"res":{"statusCode":429,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1l","content-type":"application/json; charset=utf-8","content-length":"264"}},"responseTime":5}
[13:01:49.221] INFO (2939): request completed {"req":{"id":"req-1m","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34573","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41994},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1m","set-cookie":["shopcity_session=0f60f837-ee9f-4451-a18d-7452aa0502db; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=09a18808-8c91-4c97-9f50-eb11cf36c9b1; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":7}
[13:01:49.227] INFO (2939): request completed {"req":{"id":"req-1n","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:34363","accept-encoding":"gzip, deflate","cookie":"shopcity_session=0f60f837-ee9f-4451-a18d-7452aa0502db","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56266},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1n","content-type":"application/json; charset=utf-8","content-length":"285"}},"responseTime":3}
[13:01:49.243] INFO (2939): request completed {"req":{"id":"req-1o","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:42651","accept-encoding":"gzip, deflate","cookie":"shopcity_session=0f60f837-ee9f-4451-a18d-7452aa0502db","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50204},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1o","content-type":"application/json; charset=utf-8","content-length":"285"}},"responseTime":2}
[13:01:49.255] INFO (2939): request completed {"req":{"id":"req-1p","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:33577","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36022},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1p","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":3}
[13:01:49.262] INFO (2939): request errored {"req":{"id":"req-1q","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:35817","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39416},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1q","content-type":"application/json; charset=utf-8","content-length":"331"}},"responseTime":3}
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
[13:01:49.270] INFO (2939): request errored {"req":{"id":"req-1r","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:35437","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55188},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1r","content-type":"application/json; charset=utf-8","content-length":"331"}},"responseTime":3}
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
PASS test/auth-http.int-spec.ts (7.522 s)
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
PASS test/redemption-approval.int-spec.ts (6.284 s)
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
PASS test/financial-repair-restore.int-spec.ts (16.683 s)
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
PASS test/outbox-worker-recovery.int-spec.ts (25.004 s)
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
PASS test/redemption-allocation-invariants.int-spec.ts (5.74 s)
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
FAIL test/lot-allocation-ordering.int-spec.ts (5.604 s)
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
PASS test/financial-state-invariants.int-spec.ts (5.445 s)
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
PASS test/sms-reference-backfill.int-spec.ts (5.468 s)
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-BATJ6o/prisma/schema.prisma
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
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-BATJ6o/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32781"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`

The following migration(s) have been applied:

migrations/
└─ 20260720_receipt_integrity_gate/
└─ migration.sql

All migrations have been successfully applied.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-WLgpJA/prisma/schema.prisma
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
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-WLgpJA/prisma/schema.prisma
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

Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-foczIE/prisma/schema.prisma
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
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-foczIE/prisma/schema.prisma
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

PASS test/receipt-migration-upgrade.int-spec.ts (27.231 s)
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
PASS test/phase-1.int-spec.ts (5.806 s)
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
[13:03:43.392] INFO (2939): request errored {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:36415","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33524},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","content-type":"application/json; charset=utf-8","content-length":"319"}},"responseTime":3169}
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
PASS test/redis-throttle-fail-closed.int-spec.ts (9.256 s)
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
PASS test/tenant-ownership.int-spec.ts (5.385 s)
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
PASS test/customer-email.int-spec.ts (5.403 s)
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
PASS test/outbox-migration-deploy.int-spec.ts (5.042 s)
PASS test/bootstrap-credential.int-spec.ts
PASS test/prisma.int-spec.ts

Test Suites: 1 failed, 19 passed, 20 total
Tests: 1 failed, 97 passed, 98 total
Snapshots: 0 total
Time: 160.719 s
Ran all test suites.
Error: Process completed with exit code 1.
