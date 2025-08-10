
let articles = [];
let activeTags = new Set();
let sortMode = 'date-desc'; // 'date-desc' | 'date-asc' | 'title-asc'

// Robust date parser: supports 2023-01-02, 2023/1/2, 2023.1.2, 2023年1月2日, and ISO-like strings
function parseDateToKey(dateStr) {
  if (!dateStr) return NaN;
  const s = String(dateStr).trim();

  // Exact YYYY-MM-DD (e.g., 2023-01-01)
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const m = parseInt(ymd[2], 10) - 1;
    const d = parseInt(ymd[3], 10);
    const t = new Date(y, m, d).getTime();
    return isNaN(t) ? NaN : t;
  }

  // Chinese format: YYYY年M月D日
  const zh = s.match(/^(\d{4})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})日?$/);
  if (zh) {
    const y = parseInt(zh[1], 10), m = parseInt(zh[2], 10) - 1, d = parseInt(zh[3], 10);
    const t = new Date(y, m, d).getTime();
    return isNaN(t) ? NaN : t;
  }

  // Normalize separators and try ISO-like
  const norm = s.replace(/[.\/]/g, '-');
  const iso = Date.parse(norm);
  if (!isNaN(iso)) return iso;

  // Fallback raw parse
  const raw = Date.parse(s);
  return isNaN(raw) ? NaN : raw;
}

function parseFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)/);
  if (!match) return { meta: {}, content: text };
  const meta = {};
  match[1].split(/\n/).forEach(line => {
    const [key, ...rest] = line.split(':');
    meta[key.trim()] = rest.join(':').trim();
  });
  return { meta, content: match[2] };
}
// 將 Markdown 轉為純文字，供摘要使用
function markdownToPlain(md) {
  const html = marked.parse(md);
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

const listEl = document.getElementById('article-list');
const viewEl = document.getElementById('article-view');
const contentEl = document.getElementById('content');
const tocEl = document.getElementById('toc');
const backBtn = document.getElementById('back-home');
const breadcrumbEl = document.getElementById('breadcrumb');

// --- Theme toggle ---
(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.body.classList.add('theme-dark');
  // enable smooth transitions globally
  document.body.classList.add('theme-ease');
  const btn = document.getElementById('theme-toggle') || document.getElementById('theme-toggle-fab');
  if (btn) {
    btn.addEventListener('click', () => {
      // Determine direction BEFORE toggling
      const goingToDark = !document.body.classList.contains('theme-dark');
      // Add switching class + direction (sunrise/sunset)
      document.body.classList.add('theme-switching');
      document.body.classList.toggle('sunset', goingToDark);
      document.body.classList.toggle('sunrise', !goingToDark);
      // Flip theme
      document.body.classList.toggle('theme-dark');
      const isDark = document.body.classList.contains('theme-dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      // Clear flags after animation ends
      window.setTimeout(() => {
        document.body.classList.remove('theme-switching');
        document.body.classList.remove('sunset');
        document.body.classList.remove('sunrise');
      }, 1250);
    });
  }
})();
// --- end theme toggle ---

function loadList() {
  listEl.innerHTML = '';
  // Multi-select filtering (AND semantics): show article only if it contains ALL selected tags
  const filtered = (activeTags.size > 0)
    ? articles.filter(a => {
        const at = a.tags || [];
        for (const t of activeTags) { if (!at.includes(t)) return false; }
        return true;
      })
    : articles;

  // Sorting
  const data = [...filtered].sort((a, b) => {
  if (sortMode === 'date-desc') {
    const ak = Number.isFinite(a.dateKey) ? a.dateKey : -Infinity; // 無日期放最後
    const bk = Number.isFinite(b.dateKey) ? b.dateKey : -Infinity;
    if (bk !== ak) return bk - ak;
    return a.title.localeCompare(b.title, 'zh-Hant');
  }
  // date-asc
  const ak = Number.isFinite(a.dateKey) ? a.dateKey : Infinity;  // 無日期放最後
  const bk = Number.isFinite(b.dateKey) ? b.dateKey : Infinity;
  if (ak !== bk) return ak - bk;
  return a.title.localeCompare(b.title, 'zh-Hant');
  });

  if (data.length === 0) {
  const selected = Array.from(activeTags);
  const tagsHTML = selected.map(t => `<span class="chip chip--ghost">${t}</span>`).join('');
  listEl.innerHTML = `
    <div class="empty-state" role="status" aria-live="polite">
      <div class="empty-state__title">找不到符合的文章</div>
      <div class="empty-state__desc">試著移除一些篩選標籤，或清除全部標籤再試一次。</div>
      ${selected.length ? `<div class="empty-state__tags">目前選擇：${tagsHTML}</div>` : ''}
      <div class="empty-state__actions">
        <button class="btn" id="btn-clear-tags">清除全部篩選</button>
      </div>
    </div>`;

  const clearBtn = document.getElementById('btn-clear-tags');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // 清空篩選
      activeTags.clear();
      // 同步更新 chips 樣式（讓「全部」亮起）
      const chips = document.querySelectorAll('.chip[data-tag]');
      chips.forEach(c => {
        const tag = c.getAttribute('data-tag');
        const isAll = tag === '全部';
        c.classList.toggle('active', isAll); // 只讓「全部」為 active
      });
      loadList();
      document.getElementById('main').scrollIntoView({ behavior: 'smooth' });
    });
  }
  return; // 停止後續卡片渲染
}
  data.forEach(meta => {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.classList.add('reveal');
    card.innerHTML =
      `<div class="cover" style="background-image: url('articles/images/cover/${meta.id}.jpeg');"></div>` +
      `<h2><a href="#/article/${meta.id}">${meta.title}</a></h2>` +
      `<div class="date">${meta.date}</div>` +
      `<p>${meta.summary}...</p>`;
    listEl.appendChild(card);
    card.addEventListener('click', () => {
      location.hash = `#/article/${meta.id}`;
    });
  });
  setupReveal();
}

