# vfox store

Static website selling vfox After Effects projects and stock footage. Open `index.html` to view it, or deploy this folder to any static host (GitHub Pages, Netlify, Vercel).

```text

FILES
  index.html                       home page
  shop.html, after-effects.html,
  stock-footage.html               shop pages with filters
  product.html                     product page (product.html#product-id)
  cart.html                        cart and checkout
  licenses.html, faq.html,
  contact.html                     help pages
  terms.html, refund-policy.html,
  delivery-policy.html,
  privacy-policy.html              store policies
  js/products.js                   YOUR PRODUCT LIST: the only file you edit to add products
  media/                           preview videos (watermarked), thumbnails, example images
  assets/                          vfox logos
  css/, js/app.js                  design and behaviour (no need to edit)

Upload the whole folder to any static host (Netlify, Vercel, GitHub Pages,
Hostinger...). Never put the .aep project files in this folder: anything here
can be downloaded for free.


PAYMENTS
--------
Each product in js/products.js has buyUrl (Standard price) and buyUrlPro
(Pro price). Paste a checkout link into each one and the site shows
"Buy" buttons. While they're empty the site says payments aren't
connected yet.

SIGN-UPS AND SOCIAL LINKS (bottom of js/products.js)
----------------------------------------------------
VFOX_NEWSLETTER_URL  Paste a Google Form link (one "Email" question) to
                     collect sign-ups in a Google Sheet. While it's empty,
                     "Notify me" opens an email to you instead.
VFOX_SOCIAL          Instagram / YouTube / X links for the footer. Empty
                     links are hidden.

SEARCH AND SHARING
------------------
The site address used for link previews and sitemap.xml is
https://froodyofficial-maker.github.io/Vfox/. If you move to your own domain,
tell your developer to update SITE in the page generator, or search-and-replace
that address in the .html files and sitemap.xml.
```
