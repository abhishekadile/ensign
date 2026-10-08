/* Password gate for the promo.
 * The promo is stored encrypted (AES-256-GCM) in vault/promo.bin. The key is derived
 * from the password in the browser (PBKDF2, SHA-256). Without the password the file
 * is unreadable, so it can sit in a public repository safely. */
(function () {
  var form = document.getElementById('vault-form');
  if (!form) return;
  var input = document.getElementById('vault-pass');
  var submit = document.getElementById('vault-submit');
  var msg = document.getElementById('vault-msg');
  var stage = document.getElementById('vault-stage');
  var locked = document.getElementById('vault-locked');
  var cache = null;

  function b64(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function load() {
    if (cache) return Promise.resolve(cache);
    return Promise.all([
      fetch('vault/promo.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('missing'); return r.json(); }),
      fetch('vault/promo.bin', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); })
    ]).then(function (res) { cache = { meta: res[0], data: res[1] }; return cache; });
  }

  function decrypt(pkg, password) {
    var m = pkg.meta, enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: b64(m.salt), iterations: m.iterations, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(m.iv) }, key, pkg.data);
      });
  }

  function show(buf, mime) {
    var url = URL.createObjectURL(new Blob([buf], { type: mime }));
    var el;
    if (mime.indexOf('video/') === 0) {
      el = document.createElement('video');
      el.controls = true; el.playsInline = true; el.src = url;
    } else if (mime.indexOf('image/') === 0) {
      el = document.createElement('img'); el.src = url; el.alt = 'Ensign 14 promo';
    } else {
      el = document.createElement('iframe');
      el.title = 'Ensign 14 promo';
      el.src = url;
      el.allow = 'fullscreen; autoplay';
      el.setAttribute('allowfullscreen', '');
      if (mime === 'text/html') el.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-pointer-lock');
    }
    stage.textContent = '';
    stage.appendChild(el);
    if (mime === 'text/html') {
      var section = document.getElementById('preview');
      if (section) section.classList.add('app');
      var a = document.createElement('a');
      a.className = 'vault-open'; a.href = url; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Open full screen';
      form.parentNode.appendChild(a);
    }
    stage.classList.add('open');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = input.value;
    msg.textContent = '';
    if (!pw) { msg.textContent = 'Enter the access password.'; input.focus(); return; }
    if (!window.crypto || !crypto.subtle) { msg.textContent = 'This browser cannot unlock the promo. Open the site over https in a current browser.'; return; }
    submit.disabled = true; submit.textContent = 'Unlocking';
    load().then(function (pkg) {
      return decrypt(pkg, pw).then(function (buf) {
        input.value = '';
        form.hidden = true;
        show(buf, pkg.meta.mime);
      }, function () {
        msg.textContent = 'That password did not open the promo. Check it and try again.';
        input.select();
      });
    }, function () {
      msg.textContent = 'The promo is not available yet. Please contact us for access.';
    }).then(function () {
      submit.disabled = false; submit.textContent = 'Unlock promo';
    });
  });
})();
