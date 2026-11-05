
'use strict';

// BESA SECURITY - app.js v2.7
// Fushat dinamike, validimi dhe dergimi i aplikimit.

(function () {
  const form = document.querySelector('#application');
  if (!form) return;

  const message = document.querySelector('#message');
  const today = document.querySelector('#today');
  const submitButton = form.querySelector('[type="submit"]');
  const dateInput = form.querySelector('[name="data_lindjes"]');
  const patentSelect = form.querySelector('[name="patente"]');
  const categories = form.querySelectorAll('[name="kategorite"]');

  function showMessage(text, isError = false) {
    if (!message) return;

    message.textContent = text;
    message.style.color = isError ? '#b91c1c' : '#15803d';
  }

  function currentDate() {
    const now = new Date();

    return [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0'),
      now.getFullYear()
    ].join('.');
  }

  if (today) {
    today.textContent = currentDate();
  }

  // ==========================================
  // FUSHAT DINAMIKE
  // ==========================================

  function conditionMatches(rule) {
    if (!rule || !rule.includes(':')) return false;

    const index = rule.indexOf(':');
    const name = rule.slice(0, index).trim();
    const expected = rule.slice(index + 1).trim();

    const field = form.elements.namedItem(name);

    if (!field || field.disabled) return false;

    const value = String(field.value || '').trim();

    if (expected.startsWith('!')) {
      return value !== '' &&
        value !== expected.slice(1);
    }

    return value === expected;
  }

  function updateConditionalFields() {
    // Perseritja lejon kushtet e varura:
    // denuar -> denuar_status -> denuar_arsye.

    for (let pass = 0; pass < 2; pass++) {
      form.querySelectorAll('[data-show]').forEach(container => {
        const visible = conditionMatches(
          container.dataset.show
        );

        container.classList.toggle('hidden', !visible);
        container.hidden = !visible;

        container.querySelectorAll(
          'input, select, textarea'
        ).forEach(control => {
          if (!visible) {
            // Pastro vetem kur kalon
            // ne gjendje te fshehur.

            if (!control.disabled) {
              if (
                control.type === 'checkbox' ||
                control.type === 'radio'
              ) {
                control.checked = false;
              } else {
                control.value = '';
              }
            }

            control.disabled = true;
            control.required = false;

          } else {
            control.disabled = false;

            control.required =
              control.type !== 'checkbox' &&
              control.type !== 'radio' &&
              control.type !== 'file' &&
              !control.hasAttribute('data-optional');
          }
        });
      });
    }
  }

  // ==========================================
  // VALIDIMI I DATES SE LINDJES
  // ==========================================

  function validateBirthDate() {
    if (!dateInput) return true;

    const value = dateInput.value.trim();

    dateInput.setCustomValidity('');

    const match = value.match(
      /^(\d{2})\.(\d{2})\.(\d{4})$/
    );

    if (!match) {
      dateInput.setCustomValidity(
        'Shkruaj daten ne formatin DD.MM.VVVV.'
      );
      return false;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const parsed = new Date(
      year,
      month - 1,
      day
    );

    const valid =
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day &&
      parsed <= new Date() &&
      year >= 1900;

    if (!valid) {
      dateInput.setCustomValidity(
        'Data e lindjes nuk eshte e vlefshme.'
      );
    }

    return valid;
  }

  // ==========================================
  // VALIDIMI I PATENTES
  // ==========================================

  function validatePatent() {
    if (!patentSelect || patentSelect.value !== 'Po') {
      return true;
    }

    const selected = Array.from(categories).some(
      checkbox => checkbox.checked
    );

    if (selected) return true;

    showMessage(
      'Zgjidh te pakten nje kategori te patentes.',
      true
    );

    form.querySelector(
      '[data-show="patente:Po"]'
    )?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    return false;
  }

  // ==========================================
  // VALIDIMI I DOKUMENTEVE
  // ==========================================

  function validateFiles() {
    const fileInputs = form.querySelectorAll(
      'input[type="file"]'
    );

    for (const input of fileInputs) {
      if (input.disabled) continue;

      const file = input.files?.[0];

      if (!file) {
        if (input.required) {
          showMessage(
            'Ngarko dokumentet e detyrueshme.',
            true
          );
          return false;
        }

        continue;
      }

      const extension = file.name
        .split('.')
        .pop()
        .toLowerCase();

      const allowedExtensions = [
        'pdf',
        'jpg',
        'jpeg',
        'png'
      ];

      const validExtension =
        allowedExtensions.includes(extension);

      const validSize =
        file.size <= 5 * 1024 * 1024;

      if (!validExtension || !validSize) {
        showMessage(
          'Dokumentet duhet te jene PDF, JPG ose PNG, maksimumi 5 MB.',
          true
        );

        return false;
      }
    }

    return true;
  }

  // ==========================================
  // EVENTET
  // ==========================================

  form.addEventListener(
    'change',
    updateConditionalFields
  );

  if (dateInput) {
    dateInput.addEventListener('input', () => {
      dateInput.setCustomValidity('');
    });

    dateInput.addEventListener('blur', () => {
      if (dateInput.value.trim()) {
        validateBirthDate();
      }
    });
  }

  // ==========================================
  // DERGIMI I APLIKIMIT
  // ==========================================

  form.addEventListener('submit', async event => {
    event.preventDefault();

    showMessage('');

    updateConditionalFields();

    if (!validateBirthDate()) {
      dateInput?.reportValidity();
      return;
    }

    if (!form.reportValidity()) {
      return;
    }

    if (!validatePatent()) {
      return;
    }

    if (!validateFiles()) {
      return;
    }

    if (typeof window.besaSubmit !== 'function') {
      showMessage(
        'Sistemi i dergimit nuk eshte ngarkuar. Rifresko faqen.',
        true
      );

      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Duke derguar...';
    }

    try {
      const result = await window.besaSubmit(form);

      const number = result?.number == null
        ? ''
        : String(result.number).padStart(4, '0');

      showMessage(
        number
          ? 'Aplikimi u dergua me sukses! Nr. i aplikimit: ' + number
          : 'Aplikimi u dergua me sukses!',
        false
      );

      updateConditionalFields();

      if (today) {
        today.textContent = currentDate();
      }

    } catch (error) {
      console.error(
        'Gabim gjate aplikimit:',
        error
      );

      showMessage(
        'Aplikimi nuk u dergua: ' +
        (error?.message || 'Gabim i panjohur.'),
        true
      );

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Dergo aplikimin';
      }
    }
  });

  // ==========================================
  // GJENDJA FILLESTARE
  // ==========================================

  updateConditionalFields();

})();
