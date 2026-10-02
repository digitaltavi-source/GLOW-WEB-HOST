(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;
  const cards = [...document.querySelectorAll(".flow-card,.card")];
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.dataset.visible = "true";
    }
  }, { threshold: 0.15 });
  cards.forEach((el) => io.observe(el));
})();
