/* =====================================================================
   vfox checkout & download worker (Cloudflare Workers)

   What it does
   - POST /api/create-order   prices the cart from CATALOG below and creates
                              a Razorpay order (the browser never sets prices)
   - POST /api/verify         checks Razorpay's payment signature, saves the
                              order and returns personal download links
   - POST /api/find-order     re-issues links from a payment ID + email
   - GET  /dl/...             checks a link (signature, expiry, download
                              count) and streams the file from the private
                              GitHub repo

   FILES: each product has a folder in the private repo named after its id
   (e.g. proton-beam/). Every file in that folder (.aep, .mp4, .mov, .zip,
   anything) gets its own download button. No file names in this code.

   Settings (Cloudflare dashboard → your worker → Settings → Variables)
   Variables:  SITE_ORIGIN      e.g. https://froodyofficial-maker.github.io
               FILES_REPO       e.g. froodyofficial-maker/vfox-files
               LINK_HOURS       how long a link works (default 24)
               MAX_DOWNLOADS    downloads per product per purchase (default 5)
   Secrets:    RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, LINK_SECRET, GITHUB_TOKEN
   KV binding: ORDERS

   ADDING A PRODUCT: add a line to CATALOG (same id and prices as
   js/products.js) and upload its files into a folder named <id> in the
   private files repo.
   ===================================================================== */

const CATALOG = {
  "proton-beam":            { name: "Proton Beam",                      price: 239, pricePro: 399 },
  "gun-muzzle-flash":       { name: "Gun Muzzle Flash",                 price: 49 },
  "gun-muzzle-flash-stock": { name: "Gun Muzzle Flash (Stock Footage)", price: 19 },
};

