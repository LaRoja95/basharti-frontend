(function () {
  "use strict";

  var CONFIG = window.BASHARTI_CONFIG || {};
  var API_BASE = (CONFIG.API_BASE || "").replace(/\/$/, "");
  var TRACK = window.BashartiTracking || {};
  var PRODUCT_ID = new URLSearchParams(window.location.search).get("id") || "scar-gel-tcm";

  var FALLBACK_PRODUCTS = {
    "scar-gel-tcm": {
      id: "scar-gel-tcm",
      name: "جل مرهم لإزالة آثار الندبات وحب الشباب",
      description: "تركيبة TCM بسنتيلا آسياتيكا ونياسيناميد — 30 جرام.",
      price: 199,
      image: "assets/products/scar-gel/hero-product.png?v=3",
    },
    "niacinamide-txa-serum": {
      id: "niacinamide-txa-serum",
      name: "سيروم TXA + نياسيناميد 15% لتفتيح البقع",
      description: "سيروم مركز — TXA + نياسيناميد 15% + أربوتين — 30 مل.",
      price: 189,
      image: "assets/products/niacinamide-serum/hero-product.png?v=1",
    },
    "spf50-centella-sunscreen": {
      id: "spf50-centella-sunscreen",
      name: "واقي شمس SPF 50+ بسنتيلا آسياتيكا",
      description: "حماية يومية SPF 50+ — 50 مل.",
      price: 189,
      image: "assets/products/spf50-sunscreen/hero-product.png?v=1",
    },
    "ceramide-barrier-cream": {
      id: "ceramide-barrier-cream",
      name: "كريم حاجز البشرة — سيراميد + هيالورون",
      description: "ترطيب وتقوية حاجز البشرة — 50 جم.",
      price: 189,
      image: "assets/products/ceramide-cream/hero-product.png?v=1",
    },
    "arbutin-txa-cream": {
      id: "arbutin-txa-cream",
      name: "كريم يومي أربوتين 7% + TXA 4%",
      description: "ترطيب + توحيد اللون — 50 مل.",
      price: 189,
      image: "assets/products/arbutin-cream/hero-product.png?v=1",
    },
    "hair-regrowth-spray": {
      id: "hair-regrowth-spray",
      name: "بخاخ دعم نمو الشعر",
      description: "تركيبة عشبية لفروة الرأس — 50 مل.",
      price: 199,
      image: "assets/products/hair-spray/hero-product.png?v=1",
    },
  };

  function getProfile(productId) {
    var profiles = CONFIG.PRODUCT_PROFILES || {};
    return profiles[productId] || profiles["scar-gel-tcm"] || {};
  }

  function getProductMeta(productId) {
    var meta = (CONFIG.PRODUCT_META || {})[productId] || {};
    return {
      gradient: meta.gradient || "linear-gradient(135deg, #fce4ec, #e8a0ac)",
    };
  }

  function getHeroImage(p) {
    var meta = (CONFIG.PRODUCT_META || {})[p.id];
    return (meta && meta.image) || p.image || "assets/products/placeholder.svg";
  }

  var FALLBACK_REGIONS = [
    { id: "riyadh", name: "الرياض", shippingCost: 0 },
    { id: "makkah", name: "مكة المكرمة", shippingCost: 0 },
    { id: "madinah", name: "المدينة المنورة", shippingCost: 0 },
    { id: "eastern", name: "المنطقة الشرقية", shippingCost: 0 },
    { id: "qassim", name: "القصيم", shippingCost: 0 },
    { id: "asir", name: "عسير", shippingCost: 0 },
    { id: "tabuk", name: "تبوك", shippingCost: 0 },
    { id: "hail", name: "حائل", shippingCost: 0 },
    { id: "northern_borders", name: "الحدود الشمالية", shippingCost: 0 },
    { id: "jazan", name: "جازان", shippingCost: 0 },
    { id: "najran", name: "نجران", shippingCost: 0 },
    { id: "bahah", name: "الباحة", shippingCost: 0 },
    { id: "jouf", name: "الجوف", shippingCost: 0 },
  ];

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

  var state = {
    product: null,
    regions: {},
    qty: 1,
  };

  function $(sel) { return document.querySelector(sel); }

  function fmtPrice(n) { return n.toLocaleString("ar-SA") + " ر.س"; }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function apiUrl(path) { return API_BASE + path; }

  function newEventId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "ev-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function selectedRegion() {
    var select = $("#pdRegionSelect");
    return select ? state.regions[select.value] : null;
  }

  function orderTotal() {
    var p = state.product;
    if (!p) return 0;
    return p.price * state.qty;
  }

  function updateOrderSummary() {
    var p = state.product;
    if (!p) return;
    var subtotal = p.price * state.qty;
    var subtotalEl = $("#pdSummarySubtotal");
    var totalEl = $("#pdOrderTotal");
    if (subtotalEl) subtotalEl.textContent = fmtPrice(subtotal);
    if (totalEl) totalEl.textContent = fmtPrice(subtotal);
    var submitBtn = $("#pdOrderSubmit");
    if (submitBtn) {
      submitBtn.innerHTML = 'اطلب الآن — <span>' + fmtPrice(subtotal) + "</span>";
    }
  }

  function fillRegions(regions) {
    state.regions = {};
    regions.forEach(function (r) { state.regions[r.id] = r; });
    var select = $("#pdRegionSelect");
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>اختر منطقتك</option>';
    regions.forEach(function (r) {
      var opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name;
      select.appendChild(opt);
    });
    updateOrderSummary();
  }

  function loadRegions() {
    fetch(apiUrl("/api/regions"))
      .then(function (res) { if (!res.ok) throw new Error("bad status"); return res.json(); })
      .then(fillRegions)
      .catch(function () { fillRegions(FALLBACK_REGIONS); });
  }

  function scrollToOrder() {
    var box = $("#pdOrder");
    if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
    var nameInput = $("#pdOrderForm input[name=name]");
    if (nameInput) setTimeout(function () { nameInput.focus(); }, 400);
  }

  function goToThankYou(prepared, details) {
    try {
      sessionStorage.setItem("basharti:lastOrder", JSON.stringify({
        orderId: prepared.orderId,
        total: prepared.total,
        subtotal: prepared.subtotal,
        shipping: prepared.shipping || 0,
        regionName: prepared.regionName || details.regionName || "",
        name: details.name || "",
        items: details.items || [],
      }));
    } catch (e) {}
    window.location.href = "thank-you.html?order=" + encodeURIComponent(prepared.orderId);
  }

  function trackViewContent(p) {
    if (!TRACK.track) return;
    TRACK.track("ViewContent", {
      content_id: p.id,
      content_name: p.name,
      currency: "SAR",
      value: p.price,
    }, {
      productIds: [p.id],
      value: p.price,
      currency: "SAR",
    });
  }

  function submitOrder(evt) {
    evt.preventDefault();
    var form = evt.target;
    var errorEl = $("#pdOrderError");
    var submitBtn = $("#pdOrderSubmit");
    var p = state.product;
    if (!p) return;

    errorEl.hidden = true;

    var regionId = form.regionId.value;
    var region = state.regions[regionId];
    if (!regionId || !region) {
      errorEl.textContent = "الرجاء اختيار المنطقة";
      errorEl.hidden = false;
      return;
    }

    var payload = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      regionId: regionId,
      city: region.name,
      address: form.address.value.trim(),
      items: [{ productId: p.id, quantity: state.qty }],
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "جاري إرسال الطلب...";

    if (TRACK.track) {
      TRACK.track("InitiateCheckout", {
        content_id: p.id,
        content_name: p.name,
        currency: "SAR",
        value: p.price * state.qty,
        content_ids: [p.id],
      }, {
        productIds: [p.id],
        value: p.price * state.qty,
        currency: "SAR",
      });
    }

    fetch(apiUrl("/api/orders/prepare"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.detail || "تعذر إرسال الطلب"); });
        return res.json();
      })
      .then(function (prepared) {
        var completeEventId = newEventId();
        var meta = (TRACK.metaCookies && TRACK.metaCookies()) || { fbp: "", fbc: "" };
        return fetch(apiUrl("/api/orders/complete"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: prepared.orderId,
            eventId: completeEventId,
            fbp: meta.fbp,
            fbc: meta.fbc,
            eventSourceUrl: window.location.href,
          }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error("تعذر تأكيد الطلب");
            if (TRACK.trackBrowserOnly) {
              TRACK.trackBrowserOnly("CompletePayment", {
                currency: "SAR",
                value: prepared.total,
                content_ids: [p.id],
                order_id: prepared.orderId,
              }, completeEventId);
            }
            return prepared;
          });
      })
      .then(function (prepared) {
        var p = state.product;
        goToThankYou(prepared, {
          name: form.name.value.trim(),
          regionName: region.name,
          items: [{
            id: p ? p.id : "",
            productId: p ? p.id : "",
            name: p ? p.name : "منتج",
            quantity: state.qty,
            price: p ? p.price : 0,
          }],
        });
      })
      .catch(function (err) {
        errorEl.textContent = err.message || "حدث خطأ، حاول مرة أخرى.";
        errorEl.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
        updateOrderSummary();
      });
  }

  function renderProduct(p) {
    state.product = p;
    var page = $("#productPage");
    var profile = getProfile(p.id);
    var heroImg = getHeroImage(p);
    var heroGradient = getProductMeta(p.id).gradient;

    var highlightsSection = profile.highlights && profile.highlights.length
      ? ('<section class="pd-highlights"><div class="container"><h2 class="section-title">لماذا هذا المنتج؟</h2><div class="pd-highlight-grid">' +
          profile.highlights.map(function (h) {
            return '<div class="pd-highlight"><span>' + h.icon + '</span><strong>' + escapeHtml(h.title) +
              '</strong><p>' + escapeHtml(h.text) + '</p></div>';
          }).join("") + '</div></div></section>')
      : "";

    var gallery = profile.gallery
      ? INFOGRAPHICS.map(function (img, i) {
          return (
            '<figure class="pd-info-card">' +
              '<img src="' + img.src + '" alt="' + escapeHtml(img.alt) + '" loading="' + (i < 2 ? "eager" : "lazy") + '" />' +
            '</figure>'
          );
        }).join("")
      : "";

    var gallerySection = profile.gallery && gallery
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

    var specsList = (profile.specs || []).map(function (row) {
      return '<li><strong>' + escapeHtml(row[0]) + ':</strong> ' + escapeHtml(row[1]) + '</li>';
    }).join("");

    var specsSection = specsList
      ? ('<section class="pd-specs-text">' +
          '<div class="container">' +
            '<div class="pd-specs-card">' +
              '<h3>مواصفات سريعة</h3>' +
              '<ul>' + specsList + '</ul>' +
            '</div>' +
          '</div>' +
        '</section>')
      : "";

    var pills = (profile.pills || ["💵 الدفع عند الاستلام", "🚚 توصيل مجاني"]).map(function (pill) {
      return '<li>' + escapeHtml(pill) + '</li>';
    }).join("");

    page.innerHTML = (
      '<section class="pd-hero-section">' +
        '<div class="container pd-hero-grid">' +
          '<div class="pd-hero-media">' +
            '<div class="pd-hero-frame" style="background:' + heroGradient + '">' +
              '<img src="' + heroImg + '" alt="' + escapeHtml(p.name) + '" class="pd-hero-img pd-hero-img--photo' +
                (heroImg.indexOf(".svg") !== -1 ? " pd-hero-img--svg" : "") + '" />' +
            '</div>' +
          '</div>' +
          '<div class="pd-hero-copy">' +
            '<span class="section-badge">' + escapeHtml(profile.badge || "✨ بشرتي") + '</span>' +
            '<h1>' + escapeHtml(p.name) + '</h1>' +
            '<p class="pd-lead">' + escapeHtml(p.description) + '</p>' +
            '<div class="pd-price-row">' +
              '<strong class="pd-price">' + fmtPrice(p.price) + '</strong>' +
              '<span class="pd-weight">' + escapeHtml(profile.weight || "COD") + '</span>' +
            '</div>' +
            '<ul class="pd-pills">' + pills + '</ul>' +
            '<div class="pd-order-box" id="pdOrder">' +
              '<h2 class="pd-order-title">اطلب الآن</h2>' +
              '<p class="pd-order-sub">املأ بياناتك وسنتصل بك لتأكيد التوصيل</p>' +
              '<form id="pdOrderForm" class="pd-order-form">' +
                '<label class="pd-field">' +
                  '<span class="pd-field-label">الاسم الكامل</span>' +
                  '<input type="text" name="name" required minlength="2" maxlength="80" placeholder="مثال: فاطمة أحمد" autocomplete="name" />' +
                '</label>' +
                '<label class="pd-field">' +
                  '<span class="pd-field-label">رقم الجوال</span>' +
                  '<input type="tel" name="phone" required placeholder="05xxxxxxxx" inputmode="numeric" autocomplete="tel" />' +
                '</label>' +
                '<label class="pd-field">' +
                  '<span class="pd-field-label">المنطقة</span>' +
                  '<select name="regionId" id="pdRegionSelect" required>' +
                    '<option value="" disabled selected>اختر منطقتك</option>' +
                  '</select>' +
                '</label>' +
                '<label class="pd-field">' +
                  '<span class="pd-field-label">العنوان</span>' +
                  '<textarea name="address" required minlength="5" maxlength="240" rows="3" placeholder="المدينة، الحي، الشارع، رقم المنزل"></textarea>' +
                '</label>' +
                '<div class="pd-qty-row pd-qty-row--form">' +
                  '<span class="pd-qty-label">الكمية</span>' +
                  '<button type="button" class="pd-qty-btn" data-action="dec" aria-label="تقليل">−</button>' +
                  '<span id="pdQty">1</span>' +
                  '<button type="button" class="pd-qty-btn" data-action="inc" aria-label="زيادة">+</button>' +
                '</div>' +
                '<div class="pd-order-summary">' +
                  '<div class="summary-row"><span>المنتج</span><span id="pdSummarySubtotal">' + fmtPrice(p.price) + '</span></div>' +
                  '<div class="summary-row summary-free-ship"><span>التوصيل</span><span>مجاني 🚚</span></div>' +
                  '<div class="summary-row summary-total"><span>الإجمالي</span><span id="pdOrderTotal">' + fmtPrice(p.price) + '</span></div>' +
                '</div>' +
                '<div class="cod-note">💵 الدفع عند الاستلام — لا حاجة لبطاقة بنكية</div>' +
                '<p class="form-error" id="pdOrderError" hidden></p>' +
                '<button type="submit" class="btn btn-primary btn-block pd-order-submit" id="pdOrderSubmit">اطلب الآن — <span>' + fmtPrice(p.price) + '</span></button>' +
              '</form>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      highlightsSection +
      gallerySection +
      specsSection +
      '<section class="pd-bottom-cta">' +
        '<div class="container pd-bottom-cta-inner">' +
          '<h2>جاهز للطلب؟</h2>' +
          '<p>اطلب الآن وادفع عند الاستلام بعد ما تتأكد من المنتج.</p>' +
          '<button type="button" class="btn btn-light pd-scroll-order">اطلب الآن</button>' +
        '</div>' +
      '</section>'
    );

    document.title = p.name + " | بشرتي";
    $("#stickyPrice").textContent = fmtPrice(p.price);
    $("#stickyBar").hidden = false;

    loadRegions();

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.getAttribute("data-action") === "inc") {
        state.qty = Math.min(10, state.qty + 1);
        $("#pdQty").textContent = state.qty;
        updateOrderSummary();
      }
      if (btn.getAttribute("data-action") === "dec") {
        state.qty = Math.max(1, state.qty - 1);
        $("#pdQty").textContent = state.qty;
        updateOrderSummary();
      }
    });

    $("#pdOrderForm").addEventListener("submit", submitOrder);
    $("#pdRegionSelect").addEventListener("change", updateOrderSummary);
    $("#stickyAddBtn").addEventListener("click", scrollToOrder);
    document.querySelector(".pd-scroll-order").addEventListener("click", scrollToOrder);

    trackViewContent(p);
  }

  fetch(apiUrl("/api/products/" + encodeURIComponent(PRODUCT_ID)))
    .then(function (res) {
      if (!res.ok) throw new Error("not found");
      return res.json();
    })
    .then(function (p) { renderProduct(Object.assign({ id: PRODUCT_ID }, p)); })
    .catch(function () {
      renderProduct(FALLBACK_PRODUCTS[PRODUCT_ID] || FALLBACK_PRODUCTS["scar-gel-tcm"]);
    });
})();
