/* John Ang Jing Hern — site interactions. No libraries, no build step. */
(() => {
  'use strict';
  window.__siteReady = true;

  const root = document.documentElement;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const isMouse = (e) => e.pointerType === 'mouse';

  /* ---------- Load-in ---------- */
  const markLoaded = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(markLoaded);
  } else markLoaded();

  /* ---------- Theme toggle (circular reveal) ---------- */
  const themeBtn = $('#themeToggle');
  const currentTheme = () =>
    root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  themeBtn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked */ }
    };
    if (!document.startViewTransition || RM) return apply();
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
        { duration: 700, easing: EASE, pseudoElement: '::view-transition-new(root)' }
      );
    });
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('#menuBtn'), menu = $('#mobileMenu');
  const setMenu = (open) => {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    $('#nav').classList.toggle('is-scrolled', open || scrollY > 10);
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Scroll: nav state, progress bar, timeline fill, parallax ---------- */
  const nav = $('#nav');
  const bar = $('.progress span');
  const timeline = $('#timeline');
  const tlItems = $$('.tl', timeline);
  const parallax = $$('[data-parallax]');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    nav.classList.toggle('is-scrolled', y > 10 || !menu.hidden);
    const max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    const tr = timeline.getBoundingClientRect();
    const line = vh * 0.6;
    timeline.style.setProperty('--fill', clamp((line - tr.top) / tr.height, 0, 1).toFixed(3));
    tlItems.forEach((li) => li.classList.toggle('is-past', li.getBoundingClientRect().top + 12 < line));

    if (!RM) {
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
      });
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Active nav link ---------- */
  const links = $$('.nav__links a');
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionObs.observe(s));

  /* ---------- Counters ---------- */
  const runCount = (el) => {
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.dec || '0', 10);
    if (RM || isNaN(to)) { el.textContent = to.toFixed(dec); return; }
    const dur = 1400, t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Reveal on scroll ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      $$('.count', en.target).forEach(runCount);
      revealObs.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => revealObs.observe(el));

  /* ---------- "Now" rotator ---------- */
  const rot = $('#rotator');
  const roles = [
    'LatAm analyst, SMU Emerging Markets',
    'Economics undergrad, SMU',
    'Self-taught iOS developer',
    'Ex-recruiter, Great Eastern',
  ];
  if (rot && !RM) {
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      i = (i + 1) % roles.length;
      const old = rot.firstElementChild;
      const span = document.createElement('span');
      span.textContent = roles[i];
      span.className = 'in';
      old.className = 'out';
      rot.appendChild(span);
      setTimeout(() => old.remove(), 460);
    }, 3000);
  }

  /* ---------- Career index chart ---------- */
  const chart = $('#careerChart');
  if (chart) {
    const NS = 'http://www.w3.org/2000/svg';
    const W = 600, H = 300, L = 34, R = 586, T = 16, B = 262;
    const T0 = 2020, T1 = 2027, V0 = 80, V1 = 300;
    const X = (t) => L + ((t - T0) / (T1 - T0)) * (R - L);
    const Y = (v) => B - ((v - V0) / (V1 - V0)) * (B - T);
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmtT = (t) => `${MON[clamp(Math.floor((t - Math.floor(t)) * 12), 0, 11)]} ${Math.floor(t)}`;

    const M = [
      { t: 2020.29, v: 100, d: 'Apr 2020', h: 'Singapore Polytechnic', s: 'Starts a Diploma in Engineering with Business.' },
      { t: 2022.12, v: 128, d: 'Feb 2022', h: 'Heartland Innovation Competition', s: 'Growth proposal accepted by Fun Learners School, plus an internship offer.' },
      { t: 2022.70, v: 152, d: 'Sep 2022', h: 'Pepperl+Fuchs', s: 'Sole iOS developer on a flagship-product app. Shipped ~3 months early.' },
      { t: 2023.10, v: 163, d: 'Feb 2023', h: 'Great Eastern', s: 'Recruitment & marketing: on the hiring side of the table.' },
      { t: 2023.29, v: 172, d: 'Apr 2023', h: 'Graduated, Singapore Polytechnic', s: 'Diploma CGPA 3.70 / 4.00.' },
      { t: 2025.40, v: 190, d: '2025', h: 'IBF CMFAS M4 & M4A', s: 'Qualifying exams for regulated capital-markets activities.' },
      { t: 2025.62, v: 212, d: 'Aug 2025', h: 'SMU Economics + SMU Emerging Markets', s: 'Starts BSc Economics; joins as Latin America analyst.' },
      { t: 2026.00, v: 236, d: 'Jan 2026', h: 'Colombia macro brief', s: 'Sole-authored an FMCG-focused macro brief on Colombia.' },
      { t: 2026.20, v: 262, d: 'Mar 2026', h: 'SGX Value-Up Challenge', s: 'Finished in the top 10%.' },
      { t: 2026.83, v: 288, d: 'Now', h: 'Open to 2027 internships', s: 'Investment research, markets & strategy.' },
    ];

    // Deterministic "market noise" between milestones so the line looks like a price chart
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const pts = [];
    for (let k = 0; k < M.length - 1; k++) {
      const a = M[k], b = M[k + 1];
      const n = Math.max(2, Math.round((b.t - a.t) / 0.07));
      for (let j = 0; j < n; j++) {
        const f = j / n;
        const base = a.v + (b.v - a.v) * f;
        const amp = j === 0 ? 0 : 5 * Math.sin(Math.PI * f) + 2;
        pts.push({ t: a.t + (b.t - a.t) * f, v: base + (rnd() - 0.5) * 2 * amp });
      }
    }
    pts.push({ t: M[M.length - 1].t, v: M[M.length - 1].v });

    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
    const line = $('.cx__line', chart), area = $('.cx__area', chart);
    line.setAttribute('d', d);
    area.setAttribute('d', `${d} L${X(pts[pts.length - 1].t).toFixed(1)} ${B} L${X(pts[0].t).toFixed(1)} ${B} Z`);

    const grid = $('.cx__grid', chart), axis = $('.cx__axis', chart), dots = $('.cx__dots', chart);
    [100, 150, 200, 250].forEach((v) => {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', L); l.setAttribute('x2', R); l.setAttribute('y1', Y(v)); l.setAttribute('y2', Y(v));
      grid.appendChild(l);
    });
    for (let yr = 2020; yr <= 2026; yr++) {
      const tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', X(yr)); tx.setAttribute('y', H - 12); tx.setAttribute('text-anchor', 'middle');
      tx.textContent = `'${String(yr).slice(2)}`;
      axis.appendChild(tx);
    }
    const dotEls = M.map((m) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', X(m.t)); c.setAttribute('cy', Y(m.v)); c.setAttribute('r', 3.5);
      dots.appendChild(c);
      return c;
    });

    // Draw-in animation
    const len = line.getTotalLength();
    if (!RM) {
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      dots.style.opacity = 0;
      setTimeout(() => {
        line.style.transition = `stroke-dashoffset 2.2s ${EASE}`;
        line.style.strokeDashoffset = 0;
        dots.style.transition = 'opacity .8s 1.6s';
        dots.style.opacity = 1;
        chart.classList.add('is-drawn');
      }, 650);
    } else chart.classList.add('is-drawn');

    const cross = $('.cx__cross', chart), focus = $('.cx__focus', chart);
    const vEl = $('#cxValue'), cEl = $('#cxChange'), dEl = $('#cxDate'), ro = $('#cxReadout');
    const valueAt = (t) => {
      if (t <= pts[0].t) return pts[0].v;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].t >= t) {
          const a = pts[i - 1], b = pts[i];
          return a.v + (b.v - a.v) * ((t - a.t) / (b.t - a.t));
        }
      }
      return pts[pts.length - 1].v;
    };
    let shown = -1;
    const showMilestone = (idx) => {
      if (idx === shown) return;
      shown = idx;
      const m = M[idx];
      ro.innerHTML = `<strong></strong><span></span>`;
      ro.firstChild.textContent = `${m.d === 'Now' ? '' : m.d + ' · '}${m.h}`;
      ro.lastChild.textContent = m.s;
      ro.classList.remove('flash'); void ro.offsetWidth; ro.classList.add('flash');
      dotEls.forEach((c, i) => c.classList.toggle('on', i === idx));
    };
    const setReadout = (t, label) => {
      const v = valueAt(t);
      vEl.textContent = v.toFixed(1);
      cEl.textContent = `▲ +${Math.round(v - 100)}%`;
      dEl.textContent = label || fmtT(t);
      const x = X(t), y = Y(v);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x);
      cross.setAttribute('y1', T); cross.setAttribute('y2', B);
      focus.setAttribute('cx', x); focus.setAttribute('cy', y);
      let idx = 0;
      M.forEach((m, i) => { if (m.t <= t + 0.04) idx = i; });
      showMilestone(idx);
    };
    const reset = () => {
      chart.classList.remove('is-hover');
      const last = M.length - 1;
      vEl.textContent = M[last].v.toFixed(1);
      cEl.textContent = `▲ +${M[last].v - 100}%`;
      dEl.textContent = 'Now';
      showMilestone(last);
    };
    const fromEvent = (e) => {
      const r = chart.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      return clamp(T0 + ((x - L) / (R - L)) * (T1 - T0), M[0].t, M[M.length - 1].t);
    };
    chart.addEventListener('pointermove', (e) => { chart.classList.add('is-hover'); setReadout(fromEvent(e)); });
    chart.addEventListener('pointerdown', (e) => { chart.classList.add('is-hover'); setReadout(fromEvent(e)); });
    chart.addEventListener('pointerleave', reset);

    // Keyboard: step through milestones
    let kIdx = M.length - 1;
    chart.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') kIdx = Math.max(0, kIdx - 1);
      if (e.key === 'ArrowRight') kIdx = Math.min(M.length - 1, kIdx + 1);
      if (e.key === 'Home') kIdx = 0;
      if (e.key === 'End') kIdx = M.length - 1;
      chart.classList.add('is-hover');
      setReadout(M[kIdx].t, M[kIdx].d);
    });
    chart.addEventListener('blur', reset);
    reset();
  }

  /* ---------- Work filters (FLIP animation) ---------- */
  const workGrid = $('#workGrid');
  const chips = $$('.filters .chip');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const tag = chip.dataset.filter;
    chips.forEach((c) => { const on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
    const cards = [...workGrid.children];
    const first = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
    const wasHidden = new Map(cards.map((c) => [c, c.classList.contains('is-hidden')]));
    cards.forEach((c) => {
      const show = tag === 'all' || c.dataset.tags.split(' ').includes(tag);
      c.classList.toggle('is-hidden', !show);
      if (show) c.classList.add('in');
    });
    if (RM) return;
    cards.forEach((c, i) => {
      if (c.classList.contains('is-hidden')) return;
      if (wasHidden.get(c)) {
        c.animate([{ opacity: 0, transform: 'translateY(18px) scale(.97)' }, { opacity: 1, transform: 'none' }],
          { duration: 520, delay: i * 40, easing: EASE, fill: 'backwards' });
        return;
      }
      const f = first.get(c), l = c.getBoundingClientRect();
      const dx = f.left - l.left, dy = f.top - l.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 600, easing: EASE });
    });
  }));

  /* ---------- Card spotlight + tilt ---------- */
  $$('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      if (!isMouse(e) || RM) return;
      card.style.transition = 'transform .15s ease-out, border-color .3s, box-shadow .4s';
      card.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * 4}deg) rotateY(${(px - 0.5) * 5}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transition = ''; card.style.transform = ''; });
  });

  /* ---------- Magnetic buttons ---------- */
  if (!RM) {
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        if (!isMouse(e)) return;
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Case-study dialogs: morph out of the card that opened them ---------- */
  const openDialog = (dlg, trigger) => {
    dlg.showModal();
    dlg.scrollTop = 0;
    requestAnimationFrame(() => dlg.classList.add('is-open'));
    $$('.count', dlg).forEach(runCount);
    if (RM || !trigger) return;
    const src = (trigger.closest('.card, .cert') || trigger).getBoundingClientRect();
    const dst = dlg.getBoundingClientRect();
    const dx = (src.left + src.width / 2) - (dst.left + dst.width / 2);
    const dy = (src.top + src.height / 2) - (dst.top + dst.height / 2);
    dlg.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${src.width / dst.width}, ${src.height / dst.height})`, opacity: 0.5 },
       { transform: 'none', opacity: 1 }],
      { duration: 560, easing: EASE }
    );
    const inner = $('.dlg__inner', dlg);
    inner.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 480, delay: 200, easing: EASE, fill: 'backwards' });
  };
  const closeDialog = (dlg) => {
    if (dlg.dataset.closing) return;
    dlg.dataset.closing = '1';
    dlg.classList.remove('is-open');
    const done = () => { dlg.close(); delete dlg.dataset.closing; };
    if (RM) return done();
    dlg.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(18px) scale(.97)' }],
      { duration: 240, easing: 'ease-in' }).onfinish = done;
  };
  $$('[data-open]').forEach((btn) => btn.addEventListener('click', () => {
    const dlg = document.getElementById(btn.dataset.open);
    if (dlg) openDialog(dlg, btn);
  }));
  $$('dialog.dlg').forEach((dlg) => {
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dlg); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });
    $$('.dlg__close', dlg).forEach((b) => b.addEventListener('click', () => closeDialog(dlg)));
  });

  /* ---------- Copy email + toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  };
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      showToast('Email copied ✓');
    } catch (e) {
      showToast(b.dataset.copy);
    }
  }));
})();
