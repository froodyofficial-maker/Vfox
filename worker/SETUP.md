# Secure checkout & downloads: one-time setup

This connects Razorpay payments on your site to personal, expiring download links.
Everything is done in your browser. It takes about 30 minutes, and costs nothing beyond
Razorpay's normal fee per payment.

**How it works:** buyers pay in Razorpay's window on your site. A small program (the
"worker") on Cloudflare checks the payment really happened, then gives the buyer download
links that only work for **24 hours** and **5 downloads per file**. Your files sit in a
**private** GitHub repo that nobody else can see. You never have to change links: every
buyer gets their own automatically.

> Never paste your Razorpay secret, GitHub token or link secret into the website, into
> `js/products.js`, into a public repo or into a chat. They only go into Cloudflare's
> **Secrets** (step 5).

---

## 1. Put your product files in a private repo

1. On GitHub, click **New repository**. Name it `vfox-files-private` (yours already exists) and choose **Private**. Check it says **Private** next to its name.
2. Make one **folder per product**, named **exactly** after the product's id, and put
   the files in it as they are (`.aep`, `.mp4`, `.mov`, anything; no need to zip):

   ```
   vfox-files-private/
     proton-beam/              proton_beam.aep
     gun-muzzle-flash/         your .aep (+ any footage or images it uses)
     gun-muzzle-flash-stock/   your .mp4 / .mov
   ```

   Buyers get a separate **Download** button for every file in the product's folder.

3. Easiest way to upload: on your computer, make a folder called e.g. `proton-beam`
   with the files inside. In `vfox-files-private` click **Add file → Upload files** and drag the
   **whole folder** in. Commit.

> **After Effects projects:** an `.aep` only opens cleanly on someone else's computer if
> everything it uses is with it. If a project uses outside footage or images (smoke
> clips, textures), put those files in the same folder too, or the buyer will see
> "missing footage". (In After Effects, **File → Dependencies → Collect Files** gathers
> a project and everything it uses into one folder for you.)

> **File size:** uploading through the GitHub website works for files up to **25 MB**.
> For bigger files (up to 100 MB each) use the free **GitHub Desktop** app. GitHub doesn't
> accept single files over 100 MB, so very large 4K packs would need different storage.

## 2. Create a read-only GitHub token

This lets the worker read `vfox-files-private` and nothing else.

1. GitHub → your profile picture → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name: `vfox worker`. Expiration: the longest offered (put a reminder in your calendar to renew it).
3. **Repository access:** *Only select repositories* → `vfox-files-private`.
4. **Permissions → Repository permissions → Contents:** *Read-only*.
5. Generate, and copy the token (starts with `github_pat_`). Keep it for step 5.

## 3. Get Razorpay API keys (test mode first)

1. Razorpay Dashboard, with **Test Mode** on → **Account & Settings → API Keys → Generate Key**.
2. Copy the **Key ID** (starts with `rzp_test_`) and the **Key Secret**. Keep them for step 5.

## 4. Create the worker on Cloudflare

1. Sign up free at cloudflare.com. Go to **Workers & Pages → Create → Create Worker** (the "Hello World" starter).
2. Name it `vfox-checkout` and click **Deploy**.
3. Click **Edit code**. Delete everything, paste the whole contents of
   [`worker/worker.js`](worker.js) from this repo, and click **Deploy**.
4. Go to **Storage & Databases → KV → Create** (namespace name `vfox-orders`).
5. Open your worker → **Settings → Bindings → Add → KV namespace**.
   Variable name: `ORDERS`. Namespace: `vfox-orders`. Save.

## 5. Add settings and secrets

Worker → **Settings → Variables and Secrets → Add**:

| Name | Type | Value |
|---|---|---|
| `SITE_ORIGIN` | Text | `https://froodyofficial-maker.github.io` |
| `FILES_REPO` | Text | `froodyofficial-maker/vfox-files-private` |
| `LINK_HOURS` | Text | `24` |
| `MAX_DOWNLOADS` | Text | `5` |
| `RAZORPAY_KEY_ID` | Secret | Key ID from step 3 |
| `RAZORPAY_KEY_SECRET` | Secret | Key Secret from step 3 |
| `GITHUB_TOKEN` | Secret | token from step 2 |
| `LINK_SECRET` | Secret | a long random password (40+ characters, from any password generator). You never need to type it again. |

Click **Deploy** if asked.

## 6. Connect the website

1. Copy your worker's address from its overview page, e.g. `https://vfox-checkout.yourname.workers.dev`.
2. Open `https://…workers.dev/api/health` in your browser. You should see `{"ok":true,...}`.
3. In this repo, edit `js/products.js` and set:
   ```js
   window.VFOX_API_URL = "https://vfox-checkout.yourname.workers.dev";
   ```
   Commit. Within a few minutes the cart shows **Pay securely** and product pages show **Buy now**.

## 7. Test it

Add something to the cart and pay with Razorpay's test details (in test mode, UPI ID
`success@razorpay` succeeds). You should land on **Your downloads** with a working
Download button. Try **Find my order** with the payment ID and the email you entered.

## 8. Go live

Once Razorpay activates your account: turn **Test Mode off** → **API Keys → Generate Key**, then
replace `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Cloudflare with the live ones. That's it.

---

## Everyday tasks

**Add a product**
1. Upload its files into a folder named `<product-id>` in `vfox-files-private`.
2. Add the product to `js/products.js` (website).
3. Add one line to `CATALOG` at the top of the worker code (Cloudflare → Edit code → Deploy),
   with the **same id and prices**:
   ```js
   "my-new-effect": { name: "My New Effect", price: 99 },
   ```
   The worker's prices are what buyers are actually charged.

**Update a product's files:** upload the new version into the product's folder with the same
file name (it replaces the old one). Add or delete files in the folder and buyers' download
pages change to match.

**A buyer used up their downloads:** Cloudflare → KV → `vfox-orders` → find the key
`pay:pay_XXXX` → edit and set that file's number in `"downloads"` back to `0`.

**Refunds:** issue them from the Razorpay dashboard as usual.

**Downloads say "File unavailable":** your GitHub token probably expired. Make a new one
(step 2) and replace `GITHUB_TOKEN`.