function buildToc() {
  tocEl.innerHTML = '<div class="toc-breadcrumb">' + breadcrumbEl.textContent + '</div><h3>目錄</h3>';
  const headers = contentEl.querySelectorAll('h2');
  headers.forEach(h2 => {
    const anchor = h2.textContent.trim().replace(/\s+/g, '-');
    h2.id = anchor;
    const div = document.createElement('div');
    div.innerHTML = `<a href="#${anchor}">${h2.textContent}</a>`;
    div.querySelector('a').addEventListener('click', e => {
      e.preventDefault();
      document.getElementById(anchor).scrollIntoView({ behavior: 'smooth' });
    });
    tocEl.appendChild(div);
  });
}

function animateArticleEnter(){
  // remove previous play state
  document.querySelectorAll('.anim-enter,.anim-enter-left,.anim-hero,.anim-pop').forEach(el=>{
    el.classList.remove('is-in');
  });

  // Hero / meta header
  const head = document.getElementById('article-head');
  if (head && head.style.display !== 'none'){
    head.classList.add('anim-hero');
    head.style.setProperty('--delay','0ms');
    requestAnimationFrame(()=> head.classList.add('is-in'));

    const parts = head.querySelectorAll('.article-title, .article-meta, .article-tags');
    parts.forEach((el,i)=>{
      el.classList.add('anim-enter');
      el.style.setProperty('--delay', `${120 + i*80}ms`);
      requestAnimationFrame(()=> el.classList.add('is-in'));
    });
  }

  // TOC from left
  const toc = document.getElementById('toc');
  if (toc){
    toc.classList.add('anim-enter-left');
    toc.style.setProperty('--delay','220ms');
    requestAnimationFrame(()=> toc.classList.add('is-in'));
  }

  // Content blocks stagger
  const contentBlocks = document.querySelectorAll('#content h2, #content h3, #content p, #content li, #content pre, #content blockquote, #content table, #content img');
  contentBlocks.forEach((el,i)=>{
    el.classList.add('anim-enter');
    el.style.setProperty('--delay', `${260 + i*24}ms`);
    requestAnimationFrame(()=> el.classList.add('is-in'));
  });

  // Back-home button pop
  const back = document.getElementById('back-home');
  if (back){
    back.classList.add('anim-pop');
    back.style.setProperty('--delay','380ms');
    requestAnimationFrame(()=> back.classList.add('is-in'));
  }
}

function loadArticles() {
  fetch('articles/index.json')
    .then(r => r.json())
    .then(ids => Promise.all(ids.map(id =>
      fetch(`articles/${id}.md?t=${Date.now()}`).then(r => r.text()).then(text => {
        const { meta, content } = parseFrontMatter(text);
        const plain = markdownToPlain(content);
        const rawDate = meta.date || meta.Date || meta.日期 || '';
        const dateStr = String(rawDate).trim();
        const dateKey = parseDateToKey(dateStr);
        return {
          id,
          title: meta.title || '',
          date: dateStr,
          dateKey,
          category: meta.category || '',
          tags: (meta.tags || '').split(',').map(s => s.trim()).filter(Boolean),
          summary: plain.slice(0, 120)
        };
      })
    )))
    .then(list => {
      articles = list;
      loadList();
      setupTagFilters();
      setupSortButton();
      router();
    });
}

