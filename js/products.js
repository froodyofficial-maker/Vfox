/* =====================================================================
   vfox PRODUCT LIST: the only file you need to edit to add, change or
   remove products. Every page (shop, product pages, cart, search) reads
   from it.

   PRICING: every product has two prices (in rupees):
     price     → Standard license (creators & businesses earning
                 under ₹50 lakh per month)
     pricePro  → Pro license (earning over ₹50 lakh per month)

   HOW TO ADD A PRODUCT
   1. Put preview files in /media (watermark your preview video!):
        media/my-pack-poster.jpg   16:9 still for cards (no watermark needed)
        media/my-pack-preview.mp4  H.264 MP4 preview, watermarked
   2. Copy the TEMPLATE into the PRODUCTS list and fill it in.
   3. Its page is automatically at product.html#my-pack

   TEMPLATE
   {
     id: "my-pack",                 // unique, lowercase, no spaces
     type: "ae",                    // "ae" = After Effects project, "stock" = stock footage
     name: "My Pack",
     short: "One line shown on cards and at the top of the product page.",
     description: "Full explanation. Separate paragraphs with \n\n.",
     price: 239,                    // Standard, ₹
     pricePro: 399,                 // Pro (₹50 lakh+/month), ₹
     released: "2026-11-25",        // newest first in "Newest" sort; shows a NEW badge for 30 days
     specs: ["After Effects", "1920×1080"],           // small tags on cards
     includes: ["What the buyer gets"],               // "What's included" list
     steps: ["Open the project", "Render"],           // "How to use" list
     details: { "Software": "Adobe After Effects" },  // technical details table
     duration: "00:00:04:28",       // timecode shown on the card
     poster: "media/my-pack-poster.jpg",
     preview: "media/my-pack-preview.mp4",
     gallery: ["media/my-pack-example.jpg"],          // extra stills / examples
     buyUrl: "",                    // payment link for the Standard price
     buyUrlPro: "",                 // payment link for the Pro price
     featured: true                 // feature on the home page
   }
   ===================================================================== */

window.VFOX_PRODUCTS = [
  {
    id: "proton-beam",
    type: "ae",
    name: "Proton Beam",
    short: "A fully 3D energy beam you can aim anywhere in your After Effects scene.",
    description: "Proton Beam is an After Effects project that fires a crackling, glowing energy beam between two points in 3D space. Drag the start point onto a prop, a hand or a wand, put the target wherever you want it to hit, and the beam follows.\n\nIt works with your comp's 3D camera, so the beam holds its position as the camera moves. One control layer sets when the beam fires and when it cuts out, how bright it is and how wild the arcs get.\n\nIt's built only with effects that come with After Effects, so there are no plugins to buy.",
    price: 239,
    pricePro: 399,
    released: "2026-11-25",
    specs: ["After Effects", "3D", "1920×1080", "29.97 fps", "No plugins"],
    includes: [
      "proton_beam.aep project file",
      "Start and end points (Wand_Tip_3D, Beam_Target_3D) you can move anywhere in 3D",
      "BEAM_CTRL layer with Fire Time, Cease Time, Intensity and Chaos controls",
      "Follows your comp's active 3D camera",
      "Built-in effects only: Advanced Lightning, Glow, Turbulent Displace, Gaussian Blur"
    ],
    steps: [
      "Open proton_beam.aep in After Effects and drop your footage into the comp.",
      "Move the Wand_Tip_3D null to where the beam should start, such as the tip of a prop.",
      "Move the Beam_Target_3D null to where the beam should hit.",
      "On the BEAM_CTRL layer, set Fire Time and Cease Time, then adjust Intensity and Chaos to taste.",
      "Render."
    ],
    details: {
      "Software": "Adobe After Effects",
      "Format": "After Effects project (.aep)",
      "Resolution": "1920×1080",
      "Frame rate": "29.97 fps",
      "3D": "Yes, works with the comp camera",
      "Plugins required": "None",
      "File size": "1.5 MB"
    },
    duration: "00:00:04:28",
    poster: "media/proton-beam-poster.jpg",
    preview: "media/proton-beam-preview.mp4",
    gallery: ["media/proton-beam-example.jpg"],
    // Payment links: Standard ₹239 goes in buyUrl, Pro ₹399 in buyUrlPro.
    // Leave them empty and the site shows "checkout opening soon".
    buyUrl: "",
    buyUrlPro: "",
    featured: true
  }
];

/* Contact address shown on the Contact, FAQ and policy pages. */
window.VFOX_CONTACT_EMAIL = "froodyofficial@gmail.com";
