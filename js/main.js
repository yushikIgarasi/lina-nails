/* ================= Настройки записи =================
   Поменяйте под график мастера. */
const BOOKING = {
  // время начала сеансов
  slots: ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30'],
  // выходные: 0 — воскресенье, 1 — понедельник … 6 — суббота
  daysOff: [],
  // на сколько месяцев вперёд можно записаться
  monthsAhead: 2,
};

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* ---------- Маска телефона: +7 (999) 123-45-67 ---------- */
function initPhoneMask(input) {
  const format = (value) => {
    let digits = value.replace(/\D/g, '');
    if (!digits) return '';
    if (digits[0] === '8') digits = '7' + digits.slice(1);
    if (digits[0] !== '7') digits = '7' + digits;
    digits = digits.slice(0, 11);

    const d = digits.slice(1);
    let out = '+7';
    if (d.length) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  };

  input.addEventListener('input', () => {
    input.value = format(input.value);
  });

  input.addEventListener('focus', () => {
    if (!input.value) input.value = '+7 (';
  });

  input.addEventListener('blur', () => {
    if (input.value.replace(/\D/g, '').length <= 1) input.value = '';
  });
}

const isPhoneValid = (value) => value.replace(/\D/g, '').length === 11;

/* ---------- Telegram: всегда с @ ---------- */
function initTelegram(input) {
  input.addEventListener('blur', () => {
    const v = input.value.trim().replace(/^(https?:\/\/)?(www\.)?(t|telegram)\.me\//i, '').replace(/^@+/, '');
    input.value = v ? '@' + v : '';
  });
}

/* ---------- Календарь ---------- */
function initDatepicker(root) {
  const toggle = root.querySelector('.datepicker__toggle');
  const valueEl = root.querySelector('.datepicker__value');
  const popup = root.querySelector('.datepicker__popup');
  const monthEl = root.querySelector('.datepicker__month');
  const daysEl = root.querySelector('.datepicker__days');
  const timesEl = root.querySelector('.datepicker__times');
  const slotsEl = root.querySelector('.datepicker__slots');
  const prevBtn = root.querySelector('[data-nav="-1"]');
  const nextBtn = root.querySelector('[data-nav="1"]');
  const dateInput = root.querySelector('input[name="date"]');
  const timeInput = root.querySelector('input[name="time"]');

  const today = startOfDay(new Date());
  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + BOOKING.monthsAhead, 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + BOOKING.monthsAhead + 1, 0);

  let view = new Date(minMonth);
  let selectedDate = null;
  let selectedTime = null;

  const isDayAvailable = (d) =>
    d >= today && d <= lastDay && !BOOKING.daysOff.includes(d.getDay()) && availableSlots(d).length > 0;

  function availableSlots(d) {
    if (d.getTime() !== today.getTime()) return BOOKING.slots;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes() + 60; // минимум за час
    return BOOKING.slots.filter((s) => {
      const [h, m] = s.split(':').map(Number);
      return h * 60 + m >= nowMinutes;
    });
  }

  function renderDays() {
    monthEl.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
    prevBtn.disabled = view <= minMonth;
    nextBtn.disabled = view >= maxMonth;

    daysEl.innerHTML = '';
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // неделя с понедельника
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

    for (let i = 0; i < offset; i++) daysEl.append(document.createElement('span'));

    for (let day = 1; day <= count; day++) {
      const d = new Date(view.getFullYear(), view.getMonth(), day);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'datepicker__day';
      btn.textContent = day;
      btn.dataset.date = toISO(d);
      btn.setAttribute('aria-label', `${day} ${MONTHS_GEN[d.getMonth()]}`);
      if (!isDayAvailable(d)) btn.disabled = true;
      if (d.getTime() === today.getTime()) btn.classList.add('is-today');
      if (selectedDate && d.getTime() === selectedDate.getTime()) {
        btn.classList.add('is-selected');
        btn.setAttribute('aria-pressed', 'true');
      }
      daysEl.append(btn);
    }
  }

  function renderSlots() {
    if (!selectedDate) {
      timesEl.hidden = true;
      return;
    }
    const free = availableSlots(selectedDate);
    slotsEl.innerHTML = '';
    BOOKING.slots.forEach((s) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'datepicker__slot';
      btn.textContent = s;
      btn.dataset.time = s;
      if (!free.includes(s)) btn.disabled = true;
      if (s === selectedTime) btn.classList.add('is-selected');
      slotsEl.append(btn);
    });
    timesEl.hidden = false;
  }

  function updateValue() {
    if (selectedDate && selectedTime) {
      const d = selectedDate;
      valueEl.textContent = `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]} · ${selectedTime}`;
      valueEl.classList.remove('is-empty');
      dateInput.value = toISO(d);
      timeInput.value = selectedTime;
    } else {
      valueEl.textContent = 'Выберите удобное время';
      valueEl.classList.add('is-empty');
      dateInput.value = '';
      timeInput.value = '';
    }
  }

  function open() {
    if (selectedDate) view = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderDays();
    renderSlots();
    popup.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);
  }

  function close({ focus = false } = {}) {
    popup.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside);
    document.removeEventListener('keydown', onKey);
    if (focus) toggle.focus();
  }

  function onOutside(e) {
    if (!root.contains(e.target)) close();
  }

  function onKey(e) {
    if (e.key === 'Escape') close({ focus: true });
  }

  toggle.addEventListener('click', () => (popup.hidden ? open() : close()));

  prevBtn.addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    renderDays();
  });

  nextBtn.addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    renderDays();
  });

  daysEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.datepicker__day');
    if (!btn || btn.disabled) return;
    const [y, m, d] = btn.dataset.date.split('-').map(Number);
    selectedDate = new Date(y, m - 1, d);
    if (selectedTime && !availableSlots(selectedDate).includes(selectedTime)) selectedTime = null;
    renderDays();
    renderSlots();
    updateValue();
  });

  slotsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.datepicker__slot');
    if (!btn || btn.disabled) return;
    selectedTime = btn.dataset.time;
    updateValue();
    close({ focus: true });
  });

  return {
    reset() {
      selectedDate = null;
      selectedTime = null;
      updateValue();
    },
  };
}

