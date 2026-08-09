Run npm run test:integration

> shopcity-lp@0.0.1 test:integration
> jest --config ./test/jest-int.json --runInBand

Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32769"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

┌─────────────────────────────────────────────────────────┐
│ Update available 6.19.3 -> 7.9.1 │
│ │
The following migration(s) have been applied:
│ This is a major update - please follow the guide at │

migrations/
│ https://pris.ly/d/major-version-upgrade │
└─ 20260719_phase_1_integrity_hardening/
│ │
└─ migration.sql
│ Run the following to update │
└─ 20260719_phase_1_trust_and_integrity_hardening/
│ npm i --save-dev prisma@latest │
│ npm i @prisma/client@latest │
└─ migration.sql
└─────────────────────────────────────────────────────────┘
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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
[18:59:21.431] INFO (2931): request completed {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38407","accept-encoding":"gzip, deflate","x-device-id":"818b7a94-0c39-4b13-a4e3-a3c02de7253e","content-type":"application/json","x-device-attestation":"1785697161254.cd0e1cbd-6608-450b-8613-e4aaf43e0ee9.whil9MRb-6rSRl21DXvYGGIjhMhv66_REjBEiHkwW7c","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38184},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","set-cookie":["shopcity_session=de98b0c3-3c8f-4879-87b0-8dbebe98ca67; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=7e552e20-fa61-4de5-a340-8ed771182501; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":142}
[18:59:21.492] INFO (2931): request completed {"req":{"id":"req-2","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:46565","accept-encoding":"gzip, deflate","cookie":"shopcity_session=de98b0c3-3c8f-4879-87b0-8dbebe98ca67; shopcity_csrf=7e552e20-fa61-4de5-a340-8ed771182501","x-csrf-token":"7e552e20-fa61-4de5-a340-8ed771182501","idempotency-key":"receipt-key-1","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59066},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-2","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":54}
[18:59:21.503] INFO (2931): request completed {"req":{"id":"req-3","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:38903","accept-encoding":"gzip, deflate","cookie":"shopcity_session=de98b0c3-3c8f-4879-87b0-8dbebe98ca67; shopcity_csrf=7e552e20-fa61-4de5-a340-8ed771182501","x-csrf-token":"7e552e20-fa61-4de5-a340-8ed771182501","idempotency-key":"receipt-key-1","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49514},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-3","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":8}
[18:59:21.539] INFO (2931): request completed {"req":{"id":"req-4","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39381","accept-encoding":"gzip, deflate","x-device-id":"95497e46-7975-4805-b615-32a5674a3aa9","content-type":"application/json","x-device-attestation":"1785697161523.bbb9d4a0-21df-4bbe-9dcb-40adbf7c82b4.IsgOzJs1aOt_6LLt4jBmltx4b0J2W6enIzIQQHixRl8","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52808},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-4","set-cookie":["shopcity_session=aa85441e-7393-4c31-ab07-4a920cffb467; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=bb9c6722-d60b-4553-a905-6c436f1dfc9c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":15}
[18:59:21.565] INFO (2931): request completed {"req":{"id":"req-5","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:42449","accept-encoding":"gzip, deflate","cookie":"shopcity_session=aa85441e-7393-4c31-ab07-4a920cffb467; shopcity_csrf=bb9c6722-d60b-4553-a905-6c436f1dfc9c","x-csrf-token":"bb9c6722-d60b-4553-a905-6c436f1dfc9c","idempotency-key":"receipt-key-2","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35756},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-5","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":24}
[18:59:21.581] INFO (2931): request completed {"req":{"id":"req-6","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:42045","accept-encoding":"gzip, deflate","cookie":"shopcity_session=aa85441e-7393-4c31-ab07-4a920cffb467; shopcity_csrf=bb9c6722-d60b-4553-a905-6c436f1dfc9c","x-csrf-token":"bb9c6722-d60b-4553-a905-6c436f1dfc9c","idempotency-key":"receipt-key-3","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50746},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-6","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":13}
[18:59:21.604] INFO (2931): request completed {"req":{"id":"req-7","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:46009","accept-encoding":"gzip, deflate","x-device-id":"35549675-1b4b-4f4b-a82c-bcb263bce823","content-type":"application/json","x-device-attestation":"1785697161593.7b7b3406-ff5f-4115-9b42-92617d2ed6a7.xwVlqnmQZ__CzsRiz9sLYIlswVc1nngpfprvLwIZ4r4","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54896},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-7","set-cookie":["shopcity_session=fd312d9d-5602-464c-92a7-155d5854c962; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=fe6d384f-11c9-4e51-aa2d-110bb1fb4ecc; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[18:59:21.619] INFO (2931): request completed {"req":{"id":"req-8","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34957","accept-encoding":"gzip, deflate","x-device-id":"a4755a60-fc32-4e4b-abaa-03c73128b42b","content-type":"application/json","x-device-attestation":"1785697161608.634627e7-1529-4992-8c20-cd3e4e2434ad.LE_xPDLuh8XWTKKJcJAAk6Jk0nyBD_NqGj1eBbkxlkg","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54896},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-8","set-cookie":["shopcity_session=d416bb6f-2830-484a-a28b-468f9b101389; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=d789f757-c67d-4bb2-bc19-1de08314224c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"332"}},"responseTime":10}
[18:59:21.651] INFO (2931): request completed {"req":{"id":"req-9","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37279","accept-encoding":"gzip, deflate","cookie":"shopcity_session=fd312d9d-5602-464c-92a7-155d5854c962; shopcity_csrf=fe6d384f-11c9-4e51-aa2d-110bb1fb4ecc","x-csrf-token":"fe6d384f-11c9-4e51-aa2d-110bb1fb4ecc","idempotency-key":"receipt-key-4","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40174},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-9","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":30}
[18:59:21.702] INFO (2931): request completed {"req":{"id":"req-a","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:37731","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d416bb6f-2830-484a-a28b-468f9b101389; shopcity_csrf=d789f757-c67d-4bb2-bc19-1de08314224c","x-csrf-token":"d789f757-c67d-4bb2-bc19-1de08314224c","idempotency-key":"receipt-key-5","content-type":"application/json","content-length":"129","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60930},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-a","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":48}
[18:59:21.737] INFO (2931): request completed {"req":{"id":"req-b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42337","accept-encoding":"gzip, deflate","x-device-id":"14494b1a-6994-4efa-859f-2f5e165188b2","content-type":"application/json","x-device-attestation":"1785697161719.2601322d-13db-467e-904b-0bc635cd0002.ngmhjR9kz9pWdtm3Q9EY9zPYp8UfyPfdlwnmp3dykrA","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59786},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-b","set-cookie":["shopcity_session=a55b2c8b-8755-4458-84ee-598c0bac78a5; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=34dbb9aa-4237-4447-a177-1b4a8ad0ac41; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":17}
[18:59:21.769] INFO (2931): request completed {"req":{"id":"req-d","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:44213","accept-encoding":"gzip, deflate","cookie":"shopcity_session=a55b2c8b-8755-4458-84ee-598c0bac78a5; shopcity_csrf=34dbb9aa-4237-4447-a177-1b4a8ad0ac41","x-csrf-token":"34dbb9aa-4237-4447-a177-1b4a8ad0ac41","idempotency-key":"receipt-key-4b","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49174},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-d","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":29}
[18:59:21.908] INFO (2931): request completed {"req":{"id":"req-c","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:44213","accept-encoding":"gzip, deflate","cookie":"shopcity_session=a55b2c8b-8755-4458-84ee-598c0bac78a5; shopcity_csrf=34dbb9aa-4237-4447-a177-1b4a8ad0ac41","x-csrf-token":"34dbb9aa-4237-4447-a177-1b4a8ad0ac41","idempotency-key":"receipt-key-4a","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49172},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-c","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":169}
[18:59:21.929] INFO (2931): request completed {"req":{"id":"req-e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33685","accept-encoding":"gzip, deflate","x-device-id":"61e9d22e-28ff-4ab9-8e6d-bcbb138dc2c2","content-type":"application/json","x-device-attestation":"1785697161918.f4da4fd5-fe04-43cb-a058-84c1b9387a23.k3T-JePbbx2S0yFxkEQFqjrqvOmmGL_jNM8sx3BQ7Qg","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44760},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-e","set-cookie":["shopcity_session=1dcfc138-3975-4281-978f-0748ea8746aa; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=4c9b8383-bf76-4f27-ad49-0b1b6c17e6ea; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":10}
[18:59:21.979] INFO (2931): request completed {"req":{"id":"req-f","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40231","accept-encoding":"gzip, deflate","cookie":"shopcity_session=1dcfc138-3975-4281-978f-0748ea8746aa; shopcity_csrf=4c9b8383-bf76-4f27-ad49-0b1b6c17e6ea","x-csrf-token":"4c9b8383-bf76-4f27-ad49-0b1b6c17e6ea","idempotency-key":"receipt-key-6","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":60590},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-f","content-type":"application/json; charset=utf-8","content-length":"580"}},"responseTime":44}
[18:59:22.008] INFO (2931): request completed {"req":{"id":"req-g","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:41021","accept-encoding":"gzip, deflate","cookie":"shopcity_session=1dcfc138-3975-4281-978f-0748ea8746aa; shopcity_csrf=4c9b8383-bf76-4f27-ad49-0b1b6c17e6ea","x-csrf-token":"4c9b8383-bf76-4f27-ad49-0b1b6c17e6ea","idempotency-key":"receipt-key-7","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59266},"res":{"statusCode":409,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-g","content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":26}
[18:59:22.061] INFO (2931): request completed {"req":{"id":"req-h","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:32803","accept-encoding":"gzip, deflate","x-device-id":"8b02b912-a56a-4fa1-a331-c6e731a71274","content-type":"application/json","x-device-attestation":"1785697162046.394b11b2-cbff-4f85-8dd6-f69a435afe3f.ucmAcR0YWDOTP3UdImlq_ZFHxKc0eXwz1covVnZd0zw","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36606},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-h","set-cookie":["shopcity_session=9e6c3091-493d-4dc3-ad24-e42a5ab5dfe7; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=c2f913ce-3258-42af-bb5e-051e4b17246c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":12}
[18:59:22.085] INFO (2931): request completed {"req":{"id":"req-i","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43515","accept-encoding":"gzip, deflate","cookie":"shopcity_session=9e6c3091-493d-4dc3-ad24-e42a5ab5dfe7; shopcity_csrf=c2f913ce-3258-42af-bb5e-051e4b17246c","x-csrf-token":"c2f913ce-3258-42af-bb5e-051e4b17246c","idempotency-key":"receipt-key-8","content-type":"application/json","content-length":"175","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45466},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-i","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":22}
[18:59:22.109] INFO (2931): request completed {"req":{"id":"req-j","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40219","accept-encoding":"gzip, deflate","cookie":"shopcity_session=9e6c3091-493d-4dc3-ad24-e42a5ab5dfe7; shopcity_csrf=c2f913ce-3258-42af-bb5e-051e4b17246c","x-csrf-token":"c2f913ce-3258-42af-bb5e-051e4b17246c","idempotency-key":"receipt-key-9","content-type":"application/json","content-length":"175","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57310},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-j","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":22}
[18:59:22.135] INFO (2931): request completed {"req":{"id":"req-k","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39405","accept-encoding":"gzip, deflate","x-device-id":"e8c0287b-da1d-49f2-9939-7e0c806c6769","content-type":"application/json","x-device-attestation":"1785697162125.b9a6e896-4f6a-4bf4-a09c-4d7a4f866de8.ksrf9zLVWnXdvY5L0Om-gdTpfBnIEjtIVGD9qanfTL0","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52912},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-k","set-cookie":["shopcity_session=adf381a3-3c8f-4855-9bf7-7f24f1739587; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=982e347f-4cbe-4b85-b1a8-254755c9079e; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[18:59:22.159] INFO (2931): request completed {"req":{"id":"req-l","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:39239","accept-encoding":"gzip, deflate","cookie":"shopcity_session=adf381a3-3c8f-4855-9bf7-7f24f1739587; shopcity_csrf=982e347f-4cbe-4b85-b1a8-254755c9079e","x-csrf-token":"982e347f-4cbe-4b85-b1a8-254755c9079e","idempotency-key":"receipt-key-8a","content-type":"application/json","content-length":"177","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47600},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-l","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":23}
[18:59:22.180] INFO (2931): request completed {"req":{"id":"req-m","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:43625","accept-encoding":"gzip, deflate","x-device-id":"ef7a4766-3230-4bce-ba4c-42ea2b2a67ba","content-type":"application/json","x-device-attestation":"1785697162171.041b040f-d7bb-4610-8e55-6b891c4eb52f.9ZaG890Eh0TiG3vHVc5tfct_kqhAR84qXSFEfkmP7FY","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":42636},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-m","set-cookie":["shopcity_session=ddd06c9c-e2dd-475e-98e9-d846fc204e20; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=8cb0cf9d-4535-43ba-8106-53e37b1d86fe; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":8}
[18:59:22.191] INFO (2931): request completed {"req":{"id":"req-n","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:46709","accept-encoding":"gzip, deflate","cookie":"shopcity_session=ddd06c9c-e2dd-475e-98e9-d846fc204e20; shopcity_csrf=8cb0cf9d-4535-43ba-8106-53e37b1d86fe","x-csrf-token":"8cb0cf9d-4535-43ba-8106-53e37b1d86fe","idempotency-key":"receipt-key-8b","content-type":"application/json","content-length":"174","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53984},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-n","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":9}
[18:59:22.210] INFO (2931): request completed {"req":{"id":"req-o","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:46717","accept-encoding":"gzip, deflate","x-device-id":"d0c2a98d-5b93-4598-a58b-95e2cea31c13","content-type":"application/json","x-device-attestation":"1785697162201.4910f6ba-63aa-4425-bedd-a51f4c12236e.HTs82DBaEzqbEJakDKnx9JMt29JzOQzFZLND3Dk37tA","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41364},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-o","set-cookie":["shopcity_session=24cecfae-a448-4894-9845-f207d145d6b9; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=07417c88-c6ab-49f0-81c0-97bc5012f8b2; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[18:59:22.219] INFO (2931): request completed {"req":{"id":"req-p","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:43879","accept-encoding":"gzip, deflate","x-device-id":"9c9d30a6-1886-4dc7-bf93-f3e481b83cb7","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56520},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-p","content-type":"application/json; charset=utf-8","content-length":"283"}},"responseTime":3}
[18:59:22.225] INFO (2931): request completed {"req":{"id":"req-q","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:42903","accept-encoding":"gzip, deflate","cookie":"shopcity_session=24cecfae-a448-4894-9845-f207d145d6b9; shopcity_csrf=07417c88-c6ab-49f0-81c0-97bc5012f8b2","x-csrf-token":"07417c88-c6ab-49f0-81c0-97bc5012f8b2","idempotency-key":"receipt-key-10","content-type":"application/json","content-length":"179","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54310},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-q","content-type":"application/json; charset=utf-8","content-length":"311"}},"responseTime":5}
[18:59:22.232] INFO (2931): request completed {"req":{"id":"req-r","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40953","accept-encoding":"gzip, deflate","x-device-id":"127bb8cc-0056-4af9-8b6a-0a18a21dfee9","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39928},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-r","content-type":"application/json; charset=utf-8","content-length":"283"}},"responseTime":4}
[18:59:22.254] INFO (2931): request completed {"req":{"id":"req-s","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44939","accept-encoding":"gzip, deflate","x-device-id":"7ab02611-9eab-4ae1-ae0a-2285042e28ca","content-type":"application/json","x-device-attestation":"1785697162240.3fef4113-4294-44b3-bd7d-b80a1e80fbe0.9EzSTNefu-W7DCguLxSCW2e3WF8em38S6HM1yNR1ErA","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39480},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-s","set-cookie":["shopcity_session=cb4f7e09-414c-4931-826b-fad990bc60b1; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=89daab25-957f-478b-89c1-871f49d945b3; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"301"}},"responseTime":13}
[18:59:22.280] INFO (2931): request completed {"req":{"id":"req-t","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:43353","accept-encoding":"gzip, deflate","cookie":"shopcity_session=cb4f7e09-414c-4931-826b-fad990bc60b1; shopcity_csrf=89daab25-957f-478b-89c1-871f49d945b3","x-csrf-token":"89daab25-957f-478b-89c1-871f49d945b3","idempotency-key":"receipt-key-10a","content-type":"application/json","content-length":"131","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39450},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-t","content-type":"application/json; charset=utf-8","content-length":"581"}},"responseTime":19}
[18:59:22.307] INFO (2931): request completed {"req":{"id":"req-u","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:36857","accept-encoding":"gzip, deflate","x-device-id":"7e25c8df-4f66-47c3-90a4-e7906d4f6057","content-type":"application/json","x-device-attestation":"1785697162294.a313f895-a7c5-4f47-b327-be14064e7ba9.htIGu8Kiybhoz3RjKOO4OaxCxIs-rVfhtCuqI5ZfwnA","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50652},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-u","set-cookie":["shopcity_session=5b35cc0c-78a5-44d7-b79a-d49c9f491ce7; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e0882320-49d0-4c7b-9520-75c9036f62af; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":12}
[18:59:22.324] INFO (2931): request completed {"req":{"id":"req-v","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35313","accept-encoding":"gzip, deflate","x-device-id":"9c32cd14-cfc9-4ea3-bf48-06a0ffed40ef","content-type":"application/json","x-device-attestation":"1785697162313.08b7f5c5-a364-4b3d-bd99-60bdc5309758.OM9h2ohZhFVbAvy-1g1c8cTfR8gSIG4FoJY1eoNm14Y","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58296},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-v","set-cookie":["shopcity_session=132f767d-88d5-40ab-9bb7-54cd92582aa5; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=1492b262-1179-415c-94b9-76b6f13fd72b; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"332"}},"responseTime":10}
[18:59:22.335] INFO (2931): request completed {"req":{"id":"req-w","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:42993","accept-encoding":"gzip, deflate","cookie":"shopcity_session=132f767d-88d5-40ab-9bb7-54cd92582aa5; shopcity_csrf=1492b262-1179-415c-94b9-76b6f13fd72b","x-csrf-token":"1492b262-1179-415c-94b9-76b6f13fd72b","idempotency-key":"receipt-key-13","content-type":"application/json","content-length":"136","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50840},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-w","content-type":"application/json; charset=utf-8","content-length":"309"}},"responseTime":8}
[18:59:22.347] INFO (2931): request completed {"req":{"id":"req-x","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:33443","accept-encoding":"gzip, deflate","cookie":"shopcity_session=132f767d-88d5-40ab-9bb7-54cd92582aa5; shopcity_csrf=1492b262-1179-415c-94b9-76b6f13fd72b","x-csrf-token":"1492b262-1179-415c-94b9-76b6f13fd72b","idempotency-key":"receipt-key-14","content-type":"application/json","content-length":"135","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33858},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-x","content-type":"application/json; charset=utf-8","content-length":"297"}},"responseTime":8}
[18:59:22.371] INFO (2931): request completed {"req":{"id":"req-y","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40373","accept-encoding":"gzip, deflate","x-device-id":"178c7f2d-e342-4219-8abb-a1f8f4d198c2","content-type":"application/json","x-device-attestation":"1785697162361.e5ed01ef-4723-416e-a6c1-2c82910542d6.0kXjYRGqoygodpUUjQynj991m-zbxMUrDiJh-_UaSk4","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40156},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-y","set-cookie":["shopcity_session=0c692586-e8e5-4b0d-b87e-d0cd1e1a33f5; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e2aa8c19-bb7e-4bc6-9804-b6571cc24cb5; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[18:59:22.384] INFO (2931): request completed {"req":{"id":"req-z","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39453","accept-encoding":"gzip, deflate","x-device-id":"178c7f2d-e342-4219-8abb-a1f8f4d198c2","content-type":"application/json","x-device-attestation":"1785697162374.86e5a7f1-a0c5-4b7d-ac36-3287eaa0cfaa.aQbmis5JwikSTUzxbYrbVSEk5Y4kImcaS0sbdcuzhHA","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46658},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-z","set-cookie":["shopcity_session=adf59b8a-79ec-4244-8bcc-a21e8c5c7e1a; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=fbfefd7c-6a31-4753-b031-44429b07d0c6; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":9}
[18:59:22.408] INFO (2931): request completed {"req":{"id":"req-10","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40289","accept-encoding":"gzip, deflate","cookie":"shopcity_session=adf59b8a-79ec-4244-8bcc-a21e8c5c7e1a; shopcity_csrf=fbfefd7c-6a31-4753-b031-44429b07d0c6","x-csrf-token":"fbfefd7c-6a31-4753-b031-44429b07d0c6","idempotency-key":"receipt-key-15","content-type":"application/json","content-length":"190","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54240},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-10","content-type":"application/json; charset=utf-8","content-length":"589"}},"responseTime":23}
[18:59:22.426] INFO (2931): request completed {"req":{"id":"req-11","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44227","accept-encoding":"gzip, deflate","x-device-id":"e6097ea9-1c2c-4d9d-a59b-b332f8209eb1","content-type":"application/json","x-device-attestation":"1785697162417.18c2c43d-45ec-4c36-be47-e05473679bd6.2behMFmsxB0mR2EUeAlEtu-aY-Zm_r9TvmhUgcDKsQc","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":54848},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-11","set-cookie":["shopcity_session=8d0ed63d-1ceb-423d-b811-a3196bec8741; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=27ebb822-8ce6-40a6-ba50-5ba6ce70b262; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":8}
[18:59:22.449] INFO (2931): request completed {"req":{"id":"req-12","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40971","accept-encoding":"gzip, deflate","cookie":"shopcity_session=8d0ed63d-1ceb-423d-b811-a3196bec8741; shopcity_csrf=27ebb822-8ce6-40a6-ba50-5ba6ce70b262","x-csrf-token":"27ebb822-8ce6-40a6-ba50-5ba6ce70b262","idempotency-key":"receipt-key-16","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57218},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-12","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":22}
[18:59:22.467] INFO (2931): request completed {"req":{"id":"req-13","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35575","accept-encoding":"gzip, deflate","x-device-id":"b706a95d-f1f1-4f97-a382-2031fa4c3005","content-type":"application/json","x-device-attestation":"1785697162457.6941c502-943e-4d39-82da-91b5f494f188.nymMkSL11nDZ4jjBChVKbwquq-RYeQqz9BkcDf1JUbE","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":32814},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-13","set-cookie":["shopcity_session=fc2a89dc-07e7-457d-ad1f-9240d0722b9e; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=412d2b01-4ed5-4c4a-baf9-35d125e4e736; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":9}
[18:59:22.485] INFO (2931): request completed {"req":{"id":"req-14","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:36947","accept-encoding":"gzip, deflate","cookie":"shopcity_session=fc2a89dc-07e7-457d-ad1f-9240d0722b9e; shopcity_csrf=412d2b01-4ed5-4c4a-baf9-35d125e4e736","x-csrf-token":"412d2b01-4ed5-4c4a-baf9-35d125e4e736","idempotency-key":"receipt-key-16a","content-type":"application/json","content-length":"138","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46524},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-14","content-type":"application/json; charset=utf-8","content-length":"596"}},"responseTime":17}
[18:59:22.502] INFO (2931): request completed {"req":{"id":"req-15","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:45729","accept-encoding":"gzip, deflate","cookie":"shopcity_session=fc2a89dc-07e7-457d-ad1f-9240d0722b9e; shopcity_csrf=412d2b01-4ed5-4c4a-baf9-35d125e4e736","x-csrf-token":"412d2b01-4ed5-4c4a-baf9-35d125e4e736","idempotency-key":"receipt-key-16b","content-type":"application/json","content-length":"136","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":37798},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-15","content-type":"application/json; charset=utf-8","content-length":"594"}},"responseTime":15}
[18:59:22.510] INFO (2931): request completed {"req":{"id":"req-16","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:33513","accept-encoding":"gzip, deflate","cookie":"shopcity_session=fc2a89dc-07e7-457d-ad1f-9240d0722b9e; shopcity_csrf=412d2b01-4ed5-4c4a-baf9-35d125e4e736","x-csrf-token":"412d2b01-4ed5-4c4a-baf9-35d125e4e736","idempotency-key":"receipt-key-16c","content-type":"application/json","content-length":"138","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50640},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-16","content-type":"application/json; charset=utf-8","content-length":"334"}},"responseTime":6}
[18:59:22.526] INFO (2931): request completed {"req":{"id":"req-17","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41175","accept-encoding":"gzip, deflate","x-device-id":"5ba0fdda-c630-4e25-9b04-edd4e61899bf","content-type":"application/json","x-device-attestation":"1785697162517.2ac497b2-be96-4fda-9f9f-34f625e04a80.iaHQyYg4uodTbpe5HccVqLmAYY9wZlFwXi2x01ie8bQ","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47698},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-17","set-cookie":["shopcity_session=322b7042-acce-4a1e-8fd9-f69961bf68b9; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=6299d3da-481b-4280-be45-02c10ddc5642; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":8}
[18:59:22.548] INFO (2931): request completed {"req":{"id":"req-18","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:39725","accept-encoding":"gzip, deflate","cookie":"shopcity_session=322b7042-acce-4a1e-8fd9-f69961bf68b9; shopcity_csrf=6299d3da-481b-4280-be45-02c10ddc5642","x-csrf-token":"6299d3da-481b-4280-be45-02c10ddc5642","idempotency-key":"receipt-key-17","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48166},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-18","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":21}
[18:59:22.559] INFO (2931): request completed {"req":{"id":"req-19","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34525","accept-encoding":"gzip, deflate","x-device-id":"5ba0fdda-c630-4e25-9b04-edd4e61899bf","content-type":"application/json","x-device-attestation":"1785697162550.170fa31a-cb0e-4b3c-8843-5ff8315162e6.o9BHc1Zfr8yg-VLPZXUBaPEzmKvxO7OBmlpwBEJYvs0","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40708},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-19","set-cookie":["shopcity_session=f9fb1af0-8fa2-46bf-b6dc-621d50b38fd4; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=8e018c9a-34d5-4624-973b-21ee1afc432d; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":8}
[18:59:22.589] INFO (2931): request completed {"req":{"id":"req-1a","method":"POST","url":"/api/v1/receipts/9f32f4e1-2998-4024-8cc7-99564f86f8e8/approve","query":{},"headers":{"host":"127.0.0.1:43167","accept-encoding":"gzip, deflate","cookie":"shopcity_session=f9fb1af0-8fa2-46bf-b6dc-621d50b38fd4; shopcity_csrf=8e018c9a-34d5-4624-973b-21ee1afc432d","x-csrf-token":"8e018c9a-34d5-4624-973b-21ee1afc432d","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56622},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1a","content-type":"application/json; charset=utf-8","content-length":"469"}},"responseTime":29}
[18:59:22.609] INFO (2931): request completed {"req":{"id":"req-1b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38749","accept-encoding":"gzip, deflate","x-device-id":"78035e57-9eb2-4315-a9a3-8bf52f8f72b3","content-type":"application/json","x-device-attestation":"1785697162598.21b1ef61-909a-4e73-a6ba-89eb192ddf61.8aBME6rwuDeb6dxM1rW-JjOj_CRwGGNjVtMRGLJF9H8","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57180},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1b","set-cookie":["shopcity_session=b1639050-5a71-45d0-81df-d96a6079cfc7; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=81cb622f-3ab7-406a-a356-b5a360b5385e; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":10}
[18:59:22.637] INFO (2931): request completed {"req":{"id":"req-1c","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40255","accept-encoding":"gzip, deflate","cookie":"shopcity_session=b1639050-5a71-45d0-81df-d96a6079cfc7; shopcity_csrf=81cb622f-3ab7-406a-a356-b5a360b5385e","x-csrf-token":"81cb622f-3ab7-406a-a356-b5a360b5385e","idempotency-key":"receipt-key-18","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38916},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1c","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":26}
[18:59:22.658] INFO (2931): request completed {"req":{"id":"req-1d","method":"POST","url":"/api/v1/receipts/fefd3583-7f81-4b79-8222-93b6a0836059/approve","query":{},"headers":{"host":"127.0.0.1:35299","accept-encoding":"gzip, deflate","cookie":"shopcity_session=b1639050-5a71-45d0-81df-d96a6079cfc7; shopcity_csrf=81cb622f-3ab7-406a-a356-b5a360b5385e","x-csrf-token":"81cb622f-3ab7-406a-a356-b5a360b5385e","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33360},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1d","content-type":"application/json; charset=utf-8","content-length":"378"}},"responseTime":18}
[18:59:22.686] INFO (2931): request completed {"req":{"id":"req-1e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41481","accept-encoding":"gzip, deflate","x-device-id":"a0c216af-40d1-45ac-9355-41336e3d3087","content-type":"application/json","x-device-attestation":"1785697162672.5dbc92d2-06bc-414b-8a04-dc286a775772.7UMysXUT_Rd1KTMMnJvfEbh_ZdPc1b6hNB6Yi7vLO8s","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40930},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1e","set-cookie":["shopcity_session=98efc7ef-a576-463b-a51b-20238b1599fa; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=22cd94ec-1231-45a5-9a57-4ad9539a01e4; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":13}
[18:59:22.704] INFO (2931): request completed {"req":{"id":"req-1f","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:40863","accept-encoding":"gzip, deflate","cookie":"shopcity_session=98efc7ef-a576-463b-a51b-20238b1599fa; shopcity_csrf=22cd94ec-1231-45a5-9a57-4ad9539a01e4","x-csrf-token":"22cd94ec-1231-45a5-9a57-4ad9539a01e4","idempotency-key":"receipt-key-19","content-type":"application/json","content-length":"130","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48034},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1f","content-type":"application/json; charset=utf-8","content-length":"588"}},"responseTime":16}
[18:59:22.715] INFO (2931): request completed {"req":{"id":"req-1g","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:45257","accept-encoding":"gzip, deflate","x-device-id":"a0c216af-40d1-45ac-9355-41336e3d3087","content-type":"application/json","x-device-attestation":"1785697162706.3448fdf9-dce8-4b7e-80f2-e9d06d83d1f7.hglhDAaqexa_g4XRszI_NMlFE83pbYEXSLpn7QEDqAw","content-length":"68","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40186},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1g","set-cookie":["shopcity_session=91a8e96f-76fd-4cde-85f6-c641c52b1945; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=e3dee5dc-5fc6-40ec-9acb-638fecfa1875; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"302"}},"responseTime":8}
[18:59:22.735] INFO (2931): request completed {"req":{"id":"req-1h","method":"POST","url":"/api/v1/receipts/901a5f50-19d0-4206-925e-e230544f38ca/reject","query":{},"headers":{"host":"127.0.0.1:40137","accept-encoding":"gzip, deflate","cookie":"shopcity_session=91a8e96f-76fd-4cde-85f6-c641c52b1945; shopcity_csrf=e3dee5dc-5fc6-40ec-9acb-638fecfa1875","x-csrf-token":"e3dee5dc-5fc6-40ec-9acb-638fecfa1875","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39874},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1h","content-type":"application/json; charset=utf-8","content-length":"372"}},"responseTime":19}
[18:59:22.752] INFO (2931): request completed {"req":{"id":"req-1i","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:37227","accept-encoding":"gzip, deflate","x-device-id":"791234ba-4c95-4c1b-bbd6-4f67cb042b1f","content-type":"application/json","x-device-attestation":"1785697162743.e2bee89a-b86e-4120-9e44-148bbedac1ce.rSjCi0YFSbVeJCBjV2rzz5NJYz41PKFAWARm95YnLLg","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45910},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1i","set-cookie":["shopcity_session=2743acd5-42c2-416c-a8f3-20112e66d27e; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=3beb46da-79cb-405f-a8f3-7348383e9d2e; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":8}
[18:59:22.775] INFO (2931): request completed {"req":{"id":"req-1j","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:34863","accept-encoding":"gzip, deflate","cookie":"shopcity_session=2743acd5-42c2-416c-a8f3-20112e66d27e; shopcity_csrf=3beb46da-79cb-405f-a8f3-7348383e9d2e","x-csrf-token":"3beb46da-79cb-405f-a8f3-7348383e9d2e","idempotency-key":"expired-completed-key","content-type":"application/json","content-length":"133","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58202},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1j","content-type":"application/json; charset=utf-8","content-length":"584"}},"responseTime":20}
[18:59:22.794] INFO (2931): request completed {"req":{"id":"req-1k","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:35683","accept-encoding":"gzip, deflate","x-device-id":"3ba31a97-8976-46d8-865d-926ff591e746","content-type":"application/json","x-device-attestation":"1785697162783.b8759bbe-77df-4ae6-804e-2a528561ef4f.XnIxnOplQGyP9y8RbhJZBjiTWgjNX7wJGbK6PJrjFyc","content-length":"63","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38658},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1k","set-cookie":["shopcity_session=d9236f4c-dc2e-4433-baf5-722d53637b4e; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=961d5876-d2ad-405c-9f07-b2d1178a5010; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"333"}},"responseTime":10}
[18:59:22.820] INFO (2931): request completed {"req":{"id":"req-1l","method":"POST","url":"/api/v1/receipts","query":{},"headers":{"host":"127.0.0.1:41033","accept-encoding":"gzip, deflate","cookie":"shopcity_session=d9236f4c-dc2e-4433-baf5-722d53637b4e; shopcity_csrf=961d5876-d2ad-405c-9f07-b2d1178a5010","x-csrf-token":"961d5876-d2ad-405c-9f07-b2d1178a5010","idempotency-key":"expired-pending-key","content-type":"application/json","content-length":"133","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":58920},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1l","content-type":"application/json; charset=utf-8","content-length":"584"}},"responseTime":20}
PASS test/receipts.int-spec.ts (13.244 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32770"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
PASS test/immutable-earn-ledger.int-spec.ts (6.082 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32771"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
[18:59:35.705] INFO (2931): request completed {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:44827","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":47624},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","set-cookie":["shopcity_session=55aabe10-307f-4a25-8eeb-3a8772a8f3e6; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=be311fa9-50c9-41db-a317-6e73bcf1d947; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":85}
[18:59:35.724] INFO (2931): request completed {"req":{"id":"req-2","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:39807","accept-encoding":"gzip, deflate","cookie":"shopcity_session=55aabe10-307f-4a25-8eeb-3a8772a8f3e6","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46142},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-2","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":14}
[18:59:35.737] INFO (2931): request completed {"req":{"id":"req-3","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:39209","accept-encoding":"gzip, deflate","cookie":"shopcity_session=55aabe10-307f-4a25-8eeb-3a8772a8f3e6; shopcity_csrf=be311fa9-50c9-41db-a317-6e73bcf1d947","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":37184},"res":{"statusCode":403,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-3","content-type":"application/json; charset=utf-8","content-length":"272"}},"responseTime":7}
[18:59:35.786] INFO (2931): request completed {"req":{"id":"req-4","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:36447","accept-encoding":"gzip, deflate","cookie":"shopcity_session=55aabe10-307f-4a25-8eeb-3a8772a8f3e6; shopcity_csrf=be311fa9-50c9-41db-a317-6e73bcf1d947","x-csrf-token":"be311fa9-50c9-41db-a317-6e73bcf1d947","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44078},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-4","set-cookie":["shopcity_session=a6f997a6-8d6d-470a-b26d-fa1a460928e6; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=50283ccc-4e9e-450d-88fa-e9f121cf3687; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"326"}},"responseTime":44}
[18:59:35.795] INFO (2931): request completed {"req":{"id":"req-5","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:44183","accept-encoding":"gzip, deflate","cookie":"shopcity_session=55aabe10-307f-4a25-8eeb-3a8772a8f3e6","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":37866},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-5","content-type":"application/json; charset=utf-8","content-length":"284"}},"responseTime":3}
[18:59:35.801] INFO (2931): request completed {"req":{"id":"req-6","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:38767","accept-encoding":"gzip, deflate","cookie":"shopcity_session=a6f997a6-8d6d-470a-b26d-fa1a460928e6","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50742},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-6","content-type":"application/json; charset=utf-8","content-length":"321"}},"responseTime":5}
[18:59:35.809] INFO (2931): request completed {"req":{"id":"req-7","method":"POST","url":"/api/v1/auth/logout","query":{},"headers":{"host":"127.0.0.1:35411","accept-encoding":"gzip, deflate","cookie":"shopcity_session=a6f997a6-8d6d-470a-b26d-fa1a460928e6; shopcity_csrf=50283ccc-4e9e-450d-88fa-e9f121cf3687","x-csrf-token":"50283ccc-4e9e-450d-88fa-e9f121cf3687","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38944},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-7","set-cookie":["shopcity_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly","shopcity_csrf=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly"],"content-type":"application/json; charset=utf-8","content-length":"136"}},"responseTime":7}
[18:59:35.814] INFO (2931): request completed {"req":{"id":"req-8","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:33023","accept-encoding":"gzip, deflate","cookie":"shopcity_session=a6f997a6-8d6d-470a-b26d-fa1a460928e6","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":55362},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-8","content-type":"application/json; charset=utf-8","content-length":"284"}},"responseTime":2}
[18:59:35.833] INFO (2931): request completed {"req":{"id":"req-9","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:37121","accept-encoding":"gzip, deflate","x-device-id":"3ffc61d5-b5f9-4bf7-89c5-f76c65738d0a","x-device-attestation":"1785697175821.897537f5-ff9e-48af-a8a7-d5f2bd30f7a1.4VQvdhnNPalUhagWx9dvri6p-_MUQnAiLnZfKGD9xLA","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50176},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-9","set-cookie":["shopcity_session=cdc01725-b2d9-4efa-9255-627dfeff6a80; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=7270f08f-e96e-43d2-b562-d50987a21969; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":11}
[18:59:35.844] INFO (2931): request completed {"req":{"id":"req-a","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34617","accept-encoding":"gzip, deflate","x-device-id":"69a112bd-291a-4f74-bd84-405ef5aec211","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39144},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-a","content-type":"application/json; charset=utf-8","content-length":"303"}},"responseTime":4}
[18:59:35.849] INFO (2931): request completed {"req":{"id":"req-b","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41947","accept-encoding":"gzip, deflate","x-device-id":"69a112bd-291a-4f74-bd84-405ef5aec211","x-device-attestation":"1785697175844.43e07b78-0732-4d8d-88bd-9ef14aa9f23b.ZJqbnUvaaR91-TTzmK-hYQ_7gXblnZF-fR3SEV73_4U","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51988},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-b","content-type":"application/json; charset=utf-8","content-length":"301"}},"responseTime":4}
[18:59:35.883] INFO (2931): request completed {"req":{"id":"req-c","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:40227","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43514},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-c","set-cookie":["shopcity_session=d4c4ae1b-12c9-4d90-ad36-3dba5b8fc602; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=8818615d-c589-478d-a85a-825f022e3313; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":30}
[18:59:35.938] INFO (2931): request completed {"req":{"id":"req-d","method":"POST","url":"/api/v1/auth/refresh","query":{},"headers":{"host":"127.0.0.1:43891","accept-encoding":"gzip, deflate","authorization":"_**","connection":"close","content-length":"0"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52692},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-d","set-cookie":["shopcity_session=8d7bdea0-299a-42ef-92f3-c7e68f981592; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=9b22ec98-1a42-4486-b9ad-c5a13a33516c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"326"}},"responseTime":46}
[18:59:35.996] INFO (2931): request completed {"req":{"id":"req-e","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:41631","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57722},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-e","set-cookie":["shopcity_session=a2a7a41a-5ad3-4a4d-b49c-c816a7bfc4bc; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=32b371ea-589e-4fba-bc88-a5f59bcf7474; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":36}
[18:59:36.085] INFO (2931): request completed {"req":{"id":"req-f","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:34007","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":59790},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-f","set-cookie":["shopcity_session=b88121ad-335d-4ad4-be51-59ec67c9f6d8; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=37c41fbd-defb-4f2a-8e7f-cf8254b22844; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":10}
[18:59:36.104] INFO (2931): request completed {"req":{"id":"req-g","method":"GET","url":"/api/v1/customers?q=%2B2348020000001&limit=10","query":{"q":"+2348020000001","limit":"10"},"headers":{"host":"127.0.0.1:43627","accept-encoding":"gzip, deflate","cookie":"shopcity_session=b88121ad-335d-4ad4-be51-59ec67c9f6d8","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35712},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-g","content-type":"application/json; charset=utf-8","content-length":"367"}},"responseTime":16}
[18:59:36.120] INFO (2931): request completed {"req":{"id":"req-h","method":"GET","url":"/api/v1/customers/e5f9fa22-5398-4736-b6cb-eea0067f26fe","query":{},"headers":{"host":"127.0.0.1:37061","accept-encoding":"gzip, deflate","cookie":"shopcity_session=b88121ad-335d-4ad4-be51-59ec67c9f6d8","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50572},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-h","content-type":"application/json; charset=utf-8","content-length":"330"}},"responseTime":14}
[18:59:36.152] INFO (2931): request completed {"req":{"id":"req-i","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:37323","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49094},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-i","set-cookie":["shopcity_session=c5f8f154-c1bc-45df-8833-faca569cc678; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=41a9f58e-0956-4584-810b-b699c389d7c6; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"324"}},"responseTime":8}
[18:59:36.165] INFO (2931): request completed {"req":{"id":"req-j","method":"GET","url":"/api/v1/customers?q=read-model-supervisor-http%40shopcity.local&limit=10","query":{"q":"read-model-supervisor-http@shopcity.local","limit":"10"},"headers":{"host":"127.0.0.1:35367","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c5f8f154-c1bc-45df-8833-faca569cc678","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57036},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-j","content-type":"application/json; charset=utf-8","content-length":"787"}},"responseTime":10}
[18:59:36.176] INFO (2931): request completed {"req":{"id":"req-k","method":"GET","url":"/api/v1/customers/dbdd072b-70d2-4663-b237-d8d3ffe0964a","query":{},"headers":{"host":"127.0.0.1:40487","accept-encoding":"gzip, deflate","cookie":"shopcity_session=c5f8f154-c1bc-45df-8833-faca569cc678","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51930},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-k","content-type":"application/json; charset=utf-8","content-length":"723"}},"responseTime":8}
[18:59:36.208] INFO (2931): request completed {"req":{"id":"req-l","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38607","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38206},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-l","set-cookie":["shopcity_session=384eba06-b787-4275-b5e1-ff4b945847a4; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=ea0dfa73-541e-4ba3-a04e-db18a67e1110; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":8}
[18:59:36.218] INFO (2931): request completed {"req":{"id":"req-m","method":"GET","url":"/api/v1/cards/lookup/CARD-card-http","query":{},"headers":{"host":"127.0.0.1:35311","accept-encoding":"gzip, deflate","cookie":"shopcity_session=384eba06-b787-4275-b5e1-ff4b945847a4","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51212},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-m","content-type":"application/json; charset=utf-8","content-length":"517"}},"responseTime":7}
[18:59:36.284] INFO (2931): request completed {"req":{"id":"req-n","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:38859","accept-encoding":"gzip, deflate","x-device-id":"90e36ce2-b835-49a8-986f-48b310c94e10","x-device-attestation":"1785697176273.1a9fe6c6-9744-497d-ace6-0dc34df2a44a.6ivstDlrC0uPWNf3G3y6c2QQM5UYp0mF781nRPUeS40","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36502},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-n","set-cookie":["shopcity_session=e2198319-fc86-4666-ac51-269e8bfc3427; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=47041f31-4b27-4dcd-ae96-3ec11b0a4379; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":10}
[18:59:36.322] INFO (2931): request completed {"req":{"id":"req-o","method":"POST","url":"/api/v1/transactions/redeem","query":{},"headers":{"host":"127.0.0.1:40957","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"redeem-http-pending","content-type":"application/json","content-length":"184","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49376},"res":{"statusCode":202,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-o","content-type":"application/json; charset=utf-8","content-length":"1004"}},"responseTime":34}
[18:59:36.410] INFO (2931): request completed {"req":{"id":"req-p","method":"POST","url":"/api/v1/transactions/redeem","query":{},"headers":{"host":"127.0.0.1:37623","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"redeem-http-confirmed","content-type":"application/json","content-length":"186","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57214},"res":{"statusCode":201,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-p","content-type":"application/json; charset=utf-8","content-length":"1140"}},"responseTime":84}
[18:59:36.422] INFO (2931): request completed {"req":{"id":"req-q","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:42149","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"70","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34652},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-q","set-cookie":["shopcity_session=f9b70513-f7f2-45d6-a84d-48c562a81008; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=c7413aae-3748-4bfa-b7d7-a834a2fe815b; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"339"}},"responseTime":8}
[18:59:36.429] INFO (2931): request completed {"req":{"id":"req-r","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:43375","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-0","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36148},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-r","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[18:59:36.436] INFO (2931): request completed {"req":{"id":"req-s","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:36545","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-1","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35532},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-s","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[18:59:36.446] INFO (2931): request completed {"req":{"id":"req-t","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:44023","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-2","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41514},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-t","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[18:59:36.452] INFO (2931): request completed {"req":{"id":"req-u","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:43293","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-3","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43392},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-u","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[18:59:36.458] INFO (2931): request completed {"req":{"id":"req-v","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39249","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-4","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51408},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-v","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[18:59:36.464] INFO (2931): request completed {"req":{"id":"req-w","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:32947","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-5","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":34266},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-w","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":4}
[18:59:36.470] INFO (2931): request completed {"req":{"id":"req-x","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40447","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-6","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":57978},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-x","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":4}
[18:59:36.478] INFO (2931): request completed {"req":{"id":"req-y","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:38901","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-7","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39156},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-y","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":6}
[18:59:36.484] INFO (2931): request completed {"req":{"id":"req-z","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:46299","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-8","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44196},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-z","content-type":"application/json; charset=utf-8","content-length":"670"}},"responseTime":5}
[18:59:36.490] INFO (2931): request completed {"req":{"id":"req-10","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:44919","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-9","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36778},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-10","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.496] INFO (2931): request completed {"req":{"id":"req-11","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:44629","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-10","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":37232},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-11","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.501] INFO (2931): request completed {"req":{"id":"req-12","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:46829","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-11","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45072},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-12","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[18:59:36.507] INFO (2931): request completed {"req":{"id":"req-13","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:38009","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-12","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46224},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-13","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[18:59:36.512] INFO (2931): request completed {"req":{"id":"req-14","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:41757","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-13","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":50134},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-14","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[18:59:36.518] INFO (2931): request completed {"req":{"id":"req-15","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:45073","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-14","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40504},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-15","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.523] INFO (2931): request completed {"req":{"id":"req-16","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:45487","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-15","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43314},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-16","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[18:59:36.529] INFO (2931): request completed {"req":{"id":"req-17","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:34251","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-16","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51076},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-17","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[18:59:36.535] INFO (2931): request completed {"req":{"id":"req-18","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:38289","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-17","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49490},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-18","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.540] INFO (2931): request completed {"req":{"id":"req-19","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:37895","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-18","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33638},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-19","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[18:59:36.548] INFO (2931): request completed {"req":{"id":"req-1a","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:46353","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-19","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41102},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1a","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":6}
[18:59:36.553] INFO (2931): request completed {"req":{"id":"req-1b","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:35355","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-20","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":52734},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1b","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[18:59:36.559] INFO (2931): request completed {"req":{"id":"req-1c","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33665","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-21","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45674},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1c","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.564] INFO (2931): request completed {"req":{"id":"req-1d","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40675","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-22","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36010},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1d","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[18:59:36.573] INFO (2931): request completed {"req":{"id":"req-1e","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:40561","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-23","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33324},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1e","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":7}
[18:59:36.579] INFO (2931): request completed {"req":{"id":"req-1f","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:33061","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-24","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43092},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1f","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.584] INFO (2931): request completed {"req":{"id":"req-1g","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:43589","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-25","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56498},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1g","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":4}
[18:59:36.591] INFO (2931): request completed {"req":{"id":"req-1h","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:37625","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-26","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":56674},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1h","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.598] INFO (2931): request completed {"req":{"id":"req-1i","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:38525","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-27","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44364},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1i","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.604] INFO (2931): request completed {"req":{"id":"req-1j","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:43973","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-28","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48560},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1j","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.611] INFO (2931): request completed {"req":{"id":"req-1k","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:41601","accept-encoding":"gzip, deflate","authorization":"_**","idempotency-key":"throttle-29","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":39600},"res":{"statusCode":400,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1k","content-type":"application/json; charset=utf-8","content-length":"671"}},"responseTime":5}
[18:59:36.618] INFO (2931): request completed {"req":{"id":"req-1l","method":"POST","url":"/api/v1/transactions/earn","query":{},"headers":{"host":"127.0.0.1:39683","accept-encoding":"gzip, deflate","authorization":"**_","idempotency-key":"throttle-over-limit","content-type":"application/json","content-length":"2","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":49464},"res":{"statusCode":429,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1l","content-type":"application/json; charset=utf-8","content-length":"264"}},"responseTime":5}
[18:59:36.631] INFO (2931): request completed {"req":{"id":"req-1m","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:33551","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":46464},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1m","set-cookie":["shopcity_session=b2611c06-0f71-478c-ac0a-a6b17efcd14d; Path=/; SameSite=Lax; HttpOnly; Max-Age=43199","shopcity_csrf=1d24165a-7345-4a4f-bf86-951c6662134c; Path=/; SameSite=Lax; Max-Age=43199"],"content-type":"application/json; charset=utf-8","content-length":"325"}},"responseTime":9}
[18:59:36.640] INFO (2931): request completed {"req":{"id":"req-1n","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:32791","accept-encoding":"gzip, deflate","cookie":"shopcity_session=b2611c06-0f71-478c-ac0a-a6b17efcd14d","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51130},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1n","content-type":"application/json; charset=utf-8","content-length":"285"}},"responseTime":5}
[18:59:36.650] INFO (2931): request completed {"req":{"id":"req-1o","method":"GET","url":"/api/v1/auth/me","query":{},"headers":{"host":"127.0.0.1:34725","accept-encoding":"gzip, deflate","cookie":"shopcity_session=b2611c06-0f71-478c-ac0a-a6b17efcd14d","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":48184},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1o","content-type":"application/json; charset=utf-8","content-length":"285"}},"responseTime":3}
[18:59:36.667] INFO (2931): request completed {"req":{"id":"req-1p","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:40841","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":45458},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1p","content-type":"application/json; charset=utf-8","content-length":"579"}},"responseTime":5}
[18:59:36.706] INFO (2931): request errored {"req":{"id":"req-1q","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:39413","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":44766},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1q","content-type":"application/json; charset=utf-8","content-length":"331"}},"responseTime":6}
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
[18:59:36.726] INFO (2931): request errored {"req":{"id":"req-1r","method":"GET","url":"/api/v1/config/public","query":{},"headers":{"host":"127.0.0.1:34941","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":43484},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1r","content-type":"application/json; charset=utf-8","content-length":"331"}},"responseTime":5}
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
PASS test/auth-http.int-spec.ts (7.739 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32772"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
PASS test/redemption-approval.int-spec.ts (6.131 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32774"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
FAIL test/financial-repair-restore.int-spec.ts (8.225 s)
● financial repair restore verification (int) › reconciles restored migration objects and historical adjustment evidence

    ENOENT: no such file or directory, open '/tmp/opencode/shared_schema.sql'

      41 |         restore as ExecablePostgresContainer,
      42 |         Buffer.concat([
    > 43 |           readFileSync(sharedSchemaDumpPath),
         |                       ^
      44 |           Buffer.from('\n'),
      45 |           readFileSync(sharedPublicDataDumpPath),
      46 |         ]),

      at Object.<anonymous> (financial-repair-restore.int-spec.ts:43:23)

Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32775"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
PASS test/outbox-worker-recovery.int-spec.ts (24.984 s)
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-c2bW2u/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32776"

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
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-v2G6Hx/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32777"

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
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-v2G6Hx/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32777"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`

The following migration(s) have been applied:

migrations/
└─ 20260720_receipt_integrity_gate/
└─ migration.sql

All migrations have been successfully applied.
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-SleFuc/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32778"

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
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-SleFuc/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32778"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260720_receipt_integrity_gate

Database error code: P0001

Database error:
ERROR: Receipt legacy POS references are missing

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(EP0001), message: "Receipt legacy POS references are missing", detail: None, hint: None, position: None, where_: Some("PL/pgSQL function inline_code_block line 24 at RAISE"), schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("pl_exec.c"), line: Some(3897), routine: Some("exec_stmt_raise") }

Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-CA1qc0/prisma/schema.prisma
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
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-CA1qc0/prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32779"

7 migrations found in prisma/migrations

Applying migration `20260720_receipt_integrity_gate`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260720_receipt_integrity_gate

Database error code: P0001

Database error:
ERROR: Duplicate legacy POS receipt identities require resolution

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(EP0001), message: "Duplicate legacy POS receipt identities require resolution", detail: None, hint: None, position: None, where_: Some("PL/pgSQL function inline_code_block line 15 at RAISE"), schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("pl_exec.c"), line: Some(3897), routine: Some("exec_stmt_raise") }

Prisma schema loaded from ../../../../../tmp/receipt-migration-upgrade-XPvZFo/prisma/schema.prisma
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
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
id | tenantId | branchId | receiptWeekStart | normalized_legacy_pos_receipt_number | duplicate_rank | duplicate_group_size | receiptRow  
--------------------------------------+--------------------------------------+--------------------------------------+---------------------+--------------------------------------+----------------+----------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
88888888-8888-8888-8888-888888888888 | 11111111-1111-1111-1111-111111111111 | 22222222-2222-2222-2222-222222222222 | 2026-07-20 10:15:00 | POS-DUP-0001 | 2 | 3 | {"id": "88888888-8888-8888-8888-888888888888", "cardId": "66666666-6666-6666-6666-666666666666", "branchId": "22222222-2222-2222-2222-222222222222", "deviceId": "33333333-3333-3333-3333-333333333333", "tenantId": "11111111-1111-1111-1111-111111111111", "cashierId": "44444444-4444-4444-4444-444444444444", "createdAt": "2026-08-02T19:00:46.16", "updatedAt": "2026-07-20T10:15:00", "capturedAt": "2026-07-20T10:15:00", "capturedBy": "44444444-4444-4444-4444-444444444444", "customerId": "55555555-5555-5555-5555-555555555555", "occurredAt": "2026-07-20T10:15:00", "receiptNumber": "LEGACY-RECEIPT-0002", "duplicate_rank": 2, "receiptWeekStart": "2026-07-20T10:15:00", "capturedByTenantId": "11111111-1111-1111-1111-111111111111", "purchaseAmountKobo": 1000000, "duplicate_group_size": 3, "externalReceiptNumber": " pos-dup-0001 ", "normalized_legacy_pos_receipt_number": "POS-DUP-0001"}
99999999-9999-9999-9999-999999999999 | 11111111-1111-1111-1111-111111111111 | 22222222-2222-2222-2222-222222222222 | 2026-07-20 10:15:00 | POS-DUP-0001 | 3 | 3 | {"id": "99999999-9999-9999-9999-999999999999", "cardId": "66666666-6666-6666-6666-666666666666", "branchId": "22222222-2222-2222-2222-222222222222", "deviceId": "33333333-3333-3333-3333-333333333333", "tenantId": "11111111-1111-1111-1111-111111111111", "cashierId": "44444444-4444-4444-4444-444444444444", "createdAt": "2026-08-02T19:00:46.233", "updatedAt": "2026-07-20T10:15:00", "capturedAt": "2026-07-20T10:15:00", "capturedBy": "44444444-4444-4444-4444-444444444444", "customerId": "55555555-5555-5555-5555-555555555555", "occurredAt": "2026-07-20T10:15:00", "receiptNumber": "LEGACY-RECEIPT-0003", "duplicate_rank": 3, "receiptWeekStart": "2026-07-20T10:15:00", "capturedByTenantId": "11111111-1111-1111-1111-111111111111", "purchaseAmountKobo": 1000000, "duplicate_group_size": 3, "externalReceiptNumber": "POS-DUP-0001", "normalized_legacy_pos_receipt_number": "POS-DUP-0001"}
(2 rows)

CREATE TABLE
INSERT 0 1
BEGIN
CREATE TABLE
NOTICE: relation "ReceiptLegacyIdentityQuarantineApproval" already exists, skipping
CREATE TABLE
CREATE TABLE
DO
INSERT 0 1
COMMIT
BEGIN
DO
INSERT 0 1
DELETE 1
COMMIT
PASS test/receipt-migration-upgrade.int-spec.ts (30.325 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32781"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
PASS test/redemption-allocation-invariants.int-spec.ts (5.717 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32782"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
PASS test/lot-allocation-ordering.int-spec.ts (5.544 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32783"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
PASS test/financial-state-invariants.int-spec.ts (5.368 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32784"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
PASS test/sms-reference-backfill.int-spec.ts (5.24 s)
PASS test/openapi.int-spec.ts
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32785"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
PASS test/phase-1.int-spec.ts (5.529 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32786"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
[19:01:24.536] INFO (2931): request errored {"req":{"id":"req-1","method":"POST","url":"/api/v1/auth/login","query":{},"headers":{"host":"127.0.0.1:39669","accept-encoding":"gzip, deflate","content-type":"application/json","content-length":"57","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":35470},"res":{"statusCode":503,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"req-1","content-type":"application/json; charset=utf-8","content-length":"319"}},"responseTime":3193}
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
PASS test/redis-throttle-fail-closed.int-spec.ts (9.304 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32787"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
PASS test/tenant-ownership.int-spec.ts (5.347 s)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32788"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
Seeded foundation tenant 00000000-0000-0000-0000-000000000001, branch 00000000-0000-0000-0000-000000000002, and admin user.
PASS test/customer-email.int-spec.ts (5.332 s)
PASS test/health.int-spec.ts
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "test", schema "public" at "localhost:32789"

27 migrations found in prisma/migrations

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
Applying migration `20260803_adjustment_linkage_and_repair_followup`

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
└─ 20260803_adjustment_linkage_and_repair_followup/
└─ migration.sql

All migrations have been successfully applied.
PASS test/outbox-migration-deploy.int-spec.ts (5.401 s)
PASS test/bootstrap-credential.int-spec.ts
PASS test/prisma.int-spec.ts

Test Suites: 1 failed, 19 passed, 20 total
Tests: 1 failed, 99 passed, 100 total
Snapshots: 0 total
Time: 154.448 s
Ran all test suites.
Error: Process completed with exit code 1.
