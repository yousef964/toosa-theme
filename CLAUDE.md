# TOOSA theme (toosa.ca): working notes

Shopify theme for TOOSA (Toosa Store Solutions Inc.). Separate business from the Spark sites: never mix repos, colours or content. Always "TOOSA"/"Toosa", never "Tusa".

- Base theme: Refine 4.0.0 (Shopify theme store 2782). Exported 14 Oct 2026 from the live theme "TOOSA Redesign (JD)- New Homepage".
- `main` is connected (Shopify GitHub integration) to an UNPUBLISHED dev theme. Pushes update only that theme. The live theme changes only when the owner clicks Publish in Shopify admin.
- Shopify writes theme-editor changes back to this branch as commits; pull before editing.
- Keep Shopify checkout, payments, orders and customers as they are. No Stripe, no rebuild.
- Third-party app blocks (e.g. Hulk apps) render their own code; style around them, don't edit them.
- Never handle passwords; access keys go in the environment settings, never in chat or in this repo.
