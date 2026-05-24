import { initDarkMode, initLocaleSelector, initResponsiveTextareaRows } from '../js/page/page-shared.js';
import { loadConverters, convert, detectType } from '../js/converter.js';
import { svgCopy, svgTick } from '../js/svg.js';

// --- Shared UI ---
initDarkMode('dark-mode-toggle');
initResponsiveTextareaRows({ mobileRows: 5, desktopRows: 10 });
initLocaleSelector({ defaultLocale: 'mandarin' });

// --- DOM ---
const inputEl = document.getElementById('inputText');
const outputEl = document.getElementById('outputText');
const outputLabel = document.getElementById('outputLabel');
const copyBtn = document.getElementById('copy-output-btn');

// --- State ---
let debounceTimer = null;
let convMode = 'standard';

// --- Copy button ---
if (copyBtn) {
  copyBtn.innerHTML = svgCopy;
  copyBtn.addEventListener('click', () => {
    const text = outputEl?.value || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.innerHTML = svgTick;
      setTimeout(() => { copyBtn.innerHTML = svgCopy; }, 1500);
    });
  });
}

// --- Conversion mode ---
document.querySelectorAll('input[name="convMode"]').forEach(el => {
  el.addEventListener('change', () => {
    convMode = el.id === 'mode_taiwan' ? 'taiwan' : 'standard';
    runConversion();
  });
});

// --- Conversion ---
function runConversion() {
  const input = inputEl?.value || '';
  if (!input.trim()) {
    outputEl.value = '';
    if (outputLabel) outputLabel.textContent = outputLabel.dataset?.original || '輸出';
    return;
  }

  const type = detectType(input);
  let direction, labelFrom, labelTo;

  if (type === 'traditional') {
    direction = 't2s';
    labelFrom = '繁體';
    labelTo = '简体';
  } else {
    direction = 's2t';
    labelFrom = '简体';
    labelTo = '繁體';
  }

  if (outputLabel) {
    outputLabel.textContent = `${labelFrom} → ${labelTo}`;
  }
  outputEl.value = convert(input, direction, convMode);
}

// --- Debounced input ---
if (inputEl) {
  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runConversion, 50);
  });
}

// --- Initialize ---
loadConverters()
  .then(() => { runConversion(); })
  .catch(err => {
    console.error('Failed to load converters:', err);
    if (outputEl) outputEl.value = '轉換器加載失敗，請檢查網絡連接並刷新頁面。';
  });
