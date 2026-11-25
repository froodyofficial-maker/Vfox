/* vfox store: shared behaviour for every page (product grids, enlarged preview,
   cart, menus). Products come from js/products.js; you shouldn't need to edit this file. */
(function(){
"use strict";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const PRODUCTS = (window.VFOX_PRODUCTS || []).filter(p => p && p.id);
const BUNDLE = window.VFOX_BUNDLE ? Object.assign({ id:"bundle", type:"bundle", fx:"nebula" }, window.VFOX_BUNDLE) : null;
const FX = null;
const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
if (BUNDLE) byId.bundle = BUNDLE;
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => "₹" + Math.round(n).toLocaleString("en-IN");
const proPrice = p => p.pricePro ?? p.price;
const priceFor = (p, l) => l === 2 ? proPrice(p) : p.price;
const payUrl = (p, l) => (l === 2 ? (p.buyUrlPro || p.buyUrl) : p.buyUrl) || "";
const typeLabel = t => t === "ae" ? "AE PROJECT" : t === "stock" ? "STOCK FOOTAGE" : "BUNDLE";
const hash = str => { let h=2166136261; for (const c of String(str)) { h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; };

function sizeCanvas(cv){ const dpr=Math.min(devicePixelRatio||1,2); const r=cv.getBoundingClientRect(); cv.width=Math.max(1,Math.round(r.width*dpr)); cv.height=Math.max(1,Math.round(r.height*dpr)); }

/* ---------- Injected UI (cart drawer, preview modal, toast) ---------- */
document.body.insertAdjacentHTML("beforeend", `
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-label="Cart" aria-hidden="true">
  <header><h3>Your cart</h3><button class="icon-btn" id="cartClose" aria-label="Close cart">✕</button></header>
  <div class="lines" id="lines"></div>
  <footer>
    <p class="mono" style="margin:0;color:var(--muted)">Choose Pro if you earn over ₹50 lakh a month, otherwise Standard.</p>
    <div class="seg" role="group" aria-label="License">
      <button aria-pressed="true" data-lic="1">Standard</button>
      <button aria-pressed="false" data-lic="2">Pro · ₹50L+/mo</button>
    </div>
    <div class="total"><span>Subtotal</span><b id="subtotal">$0</b></div>
    <button class="btn btn-primary" id="checkout">Checkout</button>
  </footer>
</aside>
<div class="modal" id="modal" aria-hidden="true">
  <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="mTitle">
    <button class="close" id="mClose" aria-label="Close preview">✕</button>
    <div class="stage-col">
      <div class="stage" id="mStage"></div>
      <div class="thumbs" id="mThumbs" hidden></div>
    </div>
    <div class="info" id="mInfo"></div>
  </div>
</div>
<div class="toast" id="toast" role="status"></div>`);

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2800); }

/* ---------- Media: what shows inside a card thumbnail ---------- */
function mountThumb(box, p){
  let canvas=null, video=null, raf=0, t0=0;
  const base = 1.7 + (hash(p.id)%100)/40;
  if (p.poster) {
    box.insertAdjacentHTML("afterbegin", `<img src="${esc(p.poster)}" alt="" loading="lazy">`);
  } else if (p.preview) {
    box.insertAdjacentHTML("afterbegin", `<video src="${esc(p.preview)}#t=0.5" muted playsinline preload="metadata"></video>`);
    video = $("video", box);
  } else if (p.fx && FX && FX.has(p.fx)) {
    canvas = document.createElement("canvas"); canvas.setAttribute("aria-hidden","true"); box.prepend(canvas);
  } else {
    box.insertAdjacentHTML("afterbegin", `<div class="noprev">PREVIEW COMING SOON</div>`);
  }
  const render = () => { if (canvas) { sizeCanvas(canvas); FX.draw(canvas, p.fx, base); } };
  const loop = ts => { if(!t0) t0=ts; FX.draw(canvas, p.fx, base+(ts-t0)/1000); raf=requestAnimationFrame(loop); };
  function start(){
    if (reduce) return;
    if (canvas && !raf) { t0=0; raf=requestAnimationFrame(loop); }
    if (p.preview) {
      if (!video) { box.insertAdjacentHTML("afterbegin", `<video src="${esc(p.preview)}" muted loop playsinline preload="none"></video>`); video=$("video",box); }
      video.style.zIndex = 1; video.style.opacity = 1; video.loop = true; video.play().catch(()=>{});
    }
  }
  function stop(){
    cancelAnimationFrame(raf); raf=0;
    if (video) { video.pause(); if (p.poster) video.style.opacity = 0; }
  }
  return { render, start, stop };
}

/* ---------- Cards & grids ---------- */
const mounted = [];
function card(p){
  const el = document.createElement("article"); el.className = "card";
  el.innerHTML = `
    <button class="thumb" data-open="${esc(p.id)}" aria-label="Enlarge preview of ${esc(p.name)}">
      <span class="tag">${typeLabel(p.type)}</span>
      ${p.example ? '<span class="tag example">EXAMPLE</span>' : ""}
      <span class="expand" aria-hidden="true"><span>⤢ Enlarge preview</span></span>
      ${p.duration ? `<span class="tc">${esc(p.duration)}</span>` : ""}
    </button>
    <div class="card-body">
      <h3><button data-open="${esc(p.id)}">${esc(p.name)}</button></h3>
      <p>${esc(p.short)}</p>
      ${p.specs?.length ? `<div class="specs">${p.specs.map(s=>`<span>${esc(s)}</span>`).join("")}</div>` : ""}
      <div class="buy"><div><span class="price">${fmt(p.price)}</span>${p.pricePro && p.pricePro!==p.price?`<div class="pro-note">${fmt(p.pricePro)} if you earn ₹50L+/mo</div>`:""}</div>
        <button class="add" data-id="${esc(p.id)}">Add to cart</button></div>
    </div>`;
  const thumb = $(".thumb", el);
  const m = mountThumb(thumb, p);
  el.addEventListener("pointerenter", m.start); el.addEventListener("pointerleave", m.stop);
  thumb.addEventListener("focus", m.start); thumb.addEventListener("blur", m.stop);
  mounted.push(m);
  return el;
}
function sortList(list, how){
  const l = list.slice();
  if (how === "price-asc") l.sort((a,b)=>a.price-b.price);
  if (how === "price-desc") l.sort((a,b)=>b.price-a.price);
  if (how === "name") l.sort((a,b)=>a.name.localeCompare(b.name));
  return l;
}
function fillGrid(grid){
  const type = grid.dataset.grid, limit = +grid.dataset.limit || Infinity;
  const sortSel = grid.dataset.sort ? $("#"+grid.dataset.sort) : null;
  let list = PRODUCTS.filter(p => type==="all" || (type==="featured" ? p.featured : p.type===type));
  if (type === "featured" && !list.length) list = PRODUCTS.slice();
  list = sortList(list, sortSel ? sortSel.value : "").slice(0, limit);
  grid.innerHTML = "";
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Coming soon</h3><p>Nothing in this section yet. Join the list below to hear when new packs go live.</p></div>`;
    return;
  }
  list.forEach(p => grid.appendChild(card(p)));
  grid.classList.toggle("solo", list.length === 1);
}
const grids = $$("[data-grid]");
grids.forEach(fillGrid);
$$("[data-sort-for]").forEach(sel => sel.addEventListener("change", () => { mounted.length=0; grids.forEach(fillGrid); renderMedia(); syncButtons(); }));
function renderMedia(){ mounted.forEach(m => m.render()); }
renderMedia();
if (document.fonts) document.fonts.ready.then(renderMedia);

$$("[data-count]").forEach(el => {
  const n = PRODUCTS.filter(p => el.dataset.count==="all" || p.type===el.dataset.count).length;
  el.textContent = n + (el.dataset.unit ? " " + el.dataset.unit + (n===1?"":"s") : "");
});

/* ---------- Category tiles (home): show the newest product's poster ---------- */
$$(".cat[data-cat]").forEach(tile => {
  const p = PRODUCTS.find(x => x.type === tile.dataset.cat && x.poster);
  if (p) tile.insertAdjacentHTML("afterbegin", `<img src="${esc(p.poster)}" alt="" aria-hidden="true">`);
  else tile.classList.add("soon");
});

/* ---------- Bundle ---------- */
$$("[data-bundle]").forEach(el => {
  if (!BUNDLE) { el.hidden = true; return; }
  const sum = PRODUCTS.reduce((s,p)=>s+p.price,0);
  $("[data-b=name]", el).textContent = BUNDLE.name;
  $("[data-b=blurb]", el).textContent = BUNDLE.blurb || "";
  $("[data-b=price]", el).textContent = fmt(BUNDLE.price);
  const was = $("[data-b=was]", el);
  if (sum > BUNDLE.price) was.textContent = fmt(sum) + " if bought separately"; else was.hidden = true;
});

/* ---------- Enlarged preview modal ---------- */
const modal = $("#modal"), stage = $("#mStage"), thumbsEl = $("#mThumbs"), info = $("#mInfo");
let stageRaf = 0, lastFocus = null, current = null;
function clearStage(){ cancelAnimationFrame(stageRaf); stageRaf=0; $$("video", stage).forEach(v=>v.pause()); stage.innerHTML=""; }
function showOnStage(p, item){
  clearStage();
  const hud = `<div class="hud-mini mono"><span>${typeLabel(p.type)}</span><span>${esc(p.duration||"")}</span></div>`;
  if (item.kind === "video") {
    stage.innerHTML = `<video src="${esc(item.src)}" ${p.poster?`poster="${esc(p.poster)}"`:""} controls ${reduce?"":"autoplay"} muted loop playsinline></video>`;
  } else if (item.kind === "image") {
    stage.innerHTML = hud + `<img src="${esc(item.src)}" alt="${esc(p.name)} preview still">`;
  } else if (item.kind === "fx") {
    stage.innerHTML = hud + `<canvas aria-label="${esc(p.name)} placeholder preview"></canvas>`;
    const cv = $("canvas", stage); sizeCanvas(cv);
    let t0=0; const base = 1.7 + (hash(p.id)%100)/40;
    FX.draw(cv, p.fx, base);
    if (!reduce) { const loop = ts => { if(!t0) t0=ts; FX.draw(cv, p.fx, base+(ts-t0)/1000); stageRaf=requestAnimationFrame(loop); }; stageRaf=requestAnimationFrame(loop); }
  } else {
    stage.innerHTML = `<div class="noprev">PREVIEW COMING SOON</div>`;
  }
}
function openPreview(id){
  const p = byId[id]; if (!p || p.type==="bundle") return;
  current = p; lastFocus = document.activeElement;
  const items = [];
  if (p.preview) items.push({kind:"video", src:p.preview, label:"▶ Video"});
  if (p.poster && !p.preview) items.push({kind:"image", src:p.poster});
  (p.gallery||[]).forEach(src => items.push({kind:"image", src}));
  if (!items.length) items.push(p.fx && FX && FX.has(p.fx) ? {kind:"fx"} : {kind:"none"});

  modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
  document.documentElement.style.overflow = "hidden";
  showOnStage(p, items[0]);

  thumbsEl.hidden = items.length < 2;
  thumbsEl.innerHTML = items.length < 2 ? "" : items.map((it,i)=>`<button aria-pressed="${i===0}" data-i="${i}" aria-label="Show preview ${i+1}">${it.kind==="video" ? `<span class="vid">${it.label}</span>` : `<img src="${esc(it.src)}" alt="">`}</button>`).join("");
  $$("button", thumbsEl).forEach(b => b.addEventListener("click", () => {
    $$("button", thumbsEl).forEach(x=>x.setAttribute("aria-pressed", x===b)); showOnStage(p, items[+b.dataset.i]);
  }));

  info.innerHTML = `
    <span class="eyebrow">${p.type==="ae"?"After Effects project":"Stock footage"}</span>
    <h2 id="mTitle">${esc(p.name)}</h2>
    <p class="desc">${esc(p.description || p.short)}</p>
    ${p.specs?.length ? `<div class="specs">${p.specs.map(s=>`<span>${esc(s)}</span>`).join("")}</div>` : ""}
    ${p.includes?.length ? `<div><div class="eyebrow" style="margin-bottom:8px">What's included</div><ul>${p.includes.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
    <div class="tiers">
      <div class="tier"><span><b>Standard</b><small>Earning under ₹50 lakh / month</small></span><span class="price">${fmt(p.price)}</span></div>
      ${p.pricePro && p.pricePro!==p.price ? `<div class="tier"><span><b>Pro</b><small>Earning over ₹50 lakh / month</small></span><span class="price">${fmt(p.pricePro)}</span></div>` : ""}
    </div>
    <div class="actions">
      ${payUrl(p,1) ? `<a class="btn btn-primary" href="${esc(payUrl(p,1))}" target="_blank" rel="noopener">Buy Standard · ${fmt(p.price)}</a>` : ""}
      ${payUrl(p,2) && p.pricePro && p.pricePro!==p.price ? `<a class="btn btn-ghost" href="${esc(payUrl(p,2))}" target="_blank" rel="noopener">Buy Pro · ${fmt(p.pricePro)}</a>` : ""}
      <button class="add btn${payUrl(p,1) ? "" : " btn-primary"}" data-id="${esc(p.id)}">Add to cart</button>
    </div>
    <p class="mono" style="color:var(--muted);margin:0">${payUrl(p,1) ? "Secure checkout · " : ""}<a href="licenses.html">License details</a></p>`;
  syncButtons();
  try { history.replaceState(null, "", "#" + p.id); } catch(e) {}
  $("#mClose").focus();
}
function closePreview(){
  if (!modal.classList.contains("open")) return;
  clearStage(); modal.classList.remove("open"); modal.setAttribute("aria-hidden","true");
  document.documentElement.style.overflow = ""; current = null;
  try { history.replaceState(null, "", location.pathname + location.search); } catch(e) {}
  if (lastFocus) lastFocus.focus();
}
$("#mClose").addEventListener("click", closePreview);
modal.addEventListener("click", e => { if (e.target === modal) closePreview(); });
addEventListener("resize", () => { if (current) { const cv=$("canvas",stage); if (cv) sizeCanvas(cv); } });

/* ---------- Cart ---------- */
let cart = [], lic = 1;
try { const s = JSON.parse(localStorage.getItem("vfox-cart")||"null"); if (s) { cart=(s.items||[]).filter(id=>byId[id]); lic = s.lic===2?2:1; } } catch(e) {}
const save = () => { try { localStorage.setItem("vfox-cart", JSON.stringify({items:cart, lic})); } catch(e) {} };
function syncButtons(){
  $$(".add").forEach(b => { const on = cart.includes(b.dataset.id) || (cart.includes("bundle") && b.dataset.id!=="bundle"); b.classList.toggle("added", on); b.textContent = on ? "In cart ✓" : (b.dataset.id==="bundle" ? "Add bundle to cart" : "Add to cart"); });
}
function renderCart(){
  $$("[data-cart-count]").forEach(el => el.textContent = cart.length);
  $$(".seg button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.lic===lic));
  const L = $("#lines"); L.innerHTML = "";
  if (!cart.length) L.innerHTML = '<div class="empty">Your cart is empty.<br>Pick a pack to get started.</div>';
  cart.forEach(id => {
    const p = byId[id]; const row = document.createElement("div"); row.className = "line";
    row.innerHTML = `<div class="mini">${p.poster?`<img src="${esc(p.poster)}" alt="">`:"<canvas></canvas>"}</div>
      <div><h4>${esc(p.name)}</h4><div class="mono">${p.type==="ae"?"AE project":p.type==="stock"?"Stock footage":"All packs"} · ${lic===2?"Pro":"Standard"}</div></div>
      <div style="text-align:right"><div class="price" style="font-size:1rem">${fmt(priceFor(p,lic))}</div><button class="rm" data-id="${esc(id)}">Remove</button></div>`;
    L.appendChild(row);
    const cv = $("canvas", row); if (cv && FX && p.fx && FX.has(p.fx)) { cv.width=144; cv.height=81; FX.draw(cv, p.fx, 2); }
  });
  $("#subtotal").textContent = fmt(cart.reduce((s,id)=>s+priceFor(byId[id],lic),0));
  syncButtons(); save();
}
function add(id){
  if (cart.includes(id)) { openCart(); return; }
  if (id === "bundle") { const had = cart.length; cart = ["bundle"]; toast(had ? "Bundle added. It already includes the packs you picked, so those were removed." : BUNDLE.name + " added to cart"); }
  else if (cart.includes("bundle")) { toast("That pack is already in your bundle"); return; }
  else { cart.push(id); toast(byId[id].name + " added to cart"); }
  renderCart();
}
function openCart(){ closePreview(); $("#drawer").classList.add("open"); $("#scrim").classList.add("open"); $("#drawer").setAttribute("aria-hidden","false"); $("#cartClose").focus(); }
function closeCart(){ $("#drawer").classList.remove("open"); $("#scrim").classList.remove("open"); $("#drawer").setAttribute("aria-hidden","true"); }
$("#cartClose").addEventListener("click", closeCart);
$("#scrim").addEventListener("click", closeCart);
$("#checkout").addEventListener("click", () => {
  if (!cart.length) { toast("Add a pack before checking out"); return; }
  const missing = cart.filter(id => !payUrl(byId[id], lic));
  if (missing.length) { toast("Checkout opens soon. Payments aren't connected yet."); return; }
  const L = $("#lines");
  L.innerHTML = `<div class="paylist"><p>${cart.length > 1 ? "Each item has its own secure checkout. Pay for each one below:" : "You'll finish paying on our secure checkout page:"}</p>
    ${cart.map(id => { const p = byId[id]; return `<a class="btn btn-primary" href="${esc(payUrl(p,lic))}" target="_blank" rel="noopener">Pay ${fmt(priceFor(p,lic))} · ${esc(p.name)} ↗</a>`; }).join("")}
    <button class="rm" id="backToCart">Back to cart</button></div>`;
  $("#backToCart").addEventListener("click", renderCart);
});

/* ---------- Global clicks & keys ---------- */
document.addEventListener("click", e => {
  const o = e.target.closest("[data-open]"); if (o) { openPreview(o.dataset.open); return; }
  const a = e.target.closest(".add"); if (a) { add(a.dataset.id); return; }
  const r = e.target.closest(".rm"); if (r) { cart = cart.filter(x=>x!==r.dataset.id); renderCart(); return; }
  const s = e.target.closest(".seg button"); if (s) { lic = +s.dataset.lic; renderCart(); return; }
  if (e.target.closest("[data-cart-open]")) openCart();
});
addEventListener("keydown", e => { if (e.key === "Escape") { closePreview(); closeCart(); } });

/* Open a preview straight from a link like after-effects.html#my-pack */
function fromHash(){ const id = decodeURIComponent(location.hash.slice(1)); if (id && byId[id] && id!=="bundle") openPreview(id); }
addEventListener("hashchange", fromHash);
fromHash();
renderCart();

/* ---------- Mobile menu ---------- */
const menuBtn = $("#menuBtn"), links = $(".nav-links");
if (menuBtn) menuBtn.addEventListener("click", () => { const open = links.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", open); });

/* ---------- Newsletter & contact ---------- */
$$(".signup").forEach(f => f.addEventListener("submit", e => { e.preventDefault(); toast("Thanks! You're on the list for new drops."); f.reset(); }));
$$("[data-email]").forEach(el => el.textContent = window.VFOX_CONTACT_EMAIL || "");
$$("[data-copy-email]").forEach(b => b.addEventListener("click", () => {
  const v = window.VFOX_CONTACT_EMAIL || "";
  (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(()=>toast("Email address copied"), ()=>toast(v));
}));

/* ---------- Home hero: drifting embers + timecode ---------- */
const hc = $("#heroFx");
if (hc) {
  const hx = hc.getContext("2d"), V="139,77,255", Lc="217,207,251"; let parts = [];
  const sizeHero = () => { sizeCanvas(hc); let seed = 42; const R = () => (seed = (seed*1664525 + 1013904223)>>>0) / 4294967296; parts = Array.from({length:Math.round(hc.width*hc.height/9000)}, ()=>({x:R(),y:R(),s:R()*1.8+.4,v:.02+R()*.05,p:R()*6,c:R()<.7?V:Lc})); };
  const frame = t => { const w=hc.width,h=hc.height, k=devicePixelRatio>1?2:1; hx.clearRect(0,0,w,h);
    const g=hx.createRadialGradient(w*.75,h*.5,0,w*.75,h*.5,w*.55); g.addColorStop(0,`rgba(${V},.22)`); g.addColorStop(1,`rgba(${V},0)`); hx.fillStyle=g; hx.fillRect(0,0,w,h);
    for (const p of parts) { const y=((p.y-t*p.v)%1+1)%1, x=p.x+Math.sin(t*.5+p.p)*.01; hx.fillStyle=`rgba(${p.c},${.25+.5*Math.abs(Math.sin(t+p.p))})`; hx.fillRect(x*w,y*h,p.s*k,p.s*k); } };
  sizeHero(); frame(3);
  let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(()=>{ sizeHero(); frame(3); renderMedia(); }, 150); });
  const tcEl = $("#tc"), pad = n => String(n).padStart(2,"0"); let vis = true;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(hc);
  if (!reduce) { const t0 = performance.now(); (function tick(ts){ if (vis) { const t=(ts-t0)/1000; frame(3+t); const f=Math.floor(t*29.97); tcEl.textContent=`00:${pad(Math.floor(f/1798)%60)}:${pad(Math.floor(f/29.97)%60)}:${pad(f%30)}`; } requestAnimationFrame(tick); })(t0); }
} else {
  let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(renderMedia, 150); });
}
})();
