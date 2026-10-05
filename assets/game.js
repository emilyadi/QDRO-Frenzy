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
  var CHURRO =
    '<svg viewBox="0 0 48 104" width="100%" height="100%" aria-hidden="true">' +
      '<rect x="17" y="90" width="5" height="13" rx="2.5" fill="#6d3b12"/>' +
      '<rect x="27" y="90" width="5" height="13" rx="2.5" fill="#6d3b12"/>' +
      '<rect x="1" y="40" width="12" height="5" rx="2.5" fill="#b06f23" transform="rotate(-28 7 42)"/>' +
      '<rect x="35" y="40" width="12" height="5" rx="2.5" fill="#b06f23" transform="rotate(28 41 42)"/>' +
      '<rect x="10" y="6" width="28" height="86" rx="14" fill="#c8812f"/>' +
      '<rect x="13" y="10" width="6" height="78" rx="3" fill="#e0a054" opacity="0.6"/>' +
      '<rect x="28" y="10" width="7" height="78" rx="3.5" fill="#a9641d" opacity="0.7"/>' +
      '<path d="M12 56 L36 50 M12 66 L36 60 M12 76 L36 70 M12 85 L36 79" ' +
        'stroke="#8a4a16" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.8"/>' +
      '<circle cx="18" cy="33" r="3.6" fill="#fff8ec"/>' +
      '<circle cx="30" cy="33" r="3.6" fill="#fff8ec"/>' +
      '<circle cx="18.8" cy="33.8" r="1.8" fill="#2a1708"/>' +
      '<circle cx="30.8" cy="33.8" r="1.8" fill="#2a1708"/>' +
      '<path d="M19 42 q5 5 10 0" stroke="#2a1708" stroke-width="2.1" fill="none" stroke-linecap="round"/>' +
      '<circle cx="15" cy="20" r="1.5" fill="#fff5e0"/>' +
      '<circle cx="33" cy="24" r="1.3" fill="#fff5e0"/>' +
      '<circle cx="24" cy="15" r="1.4" fill="#fff5e0"/>' +
      '<circle cx="21" cy="72" r="1.3" fill="#fff5e0"/>' +
      '<circle cx="31" cy="64" r="1.2" fill="#fff5e0"/>' +
    '</svg>';

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
