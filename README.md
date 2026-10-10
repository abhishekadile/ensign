# Ensign 14 Technology website

Static site. No build step. Served by GitHub Pages from the `main` branch root.

## The promo (password protected)

The promo is stored encrypted in `vault/`. Without the password the file is unreadable. Visitors enter the password in the promo section of the site and it decrypts in their browser.

The original promo is kept locally in `promo-source/` (git ignored). To update the promo or change the password:

    # PowerShell
    $env:PROMO_PASSWORD = '<passphrase>'
    node tools/encrypt.mjs promo-source/promo.html

    # macOS / Linux
    PROMO_PASSWORD='<passphrase>' node tools/encrypt.mjs promo-source/promo.html

Then commit `vault/promo.bin` and `vault/promo.json` and push.

Supported: a single file html, mp4, webm, mov, pdf, images. Keep it under 90 MB.
Use a long passphrase (12+ characters).

## Pages

- `/` home and story: `index.html`
- `/deployment/`: data paths, on premises and AWS options
- `/oems/`: for equipment makers

Subfolder pages load `../styles.css` and `../app.js`, so keep the folder layout as is.

## Edit

- Copy: the `index.html` inside each page folder
- Look and feel, including the product window visuals: `styles.css`
- Wafer map, walkthrough charts, OEM chat chips: `app.js`
- Promo gate: `vault.js`

All data in the visuals is example data. Keep it free of customer, OEM and tool model names.
