/**
 * Agent interface — IPA Translator
 * Loaded by agent.html via <script type="module">.
 * Translates text to IPA via URL query parameters.
 */

import { LANGUAGES, resolveDatabasePath } from './agent-lang-config.js';
import { normalizeIPAData } from './utils.js';
import { processTextCharBased, processTextLongestMatch, processKhmerText, processKorean } from './ipa.js';
import { formatAsJSON, formatAsCSV, stripHTML } from './format-display.js';

const app = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const language = params.get('language');
const input = params.get('input');
const displayFormat = (params.get('displayFormat') || 'normal').toLowerCase();

if (!language || input === null) {
  showDocumentation();
} else {
  app.innerHTML = '<pre id="output" class="loading">Loading...</pre>';
  await runTranslation(language, input, params.get('format'), params.get('variant'), displayFormat);
}

// ============================================
// Translation Mode
// ============================================

async function runTranslation(langCode, inputText, formatKey, variantKey, displayFormat) {
  const lang = LANGUAGES[langCode];
  if (!lang) {
    return showError(`Unknown language "${langCode}". Valid languages: ${Object.keys(LANGUAGES).join(', ')}`);
  }

  const validDisplayFormats = ['normal', 'ipa', 'json', 'csv'];
  if (!validDisplayFormats.includes(displayFormat)) {
    return showError(`Invalid displayFormat "${displayFormat}". Valid values: ${validDisplayFormats.join(', ')}`);
  }

  if (formatKey !== null) {
    if (!lang.formats) {
      return showError(`Language "${langCode}" does not support output formats.`);
    }
    if (!(formatKey in lang.formats)) {
      return showError(`Unknown format "${formatKey}" for ${langCode}. Valid formats: ${Object.keys(lang.formats).join(', ')}`);
    }
  }

  if (variantKey !== null) {
    if (!lang.variants) {
      return showError(`Language "${langCode}" does not have variants.`);
    }
    if (!(variantKey in lang.variants)) {
      return showError(`Unknown variant "${variantKey}" for ${langCode}. Valid variants: ${Object.keys(lang.variants).join(', ')}`);
    }
  }

  if (inputText.length > 10000) {
    return showError('Input too long (max 10,000 characters)');
  }

  if (!inputText.trim()) {
    document.getElementById('output').textContent = '';
    return;
  }

  const dbPath = resolveDatabasePath(langCode, variantKey);
  if (!dbPath) {
    return showError(`Failed to resolve database path for ${langCode}.`);
  }

  let jsonData;
  try {
    const resp = await fetch(dbPath);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    jsonData = await resp.json();
  } catch (e) {
    return showError(`Failed to load IPA database for ${langCode}: ${e.message}`);
  }

  const lookupTable = normalizeIPAData(jsonData);

  const procOpts = {
    input: inputText,
    lookupTable,
    allowWordSearch: lang.allowWordSearch || false,
  };
  if (lang.maxWordLength) procOpts.maxWordLength = lang.maxWordLength;

  const processors = {
    charBased: processTextCharBased,
    longestMatch: processTextLongestMatch,
    khmer: processKhmerText,
    korean: processKorean,
  };
  const processor = processors[lang.processor];
  if (!processor) {
    return showError(`Unknown processor "${lang.processor}" for ${langCode}.`);
  }

  let formatter = null;
  if (formatKey && lang.formats && lang.formats[formatKey]) {
    const formatRef = lang.formats[formatKey];
    if (formatRef) {
      const [moduleName, exportName] = formatRef.split(':');
      try {
        const mod = await import(`./format/${moduleName}`);
        formatter = mod[exportName];
      } catch (e) {
        return showError(`Failed to load formatter: ${e.message}`);
      }
    }
  }

  if (displayFormat === 'json' || displayFormat === 'csv') {
    const { pairs } = processor({ ...procOpts, pairsOnly: true });
    let output;
    if (displayFormat === 'json') {
      output = formatAsJSON(pairs, formatter);
    } else {
      output = formatAsCSV(pairs, formatter);
    }
    document.getElementById('output').textContent = output;
  } else {
    procOpts.withWords = displayFormat === 'normal';
    let result = processor(procOpts);
    if (formatter) result = formatter(result);
    document.getElementById('output').textContent = stripHTML(result);
  }
}

function showError(msg) {
  app.innerHTML = `<pre class="error">${escapeHtml(msg)}</pre>`;
}

// ============================================
// Documentation Mode
// ============================================

function showDocumentation() {
  const langLines = Object.entries(LANGUAGES).map(([code, lang]) => {
    const variants = lang.variants ? Object.keys(lang.variants).join(', ') : '-';
    const formats = lang.formats ? Object.keys(lang.formats).join(', ') : '-';
    return `  ${code}: variants=[${variants}] formats=[${formats}]`;
  }).join('\n');

  const doc = [
    'IPA Translator — Agent Interface',
    'Translate text to IPA via URL query parameters on agent.html.',
    '',
    'USAGE: agent.html?language=<code>&input=<text>[&format=<fmt>][&variant=<var>][&displayFormat=<fmt>]',
    '',
    'PARAMETERS:',
    '  language     (required) Language code',
    '  input        (required) Text to translate (URL-encode non-ASCII)',
    '  format           Output format key (Jyutping, Pinyin, etc). Defaults to raw IPA when omitted.',
    '  variant          Language variant. Uses default when omitted.',
    '  displayFormat    normal (text+IPA, default), ipa (IPA only), json, csv',
    '',
    'SUPPORTED LANGUAGES:',
    langLines,
    '',
    'EXAMPLES:',
    '  ?language=german&input=Hallo%20Welt',
    '  ?language=cantonese&format=Jyutping&input=你好',
    '  ?language=mandarin&variant=hans&format=Pinyin&input=你好',
    '  ?language=cantonese&input=歡迎&displayFormat=ipa',
    '  ?language=cantonese&input=歡迎&displayFormat=json',
    '',
    'OUTPUT: Plain text in <pre> tag. Errors prefixed with "Error:".',
    '',
    'NOTE: Requires a JavaScript browser (agent-browser, Playwright, Puppeteer). curl/HTTP fetch will not work.',
    'See SKILL.md for full agent usage guide.',
  ].join('\n');

  app.innerHTML = `<pre id="output">${doc}</pre>`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
