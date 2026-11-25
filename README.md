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


CONNECTING RAZORPAY (Payment Pages, no coding)
-----------------------------------------------
Use Payment PAGES, not Payment Links. A Payment Link is meant for one customer
and one payment; a Payment Page is a permanent checkout that any number of
buyers can use.

1. Activate your account
   The dashboard toggle "Test Mode" must be OFF to take real money. Razorpay
   only lets you switch to Live Mode after your KYC/account activation is
   approved (Account & Settings). Do steps 2-4 in Test Mode first to try it.

2. Upload the project file somewhere private
   For example Google Drive: upload proton_beam.zip, then Share > "Anyone with
   the link" > copy the link. This is the download link buyers get after paying.

3. Create the Standard page (₹239)
   Payment Pages > Create Payment Page > pick a simple template.
   - Title: "Proton Beam: Standard license"
   - Add a price field with a fixed amount of 239
   - Ask for the buyer's email (so you can resend files if needed)
   - In the page's settings for what happens after payment, add a success
     message containing the download link from step 2 (or a redirect URL to
     it). Razorpay also emails the buyer a receipt.
   Publish it and copy its link (it looks like https://pages.razorpay.com/...).

4. Create the Pro page (₹399)
   Repeat step 3 with the title "Proton Beam: Pro license (earning over
   ₹50 lakh/month)" and the amount 399.

5. Paste the links into js/products.js
     buyUrl:    "https://pages.razorpay.com/your-standard-page",
     buyUrlPro: "https://pages.razorpay.com/your-pro-page",
   Save and re-upload the site. "Buy Standard" and "Buy Pro" buttons now appear
   in the product preview, and the cart's Checkout button sends buyers to the
   right page for the license they picked.

6. Test it
   With Test Mode still on, buy using one of Razorpay's test cards and check
   that the download link appears. Then switch to Live Mode, create the pages
   again in Live Mode (pages made in Test Mode only take test payments) and
   paste the live links.

Tip: anyone who has a Google Drive link can share it. For more protection,
change the link now and then and update the success message, or later move to
a service that sends each buyer their own expiring download link.
```
