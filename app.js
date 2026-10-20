
'use strict';

// ============================================
// BESA SECURITY - APLIKIM PER PUNE
// app.js - Versioni i perditesuar
// ============================================

const form = document.querySelector('#application');
const $ = id => document.getElementById(id);

// ============================================
// DATA AKTUALE
// ============================================

const localDate = () =>
  new Intl.DateTimeFormat('sq-AL', {
    timeZone: 'Europe/Belgrade',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());

if ($('today')) {
  $('today').textContent = localDate();
}

// ============================================
// SHFAQJA DINAMIKE E FUSHAVE
// ============================================

function toggle(el, visible) {
  el.classList.toggle('hidden', !visible);

  el.querySelectorAll('input,select,textarea')
    .forEach(input => {
      input.disabled = !visible;

      if (!visible) {
        if (
          input.type === 'checkbox' ||
          input.type === 'radio'
        ) {
          input.checked = false;
        } else {
          input.value = '';
        }
      }

      if (
        input.type !== 'checkbox' &&
        input.type !== 'radio'
      ) {
        input.required =
          visible && el.querySelector('b') !== null;
      }
    });
}

function update() {

  // Fushat qe perdorin data-show
  document.querySelectorAll('[data-show]')
    .forEach(el => {
      const [id, want] = el.dataset.show.split(':');
      const source = $(id);

      if (!source) return;

      const val = source.value;

      const parentCondition =
        id === 'statusi' &&
        form.elements.denuar?.value !== 'Po';

      const visible =
        !parentCondition &&
        !!val &&
        (
          want.startsWith('!')
            ? val !== want.slice(1)
            : val === want
        );

      toggle(el, visible);
    });

  // Fushat qe perdorin data-radio
  document.querySelectorAll('[data-radio]')
    .forEach(el => {
      const [name, want] = el.dataset.radio.split(':');
      const field = form.elements[name];

      if (!field) return;

      toggle(el, field.value === want);
    });

  // ============================================
  // EMRI I BANKES - OPSIONI TJETER
  // ============================================

  const banka = $('emri_bankes');
  const bankaTjeter = $('emri_bankes_tjeter');

  if (banka && bankaTjeter) {
    const isOther =
      banka.value === 'Tjeter' ||
      banka.value === 'Tjetër';

    const container =
      bankaTjeter.closest('[data-show]') ||
      bankaTjeter.closest('.conditional-field') ||
      bankaTjeter.parentElement;

    if (container) {
      container.classList.toggle('hidden', !isOther);
    }

    bankaTjeter.disabled = !isOther;
    bankaTjeter.required = isOther;

    if (!isOther) {
      bankaTjeter.value = '';
    }
  }
}

if (form) {
  form.addEventListener('change', update);
  update();
}

// ============================================
// DATA E LINDJES - DD.MM.VVVV
// ============================================

const birthDate = $('data_lindjes');

function validBirthDate(value) {
  const match =
    /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);

  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  const now = new Date();

  return (
    year >= 1900 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getTime() <= now.getTime()
  );
}

if (birthDate) {

  birthDate.addEventListener('input', () => {
    const digits = birthDate.value
      .replace(/\D/g, '')
      .slice(0, 8);

    birthDate.value = [
      digits.slice(0, 2),
      digits.slice(2, 4),
      digits.slice(4, 8)
    ]
      .filter(Boolean)
      .join('.');

    birthDate.setCustomValidity('');
  });

  birthDate.addEventListener('blur', () => {
    birthDate.setCustomValidity(
      !birthDate.value ||
      validBirthDate(birthDate.value)
        ? ''
        : 'Shkruani nje date te vlefshme DD.MM.VVVV.'
    );
  });
}

// ============================================
// VALIDIMI DHE DERGIMI I FORMULARIT
// ============================================

if (form) {

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const message = $('message');

    if (message) {
      message.textContent = '';
    }

    update();

    // Kontrollo daten e lindjes
    if (birthDate) {
      const valid = validBirthDate(birthDate.value);

      birthDate.setCustomValidity(
        valid
          ? ''
          : 'Shkruani nje date te vlefshme DD.MM.VVVV.'
      );
    }

    if (!form.reportValidity()) {
      return;
    }

    // ========================================
    // VALIDIMI I BANKES
    // ========================================

    const banka = $('emri_bankes');
    const bankaTjeter = $('emri_bankes_tjeter');

    if (banka) {
      if (!banka.value) {
        if (message) {
          message.textContent =
            'Ju lutem zgjidhni banken.';
        }
        banka.focus();
        return;
      }

      if (
        (banka.value === 'Tjeter' ||
         banka.value === 'Tjetër') &&
        (!bankaTjeter || !bankaTjeter.value.trim())
      ) {
        if (message) {
          message.textContent =
            'Shkruani emrin e bankes tjeter.';
        }

        bankaTjeter?.focus();
        return;
      }
    }

    // ========================================
    // VALIDIMI I PATENTES
    // ========================================

    const categories = [
      ...form.querySelectorAll(
        'input[name="kategorite"]:checked'
      )
    ];

    const patente = form.elements.patente;

    if (
      patente?.value === 'Po' &&
      !categories.length
    ) {
      if (message) {
        message.textContent =
          'Zgjidhni te pakten nje kategori te patentes.';
      }
      return;
    }

    // ========================================
    // VALIDIMI I DOKUMENTEVE
    // ========================================

    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ];

    for (
      const input of form.querySelectorAll(
        'input[type="file"]'
      )
    ) {
      for (const file of input.files) {
        if (
          !allowed.includes(file.type) ||
          file.size > 5 * 1024 * 1024
        ) {
          if (message) {
            message.textContent =
              'Dokumenti ' + file.name +
              ' duhet te jete PDF/JPG/PNG ' +
              'dhe jo mbi 5 MB.';
          }
          return;
        }
      }
    }

    // ========================================
    // DERGIMI NE SUPABASE
    // ========================================

    const button = form.querySelector(
      'button[type="submit"]'
    );

    if (button) {
      button.disabled = true;
    }

    if (message) {
      message.textContent =
        'Duke derguar aplikimin...';
    }

    try {
      const id = await window.besaSubmit(form);

      if (message) {
        message.textContent =
          'Aplikimi u dergua me sukses!';
      }

    } catch (err) {
      if (message) {
        message.textContent =
          'Aplikimi nuk u dergua: ' +
          err.message;
      }
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  });
}
