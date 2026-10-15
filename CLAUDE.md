# TOOSA theme (toosa.ca): working notes

Shopify theme for TOOSA (Toosa Store Solutions Inc.). Separate business from the Spark sites: never mix repos, colours or content. Always "TOOSA"/"Toosa", never "Tusa".

- Base theme: Refine 4.0.0 (Shopify theme store 2782). Exported 14 Oct 2026 from the live theme "TOOSA Redesign (JD)- New Homepage".
- `main` is connected (Shopify GitHub integration) to an UNPUBLISHED dev theme. Pushes update only that theme. The live theme changes only when the owner clicks Publish in Shopify admin.
- Shopify writes theme-editor changes back to this branch as commits; pull before editing.
- Keep Shopify checkout, payments, orders and customers as they are. No Stripe, no rebuild.
- Third-party app blocks (e.g. Hulk apps) render their own code; style around them, don't edit them.
- Never handle passwords; access keys go in the environment settings, never in chat or in this repo.
- Round 3 (15 Oct 2026, homepage/footer/collections): homepage sections `tx-trust` (UL badge strip under the lineup), `tx-compare` (scorecard with meters that fill on scroll, replaces honest-comparison), `tx-about` (photo + fact tiles), `tx-showroom` (map + icon facts); styles live in `assets/tx.css`. Footer is `sections/tx-footer.liquid` + `assets/tx-footer.css` (loaded on every template from theme.liquid; `footer-group.json` points at it; old `footer.liquid` kept). Collection templates use `tx-c-intro` (H1, lead from the first description paragraph, chips, category tiles) and `tx-c-about` (collection.description styled, CSS-only read-more on phones) with `assets/tx-collection.css`; the product grid and filters are untouched. The theme colours every link with `a:not(.btn-fill)...` at specificity (0,4,1): new sections override it with matching `:not()` chains. UL is claimed only for the TS-20 compressor package (source: the air compressor page copy).
