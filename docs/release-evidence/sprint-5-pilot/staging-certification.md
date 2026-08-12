# Staging certification

Candidate SHA: 41afe775b8abf985173c58c8de244bcb617be8c5
Image digest: ghcr.io/shopcity/shopcity-lp@sha256:385fe391d928599741535e16395a33c894ea589e05effb5e1e323367ccf6b53b
RecordedAt: 2026-08-12T19:20:00.000Z
Deployment URL: https://staging.shopcity.example
Staging workflow run: https://github.com/micahjatau/shopcity_LP/actions/runs/31630700887

Validation steps:

- deployed exact digest to staging
- ran migrations
- verified readiness probes
- ran Bruno smoke checks
- ran contract tests
- ran ZAP against the staging URL

Staging validation: passed
