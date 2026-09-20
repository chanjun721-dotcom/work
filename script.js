/* Native <details> keeps the catalogue usable even when JavaScript is disabled. */
(() => {
  const jobs = [...document.querySelectorAll('details.job')];
  // Fallback for browsers without support for the details name attribute.
  jobs.forEach((job) => {
    job.addEventListener('toggle', () => {
      if (!job.open) return;
      jobs.forEach((other) => {
        if (other !== job && other.open) other.open = false;
      });
    });
  });
})();
