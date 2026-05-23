/** Persian IPA Translator */
import { initIPAIndexPage } from '../js/page/ipa-index-page.js';
import { processTextLongestMatch } from '../js/ipa.js';

initIPAIndexPage({
  defaultLocale: 'persian',
  databasePath: '../json/fa.json',
  process: processTextLongestMatch,
  ttsLanguage: 'fa',
  locale: { textAndIpa: '(متن /ipa/)', ruby: 'روبی', onlyIpa: 'فقط /ipa/' },
  gameLabel: 'persian',
  languageSelectorId: 'lang-selector-btn',
  footerToolsContainerId: 'footer-tools',
  toolsConfig: [
    { id: 'share-btn', icon: 'share', label: 'اشتراک‌گذاری', type: 'share', visible: 'after-translate' },
    { id: 'ipa-list', icon: 'globe', label: 'پایگاه داده IPA', type: 'link', href: './ipa_list.html' },
    { id: 'game-btn', icon: 'gamepad', label: 'بازی کوییز', type: 'game', visible: 'after-translate' },
    { id: 'lang-btn', icon: 'lang', label: 'زبان‌های دیگر', type: 'lang' },
  ]
});