const TYPES = { aep: "application/octet-stream", aepx: "application/xml", mp4: "video/mp4", mov: "video/quicktime", m4v: "video/mp4", webm: "video/webm", zip: "application/zip", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", pdf: "application/pdf", wav: "audio/wav", mp3: "audio/mpeg", txt: "text/plain" };
const typeFor = name => TYPES[(name.split(".").pop() || "").toLowerCase()] || "application/octet-stream";
const ghPath = (...parts) => parts.map(p => encodeURIComponent(p)).join("/");
function gh(env, path, raw) {
  return fetch(`https://api.github.com/repos/${env.FILES_REPO}/contents/${path}`, {
    headers: { "authorization": `Bearer ${env.GITHUB_TOKEN}`, "accept": raw ? "application/vnd.github.raw+json" : "application/vnd.github+json", "user-agent": "vfox-worker", "x-github-api-version": "2022-11-28" },
  });
}
/* list the files in a product's folder (skips sub-folders and hidden files like .gitkeep) */
async function listFiles(env, id) {
  const res = await gh(env, ghPath(id));
  if (!res.ok) { console.error("GitHub folder list failed", res.status, id); return []; }
  const list = await res.json();
  return (Array.isArray(list) ? list : []).filter(f => f.type === "file" && !f.name.startsWith(".")).map(f => ({ name: f.name, size: f.size }));
}
const LIC_NAME = { 1: "Standard", 2: "Pro" };
const enc = new TextEncoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      if (request.method === "POST" && url.pathname === "/api/create-order") return json(await createOrder(request, env), 200, cors);
      if (request.method === "POST" && url.pathname === "/api/verify") return json(await verify(request, env, url), 200, cors);
      if (request.method === "POST" && url.pathname === "/api/find-order") return json(await findOrder(request, env, url), 200, cors);
      if (request.method === "GET" && url.pathname.startsWith("/dl/")) return await download(url, env);
      if (url.pathname === "/" || url.pathname === "/api/health") return json({ ok: true, service: "vfox checkout" }, 200, cors);
      return json({ error: "Not found" }, 404, cors);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      return json({ error: e instanceof HttpError ? e.message : "Something went wrong. Please try again." }, status, cors);
    }
  },
};

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function json(data, status, headers) { return new Response(JSON.stringify(data), { status, headers: { ...headers, "content-type": "application/json" } }); }
function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = (env.SITE_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return { "access-control-allow-origin": ok ? origin : (allowed[0] || ""), "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "content-type", "vary": "origin" };
}
async function body(request) { try { return await request.json(); } catch { throw new HttpError(400, "Invalid request."); } }
async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0;
}
async function razorpay(env, path, init = {}) {
  const res = await fetch("https://api.razorpay.com/v1" + path, {
    ...init,
    headers: { "authorization": "Basic " + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`), "content-type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { console.error("Razorpay error", res.status, JSON.stringify(data)); throw new HttpError(502, "The payment service didn't respond. Please try again."); }
  return data;
}
const hours = env => Number(env.LINK_HOURS) || 24;
const maxDl = env => Number(env.MAX_DOWNLOADS) || 5;
const priceOf = (id, lic) => { const p = CATALOG[id]; return lic === 2 && p.pricePro ? p.pricePro : p.price; };

/* ---------- 1. create order ---------- */
function cleanItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) throw new HttpError(400, "Your cart is empty or invalid.");
  const seen = new Set(), out = [];
  for (const it of items) {
    const id = String(it?.id || ""), lic = it?.lic === 2 ? 2 : 1;
    if (!CATALOG[id]) throw new HttpError(400, "One of the products in your cart is no longer available. Remove it and try again.");
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, lic: CATALOG[id].pricePro ? lic : 1 });
  }
  return out;
}
async function createOrder(request, env) {
  const { items } = await body(request);
  const clean = cleanItems(items);
  const total = clean.reduce((s, it) => s + priceOf(it.id, it.lic), 0);
  const order = await razorpay(env, "/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: total * 100, currency: "INR", receipt: "vfox_" + Date.now(),
      notes: { items: clean.map(it => `${it.id}:${it.lic}`).join(",") },
    }),
  });
  return {
    key: env.RAZORPAY_KEY_ID, order_id: order.id, amount: order.amount, currency: order.currency,
    items: clean.map(it => ({ id: it.id, name: CATALOG[it.id].name, license: LIC_NAME[it.lic], price: priceOf(it.id, it.lic) })),
    total,
  };
}

/* ---------- 2. verify payment, save order, issue links ---------- */
function itemsFromNotes(notes) {
  return String(notes?.items || "").split(",").filter(Boolean).map(s => { const [id, l] = s.split(":"); return { id, lic: l === "2" ? 2 : 1 }; }).filter(it => CATALOG[it.id]);
}
async function saveOrder(env, payment, order) {
  const record = {
    payment_id: payment.id, order_id: order.id, email: (payment.email || "").toLowerCase(),
    items: itemsFromNotes(order.notes), amount: order.amount, created: Date.now(), downloads: {},
  };
  const existing = await env.ORDERS.get("pay:" + payment.id, "json");
  if (existing) return existing;
  await env.ORDERS.put("pay:" + payment.id, JSON.stringify(record));
  return record;
}
async function verify(request, env, url) {
  const b = await body(request);
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = b;
  if (!oid || !pid || !sig) throw new HttpError(400, "Missing payment details.");
  const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, `${oid}|${pid}`);
  if (!safeEqual(expected, String(sig))) throw new HttpError(400, "We couldn't verify this payment. If you were charged, use Find my order or contact us.");
  const [payment, order] = await Promise.all([razorpay(env, "/payments/" + encodeURIComponent(pid)), razorpay(env, "/orders/" + encodeURIComponent(oid))]);
  if (payment.order_id !== oid || !["captured", "authorized"].includes(payment.status)) throw new HttpError(400, "This payment isn't complete yet. If you were charged, use Find my order in a few minutes.");
  const record = await saveOrder(env, payment, order);
  return await linksFor(env, record, url);
}

/* ---------- 3. find order (re-issue links) ---------- */
async function findOrder(request, env, url) {
  const { payment_id, email } = await body(request);
  const pid = String(payment_id || "").trim(), em = String(email || "").trim().toLowerCase();
  if (!/^pay_[A-Za-z0-9]+$/.test(pid) || !em) throw new HttpError(400, "Enter your payment ID (it starts with pay_) and the email you paid with.");
  let record = await env.ORDERS.get("pay:" + pid, "json");
  if (!record) {
    let payment;
    try { payment = await razorpay(env, "/payments/" + encodeURIComponent(pid)); } catch { throw new HttpError(404, "We couldn't find that order. Check the payment ID and email, or contact us."); }
    if (!payment.order_id || !["captured", "authorized"].includes(payment.status)) throw new HttpError(404, "We couldn't find a completed payment with that ID.");
    const order = await razorpay(env, "/orders/" + encodeURIComponent(payment.order_id));
    if (!itemsFromNotes(order.notes).length) throw new HttpError(404, "That payment isn't a vfox store order.");
    record = await saveOrder(env, payment, order);
  }
  if (!record.email || record.email !== em) throw new HttpError(404, "We couldn't find that order. Check the payment ID and email, or contact us.");
  return await linksFor(env, record, url);
}

/* ---------- links ---------- */
async function linksFor(env, record, url) {
  const exp = Date.now() + hours(env) * 3600e3;
  const base = url.origin;
  const links = [];
  for (const it of record.items) {
    const files = [];
    for (const f of await listFiles(env, it.id)) {
      const sig = await hmacHex(env.LINK_SECRET, `${record.payment_id}|${it.id}|${f.name}|${exp}`);
      const used = record.downloads?.[`${it.id}/${f.name}`] || 0;
      files.push({
        name: f.name, size: f.size,
        url: `${base}/dl/${encodeURIComponent(record.payment_id)}/${encodeURIComponent(it.id)}/${encodeURIComponent(f.name)}?exp=${exp}&sig=${sig}`,
        downloads_left: Math.max(0, maxDl(env) - used),
      });
    }
    links.push({ id: it.id, name: CATALOG[it.id].name, license: LIC_NAME[it.lic], files });
  }
  return { payment_id: record.payment_id, expires: exp, hours: hours(env), max_downloads: maxDl(env), links };
}

/* ---------- 4. download ---------- */
function page(title, text, status) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · vfox</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#09070f;color:#ece8f7;font-family:system-ui,sans-serif;padding:24px;text-align:center">
<div style="max-width:440px"><h1 style="font-size:1.5rem">${title}</h1><p style="color:#9a91b5;line-height:1.5">${text}</p></div></body>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
async function download(url, env) {
  const [, , pid, id, name] = url.pathname.split("/").map(decodeURIComponent);
  const exp = Number(url.searchParams.get("exp")), sig = url.searchParams.get("sig") || "";
  if (!pid || !CATALOG[id] || !name || name.includes("/") || name.startsWith(".") || !exp) return page("Link not valid", "This download link is incomplete. Use the link from your order page.", 400);
  const expected = await hmacHex(env.LINK_SECRET, `${pid}|${id}|${name}|${exp}`);
  if (!safeEqual(expected, sig)) return page("Link not valid", "This download link isn't valid. Use the link from your order page.", 403);
  if (Date.now() > exp) return page("Link expired", "This link has expired. Get a fresh one from Find my order on the vfox site, using your payment ID and email.", 410);
  const record = await env.ORDERS.get("pay:" + pid, "json");
  if (!record || !record.items.some(it => it.id === id)) return page("Order not found", "We couldn't find this order. Please contact us.", 404);
  const key = `${id}/${name}`;
  const used = record.downloads?.[key] || 0;
  if (used >= maxDl(env)) return page("Download limit reached", `This file has been downloaded ${used} times, which is the limit for one purchase. Contact us if you need it again.`, 429);

  const file = await gh(env, ghPath(id, name), true);
  if (!file.ok) { console.error("GitHub file fetch failed", file.status, key); return page("File unavailable", "This file is temporarily unavailable. Please try again later or contact us.", 502); }

  record.downloads = { ...(record.downloads || {}), [key]: used + 1 };
  await env.ORDERS.put("pay:" + pid, JSON.stringify(record));
  const safeName = name.replace(/["\\\r\n]/g, "_");
  return new Response(file.body, {
    headers: {
      "content-type": typeFor(name),
      "content-disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      ...(file.headers.get("content-length") ? { "content-length": file.headers.get("content-length") } : {}),
      "cache-control": "no-store",
    },
  });
}
