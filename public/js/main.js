document.addEventListener('DOMContentLoaded', function () {
  // Language switcher (all pages)
  var switcher = document.getElementById('langSwitcher');
  if (switcher) {
    switcher.addEventListener('change', function () {
      var lang = this.value;
      window.location.href = '/change-lang/' + lang;
    });
  }

  // Hero carousel slider (homepage)
  var carousels = document.querySelectorAll('[data-carousel]');
  carousels.forEach(function (carousel) {
    var slides = carousel.querySelectorAll('.carousel-slide');
    var dots = carousel.querySelectorAll('.carousel-dot');
    if (!slides.length) return;

    var current = 0;
    var timer = null;

    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        s.classList.toggle('active', i === current);
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === current);
      });
    }

    function startAuto() {
      stopAuto();
      timer = setInterval(function () { show(current + 1); }, 5000);
    }

    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    var prevBtn = carousel.querySelector('[data-carousel-prev]');
    var nextBtn = carousel.querySelector('[data-carousel-next]');
    if (prevBtn) prevBtn.addEventListener('click', function () { stopAuto(); show(current - 1); startAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { stopAuto(); show(current + 1); startAuto(); });

    dots.forEach(function (d) {
      d.addEventListener('click', function () {
        stopAuto();
        show(parseInt(d.getAttribute('data-carousel-dot'), 10) || 0);
        startAuto();
      });
    });

    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);

    startAuto();
  });

  // Headlines ticker — slide variant (auto-rotating single headline)
  var tickerSlides = document.querySelectorAll('[data-ticker-slide]');
  tickerSlides.forEach(function (ticker) {
    var items = ticker.querySelectorAll('.ticker-slide-item');
    if (!items.length) return;

    var idx = 0;
    var slideTimer = null;

    function nextSlide() {
      items[idx].classList.remove('active');
      idx = (idx + 1) % items.length;
      items[idx].classList.add('active');
    }

    function startSlide() {
      stopSlide();
      slideTimer = setInterval(nextSlide, 3500);
    }

    function stopSlide() {
      if (slideTimer) { clearInterval(slideTimer); slideTimer = null; }
    }

    ticker.addEventListener('mouseenter', stopSlide);
    ticker.addEventListener('mouseleave', startSlide);

    startSlide();
  });

  // Horizontal Scroll category strips
  document.querySelectorAll('[data-hscroll]').forEach(function (wrap) {
    var track = wrap.querySelector('[data-hscroll-track]');
    var prevBtn = wrap.querySelector('[data-hscroll-prev]');
    var nextBtn = wrap.querySelector('[data-hscroll-next]');
    if (!track) return;
    var scrollByCard = function () {
      var card = track.querySelector('.hscroll-card');
      return (card ? card.offsetWidth + 16 : 280);
    };
    if (prevBtn) prevBtn.addEventListener('click', function () { track.scrollBy({ left: -scrollByCard(), behavior: 'smooth' }); });
    if (nextBtn) nextBtn.addEventListener('click', function () { track.scrollBy({ left: scrollByCard(), behavior: 'smooth' }); });
  });
});
