# Quasar
A black, mobile-friendly financial planner. Static HTML, CSS and JavaScript, no accounts, analytics, or backend. PDF export uses a bundled copy of jsPDF.

## Run locally
`npm start`, then open http://127.0.0.1:4173. Run `npm test` for financial calculations and input validation.

## Plans and privacy
Plans save automatically to localStorage on each device. Each saved plan has an Export PDF action in its options menu. PDFs contain that plan's income, monthly allocation, expenses and savings goals. Import is not part of the app. Clearing browser storage removes saved plans. The ignored `private/` directory holds local-only setup; only `public/` is deployed. The public app includes the requested default salary and expenses. Every new scenario starts from these presets; saved customizations remain on the device.

## Phone installation
Open the hosted URL in Safari → Share → Add to Home Screen (iPhone), or Chrome → Install app (Android). Every new plan starts with the built-in presets. Offline mode is available after the first load. Browser and installed-app storage may differ.

## Taxes
2026 single filer, Colorado, W-2 wages, under 65, standard deduction of $16,100. Federal progressive rates, 4.4% Colorado estimate, employee Social Security and Medicare including additional Medicare, optional employee FAMLI at 0.44% up to the Social Security wage base. No tax credits, pre-tax benefits, itemized deductions, state modifications, local tax, or other income. Other payroll deductions are after-tax. These are estimates, not a tax return or withholding calculator. Review the tax settings each year.
Sources: https://www.irs.gov/irb/2025-45_IRB ; https://www.irs.gov/publications/p15 ; https://tax.colorado.gov/individual-income-tax-FAQ ; https://dhr.colorado.gov/sites/dhr/files/documents/FAMLI%20Program%20Notice%20English%20December%202025.pdf

## Savings
Slow/medium/fast allocate 10%/25%/40% of money remaining after expenses and car. Multiple goals share the highest selected percentage with weights 1/2/4. Completed goals stop receiving contributions. A contribution never exceeds the remaining target. Dates assume the current contribution stays constant, without interest or later redistribution. Negative budgets pause savings.

## Deploy
GitHub Actions tests and publishes only `public/` to GitHub Pages. Enable Pages with GitHub Actions as the source. Relative asset paths support a repository subdirectory. `manifest.webmanifest` and the service worker enable installation and offline use. Increase the cache version in `public/sw.js` when changing the offline asset list.

## Controls
All cards use a single full-width column. Category accordions start closed, show their total when closed, and allow only one open at a time. Muted category colors carry through the controls, overview, and PDF. Monetary inputs have keyboard-accessible native range controls with a separate visual lens. Salary has a floor equal to the gross pay needed to cover the current monthly bills and car; expenses and car have dynamic ceilings from available take-home. Savings targets and already-saved balances are goal amounts, not monthly spending, and remain independent of these spending ceilings. Previously saved over-budget plans remain visible for correction.

Saved-plan rows reveal Delete after a 48px left swipe and commit deletion after 72% of the row width (minimum 180px). Vertical scrolling and cancelled gestures never delete. Row removal slides out then collapses. Delete options and keyboard controls provide non-gesture alternatives, and Undo restores a removed plan.

The slider's glass lens renders a synchronized SVG projection of the track, stretching it locally at the left edge with a rounded blue endpoint in the center. The straight track is masked inside the lens so it cannot show through the distortion. Direct geometry keeps the effect consistent in Safari and Chromium; CSS supplies highlights and reduced-transparency fallbacks. Native range elements retain keyboard and screen-reader behavior. Glass appears only during pointer or keyboard adjustment, returning to white on release.

Icons: Font Awesome Free 7.3.1. Attribution and licenses are bundled in public/fontawesome-LICENSE.txt; https://fontawesome.com/.

PDF export: jsPDF 4.2.1, MIT license in public/jspdf-LICENSE.txt. All PDF generation happens on the device.
