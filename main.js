(() => {
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Apple-style inertial smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    lenis.stop(); // locked while the preloader runs
  }

  /* ---------- footer reveal height ---------- */
  const footer = $('#footer'), main = $('main');
  const setFooter = () => {
    const h = Math.max(innerWidth < 700 ? 400 : 380, Math.min(innerHeight * 0.7, 560));
    footer.style.setProperty('--fh', h + 'px');
    main.style.marginBottom = h + 'px';
    ScrollTrigger.refresh();
  };
  setFooter();
  addEventListener('resize', () => { clearTimeout(setFooter.t); setFooter.t = setTimeout(setFooter, 200); });

  /* ---------- split headings into words ---------- */
  const splitWords = el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="w"><span>${w}</span></span>`).join(' ');
    return $$('.w>span', el);
  };
  $$('.split').forEach(el => {
    el.style.overflow = 'visible';
    splitWords(el);
    $$('.w', el).forEach(w => { w.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.12em'; w.firstChild.style.cssText = 'display:inline-block;transform:translateY(105%)'; });
  });
  const quoteWords = splitWords($('.split-words'));

  /* ---------- PRELOADER ---------- */
  const pre = $('#preloader'), num = $('#preNum');
  const media = $('#preMedia');
  const L = { b: 0, lr: 0, lx: 50, ly: 62 }; // light state
  const preVeil = $('#preVeil');
  const applyL = () => {
    media.style.setProperty('--b', Math.min(L.b, 1));
    gsap.set(preVeil, { x: L.lx / 100 * innerWidth, y: L.ly / 100 * innerHeight, xPercent: -50, yPercent: -50, scale: Math.max(L.lr, 1) / 26 * 1.6 });
  };
  applyL();

  const counter = { v: 0 };
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('.pre-brand span,.pre-brand em', { y: 0, duration: 1.2, stagger: 0.15 }, 0.3)
    // slow dimmer: darkness -> soft light
    .to(L, { b: 1.05, duration: 4.6, ease: 'power2.inOut', onUpdate: applyL }, 0)
    // a lamp opens up and sweeps along the cornice: left, right, then centre and floods
    .to(L, { lr: 38, lx: 18, ly: 55, duration: 1.6, ease: 'power2.out', onUpdate: applyL }, 0.2)
    .to(L, { lx: 82, ly: 48, lr: 44, duration: 1.9, ease: 'sine.inOut', onUpdate: applyL }, 1.6)
    .to(L, { lx: 50, ly: 50, lr: 150, duration: 1.6, ease: 'power2.inOut', onUpdate: applyL }, 3.2)
    .to('.pre-line i', { scaleX: 1, duration: 4.6, ease: 'power1.inOut' }, 0)
    .to(counter, { v: 100, duration: 4.6, ease: 'power1.inOut', onUpdate: () => { num.textContent = String(Math.round(counter.v)).padStart(3, '0'); } }, 0)
    .to('.pre-inner', { y: -20, opacity: 0, duration: 0.7, ease: 'power2.in' }, '+=0.15')
    .to('.pre-vignette', { opacity: 0, duration: 1.2 }, '<')
    .to(pre, { opacity: 0, duration: 1.4, ease: 'power2.inOut' }, '<0.2')
    .add(() => { document.body.classList.remove('is-loading'); pre.style.display = 'none'; if (lenis) lenis.start(); ScrollTrigger.refresh(); }, '>-0.2')
    .add(() => heroIntro(), '<-0.9');

  function heroIntro() {
    gsap.to('.hero .eyebrow', { opacity: 1, duration: 1.4, ease: 'power2.out' });
    gsap.to('.hero-title .line>span', { y: 0, duration: 1.6, stagger: 0.18, ease: 'expo.out' });
    gsap.to('.hero-cap', { opacity: 1, duration: 1.4, delay: 0.7 });
    gsap.to('.go', { opacity: 1, duration: 1.2, delay: 1 });
    gsap.to('.corner', { opacity: 1, duration: 1.2, delay: 1.2 });
    gsap.from('.logo,.nav,.burger', { y: -30, opacity: 0, duration: 1.2, delay: 0.6, stagger: 0.1, ease: 'power3.out' });
    heroLight.enabled = true;
  }

  /* ---------- hero: lamp-light follows cursor, dust repelled by it ---------- */
  const hero = $('.hero'), veil = $('#heroVeil'), dust = $('#dust'), ctx = dust.getContext('2d');
  const isTouch = matchMedia('(hover: none)').matches;
  const baseR = isTouch ? 34 : 26;
  const heroLight = { enabled: false, x: .5, y: .55, tx: .5, ty: .55, r: baseR, tr: baseR, boost: 0, active: false, last: 0 };
  let dw = 0, dh = 0, dpr = 1;
  const resizeDust = () => { dpr = Math.min(devicePixelRatio || 1, 2); dw = dust.width = hero.clientWidth * dpr; dh = dust.height = hero.clientHeight * dpr; };
  resizeDust(); addEventListener('resize', resizeDust);
  const parts = Array.from({ length: 140 }, () => ({
    x: Math.random(), y: Math.random(), z: .3 + Math.random() * .9,
    vx: 0, vy: 0, ph: Math.random() * 6.28
  }));
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    heroLight.tx = (e.clientX - r.left) / r.width; heroLight.ty = (e.clientY - r.top) / r.height;
    heroLight.active = true; heroLight.last = performance.now();
  });
  hero.addEventListener('pointerdown', e => { // tap on touch: the lamp jumps to the finger
    const r = hero.getBoundingClientRect();
    heroLight.tx = (e.clientX - r.left) / r.width; heroLight.ty = (e.clientY - r.top) / r.height;
    heroLight.active = true; heroLight.last = performance.now();
  });
  hero.addEventListener('pointerleave', () => heroLight.active = false);

  let spread = 0, spreadT = 0; // "disperse" on arrow hover
  const goBtn = $('#go');
  goBtn.addEventListener('pointerenter', () => { spreadT = 1; heroLight.tr = 46; setMuffle(true); });
  goBtn.addEventListener('pointerleave', () => { spreadT = 0; heroLight.tr = baseR; setMuffle(false); });

  const heroMedia = $('#heroMedia');
  let tNow = 0;
  gsap.ticker.add((time) => {
    tNow = time;
    if (!heroLight.enabled) return;
    // idle drift when cursor is still / absent
    if (!heroLight.active || performance.now() - heroLight.last > (isTouch ? 3500 : 2500)) {
      // on touch screens the lamp wanders on its own, sweeping the whole cornice
      const ax = isTouch ? .38 : .32, ay = isTouch ? .2 : .12, sp = isTouch ? .5 : .35;
      heroLight.tx = .5 + Math.sin(time * sp) * ax;
      heroLight.ty = .45 + Math.cos(time * sp * .77) * ay;
    }
    heroLight.x += (heroLight.tx - heroLight.x) * .06;
    heroLight.y += (heroLight.ty - heroLight.y) * .06;
    heroLight.r += (heroLight.tr - heroLight.r) * .05;
    gsap.set(veil, { x: heroLight.x * hero.clientWidth, y: heroLight.y * hero.clientHeight, xPercent: -50, yPercent: -50, scale: heroLight.r / 26 * 1.6 });
    // subtle camera tilt toward the light
    gsap.set(heroMedia, { x: Math.round((heroLight.x - .5) * -26) });

    spread += (spreadT - spread) * .05;
    ctx.clearRect(0, 0, dw, dh);
    const mx = heroLight.x * dw, my = heroLight.y * dh;
    for (const p of parts) {
      p.ph += .01;
      let px = p.x * dw, py = p.y * dh;
      const dx = px - mx, dy = py - my, d = Math.hypot(dx, dy) + .001;
      const R = 220 * dpr;
      if (d < R) { const f = (1 - d / R) * .9; p.vx += dx / d * f; p.vy += dy / d * f; }
      // disperse outward from centre on arrow hover
      p.vx += (px - dw / 2) / dw * spread * .06; p.vy += (py - dh / 2) / dh * spread * .06;
      p.vx *= .93; p.vy *= .93;
      p.x += p.vx / dw + Math.sin(p.ph) * .00004 * p.z;
      p.y += p.vy / dh - .00006 * p.z;
      if (p.y < -.05) p.y = 1.05; if (p.x < -.05) p.x = 1.05; if (p.x > 1.05) p.x = -.05; if (p.y > 1.05) p.y = -.05;
      const near = Math.max(0, 1 - d / (320 * dpr));
      const a = (.12 + near * .75 + spread * .25) * p.z;
      const s = (1.1 + p.z * 1.6 + near * 2.2) * dpr;
      ctx.beginPath(); ctx.fillStyle = `rgba(236,236,214,${a})`; ctx.arc(p.x * dw, p.y * dh, s, 0, 6.283); ctx.fill();
    }
  });

  // hero scroll: media drifts slower than page, content fades
  gsap.fromTo('#heroMedia', { scale: 1.04 }, { scale: 1.22, yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-content', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '60% top', scrub: true } });

  /* ---------- ambient sound (generated, no files): toggle + muffle ---------- */
  let ac, master, lp, soundOn = false;
  const initAudio = () => {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0;
    lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; lp.Q.value = .6;
    lp.connect(master); master.connect(ac.destination);
    [55, 82.41, 110, 164.81].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sine'; o.frequency.value = f * (1 + i * .0007);
      g.gain.value = .12 / (1 + i * .6);
      lfo.frequency.value = .05 + i * .03; lg.gain.value = g.gain.value * .6;
      lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(lp); o.start(); lfo.start();
    });
    // soft air: filtered noise
    const buf = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const n = ac.createBufferSource(); n.buffer = buf; n.loop = true;
    const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 600; nf.Q.value = .4;
    const ng = ac.createGain(); ng.gain.value = .25;
    n.connect(nf); nf.connect(ng); ng.connect(lp); n.start();
  };
  const setMuffle = on => { if (lp) lp.frequency.setTargetAtTime(on ? 260 : 1600, ac.currentTime, .4); };
  const soundBtn = $('#sound');
  soundBtn.addEventListener('click', () => {
    if (!ac) initAudio();
    ac.resume();
    soundOn = !soundOn;
    master.gain.setTargetAtTime(soundOn ? .5 : 0, ac.currentTime, .6);
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  });

  /* ---------- header behaviour ---------- */
  const header = $('#header');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      header.classList.toggle('scrolled', y > 80);
      header.classList.toggle('hide', y > lastY && y > 500 && !burger.classList.contains('open'));
      lastY = y;
    }
  });

  /* ---------- mobile menu + anchors ---------- */
  const burger = $('#burger'), mm = $('#mmenu');
  burger.addEventListener('click', () => {
    burger.classList.toggle('open'); mm.classList.toggle('open');
  });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    burger.classList.remove('open'); mm.classList.remove('open');
    if (lenis) lenis.scrollTo(t, { duration: 1.8, easing: x => 1 - Math.pow(1 - x, 4) });
    else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- parallax ---------- */
  $$('img[data-speed], svg[data-speed]').forEach(el => {
    const s = parseFloat(el.dataset.speed);
    const inHero = !!el.closest('.hero');
    const isSvg = el.tagName.toLowerCase() === 'svg';
    const amt = isSvg ? 120 : s * 30; // yPercent for images; svg uses px
    const prop = isSvg ? 'y' : 'yPercent';
    gsap.fromTo(el, { [prop]: isSvg ? -amt * Math.sign(s) : -amt }, {
      [prop]: isSvg ? amt * Math.sign(s) : amt, ease: 'none',
      scrollTrigger: {
        trigger: inHero ? '.hero' : (isSvg ? el.parentElement : el.parentElement),
        start: inHero ? 'top top' : 'top bottom', end: inHero ? 'bottom top' : 'bottom top', scrub: true
      }
    });
  });

  /* ---------- text reveals ---------- */
  $$('.split').forEach(el => {
    gsap.to($$('.w>span', el), {
      y: 0, duration: 1.2, stagger: 0.06, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });
  gsap.to(quoteWords, {
    y: 0, duration: 1.3, stagger: 0.07, ease: 'expo.out',
    scrollTrigger: { trigger: '.quote', start: 'top 55%' }
  });
  $$('.reveal-up').forEach(el => {
    if (el.closest('.hero')) return;
    gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('.eyebrow').forEach(el => {
    if (el.closest('.hero')) return;
    gsap.from(el, { opacity: 0, x: -20, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  /* ---------- stats counters ---------- */
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 2.2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => el.textContent = Math.round(o.v).toLocaleString('ru-RU') + (el.dataset.suffix || '')
    });
  });

  /* ---------- about frames ---------- */
  gsap.from('.frame-a', { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.about-visual', start: 'top 80%' } });
  gsap.from('.frame-b', { clipPath: 'inset(100% 0 0 0)', duration: 1.6, delay: .25, ease: 'expo.out', scrollTrigger: { trigger: '.about-visual', start: 'top 80%' } });

  /* ---------- stacked service cards ---------- */
  const cards = $$('.card');
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next || reduce) return;
    gsap.to(card, {
      scale: 0.93, filter: 'brightness(.88)', ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 96px', scrub: true }
    });
  });

  /* ---------- gallery ---------- */
  $$('.g').forEach((g, i) => {
    gsap.from(g, {
      y: 90, opacity: 0, duration: 1.3, ease: 'expo.out',
      scrollTrigger: { trigger: g, start: 'top 90%' }
    });
    gsap.from($('.ph', g), {
      clipPath: 'inset(0 0 100% 0)', duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: g, start: 'top 90%' }
    });
  });

  // depth: each work drifts at its own speed while scrolling
  $$('.g').forEach((g, i) => {
    const a = [5, -9, 7, -6, 9, -7][i % 6];
    gsap.fromTo(g, { yPercent: -a }, { yPercent: a, ease: 'none', scrollTrigger: { trigger: g, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.about-visual .frame-b', { yPercent: 12 }, { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.about-visual', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.stats .stat', { y: 40 }, { y: -10, ease: 'none', stagger: .05, scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'bottom 40%', scrub: true } });

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('img', lb);
  $$('.g').forEach(g => g.addEventListener('click', () => { lbImg.src = g.dataset.src; lb.classList.add('open'); }));
  lb.addEventListener('click', () => lb.classList.remove('open'));
  addEventListener('keydown', e => { if (e.key === 'Escape') lb.classList.remove('open'); });

  /* ---------- process lines ---------- */
  $$('.steps li').forEach((li, i) => {
    gsap.to(li, {
      '--p': 1, duration: 1.4, ease: 'power2.out', delay: i * 0.15,
      scrollTrigger: { trigger: '.steps', start: 'top 80%' }
    });
    gsap.from(li, { y: 50, opacity: 0, duration: 1, delay: i * 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.steps', start: 'top 85%' } });
  });

  /* ---------- footer text rise ---------- */
  gsap.fromTo('.footer-big', { yPercent: 40 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'bottom bottom', end: 'bottom top', scrub: true }
  });

  /* ---------- form (demo) ---------- */
  $('#form').addEventListener('submit', e => {
    e.preventDefault();
    $('#formOk').classList.add('show');
    e.target.reset();
  });

  /* ---------- marquee speeds up with scroll ---------- */
  const track = $('.marquee-track');
  if (track && !reduce) {
    const anim = track.getAnimations?.()[0];
    if (anim) ScrollTrigger.create({
      onUpdate: s => { const v = Math.min(Math.abs(s.getVelocity()) / 400, 4); anim.playbackRate = 1 + v; }
    });
  }
})();
