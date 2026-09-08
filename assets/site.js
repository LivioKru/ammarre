/* AMMARRE — wordmark fitting, bag, product switching */
(function () {
  'use strict';

  var PIECES = {
    'silver-current': { name: 'Silver Current', line: 'Light grey with dark grey tracer', swatch: '#c5c7c3', available: true },
    'deep-water':     { name: 'Deep Water',     line: 'Deep navy',                       swatch: '#1d3947', available: false },
    'after-tide':     { name: 'After Tide',     line: 'Oxblood',                         swatch: '#5a1e23', available: false },
    'low-water':      { name: 'Low Water',      line: 'Sage grey-green',                 swatch: '#5c6b5f', available: false },
    'windward':       { name: 'Windward',       line: 'Undyed sand',                     swatch: '#b8a888', available: false },
    'night-watch':    { name: 'Night Watch',    line: 'Near-black',                      swatch: '#24272a', available: false }
  };
  var PRICE = 89;
  var chf = function (n) { return 'CHF ' + n; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- the wordmark is set to the exact measure of the page ---- */

  function fitWordmark() {
    var mark = document.querySelector('.wordmark');
    if (!mark) return;
    var available = mark.clientWidth;
    if (!available) return;
    // two passes: variable-font width settings can land after the first measure
    var size = 200;
    mark.style.fontSize = size + 'px';
    for (var i = 0; i < 3; i++) {
      var natural = mark.scrollWidth;
      if (!natural) return;
      size = size * (available / natural);
      mark.style.fontSize = size + 'px';
    }
    mark.style.fontSize = size * 0.998 + 'px';
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmark);
  fitWordmark();
  addEventListener('load', fitWordmark);

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitWordmark, 90);
  });

  /* ---- header hairline appears once the page has moved ---- */

  var head = $('#head');
  if (head) {
    var onScroll = function () { head.dataset.stuck = String(scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- bag ---- */

  var bag = $('[data-bag]');
  var scrim = $('[data-scrim]');
  var items = [];
  var lastFocus = null;

  function renderBag() {
    var list = $('[data-bag-items]');
    var count = $$('[data-bag-count]');
    if (!list) return;

    count.forEach(function (el) { el.textContent = String(items.length); });
    $('[data-bag-total]').textContent = chf(items.length * PRICE);

    if (!items.length) {
      list.innerHTML = '<li class="bag-empty">Nothing in the bag yet.</li>';
      $('[data-checkout]').disabled = true;
      return;
    }
    $('[data-checkout]').disabled = false;
    list.innerHTML = items.map(function (it, i) {
      var sizes = ['S', 'M', 'L', 'XL'].map(function (s) {
        return '<option value="' + s + '"' + (s === it.size ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
      return '<li class="bag-item">' +
        '<span>' + it.name + '</span>' +
        '<span>' + chf(PRICE) + '</span>' +
        '<label class="data">Size <select data-bag-size="' + i + '">' + sizes + '</select></label>' +
        '<button class="x" data-remove="' + i + '">Remove</button>' +
        '</li>';
    }).join('');
  }

  function openBag(open) {
    if (!bag) return;
    if (open) lastFocus = document.activeElement;
    bag.dataset.open = String(open);
    scrim.hidden = false;
    scrim.dataset.open = String(open);
    bag.setAttribute('aria-modal', String(open));
    if (open) $('[data-bag-close]').focus();
    else if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-bag-open]')) { openBag(true); return; }
    if (e.target.closest('[data-bag-close]') || e.target === scrim) { openBag(false); return; }

    var rm = e.target.closest('[data-remove]');
    if (rm) { items.splice(Number(rm.dataset.remove), 1); renderBag(); return; }

    var add = e.target.closest('[data-add]');
    if (add) {
      var key = add.dataset.add;
      items.push({ name: PIECES[key].name, size: 'M' });
      renderBag();
      openBag(true);
    }
  });

  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-bag-size]');
    if (sel) { items[Number(sel.dataset.bagSize)].size = sel.value; }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && bag && bag.dataset.open === 'true') openBag(false);
  });

  var checkout = $('[data-checkout]');
  if (checkout) {
    checkout.addEventListener('click', function () {
      $('[data-bag-note]').textContent = 'Payment is not connected on this build.';
    });
  }
  renderBag();

  /* ---- signup ---- */

  $$('[data-signup]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.parentElement.querySelector('[data-note]');
      if (note) note.textContent = 'On the list. We will write once, when a piece lands.';
      form.reset();
    });
  });

  /* ---- product page ---- */

  var stage = $('[data-stage]');
  if (stage) {
    var params = new URLSearchParams(location.search);
    var current = PIECES[params.get('piece')] ? params.get('piece') : 'silver-current';

    var setPiece = function (key, push) {
      current = key;
      var p = PIECES[key];
      stage.src = 'assets/placeholder-bracelet.jpg';
      stage.alt = p.name + ' — placeholder photograph; final product imagery to follow.';
      $('[data-name]').textContent = p.name;
      $('[data-line]').textContent = p.line;
      $('[data-swatch]').style.background = p.swatch;
      document.title = 'AMMARRE — ' + p.name;

      var add = $('[data-add]');
      add.dataset.add = key;
      add.disabled = !p.available;
      add.textContent = p.available ? 'Add to bag — ' + chf(PRICE) : 'Not yet released';
      $('[data-availability]').textContent = p.available
        ? 'In stock, ships from Zürich'
        : 'Later in the series — leave an address and we will write when it lands';

      $$('[data-piece]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.piece === key));
      });
      if (push) history.replaceState(null, '', '?piece=' + key);
    };

    $$('[data-piece]').forEach(function (b) {
      b.addEventListener('click', function () { setPiece(b.dataset.piece, true); });
    });

    setPiece(current, false);
  }
})();
