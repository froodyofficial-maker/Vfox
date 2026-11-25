# vfox store

Static website selling vfox After Effects projects and stock footage. Open `index.html` to view it, or deploy this folder to any static host (GitHub Pages, Netlify, Vercel).

```text

FILES
  index.html, after-effects.html, stock-footage.html, licenses.html, faq.html   the pages
  js/products.js    YOUR PRODUCT LIST: the only file you edit to add products
  media/            preview videos (watermarked), thumbnails, example images
  assets/           vfox logos
  css/, js/app.js   design and behaviour (no need to edit)

Upload the whole folder to any static host (Netlify, Vercel, GitHub Pages,
Hostinger...). Never put the .aep project files in this folder: anything here
can be downloaded for free.


PAYMENTS
--------
Each product in js/products.js has buyUrl (Standard price) and buyUrlPro
(Pro price). Paste a checkout link into each one and the site shows
"Buy" buttons. While they're empty the site says payments aren't
connected yet.
```
