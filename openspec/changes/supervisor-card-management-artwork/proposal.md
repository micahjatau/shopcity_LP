# Proposal: Supervisor card artwork for management identification

## Summary

Show a responsive ShopCity card preview in the Supervisor **Manage cards** details panel, modeled on the card illustration in `figmaExport/Landing-6.png`. Populate the preview from the explicitly selected, authoritatively reloaded card rather than embedding the landing screenshot or its sample identity data.

## Problem

The management workflow already displays a card's serial, status, and customer as text, but has no visual card representation. Staff asked for the card image to help identify which card they are managing or reactivating.

## Scope

- Render a card-shaped, route-scoped visual only after explicit selection and successful authoritative verification.
- Show the current card's exact serial number, linked customer name, and authoritative card status in the preview; retain the existing labeled details and confirmation flow.
- Re-render from refreshed card data after lifecycle actions.
- Keep any barcode-like decoration non-functional and clearly decorative; it must not encode a fabricated or stale identifier.

## Non-goals

- No API, OpenAPI, generated-client, database, RBAC, tenant-scope, or card lifecycle changes.
- No edits to shared CustomerWorkspace, Cashier, Admin, or common shell behavior.
- Do not copy, modify, stage, or commit the inherited Figma export or other dirty files. Do not display its static example name, serial, status, or barcode as live card data.
