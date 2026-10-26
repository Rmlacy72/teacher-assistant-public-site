/* TeacherAssist.ai cookie consent (public website only, never app.teacherassist.ai)

   Google Analytics and the Meta Pixel load ONLY after the visitor agrees.
   - "Accept all"  -> analytics + marketing
   - "Reject all"  -> neither (only the site's essential storage)
   - "Choose"      -> pick analytics and/or marketing
   A browser Global Privacy Control signal (navigator.globalPrivacyControl)
   is honored as "no marketing" and the marketing switch cannot be turned on.
   The choice is remembered for 12 months, and any link with
   data-cookie-settings (e.g. a footer "Cookie settings" link) reopens it.

   Install: remove the existing Google Analytics and Meta Pixel snippets from
   every page, then add before </body>:
     <script src="/cookie-consent.js" defer></script>
*/
(function () {
  "use strict";

  var GA_ID = "G-C798YE25ME";
  var PIXEL_ID = "2094184638122613";
  var KEY = "ta_cookie_consent";
  var VERSION = 1;                       // bump to ask everyone again
  var MAX_AGE_DAYS = 365;
  var POLICY_URL = "/privacy.html#cookies";

  var gpc = navigator.globalPrivacyControl === true;

  /* ---------- stored choice ---------- */
  function readChoice() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (!raw) {
      var m = document.cookie.match(new RegExp("(?:^|; )" + KEY + "=([^;]*)"));
      raw = m ? decodeURIComponent(m[1]) : null;
    }
    try {
      var c = JSON.parse(raw);
      if (!c || c.v !== VERSION) return null;
      if (Date.now() - c.t > MAX_AGE_DAYS * 864e5) return null;
      if (gpc) c.marketing = false;
      return c;
    } catch (e) { return null; }
  }

  function saveChoice(analytics, marketing) {
    var c = { v: VERSION, t: Date.now(), analytics: !!analytics, marketing: !!marketing && !gpc };
    var s = JSON.stringify(c);
    try { localStorage.setItem(KEY, s); } catch (e) {}
    try {
      document.cookie = KEY + "=" + encodeURIComponent(s) + "; Max-Age=" + (MAX_AGE_DAYS * 86400) +
        "; Path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
    } catch (e) {}
    return c;
  }

  /* ---------- trackers (loaded only with consent) ---------- */
  var gaLoaded = false, pixelLoaded = false;

  function loadGA() {
    if (gaLoaded) { window["ga-disable-" + GA_ID] = false; return; }
    gaLoaded = true;
    window["ga-disable-" + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "granted", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }

  function loadPixel() {
    if (pixelLoaded) { if (window.fbq) window.fbq("consent", "grant"); return; }
    pixelLoaded = true;
    /* Meta's standard base code */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("consent", "grant");
    window.fbq("init", PIXEL_ID);
    window.fbq("track", "PageView");
  }

  function clearCookies(prefixes) {
    document.cookie.split(";").forEach(function (part) {
      var name = part.split("=")[0].trim();
      if (!prefixes.some(function (p) { return name.indexOf(p) === 0; })) return;
      var host = location.hostname.replace(/^www\./, "");
      ["", "; Domain=" + host, "; Domain=." + host].forEach(function (d) {
        document.cookie = name + "=; Max-Age=0; Path=/" + d;
      });
    });
  }

  function apply(c) {
    if (c.analytics) loadGA();
    else { window["ga-disable-" + GA_ID] = true; clearCookies(["_ga"]); }
    if (c.marketing) loadPixel();
    else { if (window.fbq) window.fbq("consent", "revoke"); clearCookies(["_fbp", "_fbc"]); }
  }

  /* ---------- banner ---------- */
  var css =
    "#ta-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:760px;margin:0 auto;" +
    "background:#fff;color:#1C2B3A;border:1px solid #d9dee5;border-radius:14px;box-shadow:0 12px 40px rgba(28,43,58,.18);" +
    "font:15px/1.5 'DM Sans',system-ui,-apple-system,Segoe UI,sans-serif;padding:18px 20px}" +
    "#ta-cc h2{font:600 1.05rem/1.3 'DM Sans',system-ui,sans-serif;margin:0 0 6px;color:#1C2B3A}" +
    "#ta-cc p{margin:0 0 12px;font-size:.92rem}" +
    "#ta-cc a{color:#1A6FA8}" +
    "#ta-cc .ta-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}" +
    "#ta-cc button{font:600 .9rem 'DM Sans',system-ui,sans-serif;border-radius:8px;padding:9px 16px;cursor:pointer;border:1px solid #1A6FA8}" +
    "#ta-cc .ta-primary{background:#1A6FA8;color:#fff}" +
    "#ta-cc .ta-secondary{background:#fff;color:#1A6FA8}" +
    "#ta-cc .ta-link{background:none;border:none;color:#1A6FA8;text-decoration:underline;padding:9px 6px}" +
    "#ta-cc fieldset{border:none;margin:4px 0 12px;padding:0}" +
    "#ta-cc label{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #eef1f4;font-size:.9rem}" +
    "#ta-cc input{margin-top:4px;width:18px;height:18px;flex-shrink:0}" +
    "#ta-cc .ta-note{color:#5b6b7b;font-size:.8rem}" +
    "#ta-cc button:focus-visible,#ta-cc input:focus-visible{outline:3px solid #1A6FA8;outline-offset:2px}" +
    "@media (max-width:520px){#ta-cc .ta-row button{flex:1 1 100%}}";

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }

  function closeBanner() {
    var b = document.getElementById("ta-cc");
    if (b) b.remove();
  }

  function showBanner(detailed) {
    closeBanner();
    if (!document.getElementById("ta-cc-style")) {
      var st = el("style", { id: "ta-cc-style" }); st.textContent = css; document.head.appendChild(st);
    }
    var current = readChoice() || { analytics: false, marketing: false };
    var box = el("div", { id: "ta-cc", role: "dialog", "aria-modal": "false", "aria-labelledby": "ta-cc-title" });

    var intro =
      "<h2 id='ta-cc-title'>Cookies on teacherassist.ai</h2>" +
      "<p>We use cookies to understand how visitors use this website (Google Analytics) and to measure our ads " +
      "(Meta Pixel). They are only set if you agree. Our teacher app never uses advertising cookies, and student " +
      "information is never shared for advertising. <a href='" + POLICY_URL + "'>Learn more</a></p>";

    if (!detailed) {
      box.innerHTML = intro +
        "<div class='ta-row'>" +
        "<button type='button' class='ta-link' data-act='choose'>Choose</button>" +
        "<button type='button' class='ta-secondary' data-act='reject'>Reject all</button>" +
        "<button type='button' class='ta-primary' data-act='accept'>Accept all</button>" +
        "</div>" +
        (gpc ? "<p class='ta-note' style='margin:10px 0 0'>Your browser's Global Privacy Control signal is on, so advertising cookies stay off.</p>" : "");
    } else {
      box.innerHTML = intro +
        "<fieldset>" +
        "<label><input type='checkbox' checked disabled> <span><strong>Essential</strong><br>Remembers your cookie choice. Always on.</span></label>" +
        "<label><input type='checkbox' id='ta-cc-analytics'" + (current.analytics ? " checked" : "") + "> " +
        "<span><strong>Analytics</strong> (Google Analytics)<br>Counts visits and shows which pages are useful.</span></label>" +
        "<label><input type='checkbox' id='ta-cc-marketing'" + (current.marketing ? " checked" : "") + (gpc ? " disabled" : "") + "> " +
        "<span><strong>Advertising</strong> (Meta Pixel)<br>Measures whether our ads on Facebook and Instagram bring visitors, and may be used to show you our ads." +
        (gpc ? "<br><span class='ta-note'>Off because your browser sends a Global Privacy Control signal.</span>" : "") +
        "</span></label>" +
        "</fieldset>" +
        "<div class='ta-row'>" +
        "<button type='button' class='ta-secondary' data-act='reject'>Reject all</button>" +
        "<button type='button' class='ta-primary' data-act='save'>Save choices</button>" +
        "</div>";
    }

    box.addEventListener("click", function (e) {
      var act = e.target && e.target.getAttribute("data-act");
      if (!act) return;
      var c;
      if (act === "accept") c = saveChoice(true, true);
      else if (act === "reject") c = saveChoice(false, false);
      else if (act === "choose") { showBanner(true); return; }
      else if (act === "save") c = saveChoice(
        document.getElementById("ta-cc-analytics").checked,
        document.getElementById("ta-cc-marketing").checked);
      closeBanner();
      apply(c);
    });

    document.body.appendChild(box);
    var first = box.querySelector("button");
    if (first && detailed) first.focus();
  }

  /* ---------- start ---------- */
  function start() {
    var c = readChoice();
    if (c) apply(c); else showBanner(false);
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-cookie-settings]") : null;
      if (!t) return;
      e.preventDefault();
      showBanner(true);
    });
  }

  window.TACookieConsent = { open: function () { showBanner(true); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();