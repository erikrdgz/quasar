# Room
A black, mobile-friendly financial planner. Static HTML, CSS and JavaScript, no dependencies, accounts, analytics, or backend.

## Run locally
`npm start`, then open http://127.0.0.1:4173. Run `npm test` for financial calculations and input validation.

## Plans and privacy
Plans save automatically to localStorage on each device. Export/import JSON moves plans between devices. Clearing browser storage removes plans. JSON backups contain personal information. The ignored `private/` directory holds local-only setup; only `public/` is deployed. The public app starts empty and contains no personal amounts.

## Phone installation
Open the hosted URL in Safari → Share → Add to Home Screen (iPhone), or Chrome → Install app (Android). Open the installed app and import your private starter file or a backup. Offline mode is available after the first load. Browser and installed-app storage may differ.

## Taxes
2026 single filer, Colorado, W-2 wages, under 65, standard deduction of $16,100. Federal progressive rates, 4.4% Colorado estimate, employee Social Security and Medicare including additional Medicare, optional employee FAMLI at 0.44% up to the Social Security wage base. No tax credits, pre-tax benefits, itemized deductions, state modifications, local tax, or other income. Other payroll deductions are after-tax. These are estimates, not a tax return or withholding calculator. Review the tax settings each year.
Sources: https://www.irs.gov/irb/2025-45_IRB ; https://www.irs.gov/publications/p15 ; https://tax.colorado.gov/individual-income-tax-FAQ ; https://dhr.colorado.gov/sites/dhr/files/documents/FAMLI%20Program%20Notice%20English%20December%202025.pdf

## Savings
Slow/medium/fast allocate 10%/25%/40% of money remaining after expenses and car. Multiple goals share the highest selected percentage with weights 1/2/4. Completed goals stop receiving contributions. A contribution never exceeds the remaining target. Dates assume the current contribution stays constant, without interest or later redistribution. Negative budgets pause savings.

## Deploy
GitHub Actions tests and publishes only `public/` to GitHub Pages. Enable Pages with GitHub Actions as the source. Relative asset paths support a repository subdirectory. `manifest.webmanifest` and the service worker enable installation and offline use. Increase the cache version in `public/sw.js` when changing the offline asset list.
