import './smooth.js';

// Pages légales : bandeau refermable et sommaire qui suit la lecture.
const ticker = document.getElementById('ticker');
document.getElementById('tickerClose').addEventListener('click', () => {
  ticker.classList.add('is-hidden');
  document.documentElement.classList.add('no-ticker');
});

// Section courante : la dernière dont le titre est passé sous la navigation.
const links = [...document.querySelectorAll('.legal-toc a')];
const sections = links.map((a) => document.getElementById(a.hash.slice(1)));
let current = null;
function spy() {
  let i = 0;
  sections.forEach((s, k) => { if (s.getBoundingClientRect().top <= 180) i = k; });
  if (i === current) return;
  current = i;
  links.forEach((a, k) => a.classList.toggle('is-current', k === i));
}
addEventListener('scroll', spy, { passive: true });
spy();
