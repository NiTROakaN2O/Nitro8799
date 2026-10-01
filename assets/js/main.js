(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const header = $('[data-header]');
  const nav = $('[data-nav]');
  const burger = $('[data-burger]');
  const quickbar = $('[data-quickbar]');
  const hero = $('#top');
  const contacts = $('#contacts');

  /* ---------- Header + quick bar on scroll ---------- */
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    if (!nav.classList.contains('is-open')) header.classList.toggle('is-hidden', y > lastY && y > 500);
    if (quickbar) {
      const pastHero = y > hero.offsetHeight * 0.6;
      const atContacts = contacts.getBoundingClientRect().top < window.innerHeight * 0.6;
      quickbar.classList.toggle('is-visible', pastHero && !atContacts);
    }
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Active nav link ---------- */
  const navLinks = $$('.nav a[href^="#"]');
  if ('IntersectionObserver' in window) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) sio.observe(s); });
  }

  /* ---------- Reveal on scroll (с лёгкой лестницей внутри одного ряда) ---------- */
  const revealEls = $$('.reveal, .step, .season');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      visible.forEach((entry, i) => {
        entry.target.style.setProperty('--rd', (i * 0.08).toFixed(2) + 's');
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Hero: свечение, искры, параллакс ---------- */
  const media = $('[data-hero-media]');
  const img = $('[data-hero-img]');
  const glow = $('[data-hero-glow]');
  const canvas = $('[data-embers]');

  if (media && img) {
    const [ox, oy] = (img.dataset.outlet || '0.8 0.45').split(' ').map(Number);
    let outlet = { x: 0, y: 0 };

    // пересчёт координат точки выхлопа с учётом object-fit: cover
    const placeOutlet = () => {
      const w = media.clientWidth, h = media.clientHeight;
      const iw = img.naturalWidth || 1472, ih = img.naturalHeight || 1480;
      const scale = Math.max(w / iw, h / ih) * 1.04;
      const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
      const rw = iw * scale, rh = ih * scale;
      const offX = (w - rw) * (isNaN(pos[0]) ? 0.5 : pos[0]);
      const offY = (h - rh) * (isNaN(pos[1]) ? 0.5 : pos[1]);
      outlet = { x: offX + rw * ox, y: offY + rh * oy };
      glow.style.setProperty('--gx', outlet.x + 'px');
      glow.style.setProperty('--gy', outlet.y + 'px');
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    if (img.complete) placeOutlet(); else img.addEventListener('load', placeOutlet);
    window.addEventListener('resize', placeOutlet);
    setTimeout(() => media.classList.add('is-ready'), 2600);

    // искры / тёплые частицы из выхода отопителя
    if (canvas && !reduceMotion) {
      const ctx = canvas.getContext('2d');
      const parts = [];
      let running = true;
      const spawn = () => {
        const a = (-0.35 + Math.random() * 0.5);            // направление: вправо и немного вверх
        const sp = 0.6 + Math.random() * 1.8;
        parts.push({
          x: outlet.x + (Math.random() - 0.5) * 30,
          y: outlet.y + (Math.random() - 0.5) * 60,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - Math.random() * 0.4,
          life: 0, max: 60 + Math.random() * 90,
          r: 0.6 + Math.random() * 1.8,
          hue: 14 + Math.random() * 26,
        });
      };
      const tick = () => {
        if (!running) return;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < 3; i++) if (parts.length < 160) spawn();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.life++;
          p.vy -= 0.012;                              // тёплый воздух поднимается
          p.vx += (Math.random() - 0.5) * 0.08;       // турбулентность
          p.x += p.vx; p.y += p.vy;
          const t = p.life / p.max;
          if (t >= 1 || p.x > w + 20 || p.y < -20) { parts.splice(i, 1); continue; }
          const alpha = Math.sin(Math.PI * t) * 0.9;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, `hsla(${p.hue + 20}, 100%, 75%, ${alpha})`);
          g.addColorStop(0.4, `hsla(${p.hue}, 100%, 55%, ${alpha * 0.6})`);
          g.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
        }
        requestAnimationFrame(tick);
      };
      // анимируем только когда hero на экране
      new IntersectionObserver(([e]) => {
        const was = running; running = e.isIntersecting;
        if (running && !was) requestAnimationFrame(tick);
      }).observe(hero);
      requestAnimationFrame(tick);
    }

    // мягкий параллакс фото за курсором
    if (finePointer && !reduceMotion) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        img.style.setProperty('--px', (dx * -14).toFixed(1) + 'px');
        img.style.setProperty('--py', (dy * -10).toFixed(1) + 'px');
      });
    }
  }

  /* ---------- Подсветка карточек симптомов за курсором ---------- */
  $$('.symptom').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Предзаполнение формы ---------- */
  const form = $('[data-form]');
  const message = $('[data-message]');
  const selectService = (value) => {
    const radio = form && form.querySelector(`input[name="service"][value="${value}"]`);
    if (radio) radio.checked = true;
  };
  const highlightForm = () => {
    form.classList.add('is-highlight');
    setTimeout(() => form.classList.remove('is-highlight'), 1800);
  };

  $$('[data-symptom]').forEach((btn) => btn.addEventListener('click', () => {
    selectService('Ремонт');
    const s = btn.dataset.symptom;
    if (message && !message.value.includes(s)) message.value = (message.value ? message.value + '\n' : '') + 'Симптом: ' + s;
    contacts.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    highlightForm();
    setTimeout(() => $('input[name="phone"]').focus({ preventScroll: true }), 700);
  }));
  $$('[data-preset]').forEach((a) => a.addEventListener('click', () => { selectService(a.dataset.preset); highlightForm(); }));

  /* ---------- Галерея работ ---------- */
  const track = $('[data-works]');
  if (track) {
    const step = () => (track.querySelector('.work')?.offsetWidth || 400) + 16;
    $('[data-works-prev]').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('[data-works-next]').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  }

  /* ---------- Phone mask (+375) ---------- */
  const phoneInput = $('input[name="phone"]');
  const formatPhone = (value) => {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('80')) d = '375' + d.slice(2);
    if (!d.startsWith('375')) d = '375' + d;
    d = d.slice(0, 12);
    const p = [d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)];
    let out = '+375';
    if (p[0]) out += ' (' + p[0];
    if (p[0].length === 2) out += ')';
    if (p[1]) out += ' ' + p[1];
    if (p[2]) out += '-' + p[2];
    if (p[3]) out += '-' + p[3];
    return out;
  };
  if (phoneInput) {
    phoneInput.addEventListener('focus', () => { if (!phoneInput.value) phoneInput.value = '+375 ('; });
    phoneInput.addEventListener('blur', () => { if (phoneInput.value.replace(/\D/g, '').length <= 3) phoneInput.value = ''; });
    phoneInput.addEventListener('input', () => { phoneInput.value = formatPhone(phoneInput.value); });
  }

  /* ---------- Отправка формы ----------
     data-endpoint — URL для POST (JSON): ваш backend, Formspree или serverless-функция,
     пересылающая заявку в Telegram-бот. Если пусто — текст заявки копируется
     в буфер и открывается Telegram-чат (data-telegram). */
  if (form) {
    const status = $('[data-status]', form);
    const setStatus = (text, type) => { status.textContent = text; status.className = 'form__status' + (type ? ' is-' + type : ''); };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const phoneField = phoneInput.closest('.field');
      if ((data.phone || '').replace(/\D/g, '').length !== 12) {
        phoneField.classList.add('is-invalid');
        setStatus('Укажите телефон в формате +375 (XX) XXX-XX-XX', 'error');
        phoneInput.focus();
        return;
      }
      phoneField.classList.remove('is-invalid');

      const endpoint = form.dataset.endpoint;
      const submitBtn = form.querySelector('[type="submit"]');
      if (endpoint) {
        submitBtn.disabled = true;
        setStatus('Отправляем…');
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          setStatus('Спасибо! Заявка отправлена — скоро перезвоним.', 'ok');
        } catch (err) {
          setStatus('Не удалось отправить. Позвоните нам — так быстрее.', 'error');
        } finally {
          submitBtn.disabled = false;
        }
        return;
      }

      const text = [
        'Заявка с сайта',
        'Услуга: ' + data.service,
        data.name && 'Имя: ' + data.name,
        'Телефон: ' + data.phone,
        data.car && 'Авто / отопитель: ' + data.car,
        data.message && data.message,
      ].filter(Boolean).join('\n');

      let copied = false;
      try { await navigator.clipboard.writeText(text); copied = true; } catch (err) { /* clipboard недоступен */ }
      window.open('https://t.me/' + encodeURIComponent(form.dataset.telegram), '_blank', 'noopener');
      setStatus(copied
        ? 'Текст заявки скопирован — вставьте его в открывшийся чат Telegram.'
        : 'Открываем Telegram — напишите нам или просто позвоните.', 'ok');
    });
  }

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
