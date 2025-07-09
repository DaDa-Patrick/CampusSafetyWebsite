let articles = [];

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
    const card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML =
      `<div class="cover"></div>` +
      `<h2><a href="#/article/${meta.id}">${meta.title}</a></h2>` +
      `<div class="date">${meta.date}</div>` +
      `<p>${meta.summary}...</p>`;
    listEl.appendChild(card);
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

function loadArticles() {
  fetch('articles/index.json')
    .then(r => r.json())
    .then(ids => Promise.all(ids.map(id =>
      fetch(`articles/${id}.md`).then(r => r.text()).then(text => {
        const { meta, content } = parseFrontMatter(text);
        return {
          id,
          title: meta.title || '',
          date: meta.date || '',
          category: meta.category || '',
          summary: content.replace(/\n/g, '').slice(0, 120)
        };
      })
    )))
    .then(list => {
      articles = list;
      loadList();
      router();
    });
}

function showArticle(id) {
  fetch(`articles/${id}.md`)
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

loadArticles();
