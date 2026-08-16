(function () {
  "use strict";

  var CONFIG = window.BASHARTI_CONFIG || {};
  var API_BASE = (CONFIG.API_BASE || "").replace(/\/$/, "");
  var CART_KEY = "basharti_cart_v1";
  var PRODUCT_ID = new URLSearchParams(window.location.search).get("id") || "scar-gel-tcm";

  var INFOGRAPHICS = [
    { src: "assets/products/scar-gel/v01-hero.png", alt: "تعزيز تجديد البشرة وتحسين مظهر الندبات" },
    { src: "assets/products/scar-gel/v05-problems.png", alt: "هل تشعرين بالضيق بسبب هذه المشاكل؟" },
    { src: "assets/products/scar-gel/v02-scar-types.png", alt: "أنواع الندبات التي يستهدفها المنتج" },
    { src: "assets/products/scar-gel/v03-benefits.png", alt: "يوازن لون البشرة وينعّم الملمس" },
    { src: "assets/products/scar-gel/v09-promo.png", alt: "حماية وترميم وإزالة تصبغات" },
    { src: "assets/products/scar-gel/v06-features.png", alt: "مزايا جل إزالة الندبات" },
    { src: "assets/products/scar-gel/v08-ingredients.png", alt: "تركيبة لطيفة — نياسيناميد وأربيوتين وهيالورونات" },
    { src: "assets/products/scar-gel/v04-texture.png", alt: "قوام شفاف غير دهني — امتصاص سريع" },
    { src: "assets/products/scar-gel/v07-specs.png", alt: "مواصفات المنتج — 30 جرام" },
  ];

  function $(sel) { return document.querySelector(sel); }

  function fmtPrice(n) { return n.toLocaleString("ar-SA") + " ر.س"; }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; }
  }

  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  }

  function addToCart(product, qty) {
    var cart = loadCart();
    var existing = cart.find(function (i) { return i.productId === product.id; });
    if (existing) existing.quantity = Math.min(10, existing.quantity + qty);
    else cart.push({ productId: product.id, quantity: qty });
    saveCart(cart);
    sessionStorage.setItem("basharti:openCart", "1");
    window.location.href = "index.html";
  }

  function renderProduct(p) {
    var page = $("#productPage");
    var isScarGel = p.id === "scar-gel-tcm" || PRODUCT_ID === "scar-gel-tcm";
    var gallery = isScarGel
      ? INFOGRAPHICS.map(function (img, i) {
          return (
            '<figure class="pd-info-card">' +
              '<img src="' + img.src + '" alt="' + escapeHtml(img.alt) + '" loading="' + (i < 2 ? "eager" : "lazy") + '" />' +
            '</figure>'
          );
        }).join("")
      : "";

    var heroImg = isScarGel
      ? "assets/products/scar-gel/hero-product.png?v=2"
      : (p.image || "assets/products/placeholder.svg");

    var highlightsSection = isScarGel
      ? ('<section class="pd-highlights">' +
          '<div class="container">' +
            '<h2 class="section-title">لماذا هذا المنتج؟</h2>' +
            '<div class="pd-highlight-grid">' +
              '<div class="pd-highlight"><span>🛡️</span><strong>حماية</strong><p>يساعد على تقليل ظهور الندبات بعد الجروح والعمليات</p></div>' +
              '<div class="pd-highlight"><span>✨</span><strong>توحيد اللون</strong><p>نياسيناميد وأربيوتين لدعم مظهر أكثر توازناً</p></div>' +
              '<div class="pd-highlight"><span>💧</span><strong>ترطيب</strong><p>هيالورونات الصوديوم لترطيب دون دهون</p></div>' +
              '<div class="pd-highlight"><span>🌿</span><strong>لطيف</strong><p>قوام شفاف سريع الامتصاص — لجميع أنواع البشرة</p></div>' +
            '</div>' +
          '</div>' +
        '</section>')
      : "";

    var gallerySection = isScarGel
      ? ('<section class="pd-gallery">' +
          '<div class="container">' +
            '<div class="section-head">' +
              '<span class="section-badge">📋 تفاصيل المنتج</span>' +
              '<h2 class="section-title">كل ما تحتاجين معرفته</h2>' +
            '</div>' +
            '<div class="pd-info-grid">' + gallery + '</div>' +
          '</div>' +
        '</section>')
      : "";

    var specsSection = isScarGel
      ? ('<section class="pd-specs-text">' +
          '<div class="container">' +
            '<div class="pd-specs-card">' +
              '<h3>مواصفات سريعة</h3>' +
              '<ul>' +
                '<li><strong>الوزن الصافي:</strong> 30 جرام</li>' +
                '<li><strong>النوع:</strong> gel / مرهم شفاف</li>' +
                '<li><strong>الاستخدام:</strong> يومي — للبالغين</li>' +
                '<li><strong>أنواع البشرة:</strong> جميع الأنواع</li>' +
                '<li><strong>المكونات البارزة:</strong> سنتيلا آسياتيكا، نياسيناميد، أربيوتين، هيالورونات الصوديوم</li>' +
                '<li><strong>الشحن:</strong> داخل المملكة — الدفع عند الاستلام</li>' +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</section>')
      : "";

    page.innerHTML = (
      '<section class="pd-hero-section">' +
        '<div class="container pd-hero-grid">' +
          '<div class="pd-hero-media">' +
            '<img src="' + heroImg + '" alt="' + escapeHtml(p.name) + '" class="pd-hero-img" />' +
          '</div>' +
          '<div class="pd-hero-copy">' +
            '<span class="section-badge">✨ الأكثر طلباً</span>' +
            '<h1>' + escapeHtml(p.name) + '</h1>' +
            '<p class="pd-lead">' + escapeHtml(p.description) + '</p>' +
            '<div class="pd-price-row">' +
              '<strong class="pd-price">' + fmtPrice(p.price) + '</strong>' +
              (isScarGel ? '<span class="pd-weight">30 جرام · COD</span>' : '<span class="pd-weight">COD</span>') +
            '</div>' +
            '<ul class="pd-pills">' +
              '<li>💵 الدفع عند الاستلام</li>' +
              '<li>📦 افحصي المنتج قبل الدفع</li>' +
              '<li>🚚 توصيل داخل المملكة</li>' +
              (isScarGel ? '<li>🌿 تركيبة TCM لطيفة</li>' : '') +
            '</ul>' +
            '<div class="pd-qty-row">' +
              '<button type="button" class="pd-qty-btn" data-action="dec">−</button>' +
              '<span id="pdQty">1</span>' +
              '<button type="button" class="pd-qty-btn" data-action="inc">+</button>' +
            '</div>' +
            '<button class="btn btn-primary btn-block pd-add-btn" id="addToCartBtn">أضف إلى السلة — ' + fmtPrice(p.price) + '</button>' +
            '<p class="pd-note muted">سنتواصل معك بعد الطلب لتأكيد التوصيل. الدفع عند الاستلام فقط.</p>' +
          '</div>' +
        '</div>' +
      '</section>' +
      highlightsSection +
      gallerySection +
      specsSection +
      '<section class="pd-bottom-cta">' +
        '<div class="container pd-bottom-cta-inner">' +
          '<h2>جاهزة للطلب؟</h2>' +
          '<p>اطلبي الآن وادفعي عند الاستلام بعد ما تتأكدي من المنتج.</p>' +
          '<button class="btn btn-primary pd-add-btn-bottom">أضف للسلة — ' + fmtPrice(p.price) + '</button>' +
        '</div>' +
      '</section>'
    );

    $("#stickyPrice").textContent = fmtPrice(p.price);
    $("#stickyBar").hidden = false;

    var qty = 1;
    function getQty() { return qty; }
    function setQty(n) { qty = Math.max(1, Math.min(10, n)); $("#pdQty").textContent = qty; }

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.getAttribute("data-action") === "inc") setQty(getQty() + 1);
      if (btn.getAttribute("data-action") === "dec") setQty(getQty() - 1);
    });

    function handleAdd() { addToCart(p, getQty()); }

    $("#addToCartBtn").addEventListener("click", handleAdd);
    $("#stickyAddBtn").addEventListener("click", handleAdd);
    document.querySelector(".pd-add-btn-bottom").addEventListener("click", handleAdd);
    $("#goCartBtn").addEventListener("click", function () {
      sessionStorage.setItem("basharti:openCart", "1");
      window.location.href = "index.html";
    });
  }

  function apiUrl(path) { return API_BASE + path; }

  fetch(apiUrl("/api/products/" + encodeURIComponent(PRODUCT_ID)))
    .then(function (res) {
      if (!res.ok) throw new Error("not found");
      return res.json();
    })
    .then(renderProduct)
    .catch(function () {
      renderProduct({
        id: PRODUCT_ID,
        name: "جل مرهم لإزالة آثار الندبات وحب الشباب",
        description: "تركيبة TCM بسنتيلا آسياتيكا ونياسيناميد — لتلطيف مظهر الندبات وآثار حب الشباب وتوحيد لون البشرة.",
        price: 199,
      });
    });
})();
