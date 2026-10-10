/* Page scripts. Nothing here moves on its own: the wafer map is drawn once,
 * and the walkthrough changes only when the visitor asks it to. */

/* ---------- Wafer map (hero) ---------- */
(function () {
  var host = document.getElementById('wafer');
  if (!host) return;
  var C = 260, R = 240, DW = 24, DH = 20;
  var flag = { i: 3, j: -4 };
  var fx = C + (flag.i + 0.5) * DW, fy = C + (flag.j + 0.5) * DH;
  var out = '<svg viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  out += '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.5"/>';
  out += '<circle cx="' + C + '" cy="' + C + '" r="' + (R - 8) + '" fill="none" stroke="var(--mist)" stroke-dasharray="3 5"/>';
  for (var i = -11; i <= 10; i++) {
    for (var j = -13; j <= 12; j++) {
      var x0 = C + i * DW, y0 = C + j * DH, inside = true;
      [[x0, y0], [x0 + DW, y0], [x0, y0 + DH], [x0 + DW, y0 + DH]].forEach(function (p) {
        var dx = p[0] - C, dy = p[1] - C;
        if (Math.sqrt(dx * dx + dy * dy) > R - 12) inside = false;
      });
      if (!inside) continue;
      var isFlag = (i === flag.i && j === flag.j);
      var d = Math.hypot(x0 + DW / 2 - fx, y0 + DH / 2 - fy);
      var t = Math.max(0, 1 - d / 120);
      var fill = isFlag ? 'var(--signal)' : (t > 0 ? 'rgba(35,64,255,' + (0.05 + 0.28 * t * t).toFixed(3) + ')' : 'none');
      var stroke = isFlag ? 'var(--ink)' : 'var(--mist)';
      out += '<rect x="' + (x0 + 1) + '" y="' + (y0 + 1) + '" width="' + (DW - 2) + '" height="' + (DH - 2) + '" rx="2" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (isFlag ? 1.6 : 1) + '"/>';
    }
  }
  out += '<circle cx="' + C + '" cy="' + (C + R) + '" r="9" fill="var(--fog)" stroke="var(--ink)" stroke-width="1.5"/>';
  out += '</svg>';
  host.innerHTML = out;
})();

/* ---------- Walkthrough: a fault, from first sign to lasting fix ----------
 * Rendered as the product window a technician sees. Example data. */
