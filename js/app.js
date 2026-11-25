/* vfox store: shared behaviour for every page. Products come from
   js/products.js; you shouldn't need to edit this file. */
(function(){
"use strict";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const PRODUCTS = (window.VFOX_PRODUCTS || []).filter(p => p && p.id);
const EMAIL = window.VFOX_CONTACT_EMAIL || "";
const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => "₹" + Math.round(n).toLocaleString("en-IN");
const LIC = { 1: "Standard", 2: "Pro" };
const hasPro = p => p.pricePro != null && p.pricePro !== p.price;
const priceFor = (p, l) => (l === 2 && hasPro(p)) ? p.pricePro : p.price;
const payUrl = (p, l) => (l === 2 ? (p.buyUrlPro || p.buyUrl) : p.buyUrl) || "";
const typeName = t => t === "ae" ? "After Effects project" : t === "stock" ? "Stock footage" : "Pack";
const typeTag = t => t === "ae" ? "AE PROJECT" : t === "stock" ? "STOCK FOOTAGE" : "PACK";
const catPage = t => t === "ae" ? "after-effects.html" : t === "stock" ? "stock-footage.html" : "shop.html";
const productUrl = p => "product.html#" + encodeURIComponent(p.id);
const isNew = p => p.released && (Date.now() - new Date(p.released).getTime()) < 30*864e5;
const relTime = p => p.released ? new Date(p.released).getTime() : 0;
const paras = s => String(s||"").split(/\n\s*\n/).map(t => `<p>${esc(t.trim())}</p>`).join("");
const ICON = {
  bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  plug:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6m6-6v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>'
};

/* ---------- Injected UI: mini cart, quick view / lightbox, toast ---------- */
document.body.insertAdjacentHTML("beforeend", `
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-label="Cart" aria-hidden="true">
  <header><h3>Your cart</h3><button class="icon-btn" id="cartClose" aria-label="Close cart">✕</button></header>
  <div class="lines" id="lines"></div>
  <footer>
    <div class="total"><span>Subtotal</span><b id="subtotal">₹0</b></div>
    <div class="drawer-actions">
      <a class="btn btn-ghost" href="cart.html">View cart</a>
      <a class="btn btn-primary" href="cart.html#checkout">Checkout</a>
    </div>
  </footer>
</aside>
<div class="modal" id="modal" aria-hidden="true">
  <div class="modal-box" role="dialog" aria-modal="true" aria-label="Preview">
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

/* ---------- Cart store: [{id, lic}] ---------- */
let cart = [];
try {
  const s = JSON.parse(localStorage.getItem("vfox-cart-v2") || "null");
  if (Array.isArray(s)) cart = s.filter(x => x && byId[x.id]).map(x => ({ id:x.id, lic: x.lic===2?2:1 }));
} catch(e) {}
const saveCart = () => { try { localStorage.setItem("vfox-cart-v2", JSON.stringify(cart)); } catch(e) {} };
const inCart = id => cart.some(x => x.id === id);
const cartTotal = () => cart.reduce((s,x) => s + priceFor(byId[x.id], x.lic), 0);
function addToCart(id, lic){
  const p = byId[id]; if (!p) return;
  lic = hasPro(p) ? (lic===2?2:1) : 1;
  const ex = cart.find(x => x.id === id);
  if (ex) { ex.lic = lic; toast(`${p.name} updated to the ${LIC[lic]} license`); }
  else { cart.push({ id, lic }); toast(`${p.name} (${LIC[lic]}) added to cart`); }
  renderAllCart(); openCart();
}
function removeFromCart(id){ cart = cart.filter(x => x.id !== id); renderAllCart(); }
function setLic(id, lic){ const x = cart.find(c => c.id === id); if (x) { x.lic = lic; renderAllCart(); } }

function renderMini(){
  const L = $("#lines"); L.innerHTML = "";
  if (!cart.length) L.innerHTML = '<div class="empty">Your cart is empty.<br><a href="shop.html" style="color:var(--violet-hi)">Browse the shop</a></div>';
  cart.forEach(({id, lic}) => {
    const p = byId[id]; const row = document.createElement("div"); row.className = "line";
    row.innerHTML = `<div class="mini">${p.poster?`<img src="${esc(p.poster)}" alt="">`:""}</div>
      <div><h4>${esc(p.name)}</h4><div class="lic-tag">${LIC[lic].toUpperCase()} LICENSE</div></div>
      <div style="text-align:right"><div class="price" style="font-size:1rem">${fmt(priceFor(p,lic))}</div><button class="rm" data-rm="${esc(id)}">Remove</button></div>`;
    L.appendChild(row);
  });
  $("#subtotal").textContent = fmt(cartTotal());
}
function renderAllCart(){
  $$("[data-cart-count]").forEach(el => el.textContent = cart.length);
  renderMini(); syncAddButtons(); saveCart();
  if ($("#cartPage")) renderCartPage();
}
function syncAddButtons(){
  $$("[data-quick-add]").forEach(b => { const on = inCart(b.dataset.quickAdd); b.classList.toggle("added", on); b.textContent = on ? "In cart ✓" : "Add to cart"; });
}
function openCart(){ closeModal(); $("#drawer").classList.add("open"); $("#scrim").classList.add("open"); $("#drawer").setAttribute("aria-hidden","false"); $("#cartClose").focus(); }
function closeCart(){ $("#drawer").classList.remove("open"); $("#scrim").classList.remove("open"); $("#drawer").setAttribute("aria-hidden","true"); }
$("#cartClose").addEventListener("click", closeCart);
$("#scrim").addEventListener("click", closeCart);

/* ---------- Product cards ---------- */
function card(p){
  const el = document.createElement("article"); el.className = "card";
  el.innerHTML = `
    <div class="thumb">
      ${p.poster ? `<img src="${esc(p.poster)}" alt="" loading="lazy">` : `<div class="noprev">PREVIEW COMING SOON</div>`}
      <a class="cover" href="${productUrl(p)}" aria-label="${esc(p.name)}"></a>
      <span class="tag">${typeTag(p.type)}</span>
      ${isNew(p) ? '<span class="badge-new">NEW</span>' : ""}
    </div>
    <div class="card-body">
      <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
      <p>${esc(p.short)}</p>
      ${p.specs?.length ? `<div class="specs">${p.specs.map(s=>`<span>${esc(s)}</span>`).join("")}</div>` : ""}
      <div class="buy"><div><span class="price">${fmt(p.price)}</span>${hasPro(p)?`<div class="pro-note">Pro license ${fmt(p.pricePro)}</div>`:""}</div>
        <button class="add" data-quick-add="${esc(p.id)}">Add to cart</button></div>
    </div>`;
  const thumb = $(".thumb", el);
  if (p.preview) {
    const q = document.createElement("button"); q.className = "quick"; q.type = "button"; q.textContent = "⤢ Quick view"; q.dataset.quickView = p.id;
    thumb.appendChild(q);
    let video = null;
    el.addEventListener("pointerenter", () => {
      if (reduce) return;
      if (!video) { video = document.createElement("video"); Object.assign(video, { src:p.preview, muted:true, loop:true, playsInline:true, preload:"none" }); video.setAttribute("muted",""); video.style.zIndex = 1; thumb.prepend(video); }
      video.style.opacity = 1; video.play().catch(()=>{});
    });
    el.addEventListener("pointerleave", () => { if (video) { video.pause(); video.style.opacity = 0; } });
  }
  return el;
}
function emptyState(title, text){ return `<div class="empty-state" style="grid-column:1/-1"><h3>${title}</h3><p>${text}</p></div>`; }

/* Simple grids (home): data-grid="featured|new|ae|stock|all" */
$$("[data-grid]").forEach(grid => {
  const type = grid.dataset.grid, limit = +grid.dataset.limit || Infinity, exclude = grid.dataset.exclude;
  let list = PRODUCTS.filter(p => p.id !== exclude && (type==="all"||type==="new" ? true : type==="featured" ? p.featured : p.type===type));
  if (type === "new") list.sort((a,b) => relTime(b)-relTime(a));
  list = list.slice(0, limit);
  if (!list.length) { grid.innerHTML = emptyState("Coming soon", "New packs are on the way. Join the list below to hear when they drop."); return; }
  list.forEach(p => grid.appendChild(card(p)));
  grid.classList.toggle("solo", list.length === 1 && grid.dataset.solo !== "off");
});

/* ---------- Shop page with filters ---------- */
const shopRoot = $("#shop");
if (shopRoot) {
  const preset = shopRoot.dataset.preset || "";
  const grid = $("#shopGrid"), countEl = $("#resultCount"), sortSel = $("#sort");
  const types = [["ae","After Effects projects"],["stock","Stock footage"]];
  const tf = $("#fType");
  tf.insertAdjacentHTML("beforeend", types.map(([v,l]) => {
    const n = PRODUCTS.filter(p => p.type===v).length;
    return `<label><span><input type="checkbox" value="${v}" ${!preset||preset===v?"checked":""}> ${l}</span><span class="count">${n}</span></label>`;
  }).join(""));
  $$("input", shopRoot).forEach(i => i.addEventListener("change", draw));
  sortSel.addEventListener("change", draw);
  function draw(){
    const typesOn = $$("#fType input:checked").map(i => i.value);
    const maxP = $("#fPrice input:checked")?.value || "any";
    const noPlug = $("#fPlug")?.checked;
    let list = PRODUCTS.filter(p => typesOn.includes(p.type)
      && (maxP==="any" || p.price <= +maxP)
      && (!noPlug || (p.specs||[]).some(s => /no plugins/i.test(s))));
    const how = sortSel.value;
    if (how === "new") list.sort((a,b) => relTime(b)-relTime(a));
    if (how === "price-asc") list.sort((a,b) => a.price-b.price);
    if (how === "price-desc") list.sort((a,b) => b.price-a.price);
    if (how === "name") list.sort((a,b) => a.name.localeCompare(b.name));
    grid.innerHTML = "";
    countEl.textContent = `${list.length} product${list.length===1?"":"s"}`;
    if (!list.length) {
      const anyOfType = PRODUCTS.some(p => typesOn.includes(p.type));
      grid.innerHTML = anyOfType ? emptyState("No matches", "Try removing a filter.") : emptyState("Coming soon", "Nothing in this category yet. Join the list below to hear when new packs go live.");
    } else list.forEach(p => grid.appendChild(card(p)));
    syncAddButtons();
  }
  draw();
}

/* ---------- Quick view modal & lightbox ---------- */
const modal = $("#modal"), stage = $("#mStage"), thumbsEl = $("#mThumbs"), info = $("#mInfo");
let lastFocus = null;
function mediaItems(p){
  const items = [];
  if (p.preview) items.push({ kind:"video", src:p.preview });
  else if (p.poster) items.push({ kind:"image", src:p.poster });
  (p.gallery||[]).forEach(src => items.push({ kind:"image", src }));
  return items;
}
function show(p, it){
  $$("video", stage).forEach(v => v.pause());
  stage.innerHTML = !it ? `<div class="noprev">PREVIEW COMING SOON</div>`
    : it.kind === "video" ? `<video src="${esc(it.src)}" ${p.poster?`poster="${esc(p.poster)}"`:""} controls ${reduce?"":"autoplay"} muted loop playsinline></video>`
    : `<img src="${esc(it.src)}" alt="${esc(p.name)}">`;
}
function openModal(p, startIndex=0, lightbox=false){
  lastFocus = document.activeElement;
  const items = mediaItems(p);
  modal.classList.toggle("lightbox", lightbox);
  modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
  document.documentElement.style.overflow = "hidden";
  show(p, items[startIndex]);
  thumbsEl.hidden = items.length < 2;
  thumbsEl.innerHTML = items.length < 2 ? "" : items.map((it,i) => `<button aria-pressed="${i===startIndex}" data-i="${i}" aria-label="Show item ${i+1}">${it.kind==="video" ? `<span class="vid">▶ Video</span>` : `<img src="${esc(it.src)}" alt="">`}</button>`).join("");
  $$("button", thumbsEl).forEach(b => b.addEventListener("click", () => { $$("button", thumbsEl).forEach(x => x.setAttribute("aria-pressed", x===b)); show(p, items[+b.dataset.i]); }));
  info.innerHTML = lightbox ? "" : `
    <span class="eyebrow">${typeName(p.type)}</span>
    <h2>${esc(p.name)}</h2>
    <p class="desc">${esc(p.short)}</p>
    ${p.specs?.length ? `<div class="specs">${p.specs.map(s=>`<span>${esc(s)}</span>`).join("")}</div>` : ""}
    <div class="tiers">
      <div class="tier"><span><b>Standard</b><small>Earning under ₹50 lakh / month</small></span><span class="price">${fmt(p.price)}</span></div>
      ${hasPro(p) ? `<div class="tier"><span><b>Pro</b><small>Earning over ₹50 lakh / month</small></span><span class="price">${fmt(p.pricePro)}</span></div>` : ""}
    </div>
    <div class="actions"><a class="btn btn-primary" href="${productUrl(p)}">View full details</a><button class="add btn" data-quick-add="${esc(p.id)}">Add to cart</button></div>`;
  syncAddButtons();
  $("#mClose").focus();
}
function closeModal(){
  if (!modal.classList.contains("open")) return;
  $$("video", stage).forEach(v => v.pause()); stage.innerHTML = "";
  modal.classList.remove("open"); modal.setAttribute("aria-hidden","true");
  document.documentElement.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}
$("#mClose").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

/* ---------- Product page ---------- */
const pdpRoot = $("#pdp");
function renderPDP(){
  const id = decodeURIComponent(location.hash.slice(1));
  const p = byId[id] || (!id && PRODUCTS[0]);
  if (!p) {
    pdpRoot.innerHTML = `<div class="wrap" style="padding-block:72px">${emptyState("Product not found", `That product isn't available. <a href="shop.html" style="color:var(--violet-hi)">Browse the shop</a>.`)}</div>`;
    document.title = "Product not found · vfox"; return;
  }
  document.title = `${p.name} · vfox`;
  const items = mediaItems(p);
  let lic = inCart(p.id) ? cart.find(x=>x.id===p.id).lic : 1;
  const related = PRODUCTS.filter(x => x.id !== p.id).slice(0, 4);
  pdpRoot.innerHTML = `
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><a href="shop.html">Shop</a><span>/</span><a href="${catPage(p.type)}">${p.type==="ae"?"After Effects":"Stock Footage"}</a><span>/</span><span aria-current="page" style="color:var(--fg)">${esc(p.name)}</span></nav>
    <div class="pdp">
      <div class="pdp-media" style="min-width:0">
        <div class="player">
          <div class="screen" id="screen"></div>
          <button class="enlarge" id="enlarge" type="button">⤢ Enlarge</button>
        </div>
        ${items.length > 1 ? `<div class="strip" id="strip">${items.map((it,i)=>`<button type="button" aria-pressed="${i===0}" data-i="${i}" aria-label="Show ${it.kind==="video"?"video preview":"image "+i}">${it.kind==="video" ? `${p.poster?`<img src="${esc(p.poster)}" alt="">`:""}<span class="play-ic">▶ VIDEO</span>` : `<img src="${esc(it.src)}" alt="">`}</button>`).join("")}</div>` : ""}
      </div>
      <div class="pdp-sections">
          <section style="padding:0"><h2>About this effect</h2><div class="prose">${paras(p.description || p.short)}</div></section>
          ${p.includes?.length ? `<section style="padding:0"><h2>What's included</h2><ul class="ticks">${p.includes.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></section>` : ""}
          ${p.steps?.length ? `<section style="padding:0"><h2>How to use it</h2><ol class="howto">${p.steps.map(s=>`<li><span>${esc(s)}</span></li>`).join("")}</ol></section>` : ""}
          ${p.details ? `<section style="padding:0"><h2>Technical details</h2><div class="table-wrap"><table class="spec-table"><tbody>${Object.entries(p.details).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
          <section style="padding:0"><h2>License</h2><div class="prose"><p>Both licenses let you use ${esc(p.name)} in your own videos and client work, including monetised content. Pick <b>Pro</b> if you or your business earn over ₹50 lakh a month, otherwise <b>Standard</b>. You can't share or resell the project file. <a href="licenses.html" style="color:var(--violet-hi)">Read the full license terms</a>.</p></div></section>
      </div>
      <aside class="buybox" aria-label="Buy ${esc(p.name)}">
        <span class="eyebrow">${typeName(p.type)}${isNew(p)?" · New":""}</span>
        <h1>${esc(p.name)}</h1>
        <p class="lead">${esc(p.short)}</p>
        ${p.specs?.length ? `<div class="specs">${p.specs.map(s=>`<span>${esc(s)}</span>`).join("")}</div>` : ""}
        <fieldset class="lic-pick">
          <legend>Choose your license</legend>
          <label class="lic-opt"><input type="radio" name="lic" value="1" ${lic===1?"checked":""}><span><b>Standard</b><small>You earn under ₹50 lakh / month</small></span><span class="price">${fmt(p.price)}</span></label>
          ${hasPro(p) ? `<label class="lic-opt"><input type="radio" name="lic" value="2" ${lic===2?"checked":""}><span><b>Pro</b><small>You earn over ₹50 lakh / month</small></span><span class="price">${fmt(p.pricePro)}</span></label>` : ""}
        </fieldset>
        <div class="buy-actions">
          <button class="btn btn-primary" id="pdpAdd" type="button">Add to cart · <span id="pdpPrice">${fmt(priceFor(p,lic))}</span></button>
          <span id="pdpBuyWrap"></span>
        </div>
        <ul class="perks">
          <li>${ICON.down}Digital download, nothing is shipped</li>
          <li>${ICON.plug}${(p.specs||[]).some(s=>/no plugins/i.test(s)) ? "No third-party plugins needed" : "Check the technical details for requirements"}</li>
          <li>${ICON.doc}<span>${p.details?.Format ? esc(p.details.Format) : typeName(p.type)}</span></li>
          <li>${ICON.mail}<span>Questions? <a href="contact.html" style="color:var(--violet-hi)">Contact us</a></span></li>
        </ul>
        <div class="share" aria-label="Share this product">
          <span class="mono">Share</span>
          <a class="share-btn" id="shWa" target="_blank" rel="noopener">WhatsApp</a>
          <a class="share-btn" id="shX" target="_blank" rel="noopener">X</a>
          <button class="share-btn" id="shCopy" type="button">Copy link</button>
        </div>
      </aside>
    </div>
    ${related.length ? `<section style="padding-top:0"><div class="sec-head"><div><span class="eyebrow">More from vfox</span><h2>You might also like</h2></div></div><div class="grid" id="related"></div></section>` : ""}
  </div>`;
  const screen = $("#screen");
  let cur = 0;
  const showScreen = i => {
    cur = i; const it = items[i];
    $$("video", screen).forEach(v => v.pause());
    screen.innerHTML = !it ? `<div class="noprev">PREVIEW COMING SOON</div>`
      : it.kind === "video" ? `<span class="wm-note">PREVIEW · WATERMARKED</span><video src="${esc(it.src)}" ${p.poster?`poster="${esc(p.poster)}"`:""} controls ${reduce?"":"autoplay"} muted loop playsinline></video>`
      : `<img src="${esc(it.src)}" alt="${esc(p.name)} example">`;
    $$("#strip button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.i === i));
  };
  showScreen(0);
  $$("#strip button").forEach(b => b.addEventListener("click", () => showScreen(+b.dataset.i)));
  $("#enlarge").addEventListener("click", () => { $$("video", screen).forEach(v => v.pause()); openModal(p, cur, true); });
  const updBuy = () => {
    $("#pdpPrice").textContent = fmt(priceFor(p, lic));
    const url = payUrl(p, lic);
    $("#pdpBuyWrap").innerHTML = url
      ? `<a class="btn btn-ghost" style="width:100%" href="${esc(url)}" target="_blank" rel="noopener">Buy now · ${fmt(priceFor(p,lic))}</a>`
      : `<p class="buy-note">Online checkout is opening soon.</p>`;
  };
  updBuy();
  $$('input[name="lic"]', pdpRoot).forEach(r => r.addEventListener("change", () => { lic = +r.value; updBuy(); updBar(); }));
  $("#pdpAdd").addEventListener("click", () => addToCart(p.id, lic));

  /* share */
  const link = location.href.split("#")[0] + "#" + encodeURIComponent(p.id);
  const msg = `${p.name}: ${p.short}`;
  $("#shWa").href = "https://wa.me/?text=" + encodeURIComponent(msg + " " + link);
  $("#shX").href = "https://x.com/intent/post?text=" + encodeURIComponent(msg) + "&url=" + encodeURIComponent(link);
  $("#shCopy").addEventListener("click", () => {
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast("Link copied"), () => toast(link));
  });

  /* product data for Google */
  let ld = $("#ld-product"); if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.id = "ld-product"; document.head.appendChild(ld); }
  const abs = u => new URL(u, location.href).href;
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description || p.short,
    image: [p.poster, ...(p.gallery||[])].filter(Boolean).map(abs), brand: { "@type": "Brand", name: "vfox" }, sku: p.id,
    offers: { "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: p.price, highPrice: hasPro(p) ? p.pricePro : p.price, offerCount: hasPro(p) ? 2 : 1, availability: "https://schema.org/InStock", url: link }
  });
  const md = $('meta[name="description"]'); if (md) md.setAttribute("content", `${p.name}: ${p.short} From ${fmt(p.price)}.`);

  /* sticky buy bar on phones, shown once the main Add to cart button scrolls away */
  let bar = $("#mbar");
  if (!bar) { bar = document.createElement("div"); bar.id = "mbar"; bar.className = "mbar"; document.body.appendChild(bar); }
  bar.innerHTML = `<span><b>${esc(p.name)}</b><small id="mbarLic"></small></span><button class="btn btn-primary" type="button" id="mbarAdd"></button>`;
  function updBar(){ $("#mbarLic").textContent = `${LIC[lic]} license`; $("#mbarAdd").textContent = `Add · ${fmt(priceFor(p,lic))}`; }
  updBar();
  $("#mbarAdd").onclick = () => addToCart(p.id, lic);
  if (window._mbarIO) window._mbarIO.disconnect();
  window._mbarIO = new IntersectionObserver(es => bar.classList.toggle("show", !es[0].isIntersecting && es[0].boundingClientRect.top < 0));
  window._mbarIO.observe($("#pdpAdd"));
  const rel = $("#related"); if (rel) related.forEach(x => rel.appendChild(card(x)));
  syncAddButtons();
  scrollTo(0, 0);
}
if (pdpRoot) { renderPDP(); addEventListener("hashchange", () => { closeModal(); renderPDP(); }); }

/* ---------- Cart page ---------- */
function renderCartPage(){
  const root = $("#cartPage");
  if (!cart.length) {
    root.innerHTML = `<div style="padding-block:24px 72px">${emptyState("Your cart is empty", `Find something for your next edit in the <a href="shop.html" style="color:var(--violet-hi)">shop</a>.`)}</div>`;
    return;
  }
  const allPay = cart.every(x => payUrl(byId[x.id], x.lic));
  root.innerHTML = `
  <div class="cartpage">
    <div class="citems">
      ${cart.map(({id, lic}) => { const p = byId[id]; return `
      <article class="citem">
        <a href="${productUrl(p)}">${p.poster?`<img src="${esc(p.poster)}" alt="">`:""}</a>
        <div style="min-width:0">
          <span class="eyebrow">${typeName(p.type)}</span>
          <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
          ${hasPro(p) ? `<label class="mono" style="display:block;color:var(--muted)">License
            <select data-lic-for="${esc(id)}" aria-label="License for ${esc(p.name)}">
              <option value="1" ${lic===1?"selected":""}>Standard: under ₹50 lakh/month · ${fmt(p.price)}</option>
              <option value="2" ${lic===2?"selected":""}>Pro: over ₹50 lakh/month · ${fmt(p.pricePro)}</option>
            </select></label>` : `<div class="lic-tag">STANDARD LICENSE</div>`}
        </div>
        <div class="right"><span class="price">${fmt(priceFor(p,lic))}</span><button class="rm" data-rm="${esc(id)}">Remove</button></div>
      </article>`; }).join("")}
    </div>
    <aside class="summary" id="checkout">
      <h2>Order summary</h2>
      <div class="row"><span>Items</span><span>${cart.length}</span></div>
      <div class="row"><span>Delivery</span><span>Digital download</span></div>
      <div class="row total"><span>Total</span><b>${fmt(cartTotal())}</b></div>
      <div id="payArea">
        ${allPay ? `<button class="btn btn-primary" style="width:100%" id="payBtn">Proceed to payment</button>`
          : `<button class="btn btn-primary" style="width:100%" disabled aria-disabled="true">Checkout opening soon</button>
             <p class="notice" style="margin:12px 0 0">Online checkout is opening soon. Your cart is saved on this device, so you can come back to it.</p>`}
      </div>
      <p class="mono" style="margin:0;color:var(--muted)">By buying you agree to the <a href="terms.html" style="color:var(--violet-hi)">Terms</a> and <a href="refund-policy.html" style="color:var(--violet-hi)">Refund policy</a>.</p>
    </aside>
  </div>`;
  $$("[data-lic-for]", root).forEach(s => s.addEventListener("change", () => setLic(s.dataset.licFor, +s.value)));
  const pb = $("#payBtn", root);
  if (pb) pb.addEventListener("click", () => {
    $("#payArea").innerHTML = `<div class="paylist" style="padding:0"><p>${cart.length > 1 ? "Each item has its own secure checkout. Pay for each one:" : "Continue to the secure checkout page:"}</p>
      ${cart.map(({id,lic}) => { const p = byId[id]; return `<a class="btn btn-primary" href="${esc(payUrl(p,lic))}" target="_blank" rel="noopener">Pay ${fmt(priceFor(p,lic))} · ${esc(p.name)} ↗</a>`; }).join("")}</div>`;
  });
}

/* ---------- Header search ---------- */
$$(".search").forEach(box => {
  const input = $("input", box), out = $(".search-results", box);
  const run = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { out.hidden = true; return; }
    const hits = PRODUCTS.filter(p => [p.name, p.short, p.description, ...(p.specs||[]), typeName(p.type)].join(" ").toLowerCase().includes(q)).slice(0, 6);
    out.innerHTML = hits.length ? hits.map(p => `<a href="${productUrl(p)}">${p.poster?`<img src="${esc(p.poster)}" alt="">`:"<span></span>"}<span><b>${esc(p.name)}</b><small>${typeName(p.type)}</small></span><span class="mono">${fmt(p.price)}</span></a>`).join("")
      : `<div class="none">No products match “${esc(input.value.trim())}”.</div>`;
    out.hidden = false;
  };
  input.addEventListener("input", run);
  input.addEventListener("focus", run);
  input.addEventListener("keydown", e => { if (e.key === "Enter") { const a = $("a", out); if (a) location.href = a.getAttribute("href"); } if (e.key === "Escape") { out.hidden = true; input.blur(); } });
  document.addEventListener("click", e => { if (!box.contains(e.target)) out.hidden = true; });
});