function setupTagFilters() {
  const chips = document.querySelectorAll('.chip[data-tag]');

  function applyActiveClasses() {
    chips.forEach(c => {
      const tag = c.getAttribute('data-tag');
      const isAll = tag === '全部';
      const shouldActive = (activeTags.size === 0 && isAll) || (!isAll && activeTags.has(tag));
      c.classList.toggle('active', shouldActive);
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.getAttribute('data-tag');
      if (tag === '全部') {
        // Clear all selections
        activeTags.clear();
      } else {
        // Toggle the tag selection
        if (activeTags.has(tag)) {
          activeTags.delete(tag);
        } else {
          activeTags.add(tag);
        }
      }
      applyActiveClasses();

      // Return to list view and reload
      const heroEl = document.getElementById('hero');
      if (heroEl) heroEl.style.display = 'block';
      viewEl.style.display = 'none';
      listEl.style.display = 'grid';
      loadList();
      document.getElementById('main').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Initial state: no selection means "全部"
  applyActiveClasses();
}

function setupSortControl() {
  const sel = document.getElementById('sort-select');
  if (!sel) return;
  sel.value = sortMode;
  sel.addEventListener('change', () => {
    sortMode = sel.value;
    // Stay in list view and re-render
    const heroEl = document.getElementById('hero');
    if (heroEl) heroEl.style.display = 'block';
    viewEl.style.display = 'none';
    listEl.style.display = 'grid';
    loadList();
  });
}

function setupSortButton() {
  const btns = Array.from(document.querySelectorAll('.js-sort-toggle'));
  if (!btns.length) return;

  const setLabel = () => {
    const isAsc = (sortMode === 'date-asc');
    const text = `日期：${isAsc ? '舊→新' : '新→舊'}`;
    btns.forEach(b => {
      b.textContent = text;
      b.setAttribute('aria-pressed', String(isAsc));
    });
  };

  setLabel();

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      sortMode = (sortMode === 'date-desc') ? 'date-asc' : 'date-desc';
      setLabel();
      const heroEl = document.getElementById('hero');
      if (heroEl) heroEl.style.display = 'block';
      viewEl.style.display = 'none';
      listEl.style.display = 'grid';
      loadList();
    });
  });
}

function showArticle(id) {
  fetch(`articles/${id}.md?t=${Date.now()}`)
    .then(r => r.text())
    .then(md => {
      const { meta, content } = parseFrontMatter(md);
      breadcrumbEl.textContent = `主題專文 / ${meta.category} / ${meta.date}`;
      contentEl.innerHTML = marked.parse(content);
      // Build meta header (title / date / author / category / tags)
      const headEl = document.getElementById('article-head');
      const tagsArr = String(meta.tags || '').split(',').map(s => s.trim()).filter(Boolean);
      const metaLine = [meta.date, meta.author, meta.category].filter(Boolean).join(' · ');
      const metaHTML = `
        <div class="article-head__inner">
          <h1 class="article-title" id="article-title">${meta.title || ''}</h1>
          ${metaLine ? `<div class="article-meta">${metaLine}</div>` : ''}
          ${tagsArr.length ? `<div class="article-tags">${tagsArr.map(t => `<span class=\"chip chip--tag\" data-tag=\"${t}\">${t}</span>`).join('')}</div>` : ''}
        </div>`;
      if (headEl) {
        headEl.innerHTML = metaHTML;
        const coverUrl = `articles/images/cover/${id}.jpeg`;
        headEl.style.backgroundImage = `url('${coverUrl}')`;
        headEl.classList.add('has-cover');
        headEl.classList.remove('no-cover');
        headEl.style.display = 'block';
      }
      // Make article page tags clickable to filter and return to list
      const tagChips = headEl ? headEl.querySelectorAll('.chip--tag[data-tag]') : [];
      tagChips.forEach(ch => {
        ch.addEventListener('click', () => {
          const t = ch.getAttribute('data-tag');
          activeTags.clear();
          if (t) activeTags.add(t);
          // Sync chip UI in both chip rows
          const chips = document.querySelectorAll('.chip[data-tag]');
          chips.forEach(c => {
            const tag = c.getAttribute('data-tag');
            const isAll = tag === '全部';
            const shouldActive = (!isAll && tag === t);
            c.classList.toggle('active', shouldActive);
          });
          // Go back to list and reload
          location.hash = '';
          const heroEl2 = document.getElementById('hero');
          if (heroEl2) heroEl2.style.display = 'block';
          viewEl.style.display = 'none';
          listEl.style.display = 'grid';
          loadList();
          document.getElementById('main').scrollIntoView({ behavior: 'smooth' });
        });
      });
      const titleEl = document.getElementById('article-title');
      if (titleEl) titleEl.textContent = meta.title || '';
      // 若 Markdown 內第一個 H1 與頁面標題重複，就移除，避免雙標題造成大空白
      (function removeDuplicateH1(){
        const h1 = contentEl.querySelector('h1');
        if (!h1) return;
        const t1 = h1.textContent.trim().replace(/\s+/g, '');
        const tt = String(meta.title || '').trim().replace(/\s+/g, '');
        if (!tt || t1 === tt) h1.remove();
      })();
      (function verifyCover(){
        const headEl = document.getElementById('article-head');
        if (!headEl) return;
        const img = new Image();
        img.onload = () => {};
        img.onerror = () => {
          headEl.classList.remove('has-cover');
          headEl.classList.add('no-cover');
          headEl.style.backgroundImage = '';
        };
        img.src = `articles/images/cover/${id}.jpeg`;
      })();
      buildToc();
      animateArticleEnter();
      viewEl.style.display = 'block';
      document.title = meta.title || '文章';
    });
}