(function () {
  var body = document.getElementById('walk-body');
  if (!body) return;
  var tabsEl = document.querySelector('.walk-tabs');
  var prev = document.getElementById('walk-prev');
  var next = document.getElementById('walk-next');

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { return (r() + r() + r() + r() - 2) * 1.7; }

  /* Gas flow: baseline 22 sccm, sigma 0.22, band = 3 sigma. Samples every 2 s from -300 s to 0 s. */
  var BASE = 22, SIG = 0.22, LO = BASE - 3 * SIG, HI = BASE + 3 * SIG, N = 151, DETECT = -136;
  function flow(drift) {
    var r = rng(7), v = [];
    for (var i = 0; i < N; i++) {
      var t = -300 + i * 2, x = BASE + gauss(r) * SIG * 0.62 + 0.05 * Math.sin(i * 0.21);
      if (drift && t > -220) { var k = (t + 220) / 220; x -= 1.95 * Math.pow(k, 1.2); }
      v.push(x);
    }
    return v;
  }
  function other(seed, base, sig) {
    var r = rng(seed), v = [];
    for (var i = 0; i < 40; i++) v.push(base + gauss(r) * sig + Math.sin(i * 0.4) * sig * 0.5);
    return v;
  }
  function spark(v, color) {
    var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), w = 120, h = 22, d = '';
    v.forEach(function (y, i) {
      d += (i ? 'L' : 'M') + (i / (v.length - 1) * w).toFixed(1) + ' ' + (h - 2 - (y - mn) / ((mx - mn) || 1) * (h - 4)).toFixed(1);
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  /* The fault chart: learned range band, trace, excursion markers, detection and fault lines */
  function chart(drift, o) {
    o = o || {};
    var W = 560, H = o.h || 230, L = 44, R = 12, T = 12, B = 26, pw = W - L - R, ph = H - T - B;
    var ymin = 20.0, ymax = 23.0, v = flow(drift);
    var X = function (t) { return L + (t + 300) / 300 * pw; };
    var Y = function (y) { return T + (ymax - y) / (ymax - ymin) * ph; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (o.label || 'Gas flow over time against its learned range') + '">';
    [20, 21, 22, 23].forEach(function (g) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(g).toFixed(1) + '" y2="' + Y(g).toFixed(1) + '" stroke="#E6E6EA" stroke-width="1"/>';
      s += '<text x="' + (L - 8) + '" y="' + (Y(g) + 3.5).toFixed(1) + '" text-anchor="end">' + g + '</text>';
    });
    [-300, -200, -100, 0].forEach(function (t) {
      s += '<text x="' + X(t).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (t === -300 ? 'start' : t === 0 ? 'end' : 'middle') + '">' + t + ' s</text>';
    });
    s += '<rect x="' + L + '" y="' + Y(HI).toFixed(1) + '" width="' + pw + '" height="' + (Y(LO) - Y(HI)).toFixed(1) + '" fill="rgba(47,179,91,.16)"/>';
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(HI).toFixed(1) + '" y2="' + Y(HI).toFixed(1) + '" stroke="#2FB35B" stroke-width="1" stroke-dasharray="4 3"/>';
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(LO).toFixed(1) + '" y2="' + Y(LO).toFixed(1) + '" stroke="#2FB35B" stroke-width="1" stroke-dasharray="4 3"/>';
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(BASE).toFixed(1) + '" y2="' + Y(BASE).toFixed(1) + '" stroke="#2FB35B" stroke-opacity=".5" stroke-width="1"/>';
    var d = '', out = '';
    v.forEach(function (y, i) {
      var t = -300 + i * 2;
      d += (i ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(y).toFixed(1);
      if (drift && (y < LO || y > HI)) out += '<circle cx="' + X(t).toFixed(1) + '" cy="' + Y(y).toFixed(1) + '" r="2.6" fill="#FF3B30"/>';
    });
    s += '<path d="' + d + '" fill="none" stroke="#3D5AFE" stroke-width="1.6" stroke-linejoin="round"/>' + out;
    if (drift && o.marks !== false) {
      s += '<line x1="' + X(DETECT).toFixed(1) + '" x2="' + X(DETECT).toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="#FF9F0A" stroke-width="1.2" stroke-dasharray="4 3"/>';
      s += '<text class="t2" x="' + (X(DETECT) - 6).toFixed(1) + '" y="' + (T + 10) + '" text-anchor="end">Detected ' + DETECT + ' s</text>';
      s += '<line x1="' + X(0).toFixed(1) + '" x2="' + X(0).toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="#FF3B30" stroke-width="1.2"/>';
      s += '<text class="t2" x="' + (X(0) - 6).toFixed(1) + '" y="' + (T + 10) + '" text-anchor="end">Fault code</text>';
    }
    return s + '</svg>';
  }
  function legend(drift) {
    return '<div class="pw-legend"><span><i class="k" style="border-color:#3D5AFE"></i>Gas flow (sccm)</span><span><i class="k band"></i>Learned range, 3&sigma;</span>' +
      (drift ? '<span><i class="k dot"></i>Outside range</span><span><i class="k dash" style="border-color:#FF9F0A"></i>Detected</span>' : '') + '</div>';
  }
  function meta() {
    return '<dl class="pw-meta"><dt>Tool</dt><dd>Ion source 04</dd><dt>Recipe</dt><dd>Etch, step 3</dd><dt>Window</dt><dd>300 s</dd><dt>Learned from</dt><dd>40 healthy runs</dd></dl>';
  }
  function bar(state, label) {
    return '<div class="pw-bar"><div class="pw-id"><span class="pw-logo"><svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"><path d="M2 9h3l2-5 3 8 2-3h2"/></svg></span><span class="pw-ident"><span class="pw-name">Ion source 04</span><span class="pw-sub">Example data</span></span></div><span class="pw-pill ' + state + '"><i></i>' + label + '</span></div>';
  }
  function tiles(flag) {
    var T = [
      ['Gas flow', flag ? '20.1' : '22.0', 'sccm', flow(!!flag).filter(function (_, i) { return i % 4 === 0; }), flag],
      ['Beam current', '412', 'mA', other(3, 412, 2.5)],
      ['RF forward', '600', 'W', other(5, 600, 1.4)],
      ['Pressure', '2.1', 'mTorr', other(9, 2.1, 0.03)]
    ];
    return '<div class="pw-tiles">' + T.map(function (t) {
      return '<div class="pw-tile' + (t[4] ? ' flag' : '') + '"><div class="pw-tn">' + t[0] + '</div><div class="pw-tv">' + t[1] + '<small>' + t[2] + '</small></div>' + spark(t[3], t[4] ? '#FF9F0A' : '#2FB35B') + '</div>';
    }).join('') + '</div>';
  }
  function win(inner, state, label) { return '<div class="pw">' + bar(state, label) + '<div class="pw-body">' + inner + '</div></div>'; }
  function card(inner) { return '<div class="pw-chart">' + inner + '</div>'; }

  var CHECKS = [
    ['Check the gas feed line and mass flow controller output', 'Compare the controller reading with the set point.', 'Manual, operation section. Seen in 3 of 4 similar incidents.'],
    ['Confirm the supply cylinder pressure is above the minimum', 'A low supply can starve the line.', 'Manual, gas supply section.'],
    ['If both are fine, inspect the source for contamination', 'The copilot is less certain beyond this point.', 'Manual, maintenance section.']
  ];

  var steps = [
    {
      tab: 'Normal operation', title: 'Normal operation',
      text: 'A tool runs its recipe. The copilot reads its signals continuously and compares them with the range this particular tool learned from its own healthy runs.',
      see: 'Tool status: nominal.',
      visual: function () {
        return win(tiles(false) + card('<p class="pw-label">Gas flow, last 300 s</p>' + legend(false) + chart(false, { label: 'Gas flow staying inside its learned range' }) + meta()), 'ok', 'Nominal');
      }
    },
    {
      tab: 'First sign', title: 'A first sign',
      text: 'One signal starts to slide. Nothing has failed and no alarm has fired, but the trace has left the range this tool normally stays in.',
      see: 'Watch: gas flow left its learned range. No fault code yet.',
      visual: function () {
        return win(tiles(true) + card('<p class="pw-label">Gas flow, last 300 s</p>' + legend(true) + chart(true) + meta()) +
          '<p class="pw-callout">Detected 136 seconds before the tool would have raised a fault.</p>', 'watch', 'Watch');
      }
    },
    {
      tab: 'Recognition', title: 'Recognition',
      text: 'The copilot compares the pattern with the fault library and with this fab’s own incident history. A close match turns up.',
      see: 'Closest match found in incident memory.',
      visual: function () {
        return win(card('<p class="pw-label">Gas flow pattern</p>' + chart(true, { h: 150, marks: false, label: 'The current drift pattern' })) +
          '<div class="pw-card"><p class="pw-label">Similar incidents</p>' +
          '<div class="pw-case"><span class="id">INC-0187</span><span>Gas feed restriction, flow fell over about 3 minutes</span><span class="sim">91%</span></div>' +
          '<div class="pw-case"><span class="id">INC-0142</span><span>Mass flow controller drift</span><span class="sim">74%</span></div>' +
          '<div class="pw-case"><span class="id">INC-0098</span><span>Source contamination</span><span class="sim">52%</span></div>' +
          '<p class="pw-diag">Likely cause: a restriction in the gas feed. The pattern matches INC-0187 and the manual’s gas supply notes.</p></div>', 'watch', 'Watch');
      }
    },
    {
      tab: 'Guidance', title: 'Guidance',
      text: 'The technician gets a short, ranked checklist: what to inspect first, what the manual says, and what fixed this last time. Each line shows its source. Tap a step to check it off.',
      see: 'A ranked checklist with sources.',
      visual: function () {
        var li = CHECKS.map(function (c, i) {
          return '<li class="pw-step" tabindex="0" role="checkbox" aria-checked="false"><span class="pw-dot">' + (i + 1) + '</span><div><b>' + c[0] + '</b><p>' + c[1] + '</p><span class="pw-src">' + c[2] + '</span></div></li>';
        }).join('');
        return win('<div class="pw-card pw-plan"><div class="pw-plan-head"><p>Restore gas flow to the learned range</p><div class="pw-eta"><span class="pw-pill info">Confidence: high</span><span>About 25 min</span></div></div>' +
          '<p class="pw-warn">Vent and lock out the gas line before opening any fitting.</p>' +
          '<div class="pw-prog"><span id="pw-count">0 of 3 done</span><i><b id="pw-bar" style="width:0%"></b></i></div><ol class="pw-steps" id="pw-steps">' + li + '</ol></div>', 'watch', 'Action plan');
      }
    },
    {
      tab: 'Learning', title: 'Learning',
      text: 'The outcome is recorded. What the technician did, and whether it worked, becomes part of the memory the next diagnosis draws on.',
      see: 'Outcome added to incident memory.',
      visual: function () {
        return win('<div class="pw-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><p class="pw-label">Incident record</p><span class="pw-pill ok"><i></i>Closed</span></div>' +
          '<dl class="pw-rec"><dt>Fault</dt><dd>Gas flow drift</dd><dt>Action taken</dt><dd>Cleared gas feed restriction</dd><dt>Result</dt><dd>Flow back in range, tool in production</dd><dt>Memory</dt><dd>Added to this fab’s incident history</dd></dl></div>' +
          '<div class="pw-card"><p class="pw-label">Recent history</p><ul class="pw-trail">' +
          '<li><span class="ic w">1</span><div><b>Drift detected</b><p>Gas flow left learned range</p></div><time>-136 s</time></li>' +
          '<li><span class="ic">2</span><div><b>Plan issued</b><p>Matched INC-0187</p></div><time>-130 s</time></li>' +
          '<li><span class="ic g">3</span><div><b>Resolved</b><p>No fault code was raised</p></div><time>+24 min</time></li></ul></div>', 'ok', 'Resolved');
      }
    }
  ];

  var idx = 0, buttons = [];
  steps.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'tab');
    b.id = 'walk-tab-' + i;
    b.innerHTML = '<span class="dot">' + (i + 1) + '</span>' + s.tab;
    b.addEventListener('click', function () { go(i, true); });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.min(idx + 1, steps.length - 1), true); buttons[idx].focus(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.max(idx - 1, 0), true); buttons[idx].focus(); }
    });
    tabsEl.appendChild(b); buttons.push(b);
  });

  function wireChecks() {
    var list = document.getElementById('pw-steps');
    if (!list) return;
    var items = list.querySelectorAll('.pw-step');
    function update() {
      var n = list.querySelectorAll('.pw-step.done').length;
      document.getElementById('pw-count').textContent = n + ' of ' + items.length + ' done';
      document.getElementById('pw-bar').style.width = (n / items.length * 100) + '%';
    }
    Array.prototype.forEach.call(items, function (li) {
      function toggle() {
        var on = li.classList.toggle('done');
        li.setAttribute('aria-checked', on ? 'true' : 'false');
        li.querySelector('.pw-dot').textContent = on ? '✓' : Array.prototype.indexOf.call(items, li) + 1;
        update();
      }
      li.addEventListener('click', toggle);
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  function go(i, animate) {
    idx = i;
    var s = steps[i];
    body.setAttribute('aria-labelledby', 'walk-tab-' + i);
    body.innerHTML = '<div class="walk-text"><h3>' + s.title + '</h3><p>' + s.text + '</p><p class="walk-see"><b>What the technician sees</b>' + s.see + '</p></div><div class="walk-visual">' + s.visual() + '</div>';
    body.classList.remove('swap');
    if (animate) { void body.offsetWidth; body.classList.add('swap'); }
    buttons.forEach(function (b, k) {
      b.setAttribute('aria-selected', k === i ? 'true' : 'false');
      b.tabIndex = k === i ? 0 : -1;
    });
    prev.disabled = i === 0;
    next.disabled = i === steps.length - 1;
    wireChecks();
  }

  prev.addEventListener('click', function () { go(idx - 1, true); });
  next.addEventListener('click', function () { go(idx + 1, true); });
  go(0, false);
})();

/* ---------- OEM page: ask the copilot (chips only, no motion) ---------- */
(function () {
  var host = document.getElementById('oem-chat');
  if (!host) return;
  var q = host.querySelector('.pw-q'), a = host.querySelector('.pw-a .txt'), src = host.querySelector('.pw-a .pw-src');
  var chips = host.querySelectorAll('.pw-chip');
  var data = [
    ['How do I replace the filament?', 'Power down and wait for the source to cool, then lock out the supply. Remove the shield, loosen the two terminal screws, and swap the filament, keeping the new one centered. Recheck continuity before restoring power.', 'Operation manual, maintenance section 6.2'],
    ['What does fault E-14 mean?', 'E-14 points to a loss of regulation on the main supply. Check the interlock chain first, then the supply feedback line. If it returns after a reset, call service.', 'Troubleshooting guide, table 4'],
    ['Which recipe suits a 150 mm wafer?', 'Start from the standard clean recipe and lower the beam energy one step. Run a test wafer before production and compare against the reference trace.', 'Recipe notes, process section'],
    ['How often should I service the neutralizer?', 'Inspect it every 250 hours of use and replace consumables at 1,000 hours, or sooner if emission becomes unstable.', 'Maintenance schedule, table 2']
  ];
  Array.prototype.forEach.call(chips, function (c, i) {
    c.addEventListener('click', function () {
      q.textContent = data[i][0]; a.textContent = data[i][1]; src.textContent = 'Source: ' + data[i][2];
      Array.prototype.forEach.call(chips, function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
    });
  });
})();