/* ---------- Home hero: latest featured product ---------- */
const heroSlot = $("#heroFeature");
if (heroSlot) {
  const p = PRODUCTS.filter(x => x.featured).sort((a,b) => relTime(b)-relTime(a))[0] || PRODUCTS[0];
  if (!p) heroSlot.hidden = true;
  else heroSlot.innerHTML = `
    <a class="hero-feature" href="${productUrl(p)}" style="display:block;text-decoration:none">
      ${isNew(p) ? '<span class="badge">NEW RELEASE</span>' : ""}
      ${p.preview && !reduce ? `<video src="${esc(p.preview)}" ${p.poster?`poster="${esc(p.poster)}"`:""} autoplay muted loop playsinline></video>` : p.poster ? `<img src="${esc(p.poster)}" alt="">` : ""}
      <div class="cap"><span><b>${esc(p.name)}</b><small>${typeName(p.type)}</small></span><span class="price">${fmt(p.price)}</span></div>
    </a>`;
}
/* ---------- Home hero: drifting embers + running timecode ---------- */
const hc = $("#heroFx");
if (hc) {
  const hx = hc.getContext("2d"), V = "139,77,255", Lc = "217,207,251"; let parts = [];
  const size = () => { const dpr = Math.min(devicePixelRatio||1, 2), r = hc.getBoundingClientRect(); hc.width = Math.max(1, Math.round(r.width*dpr)); hc.height = Math.max(1, Math.round(r.height*dpr));
    let seed = 42; const R = () => (seed = (seed*1664525 + 1013904223)>>>0) / 4294967296;
    parts = Array.from({ length: Math.round(hc.width*hc.height/9000) }, () => ({ x:R(), y:R(), s:R()*1.8+.4, v:.02+R()*.05, p:R()*6, c:R()<.7?V:Lc })); };
  const frame = t => { const w = hc.width, h = hc.height, k = devicePixelRatio>1?2:1; hx.clearRect(0,0,w,h);
    const g = hx.createRadialGradient(w*.75,h*.5,0,w*.75,h*.5,w*.55); g.addColorStop(0,`rgba(${V},.22)`); g.addColorStop(1,`rgba(${V},0)`); hx.fillStyle = g; hx.fillRect(0,0,w,h);
    for (const p of parts) { const y = ((p.y - t*p.v)%1+1)%1, x = p.x + Math.sin(t*.5+p.p)*.01; hx.fillStyle = `rgba(${p.c},${.25+.5*Math.abs(Math.sin(t+p.p))})`; hx.fillRect(x*w, y*h, p.s*k, p.s*k); } };
  size(); frame(3);
  let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { size(); frame(3); }, 150); });
  const tcEl = $("#tc"), pad = n => String(n).padStart(2,"0"); let vis = true;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(hc);
  if (!reduce) { const t0 = performance.now(); (function tick(ts){ if (vis) { const t = (ts-t0)/1000; frame(3+t);
    const f = Math.floor(t*29.97); if (tcEl) tcEl.textContent = `00:${pad(Math.floor(f/1798)%60)}:${pad(Math.floor(f/29.97)%60)}:${pad(f%30)}`; }
    requestAnimationFrame(tick); })(t0); }
}

