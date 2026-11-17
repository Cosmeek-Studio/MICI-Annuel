// Pages légales : bandeau refermable et sommaire qui suit la lecture.
const ticker = document.getElementById('ticker');
document.getElementById('tickerClose').addEventListener('click', () => {
  ticker.classList.add('is-hidden');
  document.documentElement.classList.add('no-ticker');
});

const links = new Map([...document.querySelectorAll('.legal-toc a')].map((a) => [a.hash.slice(1), a]));
const visible = new Set();
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
  // section courante : la première visible dans l'ordre du document
  const current = [...links.keys()].find((id) => visible.has(id));
  if (current) links.forEach((a, id) => a.classList.toggle('is-current', id === current));
}, { rootMargin: '-100px 0px -55% 0px' });
links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
