// Marivo 官网公共脚本：语言选择与文案。
// 文案来自 i18n/app.json（构建时从 App 的 ARB 导出，与 App 内文字一致）和 i18n/site.json（官网自己的文案）。
'use strict';

const SITE = {
  // 账号服务器，与 App 的 lib/core/endpoints.dart 一致
  api: 'https://seawalker.jiafic.cn',
  // APK 放在这个公开仓库的 Releases 里（官网本身也由它的 GitHub Pages 提供）
  releasesRepo: 'jiafic-zh/seawalker-app-releases',
  langs: ['en', 'zh', 'ru', 'ja', 'pt', 'es'],
  langNames: { en: 'English', zh: '中文', ru: 'Русский', ja: '日本語', pt: 'Português', es: 'Español' },
};

function pickLang() {
  const candidates = [new URLSearchParams(location.search).get('lang'), localStorage.getItem('lang')]
    .concat(navigator.languages || [navigator.language]);
  for (const c of candidates) {
    const code = String(c || '').slice(0, 2).toLowerCase();
    if (SITE.langs.indexOf(code) >= 0) return code;
  }
  return 'en';
}

/** 替换 {name} 占位符 */
function fmt(s, args) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (args && k in args ? args[k] : m));
}

/** 站点根目录（页面在子目录里时为 ".."） */
function root() {
  return document.documentElement.dataset.root || '.';
}

async function loadJson(path) {
  const res = await fetch(`${root()}/${path}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** 初始化页面：选语言、填文案、语言下拉框，然后调用 onReady({ t, lang })。 */
async function initPage(onReady) {
  const lang = pickLang();
  // 通过 ?lang= 链接进来时记住，切到其他页面也保持同一语言
  if (new URLSearchParams(location.search).get('lang') === lang) localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  const [app, site] = await Promise.all([loadJson('i18n/app.json'), loadJson('i18n/site.json')]);
  const text = Object.assign({}, app.en, site.en, app[lang], site[lang]);
  const t = (key, args) => fmt(key in text ? text[key] : key, args);

  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  const title = document.querySelector('title[data-key]');
  if (title) document.title = `${t(title.dataset.key)} · Marivo`;

  const sel = document.getElementById('lang');
  if (sel) {
    for (const c of SITE.langs) sel.add(new Option(SITE.langNames[c], c, false, c === lang));
    sel.onchange = () => {
      localStorage.setItem('lang', sel.value);
      const q = new URLSearchParams(location.search);
      q.set('lang', sel.value);
      location.search = q.toString();
    };
  }
  if (onReady) await onReady({ t, lang });
}

/** 新建元素：el('p', { class: 'muted' }, '文字', 子元素…) */
function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) e.append(c);
  return e;
}
