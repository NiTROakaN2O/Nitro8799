(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');

  const header = document.querySelector('[data-header]');
  const nav = document.querySelector('[data-nav]');
  const burger = document.querySelector('[data-burger]');
  const quickbar = document.querySelector('[data-quickbar]');
  const hero = document.querySelector('.hero');

  /* ---------- Header: background on scroll, hide on scroll down ---------- */
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);

    const menuOpen = nav.classList.contains('is-open');
    if (!menuOpen) header.classList.toggle('is-hidden', y > lastY && y > 400);

    if (quickbar && hero) {
      const contacts = document.getElementById('contacts');
      const pastHero = y > hero.offsetHeight * 0.6;
      const atContacts = contacts && contacts.getBoundingClientRect().top < window.innerHeight * 0.6;
      quickbar.classList.toggle('is-visible', pastHero && !atContacts);
    }

    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
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
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal, .step');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Phone mask (+375) ---------- */
  const phoneInput = document.querySelector('input[name="phone"]');
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

  /* ---------- Form ----------
     data-endpoint — URL для POST (JSON). Например, ваш backend, Formspree или
     serverless-функция, отправляющая заявку в Telegram-бот.
     Если endpoint пуст — открывается Telegram с готовым текстом заявки. */
  const form = document.querySelector('[data-form]');
  if (form) {
    const status = form.querySelector('[data-status]');
    const setStatus = (text, type) => {
      status.textContent = text;
      status.className = 'form__status' + (type ? ' is-' + type : '');
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const phoneField = phoneInput.closest('.field');
      const digits = (data.phone || '').replace(/\D/g, '');

      if (digits.length !== 12) {
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
        data.name && 'Имя: ' + data.name,
        'Телефон: ' + data.phone,
        data.car && 'Авто: ' + data.car,
        'Услуга: ' + data.service,
        data.message && 'Комментарий: ' + data.message,
      ].filter(Boolean).join('\n');

      let copied = false;
      try { await navigator.clipboard.writeText(text); copied = true; } catch (err) { /* clipboard недоступен */ }
      window.open('https://t.me/' + encodeURIComponent(form.dataset.telegram), '_blank', 'noopener');
      setStatus(copied
        ? 'Текст заявки скопирован — вставьте его в открывшийся чат Telegram.'
        : 'Открываем Telegram — напишите нам или просто позвоните.', 'ok');
    });
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
