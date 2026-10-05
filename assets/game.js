/* QDRO Frenzy — review the order, drag the right stamp, beat the clock. */
(function () {
  "use strict";

  var CAST = [
    { key: "rhiannon", name: "Rhiannon" },
    { key: "emily",    name: "Emily" },
    { key: "heather",  name: "Heather" },
    { key: "emma",     name: "Emma" }
  ];

  var GOAL = 8;             // orders to process correctly
  var SECONDS = 75;         // on the clock
  var WRONG_PENALTY = 12;   // seconds lost for a mis-stamp

  /* --------------------------------------------------------- clause bank --
     good:false means the clause is a defect, so the order must be REJECTED.
     `topics` keeps two clauses on the same subject off one order, so an order
     never cites two states or carries two different valuation dates.
     Edit freely — this array is the whole content of the game.              */
  var CLAUSES = [
    /* ---- clean clauses ---- */
    { text: "Alternate Payee is a current spouse and the order is issued pursuant to Arizona domestic relations law.", good: true, topics: ["payee", "jurisdiction"] },
    { text: "Made pursuant to Ohio domestic relations law.", good: true, topics: ["jurisdiction"] },
    { text: "The order is issued pursuant to the domestic relations laws of the Navajo Nation.", good: true, topics: ["jurisdiction"] },
    { text: "The parties shall equally split the Plan's reasonable fees and costs.", good: true, topics: ["fees"] },
    { text: "The amount awarded will be reduced to the extent it exceeds the Participant's vested account balance on the date of segregation.", good: true, topics: ["reduction"] },
    { text: "The Participant shall remain responsible for any outstanding Plan loans.", good: true, topics: ["loans"] },
    { text: "The award shall be taken from the Participant's investments in the 2030 Vanguard Target Date Fund. To the extent insufficient, the remainder shall be taken from all other funds pro rata.", good: true, topics: ["source"] },
    { text: "A flat $20,000 value as of segregation.", good: true, topics: ["valuation"] },
    { text: "The Alternate Payee's address is provided under separate cover.", good: true, topics: ["address"] },
    { text: "The amount awarded shall adjusted for gains and losses from 9/1/2003 to the date of segregation.", good: true, topics: ["gainloss"] },
    { text: "The Alternate Payee is the Participant's child who is 20 years old.", good: true, topics: ["payee"] },
    { text: "The amount awarded is a flat $50,000 of the P's vested account balance, valued as of 4/2/2021, adjusted for gains and losses after that date. The Participant has no outstanding loans.", good: true, topics: ["valuation", "gainloss", "loans"] },

    /* ---- defects ---- */
    { text: "The amount awarded will not be reduced to the extent it exceeds the Participant's vested account balance on the date of segregation.", good: false, topics: ["reduction"] },
    { text: "The amount awarded to the child alternate payee shall be grossed-up for the Participant's tax obligations.", good: false, topics: ["grossup"] },
    { text: "The Alternate Payee's beneficiary is the individual designated under Plan terms; if non, the Alternate Payee's estate.", good: false, topics: ["beneficiary"] },
    { text: "The Alternate Payee is the Participant's brother.", good: false, topics: ["payee"] },
    { text: "The amount awarded equals 56.434% of the Participant's vested account balance valued as of the date of segregation (less outstanding loans).", good: false, topics: ["valuation", "loans"] },
    { text: "The Alternate Payee is the Participant's neighbor.", good: false, topics: ["payee"] },
    { text: "100% of the account balance, unreduced for loans.", good: false, topics: ["award", "loans"] },
    { text: "The award will be transferred into an IRA for the Alternate Payee.", good: false, topics: ["distribution"] },
    { text: "Distribution checks shall be made payable to Murdock Law.", good: false, topics: ["distribution"] },
    { text: "Distribute the award to the Alternate Payee's attorney.", good: false, topics: ["distribution"] },
    { text: "50% as of 9/1/1994.", good: false, topics: ["valuation"] },
    { text: "To the extent of a conflict between the terms of the Plan and this order, the terms of this order shall control.", good: false, topics: ["conflict"] },
    { text: "The Alternate Payee is the estate of the Participant's ex-spouse.", good: false, topics: ["payee"] },
    { text: "The award shall be adjusted for investment gains and losses, but not account expenses.", good: false, topics: ["gainloss"] },
    { text: "AP is awarded 50% of P's vested account balance (first reduced for outstanding loans) as of 9/1/94, adjusted for gains and losses after that date.", good: false, topics: ["valuation", "loans", "gainloss"] },
    { text: "The Plan shall not permit the Participant to change invests while the order is being reviewed.", good: false, topics: ["investments"] },
    { text: "This order amends and reverses the order previously approved by the Plan on 8/1/2023. Amounts transferred to that order shall be returned to the Participant's account.", good: false, topics: ["prior"] }
  ];

  var GOOD = CLAUSES.filter(function (c) { return c.good; });
  var BAD  = CLAUSES.filter(function (c) { return !c.good; });

  var app = document.getElementById("app");
  var audio = new Audio("assets/audio/puck-theme.mp3");
  audio.loop = true;
  audio.volume = 0.4;
  var muted = false;
  try { muted = localStorage.getItem("qdro-muted") === "1"; } catch (e) {}

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ------------------------------------------------------ character select */
  function showSelect() {
    teardown();
    app.innerHTML = "";
    var s = el("div", "screen select");

    s.appendChild(el("p", "eyebrow", "Domestic Relations Order · Review Desk"));
    s.appendChild(el("h1", "wordmark", "QDRO Frenzy"));
    s.appendChild(el("p", "eyebrow", "Select your reviewer"));

    var roster = el("div", "roster");
    CAST.forEach(function (c) {
      var b = el("button", "pick");
      b.type = "button";
      var img = el("img");
      img.src = "assets/portraits/" + c.key + ".png";
      img.alt = c.name;
      b.appendChild(img);
      b.addEventListener("click", function () { startShift(c); });
      roster.appendChild(b);
    });
    s.appendChild(roster);

    var tip = el("p", "tagline");
    tip.innerHTML =
      "Orders land on your desk one at a time. Read every clause: if they are all clean, " +
      "drag the <b>Qualified</b> stamp onto the order — if even one clause is defective, " +
      "drag <b>Rejected</b>. Clear <b>" + GOAL + "</b> orders before the clock runs out. " +
      "A wrong stamp costs you <b>" + WRONG_PENALTY + "</b> seconds.";
    s.appendChild(tip);
    s.appendChild(el("p", "eyebrow", "Drag a stamp onto the order · or press Q / R"));

    app.appendChild(s);
  }

  /* -------------------------------------------------------------- a shift */
  var G = null;
  var raf = 0;

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    window.removeEventListener("keydown", onKey);
    G = null;
  }

  function startShift(character) {
    app.innerHTML = "";
    var screen = el("div", "screen game");

    /* HUD */
    var hud = el("div", "hud");

    var clock = el("div", "clockbox");
    clock.appendChild(el("span", "label", "Time"));
    var clockRow = el("div", "clockrow");
    var clockText = el("span", "clocktext", "1:40");
    var bar = el("div", "timebar");
    var fill = el("div", "timefill");
    bar.appendChild(fill);
    clockRow.appendChild(clockText);
    clockRow.appendChild(bar);
    clock.appendChild(clockRow);

    var prog = el("div");
    prog.appendChild(el("span", "label", "Processed"));
    var meter = el("div", "meter");
    for (var i = 0; i < GOAL; i++) meter.appendChild(el("i"));
    prog.appendChild(meter);

    var muteBtn = el("button", "mute");
    muteBtn.type = "button";
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      store("qdro-muted", muted ? "1" : "0");
      syncAudio(muteBtn);
    });

    hud.appendChild(clock);
    hud.appendChild(prog);
    hud.appendChild(el("div", "spacer"));
    hud.appendChild(muteBtn);
    screen.appendChild(hud);

    /* desk scene */
    var office = el("div", "office");
    var clerk = el("img", "clerk");
    clerk.src = "assets/sprites/" + character.key + ".png";
    clerk.alt = character.name;
    office.appendChild(clerk);

    var desk = el("div", "desk");
    var papers = el("div", "papers");
    desk.appendChild(papers);

    var tray = el("div", "tray");
    var stampQ = makeStamp("qualified", "Qualified");
    var stampR = makeStamp("rejected", "Rejected");
    tray.appendChild(stampQ);
    tray.appendChild(stampR);
    desk.appendChild(tray);

    office.appendChild(desk);
    screen.appendChild(office);
    app.appendChild(screen);

    G = {
      character: character,
      papers: papers, office: office, clerk: clerk,
      clockText: clockText, fill: fill, meter: meter,
      stamps: [stampQ, stampR],
      done: 0,
      left: SECONDS,
      queue: [],
      recent: [],
      order: null,
      card: null,
      locked: true,
      last: 0
    };

    syncAudio(muteBtn);
    window.addEventListener("keydown", onKey);
    bindStamp(stampQ, true);
    bindStamp(stampR, false);

    nextOrder();
    G.locked = false;
    G.last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function syncAudio(btn) {
    btn.textContent = muted ? "♪ Off" : "♪ On";
    btn.setAttribute("aria-pressed", muted ? "false" : "true");
    if (muted) audio.pause();
    else { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
  }

  function makeStamp(kind, label) {
    var b = el("button", "stamp " + kind);
    b.type = "button";
    b.appendChild(el("span", "handle"));
    b.appendChild(el("span", "plate", label));
    b.setAttribute("aria-label", "Stamp the order " + label);
    return b;
  }

  /* ----------------------------------------------------- building an order */
  function draw(pool, used) {
    var ok = pool.filter(function (c) {
      return !c.topics.some(function (t) { return used[t]; });
    });
    var fresh = ok.filter(function (c) { return G.recent.indexOf(c.text) === -1; });
    var list = fresh.length ? fresh : ok;
    if (!list.length) return null;
    var c = list[Math.floor(Math.random() * list.length)];
    c.topics.forEach(function (t) { used[t] = true; });
    G.recent.push(c.text);
    if (G.recent.length > 9) G.recent.shift();
    return c;
  }

  function buildOrder() {
    // A shuffled queue keeps clean and defective orders evenly mixed.
    if (!G.queue.length) G.queue = shuffle([true, true, true, true, false, false, false, false]);
    var defective = G.queue.pop();
    var want = Math.random() < 0.5 ? 3 : 4;
    var used = {};
    var picked = [];

    if (defective) {
      var b = draw(BAD, used);
      if (b) picked.push(b);
    }
    while (picked.length < want) {
      var g = draw(GOOD, used);
      if (!g) break;
      picked.push(g);
    }
    shuffle(picked);

    return {
      clauses: picked,
      defective: defective,
      caseNo: "DR-" + (2024 + Math.floor(Math.random() * 3)) + "-" +
              String(Math.floor(Math.random() * 9000) + 1000)
    };
  }

  function nextOrder() {
    G.order = buildOrder();
    var card = el("div", "order");

    var head = el("div", "orderhead");
    head.appendChild(el("span", "doctype", "Qualified Domestic Relations Order"));
    head.appendChild(el("span", "caseno", "Case No. " + G.order.caseNo));
    card.appendChild(head);

    var list = el("ol", "clauses");
    G.order.clauses.forEach(function (c) {
      var li = el("li", null, c.text);
      if (!c.good) li.dataset.defect = "1";
      list.appendChild(li);
    });
    card.appendChild(list);

    G.papers.appendChild(card);
    G.card = card;
    requestAnimationFrame(function () { card.classList.add("in"); });
  }

  /* ------------------------------------------------------------- stamping */
  function bindStamp(btn, isQualified) {
    var drag = null, moved = false, swallowClick = false;

    btn.addEventListener("pointerdown", function (e) {
      if (G.locked) return;
      drag = { x: e.clientX, y: e.clientY };
      moved = false;
      btn.setPointerCapture(e.pointerId);
      btn.classList.add("dragging");
      e.preventDefault();
    });

    btn.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      btn.style.transform = "translate(" + dx + "px," + dy + "px) rotate(-7deg)";
    });

    function release(e) {
      if (!drag) return;
      drag = null;
      btn.classList.remove("dragging");
      var over = overOrder(btn);
      btn.style.transform = "";
      if (moved) {
        swallowClick = true;
        setTimeout(function () { swallowClick = false; }, 0);
      }
      if (over && !G.locked) apply(isQualified);
    }
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", function () {
      drag = null;
      btn.classList.remove("dragging");
      btn.style.transform = "";
    });

    // Keyboard and plain taps still work, so the game is playable without a drag.
    btn.addEventListener("click", function () {
      if (swallowClick || G.locked) return;
      apply(isQualified);
    });
  }

  function overOrder(btn) {
    if (!G.card) return false;
    var s = btn.getBoundingClientRect();
    var o = G.card.getBoundingClientRect();
    var cx = s.left + s.width / 2;
    var cy = s.top + s.height / 2;
    return cx > o.left && cx < o.right && cy > o.top && cy < o.bottom;
  }

  function onKey(e) {
    if (!G || G.locked) return;
    var k = e.key.toLowerCase();
    if (k === "q") { apply(true); e.preventDefault(); }
    if (k === "r") { apply(false); e.preventDefault(); }
  }

  function apply(isQualified) {
    G.locked = true;
    var correct = isQualified !== G.order.defective;

    var mark = el("div", "impression " + (isQualified ? "qualified" : "rejected"),
      isQualified ? "Qualified" : "Rejected");
    G.card.appendChild(mark);

    if (correct) {
      G.done++;
      refreshMeter();
      flashVerdict("Correct", "good");
    } else {
      G.left = Math.max(0, G.left - WRONG_PENALTY);
      flashVerdict("−" + WRONG_PENALTY + "s", "bad");
      G.office.classList.add("shake");
      setTimeout(function () { if (G) G.office.classList.remove("shake"); }, 400);
      // Show what was missed: the defect they stamped past, or that it was clean.
      var defect = G.card.querySelector("[data-defect]");
      if (defect) defect.classList.add("flagged");
      else G.card.appendChild(el("p", "cleannote", "Every clause was clean."));
    }

    var card = G.card;
    var hold = correct ? 420 : 1150;   // linger on a miss so the defect registers
    setTimeout(function () {
      if (!G) return;
      card.classList.add("out");
      setTimeout(function () {
        if (!G) return;
        card.remove();
        if (G.done >= GOAL) return finish(true);
        if (G.left <= 0) return finish(false);
        nextOrder();
        G.locked = false;
      }, 260);
    }, hold);
  }

  function flashVerdict(text, kind) {
    var t = el("div", "verdicttoast " + kind, text);
    G.office.appendChild(t);
    setTimeout(function () { t.remove(); }, 800);
  }

  function refreshMeter() {
    var m = G.meter.children;
    for (var i = 0; i < m.length; i++) m[i].className = i < G.done ? "on" : "";
  }

  /* ----------------------------------------------------------- the clock */
  function tick(now) {
    if (!G) return;
    var dt = Math.min((now - G.last) / 1000, 0.1);
    G.last = now;
    G.left = Math.max(0, G.left - dt);

    var s = Math.ceil(G.left);
    G.clockText.textContent = Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
    G.fill.style.width = (G.left / SECONDS * 100) + "%";
    G.fill.classList.toggle("low", G.left <= 20);

    if (G.left <= 0 && !G.locked) return finish(false);
    raf = requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------- ending */
  var CHURRO = '<svg viewBox="0 0 56 124" width="100%" height="100%" aria-hidden="true"><rect x="28" y="103" width="4.2" height="13" rx="2.1" fill="#6b3d14"/><rect x="36" y="103" width="4.2" height="13" rx="2.1" fill="#6b3d14"/><ellipse cx="29" cy="117" rx="4.6" ry="2.4" fill="#4a2a0d"/><ellipse cx="39" cy="117" rx="4.6" ry="2.4" fill="#4a2a0d"/><path d="M20 52 Q12 46 7 50" fill="none" stroke="#B2762F" stroke-width="5.4" stroke-linecap="round"/><path d="M35 50 Q43 44 49 48" fill="none" stroke="#B2762F" stroke-width="5.4" stroke-linecap="round"/><path d="M20.0 13 Q14.0 59 24.0 105" fill="none" stroke="#B2762F" stroke-width="7.4" stroke-linecap="round"/><path d="M24.0 13 Q18.0 59 28.0 105" fill="none" stroke="#E3A95A" stroke-width="7.4" stroke-linecap="round"/><path d="M28.0 13 Q22.0 59 32.0 105" fill="none" stroke="#CE8C3A" stroke-width="7.4" stroke-linecap="round"/><path d="M32.0 13 Q26.0 59 36.0 105" fill="none" stroke="#AE6B24" stroke-width="7.4" stroke-linecap="round"/><path d="M36.0 13 Q30.0 59 40.0 105" fill="none" stroke="#8E5217" stroke-width="7.0" stroke-linecap="round"/><path d="M22.0 13 Q16.0 59 26.0 105" fill="none" stroke="#6B380B" stroke-width="1.5" stroke-linecap="round"/><path d="M26.0 13 Q20.0 59 30.0 105" fill="none" stroke="#6B380B" stroke-width="1.5" stroke-linecap="round"/><path d="M30.0 13 Q24.0 59 34.0 105" fill="none" stroke="#6B380B" stroke-width="1.5" stroke-linecap="round"/><path d="M34.0 13 Q28.0 59 38.0 105" fill="none" stroke="#6B380B" stroke-width="1.5" stroke-linecap="round"/><path d="M23.4 13 Q17.4 59 27.4 105" fill="none" stroke="#F6CE8A" stroke-width="2.1" stroke-linecap="round"/><path d="M27.4 13 Q21.4 59 31.4 105" fill="none" stroke="#EAB469" stroke-width="1.5" stroke-linecap="round"/><path d="M20 15 Q24 14 27.5 13.5" fill="none" stroke="#7A4310" stroke-width="5" stroke-linecap="round" opacity="0.55"/><path d="M28.5 104 Q32 104.5 36 105" fill="none" stroke="#6E3A0C" stroke-width="5" stroke-linecap="round" opacity="0.55"/><circle cx="27.3" cy="93.8" r="0.8" fill="#FFF4DC" opacity="0.73"/><circle cx="28.6" cy="60.0" r="0.9" fill="#FFF4DC" opacity="0.86"/><circle cx="20.1" cy="25.4" r="1.0" fill="#FFF4DC" opacity="0.81"/><circle cx="21.2" cy="97.1" r="0.9" fill="#FFF4DC" opacity="0.78"/><circle cx="20.4" cy="61.3" r="0.6" fill="#FFF4DC" opacity="0.59"/><circle cx="21.9" cy="56.0" r="0.8" fill="#FFF4DC" opacity="0.88"/><circle cx="28.8" cy="59.0" r="0.9" fill="#FFF4DC" opacity="0.71"/><circle cx="25.5" cy="99.6" r="1.1" fill="#FFF4DC" opacity="0.82"/><circle cx="23.9" cy="41.7" r="0.6" fill="#FFF4DC" opacity="0.84"/><circle cx="27.2" cy="49.7" r="1.1" fill="#FFF4DC" opacity="0.88"/><circle cx="18.1" cy="92.6" r="0.8" fill="#FFF4DC" opacity="0.94"/><circle cx="24.9" cy="69.6" r="1.0" fill="#FFF4DC" opacity="0.62"/><circle cx="20.1" cy="97.1" r="1.0" fill="#FFF4DC" opacity="0.55"/><circle cx="22.2" cy="22.9" r="1.0" fill="#FFF4DC" opacity="0.58"/><circle cx="28.9" cy="33.6" r="1.0" fill="#FFF4DC" opacity="0.56"/><circle cx="29.4" cy="52.5" r="0.7" fill="#FFF4DC" opacity="0.62"/><circle cx="37.4" cy="42.9" r="1.1" fill="#FFF4DC" opacity="0.59"/><circle cx="27.2" cy="70.6" r="0.6" fill="#FFF4DC" opacity="0.95"/><circle cx="22.1" cy="81.4" r="0.7" fill="#FFF4DC" opacity="0.63"/><circle cx="19.1" cy="65.8" r="0.7" fill="#FFF4DC" opacity="0.77"/><circle cx="25.6" cy="96.6" r="0.8" fill="#FFF4DC" opacity="0.76"/><circle cx="33.6" cy="30.6" r="1.1" fill="#FFF4DC" opacity="0.87"/><circle cx="22.6" cy="78.6" r="1.1" fill="#FFF4DC" opacity="0.59"/><circle cx="37.2" cy="67.5" r="0.8" fill="#FFF4DC" opacity="0.55"/><circle cx="21.1" cy="37.5" r="1.0" fill="#FFF4DC" opacity="0.62"/><circle cx="34.1" cy="42.1" r="0.7" fill="#FFF4DC" opacity="0.82"/><circle cx="19.4" cy="63.9" r="1.1" fill="#FFF4DC" opacity="0.78"/><circle cx="25.3" cy="34.7" r="0.6" fill="#FFF4DC" opacity="0.62"/><circle cx="25.7" cy="32.5" r="0.8" fill="#FFF4DC" opacity="0.76"/><circle cx="21.0" cy="91.1" r="1.1" fill="#FFF4DC" opacity="0.80"/><circle cx="23.5" cy="40" r="2.7" fill="#fffaf0"/><circle cx="31.6" cy="39.4" r="2.7" fill="#fffaf0"/><circle cx="24" cy="40.5" r="1.35" fill="#33200c"/><circle cx="32.1" cy="39.9" r="1.35" fill="#33200c"/><path d="M24 48 q4.2 3.8 8.4 -0.5" stroke="#33200c" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';

  function churroLine() {
    var row = el("div", "churros");
    for (var i = 0; i < 5; i++) {
      var c = el("div", "churro");
      c.style.animationDelay = (i * 110) + "ms";
      c.innerHTML = CHURRO;
      row.appendChild(c);
    }
    return row;
  }

  // The desk goes up: a charge is lit, then the reviewer and the filings go
  // with it. Built from square blocks on stepped timing so it reads 8-bit.
  function detonate(done) {
    var office = G.office;
    var orect = office.getBoundingClientRect();
    var crect = G.clerk.getBoundingClientRect();
    var cx = crect.left - orect.left + crect.width / 2;
    var cy = crect.top - orect.top + crect.height / 2;

    var tnt = el("div", "tnt");
    tnt.appendChild(el("span", null, "TNT"));
    tnt.style.left = cx + "px";
    tnt.style.top = cy + "px";
    office.appendChild(tnt);

    setTimeout(function () {
      if (!G) return;
      tnt.remove();

      office.appendChild(el("div", "pixflash"));

      var core = el("div", "tntcore");
      core.style.left = cx + "px";
      core.style.top = cy + "px";
      office.appendChild(core);

      for (var ring = 0; ring < 3; ring++) {
        var count = 8 + ring * 6;
        for (var i = 0; i < count; i++) {
          var a = (i / count) * Math.PI * 2 + ring * 0.26;
          var d = 72 + ring * 64;
          var blk = el("div", "pixblock");
          blk.style.left = cx + "px";
          blk.style.top = cy + "px";
          blk.style.setProperty("--bx", Math.round(Math.cos(a) * d) + "px");
          blk.style.setProperty("--by", Math.round(Math.sin(a) * d) + "px");
          blk.style.animationDelay = (ring * 80) + "ms";
          office.appendChild(blk);
        }
      }

      G.clerk.classList.add("boom");
      office.classList.add("shake");

      for (var s = 0; s < 30; s++) {
        var sc = el("div", "scrap");
        var sa = Math.random() * Math.PI * 2;
        var sd = 90 + Math.random() * 300;
        sc.style.left = (cx + (Math.random() * 50 - 25)) + "px";
        sc.style.top = (cy + (Math.random() * 50 - 25)) + "px";
        sc.style.setProperty("--tx", Math.cos(sa) * sd + "px");
        sc.style.setProperty("--ty", (Math.sin(sa) * sd * 0.65 + 210) + "px");
        sc.style.setProperty("--rot", (Math.random() * 1080 - 540) + "deg");
        sc.style.animationDelay = Math.round(Math.random() * 130) + "ms";
        office.appendChild(sc);
      }

      setTimeout(done, 1000);
    }, 430);
  }

  function finish(won) {
    if (G.over) return;
    G.over = true;
    var name = G.character.name, done = G.done, left = Math.ceil(G.left);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    G.locked = true;
    if (!won) return detonate(function () { if (G) showEnd(won, name, done, left); });
    showEnd(won, name, done, left);
  }

  function showEnd(won, name, done, left) {
    var ov = el("div", "overlay");
    if (won) ov.appendChild(churroLine());
    ov.appendChild(el("h2", "verdict " + (won ? "win" : "lose"),
      won ? "Desk Cleared" : "Time Called"));

    var p = el("p", "summary");
    p.innerHTML = won
      ? "<b>" + name + "</b> cleared all <b>" + GOAL + "</b> orders with <b>" +
        left + "s</b> left on the clock."
      : "<b>" + name + "</b> processed <b>" + done + "</b> of <b>" + GOAL +
        "</b> before the clock ran out.";
    ov.appendChild(p);

    var again = el("button", "btn", "Play Again");
    again.type = "button";
    again.addEventListener("click", showSelect);
    ov.appendChild(again);
    G.office.appendChild(ov);
    again.focus();
  }

  /* --------------------------------------------------------------- launch */
  function boot() { showSelect(); }
  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
  else boot();
})();
