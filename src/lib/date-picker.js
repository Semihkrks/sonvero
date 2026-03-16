import flatpickr from 'flatpickr';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';

const pickerMap = new WeakMap();

function isDateInput(node) {
  return node instanceof HTMLInputElement && node.type === 'date';
}

export function attachDatePicker(input, options = {}) {
  if (!input) return null;

  const prev = pickerMap.get(input);
  if (prev) {
    prev.destroy();
    pickerMap.delete(input);
  }

  const instance = flatpickr(input, {
    locale: Turkish,
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd.m.Y',
    disableMobile: true,
    allowInput: false,
    ...options,
  });

  pickerMap.set(input, instance);
  return instance;
}

export function attachDatePickersIn(root = document, options = {}) {
  const dateInputs = [];

  if (isDateInput(root)) {
    dateInputs.push(root);
  } else if (root?.querySelectorAll) {
    dateInputs.push(...root.querySelectorAll('input[type="date"]'));
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
