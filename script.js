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

const pageViewEl   = document.getElementById('page-view');
const pageContentEl = document.getElementById('page-content');
const backPageBtn   = document.getElementById('back-home-page');

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

function loadList() {
  listEl.innerHTML = '';
  articles.forEach(meta => {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML =
      `<div class="cover" style="background-image: url('articles/images/cover/${meta.id}.jpeg');"></div>` +
      `<h2><a href="#/article/${meta.id}">${meta.title}</a></h2>` +
      `<div class="date">${meta.date}</div>` +
      `<p>${meta.summary}...</p>`;
    listEl.appendChild(card);
  });
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
          summary: plain.slice(0, 120)
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

function showPage(name) {
  // 如果是 news，就載入 HTML；否則當作 MD
  if (name === 'news') {
    fetch(`pages/news.html?t=${Date.now()}`)
      .then(r => r.text())
      .then(html => {
        pageContentEl.innerHTML = html;
        listEl.style.display = 'none';
        viewEl.style.display = 'none';
        pageViewEl.style.display = 'block';
        document.title = '最新消息';
      });
  } else {
    fetch(`pages/${name}.md?t=${Date.now()}`)
      .then(r => r.text())
      .then(md => {
        pageContentEl.innerHTML = marked.parse(md);
        listEl.style.display = 'none';
        viewEl.style.display = 'none';
        pageViewEl.style.display = 'block';
        document.title = pageContentEl.querySelector('h1')?.textContent || '頁面';
      });
  }
}

function router() {
  const hash = location.hash;
  if (hash.startsWith('#/article/')) {
    const id = hash.split('/')[2];
    showArticle(id);
  } else if (hash.startsWith('#/page/')) {
    const name = hash.split('/')[2];
    showPage(name);
  } else {
    document.title = '校園安全文章';
    viewEl.style.display = 'none';
    listEl.style.display = 'grid';
    pageViewEl.style.display = 'none';
  }
}


window.addEventListener('hashchange', router);
backBtn.addEventListener('click', () => {
  location.hash = '';
});
backPageBtn.addEventListener('click', () => {
  location.hash = '';
});

loadArticles();
