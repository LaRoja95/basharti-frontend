/* Basharti — unified Meta + TikTok + Snapchat pixel tracking (client-side).
 * Configure IDs in config.js. Server-side TikTok + Meta CAPI relay via /api/e and /api/orders/complete.
 */
(function () {
  "use strict";

  var CONFIG = window.BASHARTI_CONFIG || {};
  var TIKTOK_ID = (CONFIG.TIKTOK_PIXEL_ID || "").trim();
  var META_ID = (CONFIG.META_PIXEL_ID || "").trim();
  var SNAP_ID = (CONFIG.SNAPCHAT_PIXEL_ID || "").trim();

  function newEventId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "ev-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function initTikTok() {
    if (!TIKTOK_ID) return;
    (function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
      ttq.setAndDefer = function (obj, method) {
        obj[method] = function () { obj.push([method].concat(Array.prototype.slice.call(arguments, 0))); };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (id) {
        var inst = ttq._i[id] || [];
        for (var j = 0; j < ttq.methods.length; j++) ttq.setAndDefer(inst, ttq.methods[j]);
        return inst;
      };
      ttq.load = function (id, opts) {
        var src = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[id] = [];
        ttq._i[id]._u = src;
        ttq._t = ttq._t || {};
        ttq._t[id] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[id] = opts || {};
        var el = d.createElement("script");
        el.type = "text/javascript";
        el.async = true;
        el.src = src + "?sdkid=" + id + "&lib=" + t;
        var first = d.getElementsByTagName("script")[0];
        first.parentNode.insertBefore(el, first);
      };
      ttq.load(TIKTOK_ID);
      ttq.page();
    })(window, document, "ttq");
  }

  function initMeta() {
    if (!META_ID) return;
    if (window.fbq && window._fbq) return;
    (function (f, b, e, v) {
      if (f.fbq) return;
      var n = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      var t = b.createElement(e);
      t.async = true;
      t.src = v;
      var s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", META_ID);
    window.fbq("track", "PageView");
  }

  function initSnapchat() {
    if (!SNAP_ID) return;
    (function (e, t, n) {
      if (e.snaptr) return;
      var a = (e.snaptr = function () {
        a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments);
      });
      a.queue = [];
      var s = "script";
      var r = t.createElement(s);
      r.async = true;
      r.src = n;
      var u = t.getElementsByTagName(s)[0];
      u.parentNode.insertBefore(r, u);
    })(window, document, "https://sc-static.net/scevent.min.js");
    window.snaptr("init", SNAP_ID);
    window.snaptr("track", "PAGE_VIEW");
  }

  function readCookie(name) {
    var match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function metaCookies() {
    return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc") };
  }

  function trackingPayload(extra) {
    var cookies = metaCookies();
    var base = {
      pageUrl: window.location.href,
      fbp: cookies.fbp,
      fbc: cookies.fbc,
    };
    if (!extra) return base;
    for (var key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) base[key] = extra[key];
    }
    return base;
  }

  function normalizeProps(props) {
    props = props || {};
    var contentIds = props.content_ids || (props.content_id ? [props.content_id] : []);
    return {
      contentIds: contentIds,
      value: props.value != null ? props.value : 0,
      currency: props.currency || "SAR",
      contentName: props.content_name || "",
      orderId: props.order_id || props.transaction_id || null,
    };
  }

  function trackBrowser(eventName, props, eventId) {
    var n = normalizeProps(props);

    if (TIKTOK_ID && window.ttq) {
      try {
        var ttProps = { currency: n.currency, value: n.value };
        if (n.contentIds.length === 1) {
          ttProps.content_id = n.contentIds[0];
          if (n.contentName) ttProps.content_name = n.contentName;
        } else if (n.contentIds.length) {
          ttProps.content_ids = n.contentIds;
        }
        window.ttq.track(eventName, ttProps, eventId ? { event_id: eventId } : undefined);
      } catch (e) { /* non-fatal */ }
    }

    if (META_ID && window.fbq) {
      try {
        var metaEvent = eventName === "CompletePayment" ? "Purchase" : eventName;
        var metaProps = { currency: n.currency, value: n.value };
        if (n.contentIds.length) metaProps.content_ids = n.contentIds;
        if (n.contentName && metaEvent === "ViewContent") metaProps.content_name = n.contentName;
        if (n.orderId && metaEvent === "Purchase") metaProps.order_id = n.orderId;
        window.fbq("track", metaEvent, metaProps, eventId ? { eventID: eventId } : undefined);
      } catch (e) { /* non-fatal */ }
    }

    if (SNAP_ID && window.snaptr) {
      try {
        var snapEvents = {
          ViewContent: "VIEW_CONTENT",
          AddToCart: "ADD_CART",
          InitiateCheckout: "START_CHECKOUT",
          CompletePayment: "PURCHASE",
        };
        var snapEvent = snapEvents[eventName];
        if (!snapEvent) return;
        var snapProps = { price: n.value, currency: n.currency };
        if (n.contentIds.length) snapProps.item_ids = n.contentIds;
        if (n.orderId && snapEvent === "PURCHASE") snapProps.transaction_id = n.orderId;
        window.snaptr("track", snapEvent, snapProps);
      } catch (e) { /* non-fatal */ }
    }
  }

  function serverTrack(eventName, eventId, orderId, payload) {
    var apiBase = (CONFIG.API_BASE || "").replace(/\/$/, "");
    if (!apiBase) return;
    fetch(apiBase + "/api/e", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: eventName,
        eventId: eventId,
        orderId: orderId || null,
        payload: trackingPayload(payload || {}),
      }),
    }).catch(function () {});
  }

  function track(eventName, browserProps, capiPayload) {
    var eventId = newEventId();
    trackBrowser(eventName, browserProps, eventId);
    serverTrack(eventName, eventId, null, capiPayload);
    return eventId;
  }

  function trackBrowserOnly(eventName, browserProps, eventId) {
    trackBrowser(eventName, browserProps, eventId || newEventId());
  }

  function init() {
    initTikTok();
    initMeta();
    initSnapchat();
  }

  window.BashartiTracking = {
    init: init,
    track: track,
    trackBrowserOnly: trackBrowserOnly,
    newEventId: newEventId,
    serverTrack: serverTrack,
    metaCookies: metaCookies,
    trackingPayload: trackingPayload,
    configured: {
      tiktok: !!TIKTOK_ID,
      meta: !!META_ID,
      snapchat: !!SNAP_ID,
    },
  };

  init();
})();
