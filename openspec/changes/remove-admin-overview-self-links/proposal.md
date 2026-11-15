# Proposal: Remove Admin Overview Self-Links

## Summary

Remove the redundant **Back to admin** link/button from every page in the Admin shell, including Transactions, Approvals, Fraud, Cards, Reports, Policies, and the dedicated Operations → Controls destinations.

## Problem

The Admin shell already provides persistent navigation to Overview. A second link on each page that points back to the same Overview adds clutter and does not provide meaningful back-navigation.

## Scope

- Remove Admin overview self-links from all Admin routes.
- Keep the Admin shell navigation, Operations → Controls destinations, route-specific task links, and customer-profile **Back to customers** navigation.
- Keep Supervisor and Cashier navigation unchanged.

## Non-goals

- No route, authorization, API, data, or workflow changes.
- Do not remove links that navigate to another task or route.
