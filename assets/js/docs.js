(function () {
  var root = document.documentElement;
  var body = document.body;
  var toggle = document.querySelector('.menu-toggle');
  var scrim = document.querySelector('.scrim');
  var mobile = window.matchMedia('(max-width: 960px)');
  var NAV_STORAGE_KEY = 'gh-docs-nav-collapsed';
  var SITE_STORAGE_KEY = 'gh-docs-site';

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function recall(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function isVisible(el) {
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  // ---------- Sidebar: collapses on desktop, slides in as a drawer on mobile ----------

  function isNavVisible() {
    return mobile.matches ? body.classList.contains('nav-open') : !body.classList.contains('nav-collapsed');
  }
  function syncToggle() {
    toggle.setAttribute('aria-expanded', String(isNavVisible()));
  }

  if (recall(NAV_STORAGE_KEY) === '1') body.classList.add('nav-collapsed');
  syncToggle();

  toggle.addEventListener('click', function () {
    if (mobile.matches) {
      body.classList.toggle('nav-open');
    } else {
      body.classList.toggle('nav-collapsed');
      store(NAV_STORAGE_KEY, body.classList.contains('nav-collapsed') ? '1' : '0');
    }
    syncToggle();
  });

  scrim.addEventListener('click', function () {
    body.classList.remove('nav-open');
    syncToggle();
  });

  mobile.addEventListener('change', function () {
    body.classList.remove('nav-open');
    syncToggle();
  });

  document.querySelectorAll('.toc-expand').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.closest('.toc-section').classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  document.querySelectorAll('.toc a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (mobile.matches) {
        body.classList.remove('nav-open');
        syncToggle();
      }
    });
  });

  // ---------- Sites: badges and the block availability table ----------
  // Anything with data-sites="exchange org travel" gets badges and is hidden by the site filter.

  var SITES = { exchange: 'Exchange', org: 'International', travel: 'Travel' };
  var SITE_KEYS = Object.keys(SITES);

  function sitesOf(el) {
    return (el.getAttribute('data-sites') || '').split(/\s+/).filter(Boolean);
  }

  function badgesFor(sites) {
    if (sites.length === SITE_KEYS.length) return '<span class="site-badge all">All sites</span>';
    return sites.map(function (s) {
      return '<span class="site-badge ' + s + '">' + SITES[s] + '</span>';
    }).join('');
  }

  document.querySelectorAll('.manual [data-sites]').forEach(function (el) {
    var heading = el.querySelector(':scope > h3, :scope > h4');
    if (!heading) return;
    var wrap = document.createElement('span');
    wrap.className = 'badges';
    wrap.innerHTML = badgesFor(sitesOf(el));
    heading.appendChild(wrap);
  });

  var matrix = document.getElementById('block-matrix');
  if (matrix) {
    var html = '<thead><tr><th>Block</th>' + SITE_KEYS.map(function (s) {
      return '<th class="col-' + s + '">' + SITES[s] + '</th>';
    }).join('') + '</tr></thead><tbody>';

    document.querySelectorAll('#block-library .doc-sub').forEach(function (group) {
      var entries = group.querySelectorAll('.block-entry');
      if (!entries.length) return;
      html += '<tr class="group-row"><th colspan="' + (SITE_KEYS.length + 1) + '">' + group.querySelector('h3').firstChild.textContent + '</th></tr>';
      entries.forEach(function (entry) {
        var sites = sitesOf(entry);
        html += '<tr><td><a href="#' + entry.id + '">' + entry.querySelector('h4').firstChild.textContent + '</a></td>';
        SITE_KEYS.forEach(function (s) {
          var has = sites.indexOf(s) !== -1;
          html += '<td class="col-' + s + (has ? ' yes' : ' no') + '">' +
            (has ? '✓<span class="sr-only"> available</span>' : '–<span class="sr-only"> not available</span>') + '</td>';
        });
        html += '</tr>';
      });
    });
    matrix.innerHTML = html + '</tbody>';
  }

  // ---------- Scroll spy: highlight the current section and sub-section ----------

  var links = {};
  document.querySelectorAll('.toc a[href^="#"]').forEach(function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });
  var targets = Array.prototype.filter.call(
    document.querySelectorAll('.doc-section, .doc-sub'),
    function (el) { return links[el.id]; }
  );

  function openTocFor(link) {
    var item = link.closest('.toc-section');
    if (!item.classList.contains('open')) {
      item.classList.add('open');
      item.querySelector('.toc-expand') && item.querySelector('.toc-expand').setAttribute('aria-expanded', 'true');
    }
  }

  function setActive() {
    var offset = parseInt(getComputedStyle(root).getPropertyValue('--header-h'), 10) + 40;
    var currentSection = null;
    var currentSub = null;

    targets.forEach(function (el) {
      if (!isVisible(el)) return; // hidden by the site filter
      if (el.getBoundingClientRect().top - offset <= 0) {
        if (el.classList.contains('doc-section')) {
          currentSection = el;
          currentSub = null;
        } else {
          currentSub = el;
        }
      }
    });
    if (!currentSection && targets.length) currentSection = targets[0];

    Object.keys(links).forEach(function (id) { links[id].classList.remove('active'); });
    if (currentSection) {
      links[currentSection.id].classList.add('active');
      openTocFor(links[currentSection.id]);
    }
    if (currentSub) links[currentSub.id].classList.add('active');
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () { setActive(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  // ---------- Handle anchors ----------
  // #faq, #theme_footer_panel, #news_items… match an element's id or any name in its
  // data-anchor attribute. When several match (e.g. news_items on two sites), the first one
  // visible under the current site filter wins.

  function findAnchor(name) {
    if (!name) return null;
    var matches = [];
    var byId = document.getElementById(name);
    if (byId) matches.push(byId);
    document.querySelectorAll('[data-anchor]').forEach(function (el) {
      if (el.getAttribute('data-anchor').split(/\s+/).indexOf(name) !== -1) matches.push(el);
    });
    for (var i = 0; i < matches.length; i++) {
      if (isVisible(matches[i])) return matches[i];
    }
    return matches[0] || null;
  }

  var lastTarget = null;

  function goToHash() {
    var name;
    try { name = decodeURIComponent(window.location.hash.slice(1)); } catch (e) { return; }
    var el = findAnchor(name);
    if (!el || el.id === 'top') return;

    if (lastTarget) lastTarget.classList.remove('is-target');
    el.classList.add('is-target');
    lastTarget = el;
    el.scrollIntoView();
    updateEmbedLink();
  }

  window.addEventListener('hashchange', goToHash);

  // Web fonts and images load after the first jump and push content down, so line the target
  // up again once they're in, unless the reader has started scrolling on their own.
  var readerScrolled = false;
  ['wheel', 'touchmove', 'keydown'].forEach(function (type) {
    window.addEventListener(type, function () { readerScrolled = true; }, { once: true, passive: true });
  });
  function realign() {
    if (lastTarget && !readerScrolled) lastTarget.scrollIntoView();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(realign);
  window.addEventListener('load', realign);

  // ---------- Site filter: ?site= in the URL wins, then the remembered choice ----------
  // The <head> script already set data-site on <html> before paint; this keeps it in sync.

  var siteSelect = document.getElementById('site-filter');

  function applySite(site, remember) {
    if (!SITES[site]) site = 'all';
    if (site === 'all') root.removeAttribute('data-site');
    else root.setAttribute('data-site', site);
    siteSelect.value = site;
    if (remember) store(SITE_STORAGE_KEY, site);

    var url = new URL(window.location.href);
    if (site === 'all') url.searchParams.delete('site');
    else url.searchParams.set('site', site);
    try { history.replaceState(null, '', url); } catch (e) {}

    updateEmbedLink();
    setActive();
  }

  siteSelect.addEventListener('change', function () { applySite(siteSelect.value, true); });

  // ---------- Embed mode (?embed=1): no header or menu, for iframes in the WordPress admin ----------

  var embedLink = document.querySelector('.embed-open');

  function updateEmbedLink() {
    var url = new URL(window.location.href);
    url.searchParams.delete('embed');
    embedLink.href = url.toString();
  }

  // An embedded page shouldn't overwrite the reader's remembered site.
  var isEmbed = root.classList.contains('embed');
  applySite(root.getAttribute('data-site') || 'all', !isEmbed);
  goToHash();
})();
