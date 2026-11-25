/* =====================================================================
   vfox PRODUCT LIST: the only file you need to edit to add, change or
   remove products. Every page reads from it.

   PRICING: every product has two prices (in rupees):
     price     → Standard license (creators & businesses earning
                 under ₹50 lakh per month)
     pricePro  → Pro license (earning over ₹50 lakh per month)

   HOW TO ADD A PRODUCT
   1. Put preview files in /media (watermark your preview video!):
        media/my-pack-poster.jpg  (16:9 still for the card)
        media/my-pack-preview.mp4 (H.264 MP4 preview)
   2. Copy the TEMPLATE into the PRODUCTS list and fill it in.

   TEMPLATE
   {
     id: "my-pack",                 // unique, lowercase, no spaces (link: after-effects.html#my-pack)
     type: "ae",                    // "ae" = After Effects project, "stock" = stock footage
     name: "My Pack",
     short: "One line shown on the card.",
     description: "Full explanation shown in the enlarged preview.",
     price: 239,                    // Standard, ₹
     pricePro: 399,                 // Pro (₹50 lakh+/month), ₹
     specs: ["After Effects", "1920×1080"],
     includes: ["What the buyer gets", "One bullet per item"],
     duration: "00:00:04:28",       // timecode shown on the card
     poster: "media/my-pack-poster.jpg",
     preview: "media/my-pack-preview.mp4",
     gallery: ["media/my-pack-example.jpg"],  // extra stills / examples
     buyUrl: "https://pages.razorpay.com/...",     // Razorpay Payment Page for the Standard price
     buyUrlPro: "https://pages.razorpay.com/...",  // Razorpay Payment Page for the Pro price
     featured: true                 // show on the home page
   }
   ===================================================================== */

window.VFOX_PRODUCTS = [
  {
    id: "proton-beam",
    type: "ae",
    name: "Proton Beam",
    short: "A fully 3D energy beam you can aim anywhere in your After Effects scene.",
    description: "Proton Beam is an After Effects project that fires a crackling, glowing energy beam between two points in 3D space. Drag the start point onto a prop, a hand or a wand, put the target wherever you want it to hit, and the beam follows. It works with your comp's 3D camera, so it holds its position as the camera moves. One control layer sets when the beam fires and when it cuts out, how bright it is and how wild the arcs get. Built only with effects that come with After Effects, so there are no plugins to buy.",
    price: 239,
    pricePro: 399,
    specs: ["After Effects", "3D", "1920×1080", "29.97 fps", "No plugins"],
    includes: [
      "proton_beam.aep project file",
      "Start and end points (Wand_Tip_3D, Beam_Target_3D) you can move anywhere in 3D",
      "BEAM_CTRL layer with Fire Time, Cease Time, Intensity and Chaos controls",
      "Follows your comp's active 3D camera",
      "Built-in effects only: Advanced Lightning, Glow, Turbulent Displace, Gaussian Blur"
    ],
    duration: "00:00:04:28",
    poster: "media/proton-beam-poster.jpg",
    preview: "media/proton-beam-preview.mp4",
    gallery: ["media/proton-beam-example.jpg"],
    // Razorpay Payment Page links (see "Connecting Razorpay" in README.txt).
    // Paste the Standard ₹239 page link into buyUrl and the Pro ₹399 link into buyUrlPro.
    // Leave them empty and the site shows "payments aren't connected yet".
    buyUrl: "https://rzp.io/rzp/edKub5V",
    buyUrlPro: "https://rzp.io/rzp/edKub5V",   // same page for now; swap in a separate ₹399 page if you make one
    featured: true
  }
];

/* Optional "everything" bundle on the home page. null = hidden.
   Example: { name: "Everything Bundle", blurb: "...", price: 999, pricePro: 1599 } */
window.VFOX_BUNDLE = null;

/* Contact address shown on the FAQ page. */
window.VFOX_CONTACT_EMAIL = "hello@yourdomain.com";
