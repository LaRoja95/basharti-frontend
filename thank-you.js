(function () {
  "use strict";

  function $(sel) { return document.querySelector(sel); }

  function fmtPrice(n) {
    return Number(n || 0).toLocaleString("ar-SA") + " ر.س";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function loadOrder() {
    var params = new URLSearchParams(window.location.search);
    var orderId = (params.get("order") || "").trim();
    var stored = null;
    try {
      var raw = sessionStorage.getItem("basharti:lastOrder");
      if (raw) stored = JSON.parse(raw);
    } catch (e) {}
    if (stored && stored.orderId) {
      if (orderId && stored.orderId !== orderId) {
        stored.orderId = orderId;
      }
      return stored;
    }
    return orderId ? { orderId: orderId } : null;
  }

  function pixelId() {
    return ((window.BASHARTI_CONFIG && window.BASHARTI_CONFIG.META_PIXEL_ID) || "").trim();
  }

  function purchaseDedupeKey(orderId) {
    return "fb_purchase_confirmed_v2_" + orderId;
  }

  function isPurchaseConfirmed(orderId) {
    try {
      return sessionStorage.getItem(purchaseDedupeKey(orderId)) === "1";
    } catch (e) {
      return false;
    }
  }

  function markPurchaseConfirmed(orderId) {
    try {
      sessionStorage.setItem(purchaseDedupeKey(orderId), "1");
    } catch (e) {}
  }

  function fbqReady() {
    return typeof window.fbq === "function" && !!window.fbq.callMethod;
  }

  function buildPurchasePayload(order, total) {
    var contentIds = (order.items || []).map(function (item) {
      return item.id || item.productId || "";
    }).filter(Boolean);
    var contents = (order.items || []).map(function (item) {
      return {
        id: item.id || item.productId || "",
        quantity: item.quantity || 1,
      };
    }).filter(function (entry) { return !!entry.id; });

    return {
      value: total != null ? Number(total) : 0,
      currency: "SAR",
      content_ids: contentIds,
      content_type: "product",
      contents: contents,
      order_id: order.orderId,
    };
  }

  function sendPurchaseBeacon(purchaseData) {
    var id = pixelId();
    if (!id) return;
    var params = [
      "id=" + encodeURIComponent(id),
      "ev=Purchase",
      "noscript=1",
      "cd[value]=" + encodeURIComponent(String(purchaseData.value || 0)),
      "cd[currency]=" + encodeURIComponent(purchaseData.currency || "SAR"),
      "cd[order_id]=" + encodeURIComponent(purchaseData.order_id || ""),
    ];
    if (purchaseData.content_ids && purchaseData.content_ids.length) {
      params.push("cd[content_ids]=" + encodeURIComponent(JSON.stringify(purchaseData.content_ids)));
    }
    var img = new Image(1, 1);
    img.style.display = "none";
    img.alt = "";
    img.src = "https://www.facebook.com/tr?" + params.join("&");
  }

  function trackPurchaseEvent(order, total) {
    if (!order || !order.orderId || isPurchaseConfirmed(order.orderId)) return;

    var purchaseData = buildPurchasePayload(order, total);
    var attempts = 0;
    var maxAttempts = 30;

    function trySend() {
      if (isPurchaseConfirmed(order.orderId)) return;
      attempts += 1;

      if (typeof window.fbq === "function") {
        window.fbq("track", "Purchase", purchaseData, { eventID: order.orderId });
      }

      if (fbqReady()) {
        markPurchaseConfirmed(order.orderId);
        return;
      }

      if (attempts >= maxAttempts) {
        sendPurchaseBeacon(purchaseData);
        markPurchaseConfirmed(order.orderId);
        return;
      }

      setTimeout(trySend, 200);
    }

    trySend();
  }

  function formatItems(items) {
    if (!items || !items.length) return "طلبك من بشرتي";
    return items.map(function (item) {
      var name = item.name || item.productName || "منتج";
      var qty = item.quantity || 1;
      return escapeHtml(name) + " × " + qty;
    }).join("<br />");
  }

  function render(order) {
    var page = $("#thankYouPage");
    if (!page) return;

    if (!order || !order.orderId) {
      page.innerHTML = (
        '<div class="container ty-container">' +
          '<div class="ty-card ty-card--empty">' +
            '<div class="ty-success-ring ty-success-ring--muted"><span>?</span></div>' +
            "<h1>لم نجد تفاصيل الطلب</h1>" +
            '<p class="ty-lead">إذا أكملتِ الطلب للتو، ربما انتهت الجلسة. تحققي من رسائل الجوال — سنتصل بك قريباً.</p>' +
            '<a href="index.html" class="btn btn-primary ty-cta-main">العودة للمتجر</a>' +
          "</div>" +
        "</div>"
      );
      return;
    }

    var firstName = (order.name || "").trim().split(/\s+/)[0] || "عزيزتي";
    var total = order.total != null ? order.total : order.subtotal;
    var itemsHtml = formatItems(order.items);

    page.innerHTML = (
      '<div class="container ty-container">' +
        '<div class="ty-hero">' +
          '<div class="ty-success-ring" aria-hidden="true"><span>✓</span></div>' +
          "<h1>شكراً لكِ، " + escapeHtml(firstName) + "!</h1>" +
          '<p class="ty-lead">تم استلام طلبك بنجاح — فريق <strong>بشرتي</strong> يتولى الباقي.</p>' +
        "</div>" +

        '<div class="ty-grid">' +
          '<div class="ty-card ty-card--order">' +
            '<span class="ty-label">رقم الطلب</span>' +
            '<div class="ty-order-id-row">' +
              '<code class="ty-order-id" id="tyOrderId">' + escapeHtml(order.orderId) + "</code>" +
              '<button type="button" class="ty-copy-btn" id="tyCopyBtn" aria-label="نسخ رقم الطلب">نسخ</button>' +
            "</div>" +
            '<p class="ty-hint">احفظي هذا الرقم للمتابعة مع فريقنا</p>' +
          "</div>" +

          '<div class="ty-card ty-card--summary">' +
            "<h2>ملخص الطلب</h2>" +
            '<div class="ty-summary-line">' +
              "<span>المنتجات</span>" +
              '<span class="ty-summary-items">' + itemsHtml + "</span>" +
            "</div>" +
            (order.regionName
              ? '<div class="ty-summary-line"><span>المنطقة</span><span>' + escapeHtml(order.regionName) + "</span></div>"
              : "") +
            '<div class="ty-summary-line ty-summary-total">' +
              "<span>الإجمالي</span>" +
              "<strong>" + fmtPrice(total) + "</strong>" +
            "</div>" +
            '<div class="ty-free-badge">🚚 توصيل مجاني</div>' +
          "</div>" +
        "</div>" +

        '<div class="ty-steps">' +
          "<h2>ماذا يحدث الآن؟</h2>" +
          '<ol class="ty-timeline">' +
            '<li class="ty-step ty-step--done">' +
              '<span class="ty-step-icon">✓</span>' +
              "<div><strong>تم استلام طلبك</strong><p>سجّلنا بياناتك في نظامنا</p></div>" +
            "</li>" +
            '<li class="ty-step ty-step--active">' +
              '<span class="ty-step-icon">📞</span>' +
              "<div><strong>اتصال للتأكيد</strong><p>نتصل بك خلال 24 ساعة على رقم الجوال</p></div>" +
            "</li>" +
            '<li class="ty-step">' +
              '<span class="ty-step-icon">📦</span>' +
              "<div><strong>التوصيل والدفع</strong><p>نوصل لبابك — افحصي المنتج ثم ادفعي عند الاستلام</p></div>" +
            "</li>" +
          "</ol>" +
        "</div>" +

        '<div class="ty-trust">' +
          '<div class="ty-trust-item"><span>💵</span><strong>دفع عند الاستلام</strong></div>' +
          '<div class="ty-trust-item"><span>🚚</span><strong>توصيل مجاني</strong></div>' +
          '<div class="ty-trust-item"><span>✨</span><strong>منتجات أصلية</strong></div>' +
          '<div class="ty-trust-item"><span>🛡️</span><strong>افحصي قبل الدفع</strong></div>' +
        "</div>" +

        '<div class="ty-actions">' +
          '<a href="index.html" class="btn btn-primary ty-cta-main">متابعة التسوق</a>' +
          '<a href="product.html?id=scar-gel-tcm" class="btn btn-outline ty-cta-secondary">طلب منتج آخر</a>' +
        "</div>" +

        '<p class="ty-footer-note">💗 شكراً لثقتك في <strong>بشرتي</strong> — نسعد بخدمتك دائماً</p>' +
      "</div>"
    );

    var copyBtn = $("#tyCopyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var id = order.orderId;
        var done = function () {
          copyBtn.textContent = "تم النسخ ✓";
          setTimeout(function () { copyBtn.textContent = "نسخ"; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(id).then(done).catch(function () {
            window.prompt("انسخي رقم الطلب:", id);
          });
        } else {
          window.prompt("انسخي رقم الطلب:", id);
          done();
        }
      });
    }

    trackPurchaseEvent(order, total);
  }

  render(loadOrder());
})();
