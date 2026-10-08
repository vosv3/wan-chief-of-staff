/* Wan's Chief of Staff guide: motion helpers shared by the landing page and both decks.
   Vanilla re-implementation of the pull-up words, per-character reveal, card entrances
   and background-video keep-alive. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var STAGGER = 0.08;

  function decode(html) {
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /* Build pull-up words into el. segments: [{ text, cls }]. Returns the next delay index. */
  function words(el, segments, startIndex) {
    var i = startIndex || 0;
    segments.forEach(function (seg, si) {
      var host = el;
      var parts = seg.text.split(/\s+/).filter(Boolean);
      parts.forEach(function (word, wi) {
        var w = document.createElement('span');
        w.className = 'w' + (seg.cls ? ' ' + seg.cls : '');
        w.style.setProperty('--d', (i * STAGGER).toFixed(2) + 's');
        if (seg.asterisk && wi === parts.length - 1) {
          w.appendChild(document.createTextNode(word.slice(0, -1)));
          var last = document.createElement('span');
          last.className = 'last';
          last.textContent = word.slice(-1);
          var ast = document.createElement('span');
          ast.className = 'ast';
          ast.setAttribute('aria-hidden', 'true');
          ast.textContent = '*';
          last.appendChild(ast);
          w.appendChild(last);
        } else {
          w.textContent = word;
        }
        host.appendChild(w);
        if (wi < parts.length - 1 || si < segments.length - 1) {
          host.appendChild(document.createTextNode(' '));
        }
        i++;
      });
    });
    return i;
  }

  /* Split text into per-character spans for the opacity reveal. Returns the char spans. */
  function chars(el, html) {
    var text = decode(html);
    el.textContent = '';
    el.classList.add('reveal');
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.appendChild(sr);
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    el.appendChild(vis);
    var spans = [];
    text.split(' ').forEach(function (word, wi, arr) {
      var cw = document.createElement('span');
      cw.className = 'cw';
      for (var k = 0; k < word.length; k++) {
        var c = document.createElement('span');
        c.className = 'c';
        c.textContent = word[k];
        cw.appendChild(c);
        spans.push(c);
      }
      vis.appendChild(cw);
      if (wi < arr.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    return spans;
  }

  /* Opacity 0.2 -> 1 per character; each char maps progress over [p-0.1, p+0.05]. */
  function setChars(spans, progress) {
    var n = spans.length;
    for (var i = 0; i < n; i++) {
      var cp = i / n;
      var a = cp - 0.1, b = cp + 0.05;
      var t = (progress - a) / (b - a);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      spans[i].style.opacity = (0.2 + 0.8 * t).toFixed(3);
    }
  }

  /* Drive the reveal over time (slide-linked). Returns a cancel function. */
  function revealOverTime(spans, duration, delay) {
    if (reduce.matches) { setChars(spans, 2); return function () {}; }
    setChars(spans, 0);
    var start = null, raf = 0, dead = false;
    var total = (duration || 1400);
    var wait = (delay || 0);
    function tick(ts) {
      if (dead) return;
      if (start === null) start = ts;
      var el = ts - start - wait;
      var p = el <= 0 ? 0 : Math.min(1.12, (el / total) * 1.12);
      setChars(spans, p);
      if (p < 1.12) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return function () { dead = true; cancelAnimationFrame(raf); };
  }

  /* Drive the reveal from scroll: target offset ['start 0.8', 'end 0.2']. */
  function revealOnScroll(target, spans) {
    if (reduce.matches) { setChars(spans, 2); return; }
    var queued = false;
    function update() {
      queued = false;
      var r = target.getBoundingClientRect();
      var vh = window.innerHeight;
      var startY = vh * 0.8;           // element top hits 80% of viewport
      var endY = vh * 0.2;             // element bottom hits 20% of viewport
      var span = (r.height + startY - endY);
      var p = (startY - r.top) / span;
      setChars(spans, Math.max(0, Math.min(1.12, p * 1.12)));
    }
    function onScroll() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* Restart the .in-triggered transitions on a container. */
  function replay(el) {
    el.classList.remove('in');
    void el.offsetWidth;
    requestAnimationFrame(function () { el.classList.add('in'); });
  }

  /* useInView(once) equivalent. */
  function whenInView(el, fn, margin) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.disconnect(); fn(); }
      });
    }, { rootMargin: margin || '0px' });
    io.observe(el);
  }

  /* Staggered scale-0.95 card entrances (0.15s apart, margin -100px). */
  function cards(container) {
    var list = Array.prototype.slice.call(container.querySelectorAll('.fcard'));
    list.forEach(function (c, i) { c.style.setProperty('--d', (i * 0.15).toFixed(2) + 's'); });
    whenInView(container, function () { list.forEach(function (c) { c.classList.add('in'); }); }, '-100px 0px -100px 0px');
  }

  /* Keep a muted background video playing through autoplay hiccups. */
  function keepPlaying(video) {
    if (!video) return;
    function play() {
      video.muted = true;
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    }
    play();
    video.addEventListener('pause', function () { if (!video.ended && !document.hidden) setTimeout(play, 120); });
    video.addEventListener('ended', play);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) play(); });
    window.addEventListener('focus', play);
    window.addEventListener('pageshow', play);
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
      document.addEventListener(evt, function () { if (video.paused) play(); }, { passive: true });
    });
  }

  window.Motion = {
    decode: decode,
    words: words,
    chars: chars,
    setChars: setChars,
    revealOverTime: revealOverTime,
    revealOnScroll: revealOnScroll,
    replay: replay,
    whenInView: whenInView,
    cards: cards,
    keepPlaying: keepPlaying,
    reduce: reduce
  };
})();
