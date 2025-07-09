const articles = [
  {
    id: '001',
    date: '2023-01-01',
    author: '學生輔導中心',
    category: '自我覺察',
  },
  // TODO: 加入更多文章設定
];
const listEl = document.getElementById('article-list');
const viewEl = document.getElementById('article-view');
const contentEl = document.getElementById('content');
const tocEl = document.getElementById('toc');
const backBtn = document.getElementById('back-home');
const breadcrumbEl = document.getElementById('breadcrumb');
const langBtn = document.getElementById('lang-switch');

function loadList() {
  listEl.innerHTML = '';
  articles.forEach(meta => {
      fetch(`articles/${meta.id}.md`)
        .then(r => r.text())
        .then(text => {
          const lines = text.split(/\n/);
          const title = lines[0].trim();
          const summary = text.replace(/\n/g, '').slice(0, 120);
          const card = document.createElement('div');
          card.className = 'article-card';
          card.innerHTML =
            `<div class="cover"></div>` +
            `<h2><a href="#/article/${meta.id}">${title}</a></h2>` +
            `<div class="date">${meta.date}</div>` +
            `<p>${summary}...</p>`;
          listEl.appendChild(card);
        });
  });
}

function buildToc() {
  tocEl.innerHTML = '<h3>目錄</h3>';
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

function showArticle(id) {
  const meta = articles.find(a => a.id === id);
  fetch(`articles/${id}.md`)
    .then(r => r.text())
    .then(md => {
      const lines = md.split(/\n/);
      const title = lines[0].trim();
      breadcrumbEl.textContent = `主題專文 / ${meta.category} / ${meta.date}`;
      contentEl.innerHTML = marked.parse(md);
      buildToc();
      listEl.style.display = 'none';
      viewEl.style.display = 'block';
      document.title = title;
    });
}

function router() {
  const hash = location.hash;
  if (hash.startsWith('#/article/')) {
    const id = hash.split('/')[2];
    showArticle(id);
  } else {
    document.title = '校園安全文章';
    viewEl.style.display = 'none';
    listEl.style.display = 'grid';
  }
}

langBtn.addEventListener('click', () => {
  const html = document.documentElement;
  if (html.lang === 'zh-Hant') {
    html.lang = 'en';
    langBtn.textContent = '中';
  } else {
    html.lang = 'zh-Hant';
    langBtn.textContent = 'EN';
  }
});

window.addEventListener('hashchange', router);
backBtn.addEventListener('click', () => {
  location.hash = '';
});

loadList();
router();
