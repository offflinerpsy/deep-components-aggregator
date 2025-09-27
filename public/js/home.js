const $ = s => document.querySelector(s);
const enc = encodeURIComponent; // MDN рекомендует для query. 
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent

document.getElementById('y').textContent = new Date().getFullYear();

const go = (val) => location.href = `/ui/search.html?q=${enc(val)}`;

document.getElementById('searchForm').addEventListener('submit', (e) => {
  const q = $('#q').value.trim();
  if (!q) { e.preventDefault(); return; }
});

const fill = (id, arr) => {
  const ul = document.getElementById(id);
  ul.innerHTML = arr.map(p => `<li><a href="/ui/search.html?q=${enc(p)}">${p}</a></li>`).join('');
};

Promise.all([
  fetch('/data/trending.json').then(r => r.json()),
  fetch('/data/popular.json').then(r => r.json())
]).then(([t,p]) => { fill('trending', t); fill('popular', p); });
