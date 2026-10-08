/* Wan's Chief of Staff guide: deck navigation.
   Arrow keys / Space / click / swipe advance, #n hash per slide (deep-linkable),
   Home and End, section links, the plan/Start buttons. */
(function () {
  'use strict';
  var C = window.DECK;
  var M = window.Motion;
  var slides = C.slides;
  var total = slides.length;

  var frame = document.getElementById('frame');
  var stage = document.getElementById('stage');
  var eyebrow = document.getElementById('eyebrow');
  var title = document.getElementById('title');
  var titleSm = document.getElementById('title-sm');
  var giantEl = document.getElementById('giant');
  var copyEl = document.getElementById('copy');
  var countEl = document.getElementById('slide-count');
  var sectionEl = document.getElementById('section-name');
  var barFill = document.getElementById('bar-fill');
  var bar = document.getElementById('bar');
  var startBtn = document.getElementById('start-button');
  var otherLink = document.getElementById('other-link');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.pillnav a[data-section]'));
  var current = -1;
  var cancelReveal = function () {};

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function hashToIndex() {
    var m = /^#(\d{1,2})$/.exec(location.hash || '');
    if (!m) return 0;
    var n = parseInt(m[1], 10);
    if (isNaN(n) || n < 1 || n > total) return 0;
    return n - 1;
  }

  function headline(target, s, startIdx) {
    target.textContent = '';
    var l1 = document.createElement('span');
    l1.className = 'ln one';
    var l2 = document.createElement('span');
    l2.className = 'ln two';
    target.appendChild(l1);
    target.appendChild(document.createTextNode(' '));
    target.appendChild(l2);
    var idx = M.words(l1, [{ text: s.one }], startIdx);
    return M.words(l2, [{ text: s.two }], idx);
  }

  function render(i) {
    var s = slides[i];
    var giant = C.giant && C.giant[i];
    stage.classList.toggle('is-giant', !!giant);

    eyebrow.textContent = pad(i + 1) + ' · ' + s.theme;

    var idx = 0;
    giantEl.textContent = '';
    giantEl.hidden = !giant;
    title.hidden = !!giant;
    titleSm.hidden = !giant;
    if (giant) {
      idx = M.words(giantEl, [{ text: giant, asterisk: true }], 0);
      title.textContent = '';
      headline(titleSm, s, idx);
    } else {
      titleSm.textContent = '';
      headline(title, s, 0);
    }

    cancelReveal();
    var spans = M.chars(copyEl, s.copy);

    countEl.textContent = 'Slide ' + (i + 1) + ' / ' + total;
    sectionEl.textContent = C.sectionNames[s.section];
    barFill.style.width = ((i + 1) / total * 100).toFixed(2) + '%';
    bar.setAttribute('aria-valuenow', String(i + 1));
    navLinks.forEach(function (a) {
      var on = a.getAttribute('data-section') === s.section;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if (startBtn) startBtn.hidden = i !== 0;
    if (otherLink) otherLink.hidden = i !== total - 1;

    var target = '#' + (i + 1);
    if (location.hash !== target) {
      try { history.replaceState(null, '', target); } catch (e) { location.hash = target; }
    }

    M.replay(stage);
    cancelReveal = M.revealOverTime(spans, 1300, 300);
  }

  function go(i) {
    if (i < 0) i = total - 1;
    if (i >= total) i = 0;
    if (i === current) return;
    current = i;
    render(i);
  }
  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  document.getElementById('next-button').addEventListener('click', next);
  document.getElementById('back-button').addEventListener('click', prev);
  var plan = document.getElementById('plan-button');
  if (plan) plan.addEventListener('click', function () { go(C.planSlide); });
  if (startBtn) startBtn.addEventListener('click', function () { go(C.planSlide); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-slide]'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      go(parseInt(el.getAttribute('data-slide'), 10) - 1);
    });
  });

  /* click or tap on the slide itself advances */
  frame.addEventListener('click', function (e) {
    if (e.target.closest('a, button, input, textarea, select, nav')) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;
    next();
  });

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case 'Enter':
        if (e.key === 'Enter' && t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return;
        e.preventDefault(); next(); break;
      case ' ':
      case 'Spacebar':
        if (t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return;
        e.preventDefault(); if (e.shiftKey) prev(); else next(); break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        e.preventDefault(); prev(); break;
      case 'Home':
        e.preventDefault(); go(0); break;
      case 'End':
        e.preventDefault(); go(total - 1); break;
    }
  });

  var touchX = null, touchY = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touchX = null; return; }
    touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchX, dy = t.clientY - touchY;
    touchX = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) next(); else prev();
  }, { passive: true });

  window.addEventListener('hashchange', function () {
    var i = hashToIndex();
    if (i !== current) go(i);
  });

  M.keepPlaying(frame.querySelector('video.bg'));
  go(hashToIndex());
})();