$$("[data-count]").forEach(el => {
  const n = PRODUCTS.filter(p => el.dataset.count==="all" || p.type===el.dataset.count).length;
  el.textContent = n ? n + " " + el.dataset.unit + (n===1?"":"s") : "Coming soon";
});
$$(".cat[data-cat]").forEach(tile => {
  const p = PRODUCTS.find(x => x.type === tile.dataset.cat && x.poster);
  if (p) tile.insertAdjacentHTML("afterbegin", `<img src="${esc(p.poster)}" alt="" aria-hidden="true">`);
  else tile.classList.add("soon");
});

/* ---------- Global clicks & keys ---------- */
document.addEventListener("click", e => {
  const qv = e.target.closest("[data-quick-view]"); if (qv) { e.preventDefault(); openModal(byId[qv.dataset.quickView]); return; }
  const qa = e.target.closest("[data-quick-add]"); if (qa) { const id = qa.dataset.quickAdd; if (inCart(id)) openCart(); else addToCart(id, 1); return; }
  const rm = e.target.closest("[data-rm]"); if (rm) { removeFromCart(rm.dataset.rm); return; }
  if (e.target.closest("[data-cart-open]")) openCart();
});
addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); closeCart(); } });

/* ---------- Menu, newsletter, contact ---------- */
const menuBtn = $("#menuBtn"), links = $(".nav-links");
if (menuBtn) menuBtn.addEventListener("click", () => { const open = links.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", open); });
const NEWS = window.VFOX_NEWSLETTER_URL || "";
const mailto = (subject, body) => `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
$$(".signup").forEach(f => {
  if (NEWS) { const input = $("input", f); if (input) input.remove(); const b = $("button", f); b.type = "button"; b.textContent = "Get notified of new drops"; b.addEventListener("click", () => window.open(NEWS, "_blank", "noopener")); return; }
  f.addEventListener("submit", e => {
    e.preventDefault();
    const em = ($("input", f)?.value || "").trim();
    location.href = mailto("Notify me about new vfox drops", `Please email me at ${em} when new vfox effects are released.`);
    toast("Opening your email app. Send the email to join the list.");
    f.reset();
  });
});
$$("[data-request]").forEach(a => a.setAttribute("href", mailto("Effect request", "Hi vfox,\n\nI'd like an effect that...\n\nWhat I'm making:\nSoftware I use:\n")));
const SOCIAL = window.VFOX_SOCIAL || {};
const socialNames = { instagram: "Instagram", youtube: "YouTube", x: "X" };
$$("[data-social]").forEach(nav => {
  const links = Object.entries(socialNames).filter(([k]) => SOCIAL[k]).map(([k,n]) => `<a href="${esc(SOCIAL[k])}" target="_blank" rel="noopener">${n}</a>`);
  if (links.length) { nav.insertAdjacentHTML("beforeend", links.join("")); nav.hidden = false; }
});
$$("[data-email]").forEach(el => el.textContent = EMAIL);
$$("a[data-email-link]").forEach(a => { a.href = "mailto:" + EMAIL; a.textContent = EMAIL; });
$$("[data-copy-email]").forEach(b => b.addEventListener("click", () => {
  (navigator.clipboard ? navigator.clipboard.writeText(EMAIL) : Promise.reject()).then(() => toast("Email address copied"), () => toast(EMAIL));
}));

renderAllCart();
if ($("#cartPage") && location.hash === "#checkout") setTimeout(() => $("#checkout")?.scrollIntoView({ block:"start" }), 50);
})();