/* ---------- Отправка заявки ----------
   Сайт-портфолио: заявка никуда не уходит, форма только показывает,
   как будет выглядеть запись. Для реальной отправки замените эту функцию. */
async function sendBooking() {}

function initBookingForm(form) {
  const phone = form.elements.phone;
  const service = form.elements.service;
  const errorEl = form.querySelector('.form__error');
  const submitBtn = form.querySelector('.form__submit');
  const success = form.parentElement.querySelector('.form__success');

  initPhoneMask(phone);
  initTelegram(form.elements.telegram);
  const picker = initDatepicker(form.querySelector('[data-datepicker]'));

  const showError = (text) => {
    errorEl.textContent = text;
    errorEl.hidden = !text;
  };

  [phone, service].forEach((el) =>
    el.addEventListener('input', () => {
      el.classList.remove('is-invalid');
      showError('');
    }),
  );
  service.addEventListener('change', () => service.classList.remove('is-invalid'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const problems = [];
    if (!isPhoneValid(phone.value)) {
      phone.classList.add('is-invalid');
      problems.push('телефон');
    }
    if (!service.value) {
      service.classList.add('is-invalid');
      problems.push('услугу');
    }
    if (problems.length) {
      showError(`Пожалуйста, укажите ${problems.join(' и ')}`);
      form.querySelector('.is-invalid').focus();
      return;
    }

    const data = {
      phone: phone.value,
      telegram: form.elements.telegram.value,
      service: service.value,
      design: [...form.querySelectorAll('input[name="design"]:checked')].map((i) => i.value),
      date: form.elements.date.value,
      time: form.elements.time.value,
      comment: form.elements.comment.value.trim(),
    };

    submitBtn.disabled = true;
    try {
      await sendBooking(data);
      form.reset();
      picker.reset();
      form.hidden = true;
      success.hidden = false;
    } catch {
      showError('Не получилось отправить заявку. Попробуйте ещё раз или напишите мастеру напрямую.');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

const bookingForm = document.getElementById('booking-form');
if (bookingForm) initBookingForm(bookingForm);

/* ---------- Меню ---------- */
function initNav(nav) {
  const burger = nav.querySelector('.nav__burger');
  const menu = nav.querySelector('.nav__menu');
  const links = [...nav.querySelectorAll('.nav__links a')];

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };

  burger.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) setOpen(false);
  });

  // подсвечиваем пункт раздела, который сейчас на экране
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => observer.observe(s));
}

const nav = document.querySelector('.nav');
if (nav) initNav(nav);