function router() {
  const heroEl = document.getElementById('hero');
  const filterBar = document.getElementById('filter-bar');
  const progressBar = document.getElementById('scroll-progress');
  const listSection = document.querySelector('.section.section-list');
  const panel = document.querySelector('.surface--panel');
  const hash = location.hash;

  if (hash.startsWith('#/article/')) {
    const id = hash.split('/')[2];
    if (heroEl) heroEl.style.display = 'none';
    const headEl = document.getElementById('article-head'); if (headEl) headEl.style.display = 'block';
    if (filterBar) { filterBar.classList.remove('show'); filterBar.style.display = 'none'; }
    if (progressBar) progressBar.style.display = 'none';
    if (listSection) listSection.style.display = 'none';
    if (panel) panel.style.display = 'none';
    showArticle(id);
  } else {
    document.title = '校園安全文章';
    if (heroEl) heroEl.style.display = 'block';
    if (filterBar) { filterBar.style.display = 'block'; /* visibility handled by scroll code */ }
    if (filterBar) { filterBar.classList.remove('show'); }
    document.getElementById('main').scrollIntoView({ behavior: 'smooth' });
    if (progressBar) progressBar.style.display = 'block';
    if (listSection) listSection.style.display = 'block';
    if (panel) panel.style.display = 'block';
    { const headEl = document.getElementById('article-head'); if (headEl) headEl.style.display = 'none'; }
    document.documentElement.style.setProperty('--article-hero-h', '0px');
    viewEl.style.display = 'none';
    listEl.style.display = 'grid';
    // 回到首頁時回到頂端，避免馬上觸發黏性篩選列
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
}

function setupReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(el => io.observe(el));
}

// --- Scroll UX: progress bar, parallax, back-to-top ---
(function initScrollUX(){
  const bar = document.getElementById('scroll-progress');
  const backTop = document.getElementById('back-top');
  const docEl = document.documentElement;
  const filterBar = document.getElementById('filter-bar');
  const hero = document.getElementById('hero');
  const siteBadge = document.getElementById('site-badge');
  const topbarEl = document.querySelector('header, .top-bar');
  function updateSafeTop(){
    let h = 0;
    if (topbarEl) {
      const style = getComputedStyle(topbarEl);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        h = topbarEl.offsetHeight || 0;
      }
    }
    document.documentElement.style.setProperty('--safe-top', h + 'px');
  }
  function updateFilterH() {
    if (!filterBar) { 
      document.documentElement.style.setProperty('--filter-h', '0px');
      return; 
    }
    const isShown = filterBar.classList.contains('show') && filterBar.style.display !== 'none';
    if (!isShown) {
      document.documentElement.style.setProperty('--filter-h', '0px');
      return;
    }
    const h = filterBar.offsetHeight || 0;
    // 加上 sticky 的 top:12px 當作與徽章的緩衝
    document.documentElement.style.setProperty('--filter-h', (h + 12) + 'px');
  }

  function onScroll(){
    const scrollTop = docEl.scrollTop || document.body.scrollTop;
    const scrollHeight = docEl.scrollHeight - docEl.clientHeight;
    const p = scrollHeight > 0 ? (scrollTop / scrollHeight) : 0;
    if (bar) bar.style.setProperty('--p', Math.min(1, Math.max(0, p)));
    // Parallax variable for hero bg and heading
    document.documentElement.style.setProperty('--scroll', String(scrollTop));
    // Toggle back-to-top
    if (backTop) backTop.classList.toggle('show', scrollTop > 420);
    if (siteBadge) siteBadge.classList.toggle('show', scrollTop > 40);
    if (filterBar) {
      const threshold = hero ? (hero.offsetTop + hero.offsetHeight - 24) : 280;
      filterBar.classList.toggle('show', scrollTop > threshold);
      updateFilterH();
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateSafeTop);
  updateSafeTop();
  updateFilterH();
  onScroll();

  if (backTop) {
    backTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
// --- end Scroll UX ---

window.addEventListener('hashchange', router);
backBtn.addEventListener('click', () => {
  location.hash = '';
});

loadArticles();
