document.addEventListener('DOMContentLoaded', function () {
  /* Header solid-on-scroll */
  var header = document.getElementById('site-header');
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');

  function onScroll() {
    if (window.scrollY > 40) header.classList.add('solid');
    else header.classList.remove('solid');
  }
  window.addEventListener('scroll', onScroll);
  onScroll();

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* Scroll-reveal */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* Stats strip: count up when it scrolls into view */
  var statNums = document.querySelectorAll('.stat-num');
  if (statNums.length) {
    var animateStat = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduceMotion || isNaN(target)) {
        el.textContent = target.toFixed(decimals) + suffix;
        return;
      }
      var duration = 1400;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      var statIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateStat(entry.target);
            statIo.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      statNums.forEach(function (el) { statIo.observe(el); });
    } else {
      statNums.forEach(animateStat);
    }
  }

  /* Sliding gallery reel (autoplay + controls) */
  var reel = document.querySelector('.reel-viewport');
  if (reel) {
    var track = reel.querySelector('.reel-track');
    var slides = Array.prototype.slice.call(reel.querySelectorAll('.reel-slide'));
    var dotsWrap = document.querySelector('.reel-dots');
    var prevBtn = document.querySelector('.reel-arrow.prev');
    var nextBtn = document.querySelector('.reel-arrow.next');
    var progressBar = document.querySelector('.reel-progress-bar');
    var count = slides.length;
    var index = 0;
    var AUTOPLAY_MS = 5200;
    var progressStart = null;
    var paused = false;

    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 'reel-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(dot);
    });
    var dots = Array.prototype.slice.call(dotsWrap.querySelectorAll('.reel-dot'));

    function render() {
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
    }
    function goTo(i) { index = (i + count) % count; render(); progressStart = null; if (progressBar) progressBar.style.width = '0%'; }
    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    function stepProgress(ts) {
      if (paused) { requestAnimationFrame(stepProgress); return; }
      if (!progressStart) progressStart = ts;
      var elapsed = ts - progressStart;
      var pct = Math.min(100, (elapsed / AUTOPLAY_MS) * 100);
      if (progressBar) progressBar.style.width = pct + '%';
      if (elapsed >= AUTOPLAY_MS) { progressStart = ts; index = (index + 1) % count; render(); }
      requestAnimationFrame(stepProgress);
    }

    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);
    reel.addEventListener('mouseenter', function () { paused = true; });
    reel.addEventListener('mouseleave', function () { paused = false; });

    render();
    requestAnimationFrame(stepProgress);
  }

  /* Hero booking bar -> hands off to the booking page with query params */
  var heroBookForm = document.getElementById('heroBookForm');
  if (heroBookForm) {
    heroBookForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var params = new URLSearchParams({
        checkin: document.getElementById('heroCheckin').value,
        checkout: document.getElementById('heroCheckout').value,
        guests: document.getElementById('heroGuests').value,
        room: document.getElementById('heroRoom').value
      });
      window.location.href = 'booking.html?' + params.toString();
    });
  }

  /* Booking page: prefill from query params, live summary, WhatsApp handoff */
  var bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    var qs = new URLSearchParams(window.location.search);
    var fields = ['checkin', 'checkout', 'guests', 'room'];
    fields.forEach(function (f) {
      var val = qs.get(f);
      var el = document.getElementById('b_' + f);
      if (val && el) el.value = val;
    });

    var summary = {
      room: document.getElementById('sum_room'),
      checkin: document.getElementById('sum_checkin'),
      checkout: document.getElementById('sum_checkout'),
      guests: document.getElementById('sum_guests'),
      nights: document.getElementById('sum_nights')
    };
    var roomRates = {
      'Garden View Room': 180,
      'Deluxe Ocean Room': 240,
      'Executive Suite': 340,
      'Presidential Suite': 620
    };

    function nightsBetween(a, b) {
      if (!a || !b) return 0;
      var d1 = new Date(a), d2 = new Date(b);
      var diff = (d2 - d1) / (1000 * 60 * 60 * 24);
      return diff > 0 ? Math.round(diff) : 0;
    }

    function updateSummary() {
      var room = document.getElementById('b_room').value;
      var checkin = document.getElementById('b_checkin').value;
      var checkout = document.getElementById('b_checkout').value;
      var guests = document.getElementById('b_guests').value;
      var nights = nightsBetween(checkin, checkout);

      if (summary.room) summary.room.textContent = room || '—';
      if (summary.checkin) summary.checkin.textContent = checkin || '—';
      if (summary.checkout) summary.checkout.textContent = checkout || '—';
      if (summary.guests) summary.guests.textContent = guests || '—';
      if (summary.nights) {
        var rate = roomRates[room] || 0;
        var total = rate * nights;
        summary.nights.textContent = nights ? (nights + ' night' + (nights > 1 ? 's' : '') + (total ? ' · est. $' + total : '')) : '—';
      }
    }
    ['b_room', 'b_checkin', 'b_checkout', 'b_guests'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', updateSummary);
    });
    updateSummary();

    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('b_name').value.trim();
      var email = document.getElementById('b_email').value.trim();
      var phone = document.getElementById('b_phone').value.trim();
      var room = document.getElementById('b_room').value;
      var checkin = document.getElementById('b_checkin').value;
      var checkout = document.getElementById('b_checkout').value;
      var guests = document.getElementById('b_guests').value;
      var requests = document.getElementById('b_requests').value.trim();

      var lines = [
        'Reservation request — The Solvane Hotel',
        'Name: ' + name,
        'Room: ' + room,
        'Check-in: ' + checkin,
        'Check-out: ' + checkout,
        'Guests: ' + guests,
        'Phone: ' + phone,
        'Email: ' + email
      ];
      if (requests) lines.push('Special requests: ' + requests);

      var text = encodeURIComponent(lines.join('\n'));
      var waLink = 'https://wa.me/2348087090973?text=' + text;

      var confirmBox = document.getElementById('bookingConfirm');
      var confirmLink = document.getElementById('bookingConfirmLink');
      if (confirmLink) confirmLink.setAttribute('href', waLink);
      if (confirmBox) {
        confirmBox.classList.add('is-visible');
        confirmBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  /* ======================================================================
     Gold/jade page-wipe transition
     ====================================================================== */
  var wipe = document.getElementById('pageWipe');
  if (wipe) {
    if (reduceMotion) {
      wipe.style.display = 'none';
    } else {
      requestAnimationFrame(function () { wipe.classList.add('wipe-reveal'); });
      document.querySelectorAll('a[href$=".html"]').forEach(function (link) {
        if (link.target === '_blank') return;
        var href = link.getAttribute('href');
        if (!href || href.indexOf('http') === 0) return;
        link.addEventListener('click', function (e) {
          if (href === window.location.pathname.split('/').pop()) return;
          e.preventDefault();
          wipe.classList.remove('wipe-reveal');
          wipe.classList.add('wipe-cover');
          setTimeout(function () { window.location.href = href; }, 430);
        });
      });
    }
  }

  /* ======================================================================
     Fullscreen photo lightbox — every reel slide + static gallery photo
     + room card photo on the current page becomes browsable in one set
     ====================================================================== */
  var lightboxEl = document.getElementById('photoLightbox');
  var lightboxSources = [];
  var clickableEls = Array.prototype.slice.call(document.querySelectorAll('.reel-slide, .lightbox-trigger'));
  clickableEls.forEach(function (el) {
    var img = el.querySelector('img');
    if (img) lightboxSources.push({ src: img.src, alt: img.alt });
  });

  if (lightboxEl && lightboxSources.length) {
    var lbImg = document.getElementById('lightboxImg');
    var lbCaption = document.getElementById('lightboxCaption');
    var lbIndex = 0;

    var openLightbox = function (i) {
      lbIndex = i;
      lbImg.src = lightboxSources[i].src;
      lbImg.alt = lightboxSources[i].alt;
      lbCaption.textContent = lightboxSources[i].alt;
      lightboxEl.classList.add('open');
    };
    var closeLightbox = function () { lightboxEl.classList.remove('open'); };
    var lbNext = function () { openLightbox((lbIndex + 1) % lightboxSources.length); };
    var lbPrev = function () { openLightbox((lbIndex - 1 + lightboxSources.length) % lightboxSources.length); };

    clickableEls.forEach(function (el, i) {
      el.addEventListener('click', function () { openLightbox(i); });
    });
    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxNext').addEventListener('click', lbNext);
    document.getElementById('lightboxPrev').addEventListener('click', lbPrev);
    lightboxEl.addEventListener('click', function (e) { if (e.target === lightboxEl) closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (!lightboxEl.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') lbNext();
      if (e.key === 'ArrowLeft') lbPrev();
    });
  }

  /* ======================================================================
     Room detail modal
     ====================================================================== */
  var roomModal = document.getElementById('roomModal');
  if (roomModal) {
    var rmImg = document.getElementById('roomModalImg');
    var rmName = document.getElementById('roomModalName');
    var rmPrice = document.getElementById('roomModalPrice');
    var rmFacts = document.getElementById('roomModalFacts');
    var rmDesc = document.getElementById('roomModalDesc');
    var rmAmenities = document.getElementById('roomModalAmenities');
    var rmBook = document.getElementById('roomModalBook');
    var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    document.querySelectorAll('.room-view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('[data-room]');
        if (!card) return;
        try {
          var d = JSON.parse(card.getAttribute('data-room'));
          rmImg.src = d.img; rmImg.alt = d.alt;
          rmName.textContent = d.name;
          rmPrice.innerHTML = d.price.replace('/night', '<small>/night</small>');
          rmFacts.innerHTML = d.facts.map(function (f) { return '<span>' + f + '</span>'; }).join('');
          rmDesc.textContent = d.desc;
          rmAmenities.innerHTML = d.amenities.map(function (a) { return '<li>' + CHECK_SVG + a + '</li>'; }).join('');
          rmBook.setAttribute('href', d.href);
          roomModal.showModal();
        } catch (err) { /* malformed data, ignore */ }
      });
    });
    document.getElementById('roomModalClose').addEventListener('click', function () { roomModal.close(); });
  }

  /* ======================================================================
     Room compare (persists across pages via localStorage)
     ====================================================================== */
  var COMPARE_KEY = 'solvane_compare_v1';
  function getCompare() {
    try { return JSON.parse(localStorage.getItem(COMPARE_KEY)) || []; }
    catch (e) { return []; }
  }
  function setCompare(list) {
    try { localStorage.setItem(COMPARE_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
    renderCompareTray();
    syncCompareButtons();
  }
  function toggleCompare(item) {
    var list = getCompare();
    var idx = list.findIndex(function (r) { return r.id === item.id; });
    if (idx > -1) list.splice(idx, 1);
    else {
      if (list.length >= 3) list.shift();
      list.push(item);
    }
    setCompare(list);
  }
  function syncCompareButtons() {
    var ids = getCompare().map(function (r) { return r.id; });
    document.querySelectorAll('.compare-btn[data-id]').forEach(function (btn) {
      var added = ids.indexOf(btn.getAttribute('data-id')) > -1;
      btn.classList.toggle('added', added);
      btn.querySelector('.compare-label-default').style.display = added ? 'none' : 'inline';
      btn.querySelector('.compare-label-added').style.display = added ? 'inline' : 'none';
    });
  }

  var compareTray = document.getElementById('compareTray');
  function renderCompareTray() {
    if (!compareTray) return;
    var list = getCompare();
    compareTray.classList.toggle('show', list.length > 0);
    var thumbsEl = document.getElementById('compareThumbs');
    var infoEl = document.getElementById('compareInfo');
    if (thumbsEl) thumbsEl.innerHTML = list.map(function (r) { return '<img src="' + r.img + '" alt="' + r.name + '">'; }).join('');
    if (infoEl) infoEl.textContent = list.length + ' of 3 rooms selected';
  }

  document.querySelectorAll('.compare-btn[data-id]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('[data-room]');
      if (!card) return;
      try {
        var d = JSON.parse(card.getAttribute('data-room'));
        toggleCompare({
          id: btn.getAttribute('data-id'), name: d.name, price: d.price, img: d.img,
          facts: d.facts, href: d.href
        });
      } catch (err) { /* ignore */ }
    });
  });

  var compareClearBtn = document.getElementById('compareClear');
  if (compareClearBtn) compareClearBtn.addEventListener('click', function () { setCompare([]); });

  var compareViewBtn = document.getElementById('compareViewBtn');
  var compareModal = document.getElementById('compareModal');
  if (compareViewBtn && compareModal) {
    compareViewBtn.addEventListener('click', function () {
      var list = getCompare();
      var body = document.getElementById('compareBody');
      var rows = [
        { label: '', render: function (r) { return '<img src="' + r.img + '" alt="' + r.name + '"><h4>' + r.name + '</h4><span class="cmp-price">' + r.price + '</span><br><button class="compare-remove" data-remove="' + r.id + '">Remove</button>'; } },
        { label: 'Size', render: function (r) { return r.facts[0] || '\u2014'; } },
        { label: 'Guests', render: function (r) { return r.facts[1] || '\u2014'; } },
        { label: 'View', render: function (r) { return r.facts[2] || '\u2014'; } },
        { label: '', render: function (r) { return '<a href="' + r.href + '" class="btn btn-ghost" style="padding:8px 18px;font-size:.72rem;">Book This Room</a>'; } }
      ];
      var html = '<table class="compare-table">';
      rows.forEach(function (row) {
        html += '<tr><th>' + row.label + '</th>';
        list.forEach(function (r) { html += '<td>' + row.render(r) + '</td>'; });
        html += '</tr>';
      });
      html += '</table>';
      body.innerHTML = html;
      body.querySelectorAll('[data-remove]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var list2 = getCompare().filter(function (r) { return r.id !== btn.getAttribute('data-remove'); });
          setCompare(list2);
          if (list2.length === 0) compareModal.close();
          else compareViewBtn.click();
        });
      });
      compareModal.showModal();
    });
  }
  var compareModalClose = document.getElementById('compareModalClose');
  if (compareModalClose && compareModal) compareModalClose.addEventListener('click', function () { compareModal.close(); });

  renderCompareTray();
  syncCompareButtons();
});
