/* ==========================================================================
   ShopVerse - API client + shared helpers.
   Loaded on every page before any page-specific script.
   ========================================================================== */

const SV = (() => {
  /** Change this one line when pointing the frontend at a deployed backend. */
  const API_BASE = 'http://localhost:5000/api';

  const TOKEN_KEY = 'sv_token';
  const USER_KEY = 'sv_user';

  /* ------------------------------ storage ------------------------------- */
  // Wrapped because localStorage throws outright in some privacy modes.
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (_) {
        /* ignore - the app still works, it just will not remember */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (_) {
        /* ignore */
      }
    },
  };

  const getToken = () => store.get(TOKEN_KEY);

  const getUser = () => {
    try {
      return JSON.parse(store.get(USER_KEY) || 'null');
    } catch (_) {
      return null;
    }
  };

  const setSession = (token, user) => {
    store.set(TOKEN_KEY, token);
    store.set(USER_KEY, JSON.stringify(user));
  };

  const clearSession = () => {
    store.remove(TOKEN_KEY);
    store.remove(USER_KEY);
  };

  const isLoggedIn = () => Boolean(getToken());
  const role = () => getUser()?.role || null;

  /* ------------------------------ requests ------------------------------ */

  class ApiError extends Error {
    constructor(message, status, errors) {
      super(message);
      this.status = status;
      this.errors = errors || [];
    }
  }

  async function request(path, { method = 'GET', body, auth = true, query } = {}) {
    let url = API_BASE + path;

    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (_) {
      throw new ApiError(
        'Cannot reach the server. Is the backend running on port 5000?',
        0
      );
    }

    let payload = {};
    try {
      payload = await res.json();
    } catch (_) {
      /* a 204 or a non-JSON body */
    }

    if (!res.ok) {
      // An expired or revoked token should not leave a stale session behind.
      if (res.status === 401 && getToken()) {
        clearSession();
      }
      throw new ApiError(
        payload.message || `Request failed (${res.status})`,
        res.status,
        payload.errors
      );
    }

    return payload;
  }

  const get = (path, query, opts) => request(path, { ...opts, query });
  const post = (path, body, opts) => request(path, { ...opts, method: 'POST', body });
  const put = (path, body, opts) => request(path, { ...opts, method: 'PUT', body });
  const patch = (path, body, opts) => request(path, { ...opts, method: 'PATCH', body });
  const del = (path, body, opts) => request(path, { ...opts, method: 'DELETE', body });

  /* ------------------------------ endpoints ----------------------------- */

  const api = {
    auth: {
      register: (data) => post('/auth/register', data, { auth: false }),
      login: (data) => post('/auth/login', data, { auth: false }),
      me: () => get('/auth/me'),
      updateMe: (data) => put('/auth/me', data),
      addresses: () => get('/auth/addresses'),
      addAddress: (data) => post('/auth/addresses', data),
      deleteAddress: (id) => del(`/auth/addresses/${id}`),
      changePassword: (data) => put('/auth/password', data),
    },
    categories: {
      list: (q) => get('/categories', q, { auth: false }),
      tree: () => get('/categories/tree', null, { auth: false }),
      one: (id) => get(`/categories/${id}`, null, { auth: false }),
      create: (data) => post('/categories', data),
      update: (id, data) => put(`/categories/${id}`, data),
      remove: (id) => del(`/categories/${id}`),
    },
    products: {
      list: (q) => get('/products', q, { auth: false }),
      one: (id) => get(`/products/${id}`),
      brands: () => get('/products/meta/brands', null, { auth: false }),
      lowStock: () => get('/products/meta/low-stock'),
      create: (data) => post('/products', data),
      update: (id, data) => put(`/products/${id}`, data),
      setStock: (id, stock) => patch(`/products/${id}/stock`, { stock }),
      remove: (id) => del(`/products/${id}`),
      reviews: (id, q) => get(`/products/${id}/reviews`, q, { auth: false }),
      addReview: (id, data) => post(`/products/${id}/reviews`, data),
    },
    cart: {
      get: () => get('/cart'),
      add: (productId, quantity = 1) => post('/cart', { productId, quantity }),
      update: (itemId, quantity) => put(`/cart/${itemId}`, { quantity }),
      remove: (itemId) => del(`/cart/${itemId}`),
      clear: () => del('/cart'),
    },
    coupons: {
      list: () => get('/coupons'),
      apply: (code) => post('/coupons/apply', { code }),
      remove: () => del('/coupons/apply'),
      create: (data) => post('/coupons', data),
      update: (id, data) => put(`/coupons/${id}`, data),
      remove_: (id) => del(`/coupons/${id}`),
    },
    orders: {
      create: (data) => post('/orders', data),
      mine: (q) => get('/orders', q),
      one: (id) => get(`/orders/${id}`),
      track: (id) => get(`/orders/${id}/track`),
      setStatus: (id, status, note) => put(`/orders/${id}/status`, { status, note }),
      cancel: (id, reason) => put(`/orders/${id}/cancel`, { reason }),
    },
    payments: {
      initiate: (orderId) => post('/payments/initiate', { orderId }),
      verify: (orderId, reference) => post('/payments/verify', { orderId, reference }),
      status: (orderId) => get(`/payments/${orderId}/status`),
    },
    reviews: {
      mine: () => get('/reviews/mine'),
      update: (id, data) => put(`/reviews/${id}`, data),
      remove: (id) => del(`/reviews/${id}`),
      helpful: (id) => post(`/reviews/${id}/helpful`),
    },
    seller: {
      dashboard: (days) => get('/seller/dashboard', { days }),
      salesAnalytics: (days) => get('/seller/analytics/sales', { days }),
      products: (q) => get('/seller/products', q),
      performance: () => get('/seller/products/performance'),
      orders: (q) => get('/seller/orders', q),
      reviews: () => get('/seller/reviews'),
    },
    admin: {
      dashboard: (days) => get('/admin/dashboard', { days }),
      overview: () => get('/admin/stats/overview'),
      salesReport: (q) => get('/admin/reports/sales', q),
      topProducts: (q) => get('/admin/reports/top-products', q),
      userGrowth: (q) => get('/admin/reports/user-growth', q),
      inventory: () => get('/admin/reports/inventory'),
      users: (q) => get('/admin/users', q),
      setUserStatus: (id, isActive) => patch(`/admin/users/${id}/status`, { isActive }),
      orders: (q) => get('/admin/orders', q),
    },
    health: () => get('/health', null, { auth: false }),
  };

  return {
    API_BASE,
    api,
    ApiError,
    getToken,
    getUser,
    setSession,
    clearSession,
    isLoggedIn,
    role,
    store,
  };
})();
