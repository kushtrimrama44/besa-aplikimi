
'use strict';

// BESA SECURITY
// app.js v1.3
// Menaxhimi i fushave dinamike dhe dergimi i aplikimit

(function () {
  const form = document.querySelector('#application');
  if (!form) return;

  const message = document.querySelector('#message');
  const today = document.querySelector('#today');
  const submitButton = form.querySelector('[type="submit"]');

  const dateInput = form.querySelector(
    '[name="data_lindjes"]'
  );

  const patentSelect = form.querySelector(
    '[name="patente"]'
  );

  const categories = form.querySelectorAll(
    '[name="kategorite"]'
  );

  function showMessage(text, isError) {
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

  // ------------------------------------------
  // FUSHAT DINAMIKE
  // ------------------------------------------

  function conditionMatches(rule) {
    if (!rule) return false;

    const separator = rule.indexOf(':');

    if (separator === -1) return false;

    const fieldName = rule.slice(0, separator).trim();
    const expected = rule.slice(separator + 1).trim();

    const field = form.elements.namedItem(fieldName);

    if (!field) return false;

    const value = String(field.value || '').trim();

    if (expected.startsWith('!')) {
      const excluded = expected.slice(1);

      // Fusha shfaqet vetem pasi te jete bere
      // nje zgjedhje e vlefshme.
      return value !== '' && value !== excluded;
    }

    return value === expected;
  }

  function updateConditionalFields() {
    const containers = form.querySelectorAll(
      '[data-show]'
    );

    containers.forEach(container => {
      const rule = container.dataset.show;
      const visible = conditionMatches(rule);

      container.classList.toggle('hidden', !visible);
      container.hidden = !visible;

      const controls = container.querySelectorAll(
        'input, select, textarea'
      );

      controls.forEach(control => {
        if (!visible) {
          if (control.type === 'checkbox' ||
              control.type === 'radio') {
            control.checked = false;
          } else if (control.type !== 'file') {
            control.value = '';
          } else {
            control.value = '';
          }

          control.disabled = true;
          control.required = false;
        } else {
          control.disabled = false;

          // Fushat tekstuale te shfaqura jane
          // te detyrueshme, pervec rasteve
          // kur kane atributin data-optional.
          if (
            control.type !== 'checkbox' &&
            control.type !== 'radio' &&
            control.type !== 'file' &&
            !control.hasAttribute('data-optional')
          ) {
            control.required = true;
          }
        }
      });
    });
  }

  // ------------------------------------------
  // VALIDIMI I DATES SE LINDJES
  // ------------------------------------------

  function validateBirthDate() {
    if (!dateInput) return true;

    const value = dateInput.value.trim();

    dateInput.setCustomValidity('');

    if (!value) return false;

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
      return false;
    }

    return true;
  }

  // ------------------------------------------
  // VALIDIMI I PATENTES
  // ------------------------------------------

  function validatePatent() {
    if (!patentSelect) return true;

    const value = patentSelect.value;

    if (value !== 'Po') return true;

    const selected = Array.from(categories).some(
      checkbox => checkbox.checked
    );

    if (!selected) {
      showMessage(
        'Zgjidh te pakten nje kategori te patentes.',
        true
      );

      const container = form.querySelector(
        '[data-show="patente:Po"]'
      );

      if (container) {
        container.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }

      return false;
    }

    return true;
  }

  // ------------------------------------------
  // VALIDIMI I DOKUMENTEVE
  // ------------------------------------------

  function validateFiles() {
    const fileInputs = form.querySelectorAll(
      'input[type="file"]'
    );

    const allowedExtensions = [
      'pdf',
      'jpg',
      'jpeg',
      'png'
    ];

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

      if (
        !allowedExtensions.includes(extension) ||
        file.size > 5 * 1024 * 1024
      ) {
        showMessage(
          'Dokumentet duhet te jene PDF, JPG ose PNG, maksimumi 5 MB.',
          true
        );
        return false;
      }
    }

    return true;
  }

  // ------------------------------------------
  // EVENTET
  // ------------------------------------------

  form.addEventListener('change', () => {
    updateConditionalFields();
  });

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

  // ------------------------------------------
  // DERGIMI I APLIKIMIT
  // ------------------------------------------

  form.addEventListener('submit', async event => {
    event.preventDefault();

    showMessage('', false);

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
      console.error('Gabim gjate aplikimit:', error);

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

  // Gjendja fillestare e formularit.
  updateConditionalFields();

})();
