/* Keep native disclosures as the fallback; enhance their height when supported. */
(() => {
  const jobs = [...document.querySelectorAll('details.job')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 300;
  const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  if (!jobs.length || typeof jobs[0].animate !== 'function') return;

  const cards = jobs.map((job) => {
    // Native exclusivity would hide the previous card before it can animate.
    job.removeAttribute('name');
    const summary = job.querySelector('summary');
    const content = job.querySelector('.job-detail');
    summary.setAttribute('aria-controls', content.id || (content.id = `${job.id}-detail`));
    job.dataset.expanded = String(job.open);
    summary.setAttribute('aria-expanded', String(job.open));
    return { job, summary, content, expanded: job.open, animation: null, fade: null };
  });

  function finish(card) {
    if (card.animation) {
      card.animation.onfinish = null;
      card.animation.cancel();
      card.animation = null;
    }
    card.fade?.cancel();
    card.fade = null;
    card.job.open = card.expanded;
    card.job.style.removeProperty('height');
    card.job.classList.remove('is-animating');
  }

  function transition(card, expanded) {
    const { job, summary, content } = card;
    // Read the current frame before cancelling, so a second click reverses smoothly.
    const startHeight = job.getBoundingClientRect().height;
    const startOpacity = job.open ? Number(getComputedStyle(content).opacity) : 0;
    if (card.animation) {
      card.animation.onfinish = null;
      card.animation.cancel();
    }
    card.fade?.cancel();
    card.expanded = expanded;
    job.dataset.expanded = String(expanded);
    summary.setAttribute('aria-expanded', String(expanded));

    if (reducedMotion.matches) {
      finish(card);
      return;
    }

    job.style.height = `${startHeight}px`;
    job.classList.add('is-animating');
    job.open = true; // Keep content present while closing, until the last frame.
    const style = getComputedStyle(job);
    const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const endHeight = summary.getBoundingClientRect().height + borders +
      (expanded ? content.getBoundingClientRect().height : 0);

    if (Math.abs(startHeight - endHeight) < 1) {
      finish(card);
      return;
    }

    card.animation = job.animate(
      { height: [`${startHeight}px`, `${endHeight}px`] },
      { duration, easing, fill: 'both' }
    );
    card.fade = content.animate(
      { opacity: [startOpacity, expanded ? 1 : 0] },
      { duration: expanded ? duration : 180, easing, fill: 'both' }
    );
    card.animation.onfinish = () => finish(card);
  }

  let stopPositionLock = () => {};

  function keepSummaryInPlace(summary) {
    stopPositionLock();
    const top = summary.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight) return;
    const root = document.documentElement;
    const previousAnchor = root.style.overflowAnchor;
    const previousBehavior = root.style.scrollBehavior;
    root.style.overflowAnchor = 'none';
    root.style.scrollBehavior = 'auto';
    let frame;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      root.style.overflowAnchor = previousAnchor;
      root.style.scrollBehavior = previousBehavior;
      ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((type) => {
        window.removeEventListener(type, stop);
      });
    };
    stopPositionLock = stop;
    // Give control back immediately if the visitor scrolls or taps elsewhere.
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((type) => {
      window.addEventListener(type, stop, { passive: true });
    });

    const tick = () => {
      const shift = summary.getBoundingClientRect().top - top;
      if (Math.abs(shift) > 0.5) window.scrollBy({ top: shift, behavior: 'instant' });
      if (cards.some((card) => card.animation)) frame = requestAnimationFrame(tick);
      else stop();
    };
    frame = requestAnimationFrame(tick);
  }

  cards.forEach((card) => {
    card.summary.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey) return;
      event.preventDefault();
      stopPositionLock();
      const expanded = !card.expanded;
      const previous = cards.filter((other) => other !== card && other.expanded);
      const closesEarlierRow = expanded && previous.some((other) =>
        other.job.getBoundingClientRect().top < card.job.getBoundingClientRect().top - 1
      );
      if (closesEarlierRow) keepSummaryInPlace(card.summary);
      if (expanded) previous.forEach((other) => transition(other, false));
      transition(card, expanded);
    });
  });

  // Remove fixed animation heights when reflow or accessibility settings change.
  function finishAll() {
    cards.forEach((card) => {
      if (card.animation) finish(card);
    });
    stopPositionLock();
  }
  window.addEventListener('resize', finishAll, { passive: true });
  window.addEventListener('pagehide', finishAll);
  reducedMotion.addEventListener('change', finishAll);
})();
