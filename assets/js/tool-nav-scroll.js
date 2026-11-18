/* Keep the current tool visible when .tool-nav scrolls horizontally (mobile). */
(function () {
  function center() {
    var nav = document.querySelector('.tool-nav-container');
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    var active = nav.querySelector('.tool-nav-link.active, .tool-nav-link[aria-current="page"]');
    if (!active) return;
    var navRect = nav.getBoundingClientRect();
    var linkRect = active.getBoundingClientRect();
    nav.scrollLeft += (linkRect.left - navRect.left) - (navRect.width - linkRect.width) / 2;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', center);
  else center();
})();
