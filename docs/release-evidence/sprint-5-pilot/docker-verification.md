# Docker verification

Candidate SHA: 78b186af8b1aa63a41eb4ac4619f4b79ed565899
Image digest: docker-daemon:shopcity-lp@sha256:4648c34f98b531e4e23881934a318911bd3470200f853beecc8f2e7292c06efb
RecordedAt: 2026-08-13T17:16:15Z
CI run: https://github.com/micahjatau/shopcity_LP/actions/runs/31724029222
Docker job: https://github.com/micahjatau/shopcity_LP/actions/runs/31724029222/job/94529147538
Local verification log: /tmp/docker-verify-78b186a.log

Verification steps:

- `RELEASE_SHA=78b186af8b1aa63a41eb4ac4619f4b79ed565899 RELEASE_VERSION=master npm run verify:docker-image -- shopcity-lp:78b186a` — passed
- Docker image contains `dist/src/main.js` and `dist/src/worker.js` — passed
- Container help output includes API and worker entrypoints — passed
- CI Docker Build Verification job for the same candidate SHA — passed

Result: passed
