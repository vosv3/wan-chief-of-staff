/* Chief of Staff guide: layout engine, entrance and video playback shared by every page */
(function () {
  'use strict';
  var d = document.documentElement;
  var IW = 1586, IH = 992, CROWN = 530, GAP_D = 49.24, GAP_M = 26, OVERSCAN = 1.00078, K_T = .9, MAX_ZOOM = 1.4;
  var DESK = matchMedia('(min-width:1152px) and (min-height:720px)');
  var PHONE = matchMedia('(max-width:510.98px)');
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  var EXPO = 'cubic-bezier(.16,1,.3,1)', QUART = 'cubic-bezier(.25,1,.5,1)', SHUTTER = 'cubic-bezier(.76,0,.24,1)';

  var hero = document.getElementById('hero');
  var photo = document.getElementById('photo');
  var stage = document.getElementById('stage');
  var cta = document.getElementById('cta');
  var note = document.getElementById('note');
  var lede = stage ? stage.querySelector('.lede') : null;
  var video = photo ? photo.querySelector('video') : null;

  var Hero = window.Hero = {
    videoWanted: function () { return true; }
  };

  function vw() { return d.clientWidth || window.innerWidth; }

  function layout() {
    var w = vw(), h = window.innerHeight, u = Math.min(w / 1280, h / 800);
    d.style.setProperty('--u', u);
    d.style.setProperty('--vh', h + 'px');
    if (!hero || !photo || !cta) return;
    var desk = DESK.matches, phone = PHONE.matches;
    var isCover = !hero.classList.contains('content');
    // Desktop: the CTA row (and the note under it) follow the lede, so longer copy never collides.
    if (desk && isCover && lede) {
      var ny = parseFloat(getComputedStyle(lede).getPropertyValue('--ny'));
      var top = (isNaN(ny) ? 250 : ny) + lede.offsetHeight + 26;
      cta.style.top = top + 'px';
      if (note) note.style.top = (top + 51.2 + 22) + 'px';
    } else {
      cta.style.top = '';
      if (note) note.style.top = '';
    }
    if (!isCover) return;
    var mode = desk ? 'd' : phone ? 'm' : 't';
    var hr = hero.getBoundingClientRect();
    var cb = cta.getBoundingClientRect().bottom - hr.top;
    if (note && !note.hidden) cb = Math.max(cb, note.getBoundingClientRect().bottom - hr.top);
    var kv = parseFloat(getComputedStyle(d).getPropertyValue('--k'));
    var k = isNaN(kv) ? K_T : kv;
    var crown = cb + (mode === 'd' ? GAP_D * u : mode === 't' ? GAP_D * k : GAP_M);
    var H = hr.height;
    var cover = Math.max(w / IW, H / IH);
    var s = Math.max(cover, (H - crown) / (IH - CROWN));
    if (s > cover * MAX_ZOOM) { s = cover * MAX_ZOOM; crown = H - (IH - CROWN) * s; }
    s *= OVERSCAN;
    var fx = (w / H < 1) ? 815 : IW / 2;
    var x0 = Math.min(Math.max(w / 2 - fx * s, w - IW * s), 0);
    var y0 = crown - CROWN * s;
    photo.style.setProperty('--s', s);
    photo.style.setProperty('--x0', x0 + 'px');
    photo.style.setProperty('--y0', y0 + 'px');
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; layout(); });
  }
  Hero.layout = layout;
  Hero.schedule = schedule;

  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule);
  [DESK, PHONE].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener('change', schedule); else if (mq.addListener) mq.addListener(schedule);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if (window.ResizeObserver && stage) new ResizeObserver(schedule).observe(stage);
  layout();

  /* ---------- Entrance (Web Animations) ---------- */
  var running = [];
  var h1Restore = null;

  function cancel() {
    running.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    running = [];
    if (h1Restore) { h1Restore(); h1Restore = null; }
  }

  function splitWords(el) {
    var txt = el.textContent;
    el.textContent = '';
    txt.split(/(\s+)/).forEach(function (p) {
      if (!p) return;
      if (/^\s+$/.test(p)) { el.appendChild(document.createTextNode(p)); return; }
      var w = document.createElement('span'); w.className = 'w';
      var i = document.createElement('span'); i.textContent = p;
      w.appendChild(i); el.appendChild(w);
    });
  }

  function entrance(opts) {
    opts = opts || {};
    cancel();
    if (RM.matches || !('animate' in d)) { d.classList.remove('intro'); return; }
    var T = opts.t || 1;
    var full = !!opts.chrome;
    var dd = PHONE.matches ? .75 : 1;
    var anims = [];
    function A(el, kf, delay, dur, ease) {
      if (!el || el.hidden) return null;
      var a = el.animate(kf, { delay: delay * 1000 * T, duration: dur * 1000 * T, easing: ease, fill: 'backwards' });
      anims.push(a);
      return a;
    }
    function drop(px) { return [{ opacity: 0, translate: '0 ' + px + 'px' }, { opacity: 1, translate: '0 0' }]; }
    var q = function (s) { return document.querySelector(s); };

    if (full) {
      A(q('.brand'), drop(-8 * dd), .15, .8, QUART);
      A(q('.more') || q('.hdr'), drop(-8 * dd), .25, .8, QUART);
      A(q('.rail'), [{ scale: '1 0' }, { scale: '1 1' }], .35, .9, EXPO);
      A(q('.count'), drop(8 * dd), .3, .8, QUART);
      A(q('.ctrls'), drop(8 * dd), .4, .8, QUART);
    }
    A(q('.stage .pill'), [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], .30, .75, SHUTTER);

    var h1 = q('.stage h1');
    var wordAnims = [];
    if (h1) {
      var orig = h1.innerHTML;
      var parts = h1.querySelectorAll('.ln');
      if (parts.length) Array.prototype.forEach.call(parts, splitWords); else splitWords(h1);
      h1Restore = function () { h1.innerHTML = orig; };
      Array.prototype.forEach.call(h1.querySelectorAll('.w>span'), function (s, i) {
        var a = A(s, [{ translate: '0 132%' }, { translate: '0 0' }], .45 + i * .055, 1.05, EXPO);
        if (a) wordAnims.push(a);
      });
    }
    A(q('.stage .lede'), drop(12 * dd), .85, .9, QUART);
    A(q('#note'), drop(12 * dd), .85, .9, QUART);

    var wipe = [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)' }];
    var b1 = q('.cta .b1:not([hidden])'), b2 = q('.cta .b2:not([hidden])');
    if (b1) {
      A(b1, wipe, 1.05, .75, EXPO);
      A(b1.querySelector('span'), drop(8 * dd), 1.15, .7, QUART);
    }
    if (b2) {
      A(b2, wipe, 1.13, .75, EXPO);
      A(b2.querySelector('span'), drop(8 * dd), 1.23, .7, QUART);
      A(b2.querySelector('svg'), drop(8 * dd), 1.23, .7, QUART);
    }

    running = anims;
    d.classList.remove('intro');
    if (window.__introFailsafe) { clearTimeout(window.__introFailsafe); window.__introFailsafe = null; }

    if (wordAnims.length) {
      Promise.all(wordAnims.map(function (a) { return a.finished; })).then(function () {
        if (h1Restore) { h1Restore(); h1Restore = null; }
      }, function () {});
    }
    Promise.all(anims.map(function (a) { return a.finished; })).then(function () {
      if (running !== anims) return;
      anims.forEach(function (a) { a.cancel(); });
      running = [];
      d.classList.add('intro-done');
    }, function () {});
  }

  Hero.entrance = entrance;
  Hero.cancel = cancel;
  Hero.start = function (opts) {
    var go = function () { requestAnimationFrame(function () { layout(); entrance(opts); }); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
  };

  /* ---------- Video playback ---------- */
  function play() {
    if (!video) return;
    if (!Hero.videoWanted()) { if (!video.paused) video.pause(); return; }
    video.muted = true;
    var p = video.play();
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }
  Hero.play = play;
  if (video) {
    video.muted = true;
    play();
    video.addEventListener('canplay', play);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) play(); });
    var once = function () {
      play();
      ['pointerdown', 'touchstart', 'scroll'].forEach(function (e) { window.removeEventListener(e, once, true); });
    };
    ['pointerdown', 'touchstart', 'scroll'].forEach(function (e) { window.addEventListener(e, once, { capture: true, passive: true }); });
  }
})();
