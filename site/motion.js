// Entrances happen once, in reading order. Without script, or with reduced motion, everything just shows.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function enter(selector, stepMs) {
  const items = [...document.querySelectorAll(selector)];
  items.forEach((item, index) => {
    item.classList.add('will-enter');
    item.style.setProperty('--delay', `${index * stepMs}ms`);
  });
  return items;
}

if (!reduced && 'IntersectionObserver' in window) {
  const groups = [
    '.hero-words > *',
    '.split-in > *',
    '.split-out > *',
    '.tiles h2, .tile',
    '.band-note',
    '.poster li',
    '.close-words > *, .dialog',
    '.end-top > *, .end-line',
  ];
  const watch = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const item = entry.target;
      item.classList.remove('will-enter');
      item.classList.add('entered');
      // The entrance timing must not outlive the entrance, or hover feedback would inherit its delay.
      const delay = parseInt(item.style.getPropertyValue('--delay'), 10) || 0;
      setTimeout(() => item.classList.remove('entered'), delay + 700);
      watch.unobserve(item);
    }
  }, { threshold: 0.05 });
  for (const selector of groups) {
    for (const item of enter(selector, 75)) watch.observe(item);
  }

  const shutter = document.querySelector('.shutter');
  if (shutter) {
    shutter.classList.add('will-shut');
    // Watch the frame, not the picture: a fully clipped picture never counts as visible.
    const open = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      shutter.classList.remove('will-shut');
      shutter.classList.add('shut-open');
      open.disconnect();
    }, { threshold: 0.25 });
    open.observe(shutter.parentElement ?? shutter);
  }
}
