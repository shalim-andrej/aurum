/* ═══════════════════════════════════════════════════════════════════
   AURUM — бутик-отель 5★ · main.js
   Vanilla JS, без библиотек. Все эффекты уважают prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ────────────── 0. Общая среда ────────────── */
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isFinePointer  = window.matchMedia('(pointer: fine)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ────────────── 1. PRELOADER: проценты + занавес ────────────── */
  (function initPreloader() {
    var preloader = $('#preloader');
    var bar = $('#preloaderBar');
    var percent = $('#preloaderPercent');
    if (!preloader || !bar || !percent) return;

    var DURATION = prefersReduced ? 200 : 1500;
    var start = performance.now();
    var finished = false;

    function tick(now) {
      var t = Math.min((now - start) / DURATION, 1);
      var eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      var value = Math.round(eased * 100);
      bar.style.transform = 'scaleX(' + (eased) + ')';
      percent.textContent = value + '%';
      if (t < 1) {
        requestAnimationFrame(tick);
      } else if (!finished) {
        finished = true;
        setTimeout(finish, 250);
      }
    }

    function finish() {
      preloader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      // Запускаем reveal-анимации только после поднятия занавеса
      setTimeout(function () {
        preloader.style.display = 'none';
        initReveals();
      }, 950);
    }

    requestAnimationFrame(tick);
    // Страховка: если вкладка была в фоне и rAF замер
    setTimeout(function () { if (!finished) { finished = true; finish(); } }, DURATION + 1500);
  })();

  /* ────────────── 2. КАСТОМНЫЙ КУРСОР: точка + кольцо ────────────── */
  (function initCursor() {
    var cursor = $('#cursor');
    if (!cursor || !isFinePointer || prefersReduced) return;

    document.documentElement.classList.add('has-cursor');
    var dot = $('#cursorDot');
    var ring = $('#cursorRing');
    var mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    var ringX = mouseX, ringY = mouseY;

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX; mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
    }, { passive: true });

    // Плавное следование кольца через lerp в rAF
    (function loop() {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      requestAnimationFrame(loop);
    })();

    // Увеличение над интерактивными элементами
    var hoverSelector = 'a, button, select, input[type="date"], .gallery__item, [data-magnetic], [data-tilt]';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverSelector)) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverSelector)) cursor.classList.remove('is-hover');
    });
    document.addEventListener('mousedown', function () { cursor.classList.add('is-press'); });
    document.addEventListener('mouseup', function () { cursor.classList.remove('is-press'); });
  })();

  /* ────────────── 3. HEADER: стекло + активные ссылки + прогресс ────────────── */
  var header = $('#header');
  var progressBar = $('#progressBar');
  var toTop = $('#toTop');

  (function initScrollEffects() {
    var parallaxItems = $$('img[data-speed]');
    var ticking = false;

    function onScrollFrame() {
      var y = window.scrollY || window.pageYOffset;

      // Стекло шапки
      if (header) header.classList.toggle('header--scrolled', y > 40);

      // Золотая полоса прогресса
      if (progressBar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var progress = max > 0 ? Math.min(y / max, 1) : 0;
        progressBar.style.width = (progress * 100).toFixed(2) + '%';
      }

      // Кнопка «наверх»
      if (toTop) toTop.classList.toggle('is-visible', y > 600);

      // Параллакс картинок (data-speed)
      if (!prefersReduced) {
        var vh = window.innerHeight;
        parallaxItems.forEach(function (img) {
          var rect = img.parentElement.getBoundingClientRect();
          if (rect.bottom < -100 || rect.top > vh + 100) return; // вне экрана
          var speed = parseFloat(img.getAttribute('data-speed')) || 0.1;
          var centerDelta = (rect.top + rect.height / 2) - vh / 2;
          var shift = -centerDelta * speed;
          // Ограничиваем сдвиг запасом 18% высоты картинки
          var limit = rect.height * 0.09;
          if (shift > limit) shift = limit;
          if (shift < -limit) shift = -limit;
          img.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
        });
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); }
    }, { passive: true });

    onScrollFrame();
  })();

  /* ────────────── 4. БУРГЕР: полноэкранное меню со стаггером ────────────── */
  (function initBurger() {
    var burger = $('#burger');
    var menu = $('#mobileMenu');
    if (!burger || !menu) return;

    function toggle(force) {
      var open = typeof force === 'boolean' ? force : !document.body.classList.contains('menu-open');
      document.body.classList.toggle('menu-open', open);
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    }
    burger.addEventListener('click', function () { toggle(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) toggle(false);
    });
    // Ссылка «наверх» для закрытия из smooth-scroll хендлера
    window.__closeMobileMenu = function () { toggle(false); };
  })();

  /* ────────────── 5. SMOOTH ANCHORS с учётом высоты шапки ────────────── */
  (function initAnchors() {
    $$('a[data-anchor]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id === '#' || id.length < 2) return;
        var target = $(id);
        if (!target) return;
        e.preventDefault();
        if (typeof window.__closeMobileMenu === 'function') window.__closeMobileMenu();
        var headerH = header ? header.offsetHeight : 80;
        var top = target.getBoundingClientRect().top + window.scrollY - headerH + 1;
        window.scrollTo({ top: top, behavior: prefersReduced ? 'auto' : 'smooth' });
        try { history.replaceState(null, '', id); } catch (err) { /* file:// — тихо игнорируем */ }
      });
    });
  })();

  /* ────────────── 6. REVEALS через IntersectionObserver ────────────── */
  var revealsInitialized = false;
  function initReveals() {
    if (revealsInitialized) return;
    revealsInitialized = true;
    var items = $$('.reveal');
    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ────────────── 7. СЧЁТЧИКИ (42 · 5 · 800 · 9.8) ────────────── */
  (function initCounters() {
    var counters = $$('[data-count]');
    if (!counters.length) return;

    function animate(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      if (prefersReduced) { el.textContent = target.toFixed(decimals); return; }
      var duration = 1800;
      var start = performance.now();
      function frame(now) {
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (t < 1) requestAnimationFrame(frame);
        else el.textContent = target.toFixed(decimals);
      }
      requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) { counters.forEach(animate); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animate(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { io.observe(el); });
  })();

  /* ────────────── 8. MAGNETIC BUTTONS ────────────── */
  (function initMagnetic() {
    if (!isFinePointer || prefersReduced) return;
    $$('[data-magnetic]').forEach(function (btn) {
      var strength = 0.28;
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var dx = e.clientX - (rect.left + rect.width / 2);
        var dy = e.clientY - (rect.top + rect.height / 2);
        btn.style.transform = 'translate(' + (dx * strength).toFixed(1) + 'px,' + (dy * strength).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  })();

  /* ────────────── 9. 3D TILT карточек номеров ────────────── */
  (function initTilt() {
    if (!isFinePointer || prefersReduced) return;
    $$('[data-tilt]').forEach(function (card) {
      var MAX = 5; // градусов
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform =
          'perspective(900px) rotateX(' + (-py * MAX).toFixed(2) + 'deg) rotateY(' + (px * MAX).toFixed(2) + 'deg) translateY(-2px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  })();

  /* ────────────── 10. TOAST ────────────── */
  var toastTimer = null;
  function showToast(text) {
    var toast = $('#toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 3200);
  }

  /* ────────────── 11. ДАТЫ: min = сегодня, согласование заезд/выезд ────────────── */
  function toISO(date) {
    var tz = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tz).toISOString().slice(0, 10);
  }
  function addDays(iso, days) {
    var d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return toISO(d);
  }
  function setupDatePair(checkin, checkout) {
    if (!checkin || !checkout) return;
    var today = toISO(new Date());
    checkin.min = today;
    checkout.min = addDays(today, 1);
    checkin.addEventListener('change', function () {
      if (checkin.value) {
        checkout.min = addDays(checkin.value, 1);
        if (checkout.value && checkout.value <= checkin.value) checkout.value = addDays(checkin.value, 1);
      }
    });
  }
  setupDatePair($('#w-checkin'), $('#w-checkout'));
  setupDatePair($('#b-checkin'), $('#b-checkout'));

  /* ────────────── 12. WIDGET → предзаполнение формы #booking ────────────── */
  (function initWidget() {
    var widget = $('#widgetForm');
    if (!widget) return;
    widget.addEventListener('submit', function (e) {
      e.preventDefault();
      var checkin = $('#w-checkin'), checkout = $('#w-checkout');
      if (!checkin.value || !checkout.value) {
        showToast('Выберите даты заезда и выезда');
        return;
      }
      if (checkout.value <= checkin.value) {
        showToast('Дата выезда должна быть позже заезда');
        return;
      }
      // Переносим значения в большую форму
      var bCheckin = $('#b-checkin'), bCheckout = $('#b-checkout'),
          bGuests = $('#b-guests'), bRoom = $('#b-room');
      if (bCheckin) bCheckin.value = checkin.value;
      if (bCheckout) bCheckout.value = checkout.value;
      if (bGuests) bGuests.value = $('#w-guests') ? $('#w-guests').value : '2';
      if (bRoom && $('#w-room')) bRoom.value = $('#w-room').value;
      recalcPrice();

      // Скроллим к форме бронирования
      var target = $('#booking');
      if (target) {
        var headerH = header ? header.offsetHeight : 80;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerH + 1, behavior: prefersReduced ? 'auto' : 'smooth' });
      }
      showToast('Даты приняты');
    });
  })();

  /* ────────────── 13. КНОПКИ «ВЫБРАТЬ НОМЕР» → выбор типа в форме ────────────── */
  (function initRoomCTA() {
    $$('.room-card__cta').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-room');
        var bRoom = $('#b-room');
        if (bRoom && value) {
          bRoom.value = value;
          recalcPrice();
        }
        var target = $('#booking');
        if (target) {
          var headerH = header ? header.offsetHeight : 80;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerH + 1, behavior: prefersReduced ? 'auto' : 'smooth' });
        }
        showToast('Номер выбран — заполните форму');
      });
    });
  })();

  /* ────────────── 14. ЖИВОЙ РАСЧЁТ СТОИМОСТИ (ночи × цена) ────────────── */
  var ROOM_PRICES = { classic: 18000, panorama: 32000, president: 65000 };
  function pluralNights(n) {
    var mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'ночь';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'ночи';
    return 'ночей';
  }
  function formatRub(num) {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + ' ₽';
  }
  function recalcPrice() {
    var out = $('#bookingPrice');
    var checkin = $('#b-checkin'), checkout = $('#b-checkout'), room = $('#b-room');
    if (!out || !checkin || !checkout || !room) return;

    if (!checkin.value || !checkout.value) {
      out.textContent = 'Выберите даты заезда и выезда';
      return;
    }
    var ms = new Date(checkout.value + 'T12:00:00') - new Date(checkin.value + 'T12:00:00');
    var nights = Math.round(ms / 86400000);
    if (nights <= 0) {
      out.textContent = 'Дата выезда должна быть позже заезда';
      return;
    }
    var price = ROOM_PRICES[room.value] || parseInt((room.selectedOptions[0] || {}).getAttribute ? (room.selectedOptions[0].getAttribute('data-price') || '0') : '0', 10);
    var total = price * nights;
    out.innerHTML = 'Итого: <strong>' + formatRub(total) + '</strong> за ' + nights + ' ' + pluralNights(nights) +
                    '<small>завтрак включён</small>';
  }
  ['b-checkin', 'b-checkout', 'b-room'].forEach(function (id) {
    var el = $('#' + id);
    if (el) el.addEventListener('change', recalcPrice);
  });
  recalcPrice();

  /* ────────────── 15. МАСКА ТЕЛЕФОНА +7 (XXX) XXX-XX-XX ────────────── */
  (function initPhoneMask() {
    var phone = $('#b-phone');
    if (!phone) return;
    phone.addEventListener('input', function () {
      var d = phone.value.replace(/\D/g, '');
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (d && d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      var out = '';
      if (d.length > 0) out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 5) out += ') ' + d.slice(4, 7);
      if (d.length > 7) out += '-' + d.slice(7, 9);
      if (d.length > 9) out += '-' + d.slice(9, 11);
      phone.value = out;
    });
  })();

  /* ────────────── 16. ВАЛИДАЦИЯ + УСПЕХ ФОРМЫ БРОНИРОВАНИЯ ────────────── */
  (function initBookingForm() {
    var form = $('#bookingForm');
    var success = $('#bookingSuccess');
    if (!form || !success) return;

    function setError(id, has) {
      var input = $('#' + id);
      if (input) input.closest('.field').classList.toggle('field--error', has);
      return has;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#b-name'), phone = $('#b-phone'),
          checkin = $('#b-checkin'), checkout = $('#b-checkout');

      var invalid = false;
      invalid = setError('b-name', !name.value.trim() || name.value.trim().length < 2) || invalid;
      invalid = setError('b-phone', phone.value.replace(/\D/g, '').length !== 11) || invalid;
      invalid = setError('b-checkin', !checkin.value) || invalid;
      invalid = setError('b-checkout', !checkout.value || (checkin.value && checkout.value <= checkin.value)) || invalid;

      if (invalid) { showToast('Проверьте выделенные поля'); return; }

      // Анимация успеха
      form.classList.add('is-sent');
      success.classList.add('is-visible');
      success.setAttribute('aria-hidden', 'false');
      showToast('Заявка отправлена');
    });

    // Сброс ошибок при вводе
    $$('.field__input', form).forEach(function (input) {
      input.addEventListener('input', function () {
        input.closest('.field').classList.remove('field--error');
      });
    });

    // «Отправить ещё одну»
    var resetBtn = $('#bookingReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        success.classList.remove('is-visible');
        success.setAttribute('aria-hidden', 'true');
        form.classList.remove('is-sent');
        form.reset();
        recalcPrice();
      });
    }
  })();

  /* ────────────── 17. СЛАЙДЕР ОТЗЫВОВ: стрелки / точки / свайп / автоплей ────────────── */
  (function initSlider() {
    var track = $('#reviewsTrack');
    var slider = $('#reviewsSlider');
    var dotsWrap = $('#reviewsDots');
    if (!track || !slider || !dotsWrap) return;

    var slides = $$('.review', track);
    var index = 0;
    var autoplayDelay = 6000;
    var timer = null;

    // Точки
    var dots = slides.map(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'reviews__dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Отзыв ' + (i + 1));
      dot.addEventListener('click', function () { go(i, true); });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function render() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
    }
    function go(i, user) {
      index = (i + slides.length) % slides.length;
      render();
      if (user) restartAutoplay();
    }

    var prev = $('#reviewsPrev'), next = $('#reviewsNext');
    if (prev) prev.addEventListener('click', function () { go(index - 1, true); });
    if (next) next.addEventListener('click', function () { go(index + 1, true); });

    // Свайп (pointer events охватывают touch)
    var startX = null;
    slider.addEventListener('pointerdown', function (e) {
      startX = e.clientX;
    });
    slider.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var delta = e.clientX - startX;
      if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1), true);
      startX = null;
    });
    slider.addEventListener('pointercancel', function () { startX = null; });

    // Автоплей с паузой на hover/focus
    function startAutoplay() {
      if (prefersReduced || timer) return;
      timer = setInterval(function () { go(index + 1, false); }, autoplayDelay);
    }
    function stopAutoplay() { clearInterval(timer); timer = null; }
    function restartAutoplay() { stopAutoplay(); startAutoplay(); }

    slider.addEventListener('mouseenter', stopAutoplay);
    slider.addEventListener('mouseleave', startAutoplay);
    slider.addEventListener('focusin', stopAutoplay);
    slider.addEventListener('focusout', startAutoplay);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAutoplay(); else startAutoplay();
    });

    render();
    startAutoplay();
  })();

  /* ────────────── 18. LIGHTBOX ГАЛЕРЕИ ────────────── */
  (function initLightbox() {
    var items = $$('.gallery__item');
    var lightbox = $('#lightbox');
    if (!items.length || !lightbox) return;

    var img = $('#lightboxImg');
    var caption = $('#lightboxCaption');
    var counter = $('#lightboxCounter');
    var current = 0;

    function open(i) {
      current = (i + items.length) % items.length;
      var source = $('img', items[current]);
      var src = source ? source.getAttribute('src') : '';
      img.setAttribute('src', src);
      img.setAttribute('alt', source ? source.getAttribute('alt') : '');
      caption.textContent = items[current].getAttribute('data-caption') || '';
      counter.textContent = (current + 1) + ' / ' + items.length;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    items.forEach(function (item, i) {
      item.addEventListener('click', function () { open(i); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });

    $('#lightboxClose').addEventListener('click', close);
    $('#lightboxPrev').addEventListener('click', function () { open(current - 1); });
    $('#lightboxNext').addEventListener('click', function () { open(current + 1); });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close(); // клик по затемнению
    });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') open(current - 1);
      if (e.key === 'ArrowRight') open(current + 1);
    });
  })();

  /* ────────────── 19. КНОПКА «НАВЕРХ» ────────────── */
  (function initToTop() {
    if (!toTop) return;
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  })();

  /* ────────────── 20. FALLBACK ВИДЕО HERO → градиент ────────────── */
  (function initVideoFallback() {
    var video = $('#heroVideo');
    var hero = $('#hero');
    if (!video || !hero) return;

    function fallback() {
      hero.classList.add('hero--fallback');
      if (video.parentNode) video.parentNode.removeChild(video);
    }
    if (!video.canPlayType || !video.canPlayType('video/mp4')) { fallback(); return; }
    video.addEventListener('error', fallback);
    var source = $('source', video);
    if (source) source.addEventListener('error', fallback);
    // Если метаданные так и не загрузились — оставляем постер, ошибкой это не является
  })();

  /* ────────────── 21. ПОЛИТИКА (функциональная кнопка) + АКТИВНАЯ ССЫЛКА МЕНЮ ────────────── */
  (function initMisc() {
    var policy = $('#policyLink');
    if (policy) {
      policy.addEventListener('click', function () {
        showToast('Документ доступен на стойке ресепшн и по запросу консьержа');
      });
    }

    // Подсветка активного пункта навигации
    var navLinks = $$('.header__link[data-anchor]');
    var sections = navLinks.map(function (l) { return $(l.getAttribute('href')); });
    if ('IntersectionObserver' in window && sections.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var idx = sections.indexOf(entry.target);
          navLinks.forEach(function (l, i) { l.classList.toggle('is-active', i === idx); });
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      sections.forEach(function (s) { if (s) io.observe(s); });
    }
  })();

})();
