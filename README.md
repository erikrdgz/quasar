# Quasar
Compare salary plans, lock one in, then track what's left to spend each month. Static HTML, CSS and JavaScript, no accounts, analytics or backend. Everything stays on the device.

## Run locally
`npm start`, then open http://127.0.0.1:4173. Run `npm test` for the tax, plan, ledger and storage-format checks.

## How it fits together
- **First launch** asks for a first name (stored on the device, editable from the menu). Every later launch, and any return after 30 minutes away, opens with the logo and a greeting: time of day half the time, otherwise one of a few alternatives (never the same twice in a row), with what's left to spend underneath. Tap to skip.
- **Plans** compare scenarios: income, rent, car, bills and savings goals, each a tile that expands into its editor. A live "left / month" readout in each editor shows the effect while you drag.
- **Lock in this plan** (slide the knob across, like the iPhone's old slide to unlock) snapshots one plan as the budget. Bills, car and goal savings are set aside up front; what remains is the monthly amount to spend. Later edits to the plan don't change the budget until you choose **Update your budget**, which also updates the open month's amount (purchases already logged stay).
- **Today** shows what's left this month, safe-to-spend per day (left ÷ days remaining, including today), spending by day, a no-spend streak, a bills checklist and recent purchases. **Add purchase** takes an amount, an optional name and a category (Misc by default).
- **Ledger** lists the month's purchases (swipe left to delete, tap to edit), spending for the month, 3 months or year, the reality check, month close and closed-month history.

## Reality check
Enter what your bank says you spent on purchases this month. Quasar shows the gap against what's logged and offers to record the difference as "Unlogged spending" so the number matches reality.

## Closing a month
Months never reset on their own. When a month ends, Today shows a banner. Closing reviews the month, asks whether to carry what's left (or the overspend) into the next month or start fresh, and requires a 1.5-second press-and-hold. Closed months are archived, not deleted. The most recent close can be reopened until the new month has activity. Closing early sends new purchases to the following month.

## Storage and backup
State lives in IndexedDB (localStorage if IndexedDB is unavailable). The app asks the browser to keep storage persistent. On first launch, plans saved by earlier versions under `room-plans-v1` are migrated; that key is left in place as a backup. The menu exports and imports a JSON backup of all plans and months; importing replaces everything after confirmation. **Start over** in the menu erases every plan, month, purchase and the stored name (including the original `room-plans-v1` plans, so they aren't migrated back) after a press-and-hold, then restarts at onboarding. Safari can clear data for sites not opened in a while, so Today suggests adding Quasar to the Home Screen until dismissed. Browser and installed-app storage are separate; move data between them with a backup.

## Phone installation
Open the hosted URL in Safari → Share → Add to Home Screen (iPhone), or Chrome → Install app (Android). Offline mode is available after the first load.

## Taxes
Income can be entered as a salary (estimated) or as monthly take-home pay (used as-is, for anyone outside Colorado or with pre-tax deductions). The estimate assumes 2026 single filer, Colorado, W-2 wages, under 65, standard deduction of $16,100. Federal progressive rates, 4.4% Colorado estimate, employee Social Security and Medicare including additional Medicare, optional employee FAMLI at 0.44% up to the Social Security wage base. No tax credits, pre-tax benefits, itemized deductions, state modifications, local tax, or other income.
Sources: https://www.irs.gov/irb/2025-45_IRB ; https://www.irs.gov/publications/p15 ; https://tax.colorado.gov/individual-income-tax-FAQ ; https://dhr.colorado.gov/sites/dhr/files/documents/FAMLI%20Program%20Notice%20English%20December%202025.pdf

## Savings
Slow/medium/fast allocate 10%/25%/40% of money remaining after bills and car. Multiple goals share the highest selected percentage with weights 1/2/4. Completed goals stop receiving contributions. A contribution never exceeds the remaining target. Dates assume the current contribution stays constant, without interest or later redistribution. Negative budgets pause savings.

## Car price estimate
The car editor and PDF reverse the amortized-loan payment formula to show an illustrative purchase-price range: 60 monthly payments, 6–10% APR, zero down, taxes and fees paid separately. Values round down to the nearest $100. Source for loan-term and price factors: https://www.consumerfinance.gov/ask-cfpb/how-much-can-i-afford-to-borrow-for-a-car-or-auto-loan-en-751/

## Motion
Tapping a tile morphs it into its editor, modelled on iOS's card transition. One spring (response 0.5s, damping 0.82) drives the panel's rounded clip, its content (which rides the clip's corner and scales up from the tile's width), a copy of the tile that dissolves early, and the app receding behind. Closing uses a critically damped spring (0.4s) back to the tile's unscaled position, and a close during the open reverses from wherever the card is. Numbers count with damped springs. Reduced-motion settings swap these for short fades.

## Color
Blue is the action color: primary buttons, the Add purchase and Lock tiles, sliders and switches. White marks selection and highlights. Green, amber and red only describe status. Category colors appear only in spending data.

## Deploy
GitHub Actions tests and publishes only `public/` to GitHub Pages. Bump the `?v=` query on module imports and the cache name in `public/sw.js` when changing files.

## Credits
Icons: Font Awesome Free 7.3.1 (licenses in public/fontawesome-LICENSE.txt), plus simple stroke icons drawn for Quasar. PDF export: jsPDF 4.2.1, MIT license in public/jspdf-LICENSE.txt. All PDF generation happens on the device.
