# Quasar
Compare salary plans, lock one in, then track what's left to spend each month. Static HTML, CSS and JavaScript, no accounts, analytics or backend. Everything stays on the device.

## Run locally
`npm start`, then open http://127.0.0.1:4173. Run `npm test` for the tax, plan, ledger and storage-format checks.

## How it fits together
- **First launch** shows the logo, then a short full-screen setup: your name, the plan's name and salary (or monthly take-home) together, then rent, car, groceries, utilities, phone, insurance and subscriptions, one per screen. Every step has Back, Skip and a percentage bar; "I'll add the rest myself" jumps to a summary of what's left each month, where you can slide to lock it in or explore first. Plans start empty; nothing is pre-filled. Every later launch, and any return after 30 minutes away, opens with the logo and a greeting: time of day half the time, otherwise one of a few alternatives (never the same twice in a row), with what's left to spend underneath. Tap to skip.
- **Plans** compare scenarios: income, rent, car, bills and savings goals, each a tile that expands into its editor. A live "left / month" readout in each editor shows the effect while you drag.
- **Lock in this plan** is a slider in the Lock tile (like the iPhone's old slide to unlock). Locking snapshots the plan as the budget and stays on Plans. Bills, car and goal savings are set aside up front; what remains is the monthly amount to spend. Once locked, slide the knob back to unlock: tracking pauses but every month and purchase is kept, and locking any plan again resumes the open month. If the locked plan changes, the tile offers **Update budget**, which also updates the open month's amount (purchases already logged stay).
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
Income can be entered as a salary (estimated) or as monthly take-home pay (used as-is, for anyone with pre-tax deductions or unusual situations). Salary estimates are for a 2026 single filer with W-2 wages: federal progressive rates with the $16,100 standard deduction, employee Social Security and Medicare (including additional Medicare), and the chosen state's income tax: brackets, standard deduction, personal exemption, and the credits some states give in place of those (AR, CA, DE, IA, NE, OR), from the Tax Foundation's 2026 table. Alabama's standard deduction phase-down and Arkansas's lower-income table are modelled. Colorado's FAMLI premium (0.44%, up to the Social Security wage base) is optional and only applies in Colorado. Not modelled: local income taxes, deductions for federal tax paid (AL, MO, OR), recapture (CT, NY), other credits (including Utah's taxpayer credit), state payroll programs other than FAMLI, pre-tax benefits and other income. Plans saved before the state picker are treated as Colorado.
Sources: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/ ; https://www.irs.gov/irb/2025-45_IRB ; https://www.irs.gov/publications/p15 ; https://dhr.colorado.gov/sites/dhr/files/documents/FAMLI%20Program%20Notice%20English%20December%202025.pdf

## Savings
Tapping a goal (or Add goal) morphs its card into a goal sheet stacked over the goals list and sized to fit a phone screen: name, when it'll be ready, the monthly amount, progress, target and saved, pace and Done. Tapping the goal's icon opens its icon and color pickers. Custom pace sets aside a fixed amount each month; custom goals take their amount first (capped at what's needed and what's available), then slow/medium/fast goals share the rest.

Each goal has one of ten Font Awesome icons (savings, emergency, travel, home, car, education, wedding, gifts, tech, pet), picked in the goal editor. Until one is picked, the icon is guessed from the goal's name ("Japan trip" → plane), falling back to the piggy bank. Icons show on goal cards and on the Plans tile. A goal can also have an optional color (green, teal, sky, purple, pink, red, orange or yellow) that tints its icon chip, its selected icon and its progress bar; the default is none.
Slow/medium/fast allocate 10%/25%/40% of money remaining after bills and car. Multiple goals share the highest selected percentage with weights 1/2/4. Completed goals stop receiving contributions. A contribution never exceeds the remaining target. Dates assume the current contribution stays constant, without interest or later redistribution. Negative budgets pause savings.

## Car price estimate
The car editor and PDF reverse the amortized-loan payment formula to show an illustrative purchase-price range: 60 monthly payments, 6–10% APR, zero down, taxes and fees paid separately. Values round down to the nearest $100. Source for loan-term and price factors: https://www.consumerfinance.gov/ask-cfpb/how-much-can-i-afford-to-borrow-for-a-car-or-auto-loan-en-751/

## Text fields
While a text field is being edited and has text, a clear (×) button sits at its right edge; clearing keeps the keyboard up. Focusing a field puts the cursor at the end. Number fields are text fields with a decimal keyboard so the cursor can be placed, and accept only digits and one decimal point.

## Motion
Tapping a tile morphs it into its editor, modelled on iOS's card transition. One spring (response 0.5s, damping 0.82) drives the panel's rounded clip, its content (which rides the clip's corner and scales up from the tile's width), a copy of the tile that dissolves early, and the app receding behind. Closing uses a critically damped spring (0.4s) back to the tile's unscaled position, and a close during the open reverses from wherever the card is. Setup steps push like iOS navigation: Continue and Skip slide the current screen out left as the next slides in from the right, Back mirrors it, both on one critically damped spring with no cross-fade; entering and leaving setup glide out before the next screen eases in. Numbers count with damped springs. Reduced-motion settings swap these for short fades.

## Color
Blue is the action color: primary buttons, the Add purchase and Lock tiles, sliders and switches. White marks selection and highlights. Green, amber and red only describe status. Category colors appear only in spending data.

## Deploy
GitHub Actions tests and publishes only `public/` to GitHub Pages. Bump the `?v=` query on module imports and the cache name in `public/sw.js` when changing files.

## Credits
Icons: Font Awesome Free 7.3.1 (licenses in public/fontawesome-LICENSE.txt), plus simple stroke icons drawn for Quasar. PDF export: jsPDF 4.2.1, MIT license in public/jspdf-LICENSE.txt. All PDF generation happens on the device.
