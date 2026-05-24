// Simplified ↔ Traditional Chinese converter
// Uses opencc-js from local lib/

const LIB = '../lib/opencc';

let _cn2tw = null;
let _tw2cn = null;
let _cn2hk = null;
let _hk2cn = null;
let _ready = false;

/**
 * Load opencc-js converters from local lib (cached after first call)
 * @returns {Promise<void>}
 */
export async function loadConverters() {
  if (_ready) return;

  const [{ Converter: Cn2T }, { Converter: T2Cn }] = await Promise.all([
    import(`${LIB}/cn2t.js`),
    import(`${LIB}/t2cn.js`),
  ]);

  _cn2tw = Cn2T({ from: 'cn', to: 'tw' });
  _tw2cn = T2Cn({ from: 'tw', to: 'cn' });
  _cn2hk = Cn2T({ from: 'cn', to: 'hk' });
  _hk2cn = T2Cn({ from: 'hk', to: 'cn' });
  _ready = true;
}

/**
 * Convert text between Simplified and Traditional Chinese
 * @param {string} text - Text to convert
 * @param {string} direction - 's2t' (simplified to traditional) or 't2s' (traditional to simplified)
 * @param {string} mode - 'standard' (TW) or 'taiwan' (TW with phrases) or 'hongkong' (HK variant)
 * @returns {string} Converted text
 */
export function convert(text, direction, mode = 'standard') {
  if (!_ready) return text;

  const converter = getConverter(direction, mode);
  if (!converter) return text;

  return converter(text);
}

function getConverter(direction, mode) {
  if (direction === 's2t') {
    return mode === 'hongkong' ? _cn2hk : _cn2tw;
  }
  return mode === 'hongkong' ? _hk2cn : _tw2cn;
}

/**
 * Detect whether text is Simplified or Traditional Chinese.
 * Logic: s2t converter changes simplified chars → if output differs, input has simplified chars.
 *         t2s converter changes traditional chars → if output differs, input has traditional chars.
 * @param {string} text - Text to analyze
 * @returns {string} 'simplified', 'traditional', or 'mixed'
 */
export function detectType(text) {
  if (!_ready || !text) return 'simplified';

  const tw = _cn2tw(text);
  const cn = _tw2cn(text);

  const s2tChanged = tw !== text;
  const t2sChanged = cn !== text;

  if (s2tChanged && t2sChanged) return 'mixed';
  if (s2tChanged) return 'simplified';
  if (t2sChanged) return 'traditional';

  return 'simplified';
}
