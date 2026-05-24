/**
 * Mandarin IPA Translator - Simplified using initIPAIndexPage
 */

import { initIPAIndexPage } from '../js/page/ipa-index-page.js';
import { processTextCharBased } from '../js/ipa.js';
import { detectType, loadConverters } from '../js/converter.js';
import {
  formatIPA_org,
  formatIPA_num,
  convertIPATextToPinyin,
  convertIPATextToPinyinWithMarks,
  convertIPATextToZhuyin
} from '../js/format/zh.format.js';

// Load OpenCC converters for Simplified/Traditional detection
loadConverters().then(() => {
  initIPAIndexPage({
    defaultLocale: 'mandarin',
    databasePath: '../json/${variant}.json',
    variantRadioSelector: 'input[name="zhTypeOption"]',
    variantMapping: { zh_type1: 'zh_hant', zh_type2: 'zh_hans' },
    process: processTextCharBased,
    formatRadioSelector: 'input[name="format"]',
    formatMapping: {
      IPA_org: formatIPA_org,
      IPA_num: formatIPA_num,
      Pinyin_num: convertIPATextToPinyin,
      Pinyin: convertIPATextToPinyinWithMarks,
      Zhuyin: convertIPATextToZhuyin
    },
    locale: { textAndIpa: '(文字 /ipa/)', ruby: '注音格式', onlyIpa: '只有 /ipa/' },
    maxWordLength: 9,
    ttsLanguage: 'zh-CN',
    gameLabel: 'mandarin',
    languageSelectorId: 'lang-selector-btn',
    footerToolsContainerId: 'footer-tools',
    onVariantAutoDetect: () => {
      const inputEl = document.getElementById('cWords_tBox');
      const text = inputEl?.value || '';
      if (!text.trim()) return;

      const type = detectType(text);
      const targetId = type === 'simplified' ? 'zh_type2' : 'zh_type1';
      const currentRadio = document.querySelector('input[name="zhTypeOption"]:checked');
      if (currentRadio && currentRadio.id === targetId) return;

      const targetRadio = document.querySelector(`input[name="zhTypeOption"][id="${targetId}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
        targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    toolsConfig: [
      { id: 'share-btn', icon: 'share', label: '分享', type: 'share', visible: 'after-translate' },
      { id: 'ipa-list-hant', icon: 'globe', label: 'IPA 資料庫 (繁)', type: 'link', href: './ipa_list_zh_hant.html' },
      { id: 'ipa-list-hans', icon: 'globe', label: 'IPA 資料庫 (簡)', type: 'link', href: './ipa_list_zh_hans.html' },
      { id: 'game-btn', icon: 'gamepad', label: '測驗小遊戲', type: 'game', visible: 'after-translate' },
      { id: 'lang-btn', icon: 'lang', label: '其他語言', type: 'lang' },
    ]
  });
});
