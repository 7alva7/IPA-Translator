/**
 * IPA Translation Page Initialization
 * FOR: index.html pages only (translation UI)
 */

import { loadIPADatabase, normalizeIPAData, isElementChecked, setElementValue, setElementValueAnimated } from '../utils.js';
import { formatPairIPAs, formatAsJSON, formatAsCSV } from '../format-display.js';
import { initSpeakButton } from '../tts.js';
import { getShareModal, parseShareFromUrl, clearShareParams } from '../share.js';
import { svgShare, svgGlobe, svgGamepad, svgCopy, svgTick, svgDownArrow, svgLang, svgFullscreen, svgExitFullscreen } from '../svg.js';
import { initDarkMode, initLanguageButtons, generateLanguageButtons, initResponsiveTextareaRows, initLocaleSelector } from './page-shared.js';

export function initIPAIndexPage(options) {
  const {
    databasePath,
    process,
    inputId = 'cWords_tBox',
    outputId = 'IPA_tBox',
    withWordsId = 'wf_c_words',
    allowWordSearchId = 'allow_words_search',
    variantRadioSelector = 'input[name="inlineRadioOptions"]',
    formatRadioSelector = null,
    darkModeToggleId = 'dark-mode-toggle',
    langButtonsContainerId = 'lang-buttons-container',
    speakButtonId = 'speak-btn',
    outputFormatter = null,
    maxWordLength = 6,
    maxPhraseLength = 5,
    enableLanguageButtons = true,
    enableResponsiveTextarea = true,
    enableSpeakButton = true,
    mobileRows = 5,
    desktopRows = 10,
    formatMapping = null,
    getLanguage = null,
    variantMapping = null,
    withWordsCheckboxId = null,
    ttsLanguage = null,
    gameLabel = null,
    enableGameButton = true,
    enableShareButton = true,
    languageSelectorId = null,
    footerToolsContainerId = null,
    toolsConfig = null,
    locale = null,
    defaultLocale = null,
  } = options;

  const defaultFormatLabels = { textAndIpa: '(Text /ipa/)', onlyIpa: 'Only /ipa/' };
  const L = locale ? { ...defaultFormatLabels, ...locale } : defaultFormatLabels;

  if (!databasePath) throw new Error('initIPAIndexPage: "databasePath" is required');
  if (!process) throw new Error('initIPAIndexPage: "process" is required');

  let IPA_DB = {};
  let currentFormat = null;
  let debounceTimer = null;
  let dbGeneration = 0;
  let displayFormat = '';

  const getVariant = () => {
    if (!variantRadioSelector) return null;
    const radio = document.querySelector(`${variantRadioSelector}:checked`);
    return radio ? radio.id : null;
  };

  const getFormat = () => {
    if (!formatRadioSelector) return null;
    const radio = document.querySelector(`${formatRadioSelector}:checked`);
    return radio ? radio.id : null;
  };

  const getDatabasePath = () => {
    if (databasePath.includes('${variant}')) {
      const variant = getVariant();
      const mappedVariant = options.variantMapping && variant ? options.variantMapping[variant] : variant;
      return databasePath.replace('${variant}', mappedVariant || 'default');
    }
    return databasePath;
  };

  const getFormatter = () => {
    if (formatMapping && currentFormat && formatMapping[currentFormat]) {
      return formatMapping[currentFormat];
    }
    return outputFormatter;
  };

  const iconMap = { share: svgShare, globe: svgGlobe, gamepad: svgGamepad, lang: svgLang };

  const getWithWords = () => {
    const effectiveId = withWordsCheckboxId || withWordsId;
    if (!effectiveId) return true;
    const el = document.getElementById(effectiveId);
    return el ? el.checked : true; // default true when checkbox doesn't exist
  };

  const getAllowWordSearch = () => {
    return allowWordSearchId ? isElementChecked(allowWordSearchId) : false;
  };

  function buildPairsData() {
    const input = document.getElementById(inputId)?.value || '';
    const withWords = getWithWords();
    const allowWordSearch = getAllowWordSearch();

    const { pairs } = process({
      input,
      lookupTable: IPA_DB,
      withWords,
      allowWordSearch,
      maxWordLength,
      maxPhraseLength,
      pairsOnly: true
    });

    const formatter = getFormatter();
    return { pairs, formattedPairs: formatPairIPAs(pairs, formatter) };
  }

  const translate = () => {
    const inputEl = document.getElementById(inputId);
    const outputEl = document.getElementById(outputId);
    if (!inputEl || !outputEl) return;

    const input = inputEl.value;
    if (!input) {
      setElementValue(outputId, '');
      return;
    }
    if (input.length > 10000) {
      setElementValue(outputId, 'Input too long (max 10,000 characters)');
      return;
    }
    setElementValue(outputId, 'loading....');

    const withWords = getWithWords();
    const allowWordSearch = getAllowWordSearch();
    const formatter = getFormatter();

    if (displayFormat === 'ipa') {
      let ipaResult = process({
        input,
        lookupTable: IPA_DB,
        withWords: false,
        allowWordSearch,
        maxWordLength,
        maxPhraseLength
      });
      if (formatter) ipaResult = formatter(ipaResult);
      setElementValueAnimated(outputId, ipaResult);
    } else if (displayFormat === 'json') {
      const { pairs } = buildPairsData();
      setElementValueAnimated(outputId, formatAsJSON(pairs, formatter));
    } else if (displayFormat === 'csv') {
      const { pairs } = buildPairsData();
      setElementValueAnimated(outputId, formatAsCSV(pairs, formatter));
    } else {
      let result = process({
        input,
        lookupTable: IPA_DB,
        withWords,
        allowWordSearch,
        maxWordLength,
        maxPhraseLength
      });
      if (formatter) result = formatter(result);
      setElementValueAnimated(outputId, result);
    }

    if (enableShareButton) {
      const shareBtn = document.getElementById('share-btn');
      if (shareBtn) shareBtn.style.display = 'inline-flex';
    }

    if (footerToolsContainerId) {
      const container = document.getElementById(footerToolsContainerId);
      if (container) {
        container.querySelectorAll('[data-visible="after-translate"]').forEach(el => {
          el.style.display = 'flex';
        });
      }
    }
  };

  const loadDatabase = () => {
    dbGeneration++;
    const inputEl = document.getElementById(inputId);
    if (inputEl && inputEl.value) {
      setElementValue(outputId, 'loading....');
    }
    loadIPADatabase({
      basePath: getDatabasePath(),
      onSuccess: (lookup) => {
        IPA_DB = lookup;
        translate();
      },
      onError: (err) => {
        console.error('Failed to load database:', err);
        setElementValue(outputId, 'Error loading database');
      }
    });
  };

  const debouncedTranslate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(translate, 50);
  };

  const setupEventListeners = () => {
    const inputEl = document.getElementById(inputId);
    if (inputEl) {
      inputEl.addEventListener('input', debouncedTranslate);
      inputEl.addEventListener('focus', function () { this.select(); });
    }

    if (variantRadioSelector) {
      document.querySelectorAll(variantRadioSelector).forEach(el => {
        el.addEventListener('change', () => { loadDatabase(); });
      });
    }

    if (formatRadioSelector) {
      document.querySelectorAll(formatRadioSelector).forEach(el => {
        el.addEventListener('change', () => {
          currentFormat = getFormat();
          translate();
        });
      });
    }

    if (withWordsId) {
      const withWordsEl = document.getElementById(withWordsId);
      if (withWordsEl) withWordsEl.addEventListener('change', translate);
    }

    if (allowWordSearchId) {
      const allowWordSearchEl = document.getElementById(allowWordSearchId);
      if (allowWordSearchEl) allowWordSearchEl.addEventListener('change', translate);
    }
  };

  // Initialize shared UI components
  initDarkMode(darkModeToggleId);

  if (enableLanguageButtons && !languageSelectorId) {
    initLanguageButtons({ containerId: langButtonsContainerId, configPath: '../config/languages.json' });
  }

  // Render footer tool labels from locale data
  function renderFooterTools(localeCode, localeData) {
    if (!footerToolsContainerId || !toolsConfig) return;
    const container = document.getElementById(footerToolsContainerId);
    if (!container) return;

    toolsConfig.forEach((tool, i) => {
      const btn = container.children[i];
      if (!btn) return;
      const span = btn.querySelector('span');
      if (!span) return;

      if (tool.type === 'link') {
        // Keep hardcoded label (language-specific, e.g. "IPA France")
        return;
      }
      const key = `tools_${tool.type}`;
      span.textContent = (localeData && localeData[key]) || tool.label;
    });
  }

  // Format button and dropdown locale-aware update (scope vars for renderFormatControls)
  let formatBtnEl = null;
  let formatDropdown = null;
  var formatLabels = { '': L.textAndIpa, ipa: L.onlyIpa, json: 'JSON', csv: 'CSV' };

  // Initialize locale selector (footer dropdown) — callbacks wired after format button setup

  // Language selector modal (shared by header button and footer tools)
  let langModal = null;

  const getLangModal = () => {
    if (!langModal) {
      const overlay = document.createElement('div');
      overlay.className = 'lang-modal-overlay';
      overlay.innerHTML = `
        <div class="lang-modal" role="dialog" aria-modal="true">
          <button class="lang-modal-close" aria-label="Close">&times;</button>
          <h3>選擇語言 / Select Language</h3>
          <ul class="lang-modal-list" id="lang-modal-list"></ul>
        </div>`;
      document.body.appendChild(overlay);

      const closeBtn = overlay.querySelector('.lang-modal-close');
      const close = () => { overlay.style.display = 'none'; };

      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.style.display !== 'none') close();
      });

      langModal = { overlay, close };
    }
    return langModal;
  };

  const openLangModal = () => {
    const modal = getLangModal();
    generateLanguageButtons({
      containerId: 'lang-modal-list',
      configPath: '../config/languages.json',
      wrapperTag: 'div'
    });
    modal.overlay.style.display = 'flex';
  };

  // Fullscreen output modal
  let fullscreenModal = null;

  const getFullscreenModal = () => {
    if (!fullscreenModal) {
      const overlay = document.createElement('div');
      overlay.className = 'fullscreen-overlay';
      overlay.innerHTML = `
        <div class="fullscreen-content" role="dialog" aria-modal="true">
          <button class="fullscreen-close" aria-label="Close">&times;</button>
          <pre class="fullscreen-text"></pre>
        </div>`;
      document.body.appendChild(overlay);

      const closeBtn = overlay.querySelector('.fullscreen-close');
      const contentEl = overlay.querySelector('.fullscreen-text');
      const close = () => { overlay.style.display = 'none'; };

      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.style.display !== 'none') close();
      });

      fullscreenModal = { overlay, contentEl, close };
    }
    return fullscreenModal;
  };

  if (languageSelectorId) {
    const selectorBtn = document.getElementById(languageSelectorId);
    if (selectorBtn) {
      selectorBtn.addEventListener('click', openLangModal);
    }
  }

  if (enableResponsiveTextarea) {
    initResponsiveTextareaRows({ mobileRows, desktopRows });
  }

  if (enableSpeakButton) {
    initSpeakButton({
      buttonId: speakButtonId,
      inputId: inputId,
      getLanguage: getLanguage || (ttsLanguage ? () => ttsLanguage : () => null)
    });
  }

  // Output controls — copy button and display format dropdown
  const outputControls = document.getElementById('output-controls');
  if (outputControls) {
    const copyBtn = document.getElementById('copy-output-btn');
    if (copyBtn) {
      copyBtn.innerHTML = svgCopy;
      copyBtn.addEventListener('click', () => {
        const output = document.getElementById(outputId)?.value || '';
        navigator.clipboard.writeText(output).then(() => {
          copyBtn.innerHTML = svgTick;
          setTimeout(() => { copyBtn.innerHTML = svgCopy; }, 1500);
        });
      });
    }

    formatBtnEl = document.getElementById('display-format-btn');
    if (formatBtnEl) {
      formatLabels = { '': L.textAndIpa, ipa: L.onlyIpa, json: 'JSON', csv: 'CSV' };
      formatBtnEl.innerHTML = `${L.textAndIpa} ${svgDownArrow}`;

      formatDropdown = {
        el: null,
        open: false,
        show() {
          if (!this.el) {
            this.el = document.createElement('div');
            this.el.className = 'format-dropdown';
            this.el.style.display = 'none';
            this.el.innerHTML = Object.entries(formatLabels).map(([val, label]) =>
              `<button class="format-dropdown-menu-item" value="${val}">${label}</button>`
            ).join('');
            this.el.querySelectorAll('.format-dropdown-menu-item').forEach(item => {
              item.addEventListener('click', () => {
                displayFormat = item.value;
                formatBtnEl.innerHTML = `${formatLabels[item.value]} ${svgDownArrow}`;
                formatDropdown.hide();
                translate();
              });
            });
            outputControls.appendChild(this.el);
          }
          this.open = true;
          formatBtnEl.setAttribute('aria-expanded', 'true');
          this.el.style.display = 'block';
        },
        hide() {
          this.open = false;
          formatBtnEl.removeAttribute('aria-expanded');
          if (this.el) this.el.style.display = 'none';
        }
      };

      formatBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        formatDropdown.open ? formatDropdown.hide() : formatDropdown.show();
      });

      document.addEventListener('click', (e) => {
        if (formatDropdown.open && !formatBtnEl.contains(e.target) && !formatDropdown.el?.contains(e.target)) {
          formatDropdown.hide();
        }
      });
    }

    // Fullscreen button
    const sep = document.createElement('span');
    sep.className = 'output-sep';
    sep.textContent = '•';
    outputControls.appendChild(sep);

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.id = 'fullscreen-btn';
    fullscreenBtn.className = 'btn-icon';
    fullscreenBtn.setAttribute('aria-label', 'Fullscreen');
    fullscreenBtn.innerHTML = svgFullscreen;
    outputControls.appendChild(fullscreenBtn);

    fullscreenBtn.addEventListener('click', () => {
      const output = document.getElementById(outputId)?.value || '';
      if (!output) return;
      const modal = getFullscreenModal();
      modal.contentEl.textContent = output;
      modal.overlay.style.display = 'flex';
    });

  }

  // Format controls locale-aware update
  function renderFormatControls(localeCode, localeData) {
    if (!formatBtnEl) return;
    const labels = localeData || {};
    formatLabels = { '': labels.textAndIpa || L.textAndIpa, ipa: labels.onlyIpa || L.onlyIpa, json: 'JSON', csv: 'CSV' };

    // Update button text (preserve SVG arrow)
    const btnText = Array.from(formatBtnEl.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    if (btnText) {
      btnText.textContent = formatLabels[displayFormat || ''] + ' ';
    }

    // Update dropdown items if dropdown has been created
    if (formatDropdown && formatDropdown.el) {
      formatDropdown.el.querySelectorAll('.format-dropdown-menu-item').forEach(item => {
        const label = formatLabels[item.value];
        if (item.value === '') {
          const t = Array.from(item.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
          if (t) t.textContent = label + ' ';
        } else {
          item.textContent = label;
        }
      });
    }
  }

  // Wire locale selector with combined callback
  if (defaultLocale) {
    initLocaleSelector({
      defaultLocale,
      onLocaleChange: (code, data) => {
        renderFooterTools(code, data);
        renderFormatControls(code, data);
      }
    });
  }

  // Language selector button — inject SVG arrow
  if (languageSelectorId) {
    const selBtn = document.getElementById(languageSelectorId);
    if (selBtn) {
      const text = selBtn.textContent.trim();
      if (text.includes('▾')) {
        selBtn.innerHTML = text.replace('▾', '') + svgDownArrow;
      }
    }
  }

  // Share button (opens modal with share, export, and game options)
  // Shared click handler for share button (output label or footer tools)
  const shareButtonClick = (e) => {
    if (e) e.stopPropagation();
    const input = document.getElementById(inputId)?.value || '';
    if (!input.trim()) return;

    const { pairs, formattedPairs } = buildPairsData();

    const shareData = {
      page: 'translator',
      lang: gameLabel || '',
      text: input,
      format: currentFormat || '',
      pairs,
      formattedPairs,
    };

    const opts = { getShareData: () => shareData, showExport: true };

    getShareModal().show(opts);
  };

  const gameButtonClick = () => {
    const input = document.getElementById(inputId)?.value || '';
    if (!input.trim()) return;

    const { pairs, formattedPairs } = buildPairsData();
    const validPairs = pairs.filter(([, ipa]) => ipa != null);
    if (validPairs.length < 2) return;

    localStorage.setItem('ipa_game_data', JSON.stringify({
      text: input,
      pairs: validPairs,
      formattedPairs,
      language: gameLabel || '',
      format: currentFormat || '',
      ttsLanguage: ttsLanguage || (getLanguage ? getLanguage() : ''),
    }));

    window.location.href = '../game/index.html';
  };

  // Footer tools — per-language config from main.js
  if (footerToolsContainerId && toolsConfig) {
    const container = document.getElementById(footerToolsContainerId);
    if (container) {
      let html = '';

      toolsConfig.forEach(tool => {
        const icon = iconMap[tool.icon] || '';
        const visible = tool.visible === 'after-translate';
        const hiddenStyle = visible ? 'style="display:none"' : '';

        if (tool.type === 'link') {
          html += `<button id="${tool.id}" class="share-circle-btn" data-href="${tool.href}" ${hiddenStyle}>${icon}<span>${tool.label}</span></button>`;
        } else if (tool.type === 'share' && enableShareButton) {
          html += `<button id="${tool.id}" class="share-circle-btn" data-visible="${tool.visible}" ${hiddenStyle}>${icon}<span>${tool.label}</span></button>`;
        } else if (tool.type === 'game' && enableGameButton) {
          html += `<button id="${tool.id}" class="share-circle-btn" data-visible="${tool.visible}" ${hiddenStyle}>${icon}<span>${tool.label}</span></button>`;
        } else if (tool.type === 'lang') {
          html += `<button id="${tool.id}" class="share-circle-btn">${icon}<span>${tool.label}</span></button>`;
        }
      });

      container.innerHTML = html;

      // Handle link-type buttons (data-href)
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-href]');
        if (btn) {
          e.preventDefault();
          window.location.href = btn.dataset.href;
        }
      });

      // Wire up handlers by ID
      const shareBtn = document.getElementById('share-btn');
      if (shareBtn) shareBtn.addEventListener('click', shareButtonClick);

      const gameBtn = document.getElementById('game-btn');
      if (gameBtn) gameBtn.addEventListener('click', gameButtonClick);

      const langBtn = document.getElementById('lang-btn');
      if (langBtn) langBtn.addEventListener('click', openLangModal);
    }
  }

  // Share button on output label (legacy — only if no footer tools and share is enabled)
  if (enableShareButton && !footerToolsContainerId) {
    const outputEl = document.getElementById(outputId);
    if (outputEl) {
      const outputLabel = outputEl.closest('.form-group')?.querySelector('label');
      if (outputLabel) {
        const shareBtn = document.createElement('button');
        shareBtn.id = 'share-btn';
        shareBtn.className = 'btn-icon';
        shareBtn.setAttribute('aria-label', 'Share');
        shareBtn.innerHTML = svgShare;
        shareBtn.style.display = 'none';
        outputLabel.appendChild(shareBtn);
        shareBtn.addEventListener('click', shareButtonClick);
      }
    }
  }

  // Parse shared URL data
  (async () => {
    const raw = await parseShareFromUrl();
    if (!raw || raw.page !== 'translator') return;

    if (raw.lang && raw.lang !== gameLabel) {
      const params = new URLSearchParams(window.location.search);
      const b64 = params.get('d');
      if (b64) window.location.href = `../${raw.lang}/index.html?d=${b64}`;
      return;
    }

    clearShareParams();

    if (raw.text) {
      const inputEl = document.getElementById(inputId);
      if (inputEl) inputEl.value = raw.text;
    }

    if (raw.format && formatRadioSelector) {
      const formatRadio = document.querySelector(`${formatRadioSelector}[id="${raw.format}"]`);
      if (formatRadio) {
        formatRadio.checked = true;
        currentFormat = raw.format;
      }
    }
  })();

  setupEventListeners();
  loadDatabase();

  return {
    translate,
    destroy: () => { clearTimeout(debounceTimer); }
  };
}
