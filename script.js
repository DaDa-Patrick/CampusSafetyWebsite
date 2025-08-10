let articles = [];
let activeTag = '';

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
  const btn = document.getElementById('theme-toggle') || document.getElementById('theme-toggle-fab');
  if (btn) {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('theme-dark');
      const isDark = document.body.classList.contains('theme-dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
})();
// --- end theme toggle ---

function loadList() {
  listEl.innerHTML = '';
  const data = activeTag ? articles.filter(a => a.tags && a.tags.includes(activeTag)) : articles;
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

function loadArticles() {
  fetch('articles/index.json')
    .then(r => r.json())
    .then(ids => Promise.all(ids.map(id =>
      fetch(`articles/${id}.md?t=${Date.now()}`).then(r => r.text()).then(text => {
        const { meta, content } = parseFrontMatter(text);
        const plain = markdownToPlain(content);
        return {
          id,
          title: meta.title || '',
          date: meta.date || '',
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
      router();
    });
}

function setupTagFilters() {
  const chips = document.querySelectorAll('.chip[data-tag]');
  const allChip = Array.from(chips).find(c => c.getAttribute('data-tag') === '全部');

  function applyActiveClasses() {
    chips.forEach(c => {
      const tag = c.getAttribute('data-tag');
      const isAll = tag === '全部';
      const shouldActive = (activeTag === '' && isAll) || (activeTag !== '' && tag === activeTag);
      c.classList.toggle('active', shouldActive);
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.getAttribute('data-tag');
      if (tag === '全部') {
        activeTag = '';              // 「全部」= 清除篩選
      } else {
        activeTag = (activeTag === tag) ? '' : tag; // 再點同一顆→取消，回到全部
      }
      applyActiveClasses();

      // 回到列表視圖並重載
      const heroEl = document.getElementById('hero');
      if (heroEl) heroEl.style.display = 'block';
      viewEl.style.display = 'none';
      listEl.style.display = 'grid';
      loadList();
      document.getElementById('main').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 初始狀態：預設為「全部」啟用
  applyActiveClasses();
}

function showArticle(id) {
  fetch(`articles/${id}.md?t=${Date.now()}`)
    .then(r => r.text())
    .then(md => {
      const { meta, content } = parseFrontMatter(md);
      breadcrumbEl.textContent = `主題專文 / ${meta.category} / ${meta.date}`;
      contentEl.innerHTML = marked.parse(content);
      buildToc();
      listEl.style.display = 'none';
      viewEl.style.display = 'block';
      document.title = meta.title || '文章';
    });
}

function router() {
  const heroEl = document.getElementById('hero');
  const hash = location.hash;
  if (hash.startsWith('#/article/')) {
    const id = hash.split('/')[2];
    if (heroEl) heroEl.style.display = 'none';
    showArticle(id);
  } else {
    document.title = '校園安全文章';
    if (heroEl) heroEl.style.display = 'block';
    viewEl.style.display = 'none';
    listEl.style.display = 'grid';
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

window.addEventListener('hashchange', router);
backBtn.addEventListener('click', () => {
  location.hash = '';
});

loadArticles();
