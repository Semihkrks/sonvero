import flatpickr from 'flatpickr';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';

const pickerMap = new WeakMap();

function isDateInput(node) {
  return node instanceof HTMLInputElement && node.type === 'date' && !node.closest('.sv-workspace,.sv-form');
}

// Orijinal tarih alanının erişilebilir adı: aria-label > aria-labelledby > <label for> > saran <label> > placeholder.
function accessibleName(input) {
  const direct = input.getAttribute('aria-label');
  if (direct) return direct.trim();
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
    if (text) return text;
  }
  const fromLabels = input.labels?.length ? [...input.labels].map((l) => l.textContent || '').join(' ').trim() : '';
  if (fromLabels) return fromLabels.replace(/\s+/g, ' ');
  const group = input.closest('.filter-group,.form-group');
  const groupLabel = group?.querySelector('label,.filter-label,.form-label')?.textContent?.trim();
  if (groupLabel) return groupLabel;
  return input.getAttribute('placeholder') || 'Tarih';
}

function labelAltInput(instance, input, name) {
  const alt = instance?.altInput;
  if (!alt) return;
  alt.setAttribute('aria-label', name);
  if (input.id && !alt.id) alt.id = `${input.id}__display`;
}

export function attachDatePicker(input, options = {}) {
  if (!input) return null;

  const prev = pickerMap.get(input);
  if (prev) {
    prev.destroy();
    pickerMap.delete(input);
  }

  // Ad, flatpickr orijinal alanı type=hidden yapmadan (labels kaybolmadan) önce okunur.
  const name = accessibleName(input);
  const userOnReady = options.onReady;
  const instance = flatpickr(input, {
    locale: Turkish,
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd.m.Y',
    disableMobile: true,
    allowInput: false,
    ...options,
    onReady: [
      (_dates, _str, fp) => labelAltInput(fp, input, name),
      ...(Array.isArray(userOnReady) ? userOnReady : userOnReady ? [userOnReady] : []),
    ],
  });
  // onReady altInput oluşmadan da tetiklenebilir; oluşturulduktan sonra garanti et.
  labelAltInput(instance, input, name);

  pickerMap.set(input, instance);
  return instance;
}

export function attachDatePickersIn(root = document, options = {}) {
  const dateInputs = [];

  if (isDateInput(root)) {
    dateInputs.push(root);
  } else if (root?.querySelectorAll) {
    // React çalışma alanı (.sv-workspace/.sv-form) kendi tarih alanını yönetir; çift alan oluşmasın.
    dateInputs.push(...[...root.querySelectorAll('input[type="date"]')].filter(isDateInput));
  }

  dateInputs.forEach((input) => {
    if (input.dataset.datePicker === 'off') return;
    if (input._flatpickr) return;
    attachDatePicker(input, options);
  });
}

export function startDatePickerAutoBind(root = document.body, options = {}) {
  if (!root || typeof MutationObserver === 'undefined') return () => {};

  attachDatePickersIn(root, options);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;

        if (isDateInput(node)) {
          attachDatePickersIn(node, options);
          return;
        }

        attachDatePickersIn(node, options);
      });
    });
  });

  observer.observe(root, { childList: true, subtree: true });

  return () => observer.disconnect();
}
