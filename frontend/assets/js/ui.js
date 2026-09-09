/* ==========================================================================
   ShopVerse - UI helpers: toasts, formatting, skeletons, guards, layout.
   ========================================================================== */

const UI = (() => {
  /* ------------------------------ formatting ---------------------------- */

  const money = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const date = (d, withTime = false) => {
    if (!d) return '-';
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    if (withTime) {
      opts.hour = '2-digit';
      opts.minute = '2-digit';
    }
    return new Date(d).toLocaleDateString('en-IN', opts);
  };

  /** Escapes anything that came from the database before it reaches innerHTML. */
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const stars = (rating) => {
    const r = Number(rating) || 0;
    let out = '';
    for (let i = 1; i <= 5; i += 1) {
      if (r >= i) out += '<i class="bi bi-star-fill"></i>';
      else if (r >= i - 0.5) out += '<i class="bi bi-star-half"></i>';
      else out += '<i class="bi bi-star"></i>';
    }
    return `<span class="stars" aria-label="${r} out of 5 stars">${out}</span>`;
  };

  const qs = (key) => new URLSearchParams(location.search).get(key);

  /** Resolve a path relative to the site root from any page depth. */
  const root = () => (location.pathname.includes('/pages/') ? '../' : './');
  const link = (p) => root() + p.replace(/^\//, '');

  /* -------------------------------- toasts ------------------------------- */

  let toastHost;
  const ICONS = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-octagon-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  };

  function toast(message, type = 'info', { action, duration = 4000 } = {}) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toast-host';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }

    const el = document.createElement('div');
    el.className = `toast-sv ${type}`;
    el.innerHTML = `
      <i class="bi ${ICONS[type] || ICONS.info}"></i>
      <div class="flex-grow-1">${esc(message)}</div>`;

    if (action) {
      const btn = document.createElement('button');
      btn.className = 'undo';
      btn.textContent = action.label;
      btn.onclick = () => {
        action.onClick();
        el.remove();
      };
      el.appendChild(btn);
    }

    toastHost.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 200);
    }, duration);
  }

  const toastOk = (m, o) => toast(m, 'success', o);
  const toastErr = (e, o) =>
    toast(typeof e === 'string' ? e : e?.message || 'Something went wrong.', 'error', o);

  /* ------------------------------ skeletons ------------------------------ */

  const skeletonCards = (n = 8) =>
    Array.from({ length: n })
      .map(
        () => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card">
          <div class="sk sk-thumb"></div>
          <div class="body">
            <div class="sk sk-text" style="width:85%"></div>
            <div class="sk sk-text" style="width:60%"></div>
            <div class="sk sk-text" style="width:40%;height:16px"></div>
          </div>
        </div>
      </div>`
      )
      .join('');

  const skeletonRows = (rows = 5, cols = 4) =>
    Array.from({ length: rows })
      .map(
        () =>
          `<tr>${Array.from({ length: cols })
            .map(() => '<td><div class="sk sk-text" style="margin:0"></div></td>')
            .join('')}</tr>`
      )
      .join('');

  const empty = (icon, title, text, cta) => `
    <div class="empty">
      <i class="bi ${icon}"></i>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${cta ? `<a href="${cta.href}" class="btn-sv btn-primary-sv">${esc(cta.label)}</a>` : ''}
    </div>`;

  /* -------------------------------- guards ------------------------------- */

  /**
   * Sends the visitor to login (remembering where they were going) unless they
   * are signed in with one of the allowed roles.
   */
  function requireAuth(...allowedRoles) {
    if (!SV.isLoggedIn()) {
      SV.store.set('sv_redirect', location.pathname + location.search);
      location.href = link('pages/login.html');
      return false;
    }
    if (allowedRoles.length && !allowedRoles.includes(SV.role())) {
      document.body.innerHTML = `
        <div class="empty" style="padding-top:120px">
          <i class="bi bi-shield-lock"></i>
          <h3>403 &mdash; Access denied</h3>
          <p>Your account (${esc(SV.role())}) cannot view this page.</p>
          <a href="${link('index.html')}" class="btn-sv btn-primary-sv">Back to home</a>
        </div>`;
      return false;
    }
    return true;
  }

  /* -------------------------------- theme -------------------------------- */

  function initTheme() {
    const saved = SV.store.get('sv_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleTheme() {
    const next =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    SV.store.set('sv_theme', next);
    renderThemeIcon();
  }

  function renderThemeIcon() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = `<i class="bi ${dark ? 'bi-sun' : 'bi-moon-stars'}"></i>`;
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  /* -------------------------------- layout ------------------------------- */

  function header() {
    const user = SV.getUser();
    const r = root();

    const accountMenu = user
      ? `
      <li><h6 class="dropdown-header">${esc(user.name)}<br><small class="text-muted">${esc(user.email)}</small></h6></li>
      <li><hr class="dropdown-divider"></li>
      ${
        user.role === 'customer'
          ? `<li><a class="dropdown-item" href="${r}pages/orders.html"><i class="bi bi-box-seam me-2"></i>My Orders</a></li>`
          : ''
      }
      ${
        user.role === 'seller'
          ? `<li><a class="dropdown-item" href="${r}pages/seller.html"><i class="bi bi-shop me-2"></i>Seller Dashboard</a></li>`
          : ''
      }
      ${
        user.role === 'admin'
          ? `<li><a class="dropdown-item" href="${r}pages/admin.html"><i class="bi bi-speedometer2 me-2"></i>Admin Dashboard</a></li>`
          : ''
      }
      <li><a class="dropdown-item" href="${r}pages/profile.html"><i class="bi bi-person me-2"></i>Profile</a></li>
      <li><hr class="dropdown-divider"></li>
      <li><button class="dropdown-item text-danger" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Logout</button></li>`
      : `
      <li><a class="dropdown-item" href="${r}pages/login.html"><i class="bi bi-box-arrow-in-right me-2"></i>Login</a></li>
      <li><a class="dropdown-item" href="${r}pages/register.html"><i class="bi bi-person-plus me-2"></i>Create account</a></li>`;

    return `
    <header class="sv-header">
      <div class="container-sv d-flex align-items-center gap-3">
        <a href="${r}index.html" class="sv-logo"><i class="bi bi-bag-heart-fill"></i> ShopVerse</a>

        <nav class="d-none d-lg-flex gap-3 ms-2" aria-label="Main">
          <a href="${r}pages/products.html" class="small fw-semibold">Shop</a>
          <a href="${r}pages/products.html?sort=popular" class="small fw-semibold">Popular</a>
          <a href="${r}pages/products.html?sort=newest" class="small fw-semibold">New</a>
        </nav>

        <form class="sv-search ms-auto ms-lg-3" role="search" id="hdrSearch">
          <i class="bi bi-search" aria-hidden="true"></i>
          <input type="search" name="search" placeholder="Search for products, brands and more..."
                 aria-label="Search products" value="${esc(qs('search') || '')}">
        </form>

        <div class="d-flex align-items-center gap-1 ms-auto ms-lg-0">
          <button class="sv-iconbtn" id="themeBtn" type="button"></button>

          <a href="${r}pages/cart.html" class="sv-iconbtn" aria-label="Cart">
            <i class="bi bi-cart3"></i>
            <span class="sv-badge-count" id="cartCount" hidden>0</span>
          </a>

          <div class="dropdown">
            <button class="sv-iconbtn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Account">
              <i class="bi bi-person-circle"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow">${accountMenu}</ul>
          </div>
        </div>
      </div>
    </header>`;
  }

  function footer() {
    const r = root();
    return `
    <footer class="sv-footer">
      <div class="container-sv">
        <div class="row g-4">
          <div class="col-lg-4">
            <div class="sv-logo mb-3"><i class="bi bi-bag-heart-fill"></i> ShopVerse</div>
            <p class="small mb-0" style="max-width:38ch">
              Shop smarter, live better. Quality products from trusted sellers, delivered
              across India.
            </p>
          </div>
          <div class="col-6 col-lg-2">
            <h6>Shop</h6>
            <a href="${r}pages/products.html">All products</a>
            <a href="${r}pages/products.html?sort=popular">Best sellers</a>
            <a href="${r}pages/products.html?sort=newest">New arrivals</a>
          </div>
          <div class="col-6 col-lg-2">
            <h6>Account</h6>
            <a href="${r}pages/login.html">Login</a>
            <a href="${r}pages/register.html">Register</a>
            <a href="${r}pages/orders.html">My orders</a>
          </div>
          <div class="col-6 col-lg-2">
            <h6>Sell</h6>
            <a href="${r}pages/register.html?role=seller">Become a seller</a>
            <a href="${r}pages/seller.html">Seller dashboard</a>
          </div>
          <div class="col-6 col-lg-2">
            <h6>Support</h6>
            <a href="#">Help centre</a>
            <a href="#">Returns policy</a>
            <a href="#">Contact us</a>
          </div>
        </div>
        <div class="base d-flex flex-wrap justify-content-between gap-2">
          <span>&copy; ${new Date().getFullYear()} ShopVerse. Academic project.</span>
          <span>Built with Node.js, Express, MongoDB &amp; Bootstrap.</span>
        </div>
      </div>
    </footer>`;
  }

  /** Renders the shared chrome and wires up its behaviour. */
  function mountLayout({ withFooter = true } = {}) {
    initTheme();

    const head = document.getElementById('sv-header');
    if (head) head.outerHTML = header();

    if (withFooter) {
      const foot = document.getElementById('sv-footer');
      if (foot) foot.outerHTML = footer();
    }

    renderThemeIcon();
    document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      SV.clearSession();
      toastOk('Logged out.');
      setTimeout(() => (location.href = link('index.html')), 400);
    });

    document.getElementById('hdrSearch')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const term = new FormData(e.target).get('search');
      location.href = `${link('pages/products.html')}?search=${encodeURIComponent(term || '')}`;
    });

    refreshCartCount();
  }

  /** Keeps the header cart badge in sync. Customers only - nobody else has a cart. */
  async function refreshCartCount() {
    const badge = document.getElementById('cartCount');
    if (!badge) return;

    if (!SV.isLoggedIn() || SV.role() !== 'customer') {
      badge.hidden = true;
      return;
    }

    try {
      const res = await SV.api.cart.get();
      const n = res.data.summary.itemCount;
      badge.textContent = n;
      badge.hidden = n === 0;
    } catch (_) {
      badge.hidden = true;
    }
  }

  /* ---------------------------- product card ----------------------------- */

  function productCard(p) {
    const r = root();
    const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
    const out = p.stock === 0;
    const low = p.stock > 0 && p.stock <= 8;

    return `
    <div class="product-card">
      <a href="${r}pages/product.html?id=${p._id}" class="thumb d-block">
        <img src="${esc(p.images?.[0] || '')}" alt="${esc(p.name)}" loading="lazy">
        ${off > 0 ? `<span class="tag-discount">${off}% OFF</span>` : ''}
      </a>
      <button class="wish-btn" type="button" aria-label="Add to wishlist" data-wish="${p._id}">
        <i class="bi bi-heart"></i>
      </button>
      <div class="body">
        <a href="${r}pages/product.html?id=${p._id}" class="title">${esc(p.name)}</a>
        <div class="d-flex align-items-center gap-1">
          ${stars(p.ratingAverage)}
          <small class="dim">(${p.ratingCount || 0})</small>
        </div>
        <div class="d-flex align-items-baseline gap-2 mt-1">
          <strong class="price" style="font-size:var(--t-md)">${money(p.price)}</strong>
          ${off > 0 ? `<small class="dim text-decoration-line-through price">${money(p.mrp)}</small>` : ''}
        </div>
        ${
          out
            ? '<span class="stock-out"><i class="bi bi-x-circle"></i> Out of stock</span>'
            : low
            ? `<span class="stock-warn"><i class="bi bi-exclamation-triangle"></i> Only ${p.stock} left</span>`
            : '<span class="stock-ok"><i class="bi bi-check-circle"></i> In stock</span>'
        }
        <button class="btn-sv btn-primary-sv btn-block mt-2" data-add="${p._id}" ${out ? 'disabled' : ''}>
          <i class="bi bi-cart-plus"></i> ${out ? 'Unavailable' : 'Add to Cart'}
        </button>
      </div>
    </div>`;
  }

  /**
   * One delegated listener handles every "Add to cart" and wishlist button on
   * the page, including cards rendered after this runs.
   */
  function wireProductGrid(container) {
    container.addEventListener('click', async (e) => {
      const addBtn = e.target.closest('[data-add]');
      if (addBtn) {
        if (!SV.isLoggedIn()) {
          SV.store.set('sv_redirect', location.pathname + location.search);
          toast('Please log in to add items to your cart.', 'info');
          setTimeout(() => (location.href = link('pages/login.html')), 800);
          return;
        }
        if (SV.role() !== 'customer') {
          toast('Only customer accounts can shop.', 'warning');
          return;
        }

        const original = addBtn.innerHTML;
        addBtn.disabled = true;
        addBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        try {
          await SV.api.cart.add(addBtn.dataset.add, 1);
          toastOk('Added to cart.');
          refreshCartCount();
        } catch (err) {
          toastErr(err);
        } finally {
          addBtn.disabled = false;
          addBtn.innerHTML = original;
        }
        return;
      }

      const wishBtn = e.target.closest('[data-wish]');
      if (wishBtn) {
        wishBtn.classList.toggle('active');
        toast(
          wishBtn.classList.contains('active')
            ? 'Saved to wishlist.'
            : 'Removed from wishlist.',
          'info',
          { duration: 1800 }
        );
      }
    });
  }

  /* ----------------------------- scroll reveal --------------------------- */

  function revealOnScroll(selector = '.fade-up') {
    const els = document.querySelectorAll(selector);
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
  }

  return {
    money,
    date,
    esc,
    stars,
    qs,
    root,
    link,
    toast,
    toastOk,
    toastErr,
    skeletonCards,
    skeletonRows,
    empty,
    requireAuth,
    initTheme,
    mountLayout,
    refreshCartCount,
    productCard,
    wireProductGrid,
    revealOnScroll,
  };
})();

UI.initTheme(); // applied before first paint to avoid a light flash in dark mode
