import { svgDarkMode, svgLightMode } from '../svg.js';

/**
 * Set up dark mode toggle
 * @param {string} toggleId - ID of the theme toggle button element
 */
export function initDarkMode(toggleId) {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;

  const iconSpan = toggle.querySelector(".icon");
  const savedTheme = localStorage.getItem("theme");

  // Set initial state
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (iconSpan) iconSpan.innerHTML = svgDarkMode;
  } else {
    document.body.classList.remove("dark-mode");
    if (iconSpan) iconSpan.innerHTML = svgLightMode;
  }

  // Add click handler
  toggle.addEventListener("click", function () {
    toggle.classList.add("btn-theme-transition");
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");

    if (iconSpan) {
      iconSpan.innerHTML = isDark ? svgDarkMode : svgLightMode;
    }

    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

/**
 * Generate and insert language buttons for "Other Languages" section
 * Reads from config/languages.json and dynamically builds the list
 * USED BY: Both index.html and ipa_list*.html pages
 *
 * @param {object} options - Options:
 *   @param {string} options.containerId - ID of container element (default: "lang-buttons-container")
 *   @param {string} options.configPath - Path to languages.json config file (default: "../config/languages.json")
 *   @param {string} options.wrapperTag - HTML tag to wrap each item (default: "li")
 */
export async function generateLanguageButtons(options) {
  const {
    containerId = "lang-buttons-container",
    configPath = "../config/languages.json",
    wrapperTag = "li"
  } = options;

  try {
    const response = await fetch(configPath);
    if (!response.ok) {
      throw new Error(`Failed to load language config: ${response.status}`);
    }

    const langConfig = await response.json();
    const container = document.getElementById(containerId);

    if (!container) {
      throw new Error(`Container with ID "${containerId}" not found`);
    }

    const languages = langConfig.languages || [];
    let html = "";

    languages.forEach(lang => {
      const label = lang.name || lang.code;
      const href = lang.indexPath || "#";
      const isCurrent = lang.isActive === true;
      const style = isCurrent ? 'style="font-weight: bold; color: var(--accent-color);"' : "";

      html += `<${wrapperTag} ${style}><a href="${href}">${label}</a></${wrapperTag}>`;
    });

    container.innerHTML = html;
  } catch (e) {
    console.error(e.message);
  }
}

/**
 * Initialize language buttons on page load
 * Helper function to call generateLanguageButtons when DOM is ready
 */
export function initLanguageButtons(options) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      generateLanguageButtons(options);
    });
  } else {
    generateLanguageButtons(options);
  }
}

/**
 * Set textarea rows based on screen width and re-check on resize
 */
/**
 * Initialize locale (display language) selector dropdown.
 * Populates a <select> from languages.json, applies translations to [data-i18n] elements,
 * and persists the selection in localStorage.
 *
 * @param {object} options - Options:
 *   @param {string} options.selectId - ID of the select element (default: "locale-select")
 *   @param {string} options.languagesPath - Path to languages.json (default: "../config/languages.json")
 *   @param {string} options.localeBasePath - Base path to locale JSON files (default: "../config/locale")
 *   @param {string} options.storageKey - localStorage key (default: "ipa_locale")
 *   @param {string} options.defaultLocale - Fallback locale code (default: "english")
 */
export function initLocaleSelector(options = {}) {
  const {
    selectId = "locale-select",
    languagesPath = "../config/languages.json",
    localeBasePath = "../config/locale",
    storageKey = "ipa_locale",
    defaultLocale = "english",
    onLocaleChange = null
  } = options;

  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;

  const localeCache = {};
  let languagesList = null;

  async function loadLocale(code) {
    if (localeCache[code]) return localeCache[code];
    try {
      const resp = await fetch(`${localeBasePath}/${code}.json`);
      if (!resp.ok) throw new Error(`Locale not found: ${code} (${resp.status})`);
      const data = await resp.json();
      localeCache[code] = data;
      return data;
    } catch (e) {
      console.error(`Failed to load locale ${code}:`, e.message);
      return {};
    }
  }

  async function applyTranslations(localeCode) {
    if (localeCode === '') {
      // Restore original HTML text
      document.querySelectorAll('[data-i18n]').forEach(el => {
        if (el.dataset.i18nOriginal) {
          if ('html' in el.dataset) {
            el.innerHTML = el.dataset.i18nOriginal;
          } else {
            el.textContent = el.dataset.i18nOriginal;
          }
        }
      });
      if (onLocaleChange) onLocaleChange(localeCode, null);
      return;
    }
    const locale = await loadLocale(localeCode);
    const keys = Object.keys(locale);

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (locale[key] !== undefined) {
        if (!el.dataset.i18nOriginal) {
          el.dataset.i18nOriginal = el.innerHTML;
        }
        if ('html' in el.dataset) {
          el.innerHTML = locale[key];
        } else {
          el.textContent = locale[key];
        }
      } else if (key && !keys.length) {
        if (el.dataset.i18nOriginal) {
          el.textContent = el.dataset.i18nOriginal;
        }
      }
    });

    if (onLocaleChange) onLocaleChange(localeCode, locale);
  }

  async function init() {
    try {
      const resp = await fetch(languagesPath);
      if (!resp.ok) throw new Error(`Failed to load languages config: ${resp.status}`);
      const { languages } = await resp.json();
      languagesList = languages;

      languages.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.localeName || lang.name;
        selectEl.appendChild(opt);
      });

      // Add "(Default)" option at the top
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '(Default)';
      selectEl.prepend(defaultOpt);

      const savedLocale = localStorage.getItem(storageKey);
      const initialLocale = (savedLocale && languages.find(l => l.code === savedLocale))
        ? savedLocale
        : defaultLocale;

      selectEl.value = initialLocale;
      await applyTranslations(initialLocale);

      selectEl.addEventListener('change', async () => {
        const newLocale = selectEl.value;
        if (newLocale === '') {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, newLocale);
        }
        await applyTranslations(newLocale);
      });
    } catch (e) {
      console.error('initLocaleSelector:', e.message);
    }
  }

  init();

  return applyTranslations;
}


export function initResponsiveTextareaRows(options = {}) {
  const isMobile = window.innerWidth <= 768;
  const mobileRows = options.mobileRows || 5;
  const desktopRows = options.desktopRows || 10;
  const targets = options.targets || null;

  const getAllTargets = () => targets
    ? targets.map(id => document.getElementById(id)).filter(el => el)
    : document.querySelectorAll('textarea[id$="_tBox"]');

  // Set initial rows
  getAllTargets().forEach(textarea => {
    textarea.rows = isMobile ? mobileRows : desktopRows;
  });

  // Re-check on window resize (debounced)
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const nowIsMobile = window.innerWidth <= 768;
      getAllTargets().forEach(textarea => {
        textarea.rows = nowIsMobile ? mobileRows : desktopRows;
      });
    }, 250);
  });
}
