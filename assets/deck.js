/* Chief of Staff guide: deck navigation (arrow keys, Space, click, swipe, #n hash, Home/End, section links, back/next, Start) */
(function () {
  'use strict';
  var C = window.DECK;
  var slides = C.slides;
  var total = slides.length;

  var hero = document.getElementById('hero');
  var pillLbl = document.getElementById('tag');
  var copyEl = document.getElementById('copy');
  var countEl = document.getElementById('slide-count');
  var begin = document.getElementById('begin-button');
  var homeBtn = document.getElementById('home-button');
  var otherBtn = document.getElementById('other-button');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.links a'));
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var current = 0;
  var ready = false;

  function isCover(i) { return i === 0 || i === total - 1; }
  Hero.videoWanted = function () { return isCover(current); };

  function hashToIndex() {
    var m = /^#(\d{1,2})$/.exec(location.hash || '');
    if (!m) return 0;
    var n = parseInt(m[1], 10);
    if (isNaN(n) || n < 1 || n > total) return 0;
    return n - 1;
  }

  function render(i) {
    var s = slides[i];
    var cover = isCover(i);
    hero.classList.toggle('cover', cover);
    hero.classList.toggle('content', !cover);
    pillLbl.textContent = s.theme;
    // looked up each time: the entrance restores the headline markup, which replaces these nodes
    document.getElementById('line-one').textContent = s.one;
    document.getElementById('line-two').textContent = s.two;
    // keep hyphenated terms (end-session, /check-in) on one line; markup only, words unchanged
    copyEl.innerHTML = s.copy.replace(/[A-Za-z\/]+(?:-[A-Za-z]+)+/g, '<span style="white-space:nowrap">$&</span>');
    copyEl.classList.toggle('keep', !!s.keepBreaks);
    begin.hidden = i !== 0;
    var sb = document.getElementById('start-button');
    if (sb) sb.hidden = i !== 0;
    homeBtn.hidden = otherBtn.hidden = i !== total - 1;
    countEl.textContent = (i + 1) + ' / ' + total;
    navLinks.forEach(function (a) {
      var on = a.getAttribute('data-section') === s.section;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    var target = '#' + (i + 1);
    if (location.hash !== target) {
      try { history.replaceState(null, '', target); } catch (e) { location.hash = target; }
    }
    Hero.layout();
    Hero.play();
  }

  function go(i) {
    if (i < 0) i = total - 1;
    if (i >= total) i = 0;
    if (i === current && ready) return;
    current = i;
    Hero.cancel();
    render(i);
    if (ready && !reduceMotion.matches) Hero.entrance({ t: .6 });
  }
  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  document.getElementById('next-button').addEventListener('click', next);
  document.getElementById('back-button').addEventListener('click', prev);
  begin.addEventListener('click', function () { go(1); });
  var plan = document.getElementById('plan-button');
  if (plan) plan.addEventListener('click', function () { go(C.planSlide); });
  var startBtn = document.getElementById('start-button');
  if (startBtn) startBtn.addEventListener('click', function () { go(C.planSlide); });

  /* click or tap on the slide itself advances */
  hero.addEventListener('click', function (e) {
    if (e.target.closest('a, button, input, textarea, select, nav')) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;
    next();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-slide]'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      go(parseInt(el.getAttribute('data-slide'), 10) - 1);
    });
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

  current = hashToIndex();
  render(current);
  ready = true;
  Hero.start({ chrome: true });
})();
