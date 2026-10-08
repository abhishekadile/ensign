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

/* ---------- Walkthrough: a fault, from first sign to lasting fix ---------- */
(function () {
  var body = document.getElementById('walk-body');
  if (!body) return;
  var tabsEl = document.querySelector('.walk-tabs');
  var prev = document.getElementById('walk-prev');
  var next = document.getElementById('walk-next');
  var BAND = 0.14;

  function wobble(t) { return Math.sin(t * 12.9898) * 0.5 + Math.sin(t * 78.233) * 0.5; }
  function series(n, start, rate, amp) {
    var a = amp || 1, v = [];
    for (var i = 0; i < n; i++) {
      var x = 0.035 * a * Math.sin(i * 0.09) + 0.02 * a * Math.sin(i * 0.27 + 1.2) + 0.008 * wobble(i);
      if (start !== null && i > start) x += Math.min(0.36, (i - start) * rate);
      v.push(x);
    }
    return v;
  }
  function firstOut(v) {
    for (var i = 0; i < v.length; i++) if (v[i] > BAND) return i;
    return -1;
  }
  function chart(v, W, H, opts) {
    opts = opts || {};
    var y = function (val) { return (H / 2 - val * H).toFixed(1); };
    var dx = W / (v.length - 1);
    var d = v.map(function (val, i) { return (i ? 'L' : 'M') + (i * dx).toFixed(1) + ' ' + y(val); }).join('');
    var top = y(BAND), bot = y(-BAND);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + (opts.label || 'Signal over time') + '">';
    s += '<rect class="g-band" x="0" y="' + top + '" width="' + W + '" height="' + (bot - top).toFixed(1) + '"/>';
    s += '<line class="g-edge" x1="0" x2="' + W + '" y1="' + top + '" y2="' + top + '"/><line class="g-edge" x1="0" x2="' + W + '" y1="' + bot + '" y2="' + bot + '"/>';
    if (opts.text !== false) {
      s += '<text class="g-text" x="8" y="' + (parseFloat(bot) - 6) + '">Normal band</text>';
    }
    s += '<path class="g-line' + (opts.dim ? ' dim' : '') + '" d="' + d + '"/>';
    if (opts.mark !== undefined && opts.mark >= 0) {
      var mx = (opts.mark * dx).toFixed(1), my = y(v[opts.mark]);
      s += '<circle class="g-mark" cx="' + mx + '" cy="' + my + '" r="7"/>';
      if (opts.markLabel) s += '<text class="g-text strong" x="' + (parseFloat(mx) - 10) + '" y="' + (parseFloat(my) - 16) + '" text-anchor="end">' + opts.markLabel + '</text>';
    }
    s += '</svg>';
    return s;
  }

  var drifting = series(140, 70, 0.0055);
  var cross = firstOut(drifting);

  function mini(label, v, best) {
    return '<div class="mini' + (best ? ' best' : '') + '">' + chart(v, 180, 80, { text: false, dim: !best, label: label }) + '<p>' + (best ? 'Closest match' : label) + '</p></div>';
  }

  var steps = [
    {
      tab: 'Normal operation', title: 'Normal operation',
      text: 'A tool runs its recipe. The copilot reads its signals continuously and compares them with how this particular tool usually behaves.',
      see: 'Tool status: healthy.',
      visual: function () {
        return '<p class="visual-label">Beam current</p>' + chart(series(140, null), 560, 240, { label: 'A signal staying inside its normal band' });
      }
    },
    {
      tab: 'First sign', title: 'A first sign',
      text: 'One signal starts to climb. Nothing has failed and no alarm has fired, but the pattern has left the band this tool normally stays in.',
      see: 'Notice: drift detected. No fault code yet.',
      visual: function () {
        return '<p class="visual-label">Beam current</p>' + chart(drifting, 560, 240, { mark: cross, markLabel: 'Left the band', label: 'A signal climbing out of its normal band' });
      }
    },
    {
      tab: 'Recognition', title: 'Recognition',
      text: 'The copilot compares the pattern with the fault library and with this fab’s own incident history. A close match turns up.',
      see: 'Match found in incident memory.',
      visual: function () {
        return '<p class="visual-label">Current pattern</p>' + chart(drifting, 560, 150, { mark: cross, text: false, label: 'The current drift pattern' }) +
          '<div class="mini-row">' +
          mini('Past incident A', series(90, 40, 0.0025), false) +
          mini('Past incident B', series(90, 40, 0.0055), true) +
          mini('Past incident C', series(90, null, 0, 3), false) +
          '</div>';
      }
    },
    {
      tab: 'Guidance', title: 'Guidance',
      text: 'The technician gets a short, ranked checklist: what to inspect first, what the manual says, and what fixed this last time. Each line shows its source and how sure the copilot is.',
      see: 'A ranked checklist with sources.',
      visual: function () {
        return '<div class="ui-card"><div class="ui-head"><strong>Suggested checks</strong><span class="chip">Confidence: High</span></div>' +
          '<ol class="ui-list">' +
          '<li><b>Inspect the neutralizer filament for wear.</b><span>Source: equipment manual, maintenance section. Seen in past incidents.</span></li>' +
          '<li><b>Confirm gas flow is stable at the source.</b><span>Source: equipment manual, operation section.</span></li>' +
          '<li><b>If both check out, escalate to a senior technician.</b><span>The copilot is less certain beyond this point.</span></li>' +
          '</ol><p class="ui-foot">Example only.</p></div>';
      }
    },
    {
      tab: 'Learning', title: 'Learning',
      text: 'The outcome is recorded. What the technician did, and whether it worked, becomes part of the memory the next diagnosis draws on.',
      see: 'Outcome added to incident memory.',
      visual: function () {
        return '<div class="ui-card"><div class="ui-head"><strong>Incident record</strong><span class="chip">Closed</span></div>' +
          '<dl class="ui-rows">' +
          '<dt>Fault</dt><dd>Beam current drift</dd>' +
          '<dt>Action taken</dt><dd>Replaced neutralizer filament</dd>' +
          '<dt>Result</dt><dd class="ok">Resolved, tool back in production</dd>' +
          '<dt>Memory</dt><dd>Added to this fab’s incident history</dd>' +
          '</dl><p class="ui-foot">Example only.</p></div>';
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
  }

  prev.addEventListener('click', function () { go(idx - 1, true); });
  next.addEventListener('click', function () { go(idx + 1, true); });
  go(0, false);
})();
