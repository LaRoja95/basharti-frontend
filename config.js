// Basharti (بشرتي) storefront config
window.BASHARTI_CONFIG = {
  // Empty = same-origin /api/ (proxied by nginx) — works on bacharati.store
  API_BASE: "",
  STORE_URL: "https://bacharati.store",
  TIKTOK_PIXEL_ID: "",

  PRODUCT_META: {
    "scar-gel-tcm":    { emoji: "✨", category: "عناية بالبشرة", gradient: "linear-gradient(135deg, #fff8e1, #d4a574)", image: "assets/products/scar-gel/hero-product.png?v=2" },
    "serum-vitc":      { emoji: "🍊", category: "سيروم", gradient: "linear-gradient(135deg, #fff3e0, #ffcc80)" },
    "cream-hydra":     { emoji: "🧴", category: "ترطيب", gradient: "linear-gradient(135deg, #e0f2f1, #7eb8b0)" },
    "sunscreen-spf50": { emoji: "☀️", category: "حماية", gradient: "linear-gradient(135deg, #fff8e1, #d4a574)" },
    "cleanser-gentle": { emoji: "🫧", category: "تنظيف", gradient: "linear-gradient(135deg, #f3e5f5, #d1717f)" },
  },
};
