/* QDRO Frenzy — catch the clean filings, let the deficient ones hit the floor. */
(function () {
  "use strict";

  var CAST = [
    { key: "rhiannon", name: "Rhiannon" },
    { key: "emily",    name: "Emily" },
    { key: "heather",  name: "Heather" },
    { key: "emma",     name: "Emma" }
  ];

  // Both pools wear the same manila chip on purpose: reading the clause is the game.
  var GOOD = [
    "Made pursuant to Ohio domestic relations law",
    "AP is the former spouse",
    "Split the Plan's fees and costs 50/50",
    "Reduce award to the extent it exceeds the vested account balance as of segregation",
    "A flat $20,000 value as of segregation"
  ];
  var BAD = [
    "100% of the account balance, unreduced for loans",
    "AP is P's neighbor",
    "Gross up the child support award for taxes",
    "Transfer the award into an IRA",
    "Distribute the award to AP's attorney",
    "50% as of 9/1/1994"
  ];

  var GOAL = 10;      // good filings needed to win
  var MAX_DROPS = 3;  // good filings allowed to hit the floor

  var app = document.getElementById("app");
  var audio = new Audio("assets/audio/one-more-life.mp3");
  audio.loop = true;
  audio.volume = 0.45;
  var muted = false;
  try { muted = localStorage.getItem("qdro-muted") === "1"; } catch (e) {}

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var lastDrawn = {};
  function pick(list, poolName) {
    var i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastDrawn[poolName]) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
    lastDrawn[poolName] = i;
    return list[i];
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ------------------------------------------------------ character select */
  function showSelect() {
    stopLoop();
    app.innerHTML = "";
    var s = el("div", "screen select");

    s.appendChild(el("p", "eyebrow", "Domestic Relations Order · Intake Desk"));
    var h1 = el("h1", "wordmark", "QDRO Frenzy");
    s.appendChild(h1);
    s.appendChild(el("p", "eyebrow", "Select your drafter"));

    var roster = el("div", "roster");
    CAST.forEach(function (c) {
      var b = el("button", "pick");
      b.type = "button";
      var img = el("img");
      img.src = "assets/portraits/" + c.key + ".png";
      img.alt = c.name;
      b.appendChild(img);
      b.addEventListener("click", function () { startRound(c); });
      roster.appendChild(b);
    });
    s.appendChild(roster);

    var tip = el("p", "tagline");
    tip.innerHTML =
      "Filings rain down on the intake desk. Catch the clean ones in the " +
      "<b>APPROVED box</b> overhead — catch <b>" + GOAL + "</b> to qualify the order. " +
      "Every catch speeds the docket up. Let <b>" + MAX_DROPS + "</b> good filings hit the floor " +
      "and the order is rejected. Grabbing a deficient filing costs you a catch.";
    s.appendChild(tip);
    s.appendChild(el("p", "eyebrow", "Drag · move the mouse · or use ← →"));

    app.appendChild(s);
  }

  /* ------------------------------------------------------------- the round */
  var G = null; // live round state

  function startRound(character) {
    app.innerHTML = "";
    var screen = el("div", "screen game");

    /* HUD */
    var hud = el("div", "hud");
    var caughtBox = el("div");
    caughtBox.appendChild(el("span", "label", "Qualified"));
    var meter = el("div", "meter");
    for (var i = 0; i < GOAL; i++) meter.appendChild(el("i"));
    caughtBox.appendChild(meter);

    var dropBox = el("div");
    dropBox.appendChild(el("span", "label", "Dropped"));
    var drops = el("div", "drops");
    for (var j = 0; j < MAX_DROPS; j++) drops.appendChild(el("i"));
    dropBox.appendChild(drops);

    var muteBtn = el("button", "mute");
    muteBtn.type = "button";
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      store("qdro-muted", muted ? "1" : "0");
      syncAudio(muteBtn);
    });

    hud.appendChild(caughtBox);
    hud.appendChild(dropBox);
    hud.appendChild(el("div", "spacer"));
    hud.appendChild(muteBtn);
    screen.appendChild(hud);

    /* field */
    var field = el("div", "field");
    var ground = el("div", "ground");
    var zone = el("div", "catchzone");
    var sprite = el("img", "player");
    sprite.src = "assets/sprites/" + character.key + ".png";
    sprite.alt = character.name;
    field.appendChild(ground);
    field.appendChild(zone);
    field.appendChild(sprite);
    screen.appendChild(field);
    app.appendChild(screen);

    G = {
      character: character,
      field: field, sprite: sprite, zone: zone,
      meter: meter, drops: drops,
      items: [],
      caught: 0, dropped: 0,
      speed: 120,          // px per second, before the multiplier
      mult: 1,
      spawnEvery: 1600,    // ms
      sinceSpawn: 600,
      x: 0, targetX: 0,
      keyLeft: false, keyRight: false,
      w: 0, h: 0, spriteW: 0, spriteH: 0,
      running: false, last: 0
    };

    syncAudio(muteBtn);
    if (!muted) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }

    measure();
    G.x = G.w / 2;
    G.targetX = G.x;
    placePlayer();

    if (sprite.complete && sprite.naturalWidth) measure();
    else sprite.addEventListener("load", function () { measure(); placePlayer(); });

    bindControls();
    countIn();
  }

  function syncAudio(btn) {
    btn.textContent = muted ? "♪ Off" : "♪ On";
    btn.setAttribute("aria-pressed", muted ? "false" : "true");
    if (muted) audio.pause();
    else { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
  }

  function measure() {
    if (!G) return;
    var r = G.field.getBoundingClientRect();
    G.w = r.width;
    G.h = r.height;
    G.groundH = parseFloat(getComputedStyle(G.field.querySelector(".ground")).height) || 44;
    G.spriteH = G.sprite.offsetHeight || 150;
    var ratio = (G.sprite.naturalWidth && G.sprite.naturalHeight)
      ? G.sprite.naturalWidth / G.sprite.naturalHeight : 0.42;
    G.spriteW = G.spriteH * ratio;
    G.x = Math.min(Math.max(G.x, G.spriteW / 2), Math.max(G.spriteW / 2, G.w - G.spriteW / 2));
  }

  // Catch zone == the APPROVED box the sprite holds overhead.
  function zoneRect() {
    var top = G.h - G.groundH - G.spriteH;
    return {
      left: G.x - G.spriteW * 0.31,
      right: G.x + G.spriteW * 0.31,
      top: top + G.spriteH * 0.015,
      bottom: top + G.spriteH * 0.235
    };
  }

  function placePlayer() {
    if (!G) return;
    G.sprite.style.transform = "translateX(" + (G.x - G.spriteW / 2) + "px)";
    var z = zoneRect();
    G.zone.style.width = (z.right - z.left) + "px";
    G.zone.style.height = (z.bottom - z.top) + "px";
    G.zone.style.transform = "translate(" + z.left + "px," + z.top + "px)";
  }

  /* ------------------------------------------------------------- controls */
  function onKeyDown(e) {
    if (!G) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { G.keyLeft = true; e.preventDefault(); }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { G.keyRight = true; e.preventDefault(); }
  }
  function onKeyUp(e) {
    if (!G) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") G.keyLeft = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") G.keyRight = false;
  }
  function onPointer(e) {
    if (!G) return;
    var r = G.field.getBoundingClientRect();
    G.targetX = e.clientX - r.left;
    if (e.pointerType !== "mouse") e.preventDefault();
  }

  function bindControls() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    G.field.addEventListener("pointermove", onPointer, { passive: false });
    G.field.addEventListener("pointerdown", onPointer, { passive: false });
    window.addEventListener("resize", onResize);
  }
  function unbindControls() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", onResize);
  }
  function onResize() { measure(); placePlayer(); }

  /* ----------------------------------------------------------- round flow */
  function countIn() {
    var ov = el("div", "overlay");
    var n = el("p", "countdown", "3");
    ov.appendChild(n);
    G.field.appendChild(ov);
    var left = 3;
    var t = setInterval(function () {
      left--;
      if (left > 0) { n.textContent = String(left); return; }
      clearInterval(t);
      ov.remove();
      G.running = true;
      G.last = performance.now();
      raf = requestAnimationFrame(tick);
    }, 650);
  }

  var raf = 0;
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (G) { G.running = false; unbindControls(); }
    G = null;
  }

  function spawn() {
    var isGood = Math.random() < 0.55;
    var node = el("div", "filing", isGood ? pick(GOOD, "good") : pick(BAD, "bad"));
    node.style.transform = "translate(0px,-200px)";
    G.field.appendChild(node);
    var w = node.offsetWidth, h = node.offsetHeight;
    var x = Math.random() * Math.max(1, G.w - w);
    G.items.push({ node: node, good: isGood, x: x, y: -h - 10, w: w, h: h });
  }

  function toast(text, kind, x, y) {
    var t = el("div", "toast " + kind, text);
    t.style.left = x + "px";
    t.style.top = y + "px";
    G.field.appendChild(t);
    setTimeout(function () { t.remove(); }, 720);
  }

  function refreshHud() {
    var m = G.meter.children;
    for (var i = 0; i < m.length; i++) m[i].className = i < G.caught ? "on" : "";
    var d = G.drops.children;
    for (var j = 0; j < d.length; j++) d[j].className = j < G.dropped ? "lost" : "";
  }

  function remove(item, popped) {
    var idx = G.items.indexOf(item);
    if (idx > -1) G.items.splice(idx, 1);
    if (popped) {
      item.node.style.setProperty("--end", "translate(" + item.x + "px," + item.y + "px)");
      item.node.classList.add("pop");
      setTimeout(function () { item.node.remove(); }, 220);
    } else {
      item.node.remove();
    }
  }

  function tick(now) {
    if (!G || !G.running) return;
    var dt = Math.min((now - G.last) / 1000, 0.05);
    G.last = now;

    /* move the drafter */
    var speed = 640 * dt;
    if (G.keyLeft) G.targetX -= speed;
    if (G.keyRight) G.targetX += speed;
    G.targetX = Math.min(Math.max(G.targetX, G.spriteW / 2), Math.max(G.spriteW / 2, G.w - G.spriteW / 2));
    G.x += (G.targetX - G.x) * Math.min(1, dt * 18);
    placePlayer();

    /* spawn */
    G.sinceSpawn += dt * 1000;
    if (G.sinceSpawn >= G.spawnEvery) { G.sinceSpawn = 0; spawn(); }

    /* fall + resolve */
    var z = zoneRect();
    var floor = G.h - G.groundH;
    for (var i = G.items.length - 1; i >= 0; i--) {
      var it = G.items[i];
      it.y += G.speed * G.mult * dt;
      it.node.style.transform = "translate(" + it.x + "px," + it.y + "px)";

      var cx = it.x + it.w / 2;
      var caughtIt = it.y + it.h >= z.top && it.y + it.h <= z.bottom + 14 &&
                     cx >= z.left - 6 && cx <= z.right + 6;

      if (caughtIt) {
        remove(it, true);
        if (it.good) {
          G.caught++;
          G.mult *= 1.07;                                   // the docket speeds up
          G.spawnEvery = Math.max(760, G.spawnEvery * 0.95);
          toast("+1", "good", it.x, it.y);
        } else {
          // Deficient filing: a real setback that still leaves the stated
          // win/lose conditions untouched.
          G.caught = Math.max(0, G.caught - 1);
          toast("−1", "bad", it.x, it.y);
          G.field.classList.add("flash");
          setTimeout(function () { if (G) G.field.classList.remove("flash"); }, 280);
        }
        refreshHud();
        if (G.caught >= GOAL) return finish(true);
        continue;
      }

      if (it.y + it.h >= floor) {
        if (it.good) {
          G.dropped++;
          toast("MISSED", "bad", it.x, floor - 40);
          refreshHud();
          remove(it, false);
          if (G.dropped >= MAX_DROPS) return finish(false);
          continue;
        }
        remove(it, false); // a deficient filing hitting the floor is fine
        continue;
      }
    }

    raf = requestAnimationFrame(tick);
  }

  function finish(won) {
    var character = G.character, caught = G.caught, dropped = G.dropped;
    G.running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;

    var ov = el("div", "overlay");
    var v = el("h2", "verdict " + (won ? "win" : "lose"),
      won ? "Order Qualified" : "Order Rejected");
    ov.appendChild(v);

    var p = el("p", "summary");
    p.innerHTML = won
      ? "<b>" + character.name + "</b> got all <b>" + GOAL + "</b> clean filings into the box."
      : "<b>" + character.name + "</b> qualified <b>" + caught + "</b> of <b>" + GOAL +
        "</b> before <b>" + dropped + "</b> good filings hit the floor.";
    ov.appendChild(p);

    var again = el("button", "btn", "Play Again");
    again.type = "button";
    again.addEventListener("click", showSelect);
    ov.appendChild(again);
    G.field.appendChild(ov);
    again.focus();
  }

  /* --------------------------------------------------------------- launch */
  function boot() { showSelect(); }
  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
  else boot();
})();
