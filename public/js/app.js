(() => {
  const TOKEN_KEY = 'shareEquipToken';
  const USER_KEY = 'shareEquipUser';
  let equipmentCache = [];
  let editingEquipmentId = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const token = () => localStorage.getItem(TOKEN_KEY);
  const user = () => JSON.parse(localStorage.getItem(USER_KEY) || 'null');

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function iconFor(category = '', name = '') {
    const value = `${category} ${name}`.toLowerCase();
    if (value.includes('audio') || value.includes('pa') || value.includes('speaker')) return '🔊';
    if (value.includes('ladder')) return '🪜';
    if (value.includes('saw') || value.includes('tool')) return '🛠️';
    if (value.includes('table')) return '▤';
    if (value.includes('projector') || value.includes('visual')) return '📽️';
    return '▦';
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && typeof options.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    if (token()) headers.Authorization = `Bearer ${token()}`;

    const response = await fetch(path, { ...options, headers });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.message || 'Request failed.');
    return data;
  }

  function showAlert(element, message, type = 'success') {
    if (!element) return;
    element.textContent = message;
    element.className = `alert ${type}`;
    element.classList.remove('hidden');
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(date));
  }

  function equipmentCard(item, options = {}) {
    const statusClass = item.status.toLowerCase().replace(' ', '-');
    const action = item.status === 'Available'
      ? `<button class="btn btn-dark request-btn" data-id="${item._id}">Request Loan</button>`
      : `<button class="btn btn-outline" disabled>${escapeHtml(item.status)}</button>`;

    const adminActions = options.admin ? `
      <button class="btn btn-outline edit-equipment-btn" data-id="${item._id}">Edit</button>
      <button class="btn btn-outline delete-equipment-btn" data-id="${item._id}">Delete</button>` : '';

    return `<article class="equipment-card">
      <div class="equipment-visual"><span class="equipment-icon" aria-hidden="true">${iconFor(item.category, item.name)}</span></div>
      <div class="card-body">
        <div class="card-meta">${escapeHtml(item.category)}</div>
        <h3>${escapeHtml(item.name)}</h3>
        <p class="card-desc">${escapeHtml(item.description)}</p>
        <p class="card-meta">${escapeHtml(item.location)} • ${escapeHtml(item.condition)}</p>
        <div class="card-footer">
          <span class="status ${statusClass}">${escapeHtml(item.status)}</span>
          ${options.admin ? `<div class="request-actions">${adminActions}</div>` : action}
        </div>
      </div>
    </article>`;
  }

  async function loadEquipment(params = {}, target = null, options = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value && value !== 'All') query.set(key, value); });
    const data = await api(`/api/equipment${query.toString() ? `?${query}` : ''}`);
    equipmentCache = data.equipment;
    if (target) target.innerHTML = equipmentCache.length ? equipmentCache.map((item) => equipmentCard(item, options)).join('') : '<div class="empty-state">No equipment matched your search.</div>';
    return equipmentCache;
  }

  async function loadHome() {
    try {
      const items = await loadEquipment({ status: 'Available' });
      const featured = items.slice(0, 4);
      $('#homeEquipment').innerHTML = featured.length ? featured.map(equipmentCard).join('') : '<div class="empty-state">No available equipment yet.</div>';
      $('#homeCount').textContent = `${items.length} available`;
      bindRequestButtons(document);

      $('#homeSearchBtn')?.addEventListener('click', () => {
        const search = $('#homeSearch').value.trim();
        window.location.href = `/dashboard.html${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      });
      $('#homeSearch')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') $('#homeSearchBtn').click();
      });
    } catch (error) {
      $('#homeEquipment').innerHTML = `<div class="empty-state">Could not load equipment. Start the server and connect MongoDB first.</div>`;
      $('#homeCount').textContent = 'Unavailable';
    }
  }

  function bindRequestButtons(root) {
    $$('.request-btn', root).forEach((button) => {
      button.addEventListener('click', () => {
        if (!token()) {
          window.location.href = '/login.html';
          return;
        }
        const item = equipmentCache.find((equipment) => equipment._id === button.dataset.id);
        if (item) openRequestModal(item);
      });
    });
  }

  function openModal(id) { $(id).classList.remove('hidden'); }
  function closeModal(id) { $(id).classList.add('hidden'); }

  function openRequestModal(item) {
    $('#requestEquipmentName').textContent = `${item.name} • ${item.location}`;
    $('#requestForm input[name="equipment"]').value = item._id;
    const today = new Date().toISOString().slice(0, 10);
    $('#requestForm input[name="startDate"]').min = today;
    $('#requestForm input[name="endDate"]').min = today;
    $('#requestForm').reset();
    $('#requestForm input[name="equipment"]').value = item._id;
    openModal('#requestModal');
  }

  function setupLogin() {
    $$('.tab').forEach((tab) => tab.addEventListener('click', () => {
      const isLogin = tab.dataset.authTab === 'login';
      $$('.tab').forEach((item) => item.classList.toggle('active', item === tab));
      $('#loginForm').classList.toggle('hidden', !isLogin);
      $('#registerForm').classList.toggle('hidden', isLogin);
      $('#authMessage').classList.add('hidden');
    }));

    $('#loginForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      try {
        const data = await api('/api/auth/login', { method: 'POST', body: Object.fromEntries(form) });
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        window.location.href = '/dashboard.html';
      } catch (error) { showAlert($('#authMessage'), error.message, 'error'); }
    });

    $('#registerForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      try {
        const data = await api('/api/auth/register', { method: 'POST', body: Object.fromEntries(form) });
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        window.location.href = '/dashboard.html';
      } catch (error) { showAlert($('#authMessage'), error.message, 'error'); }
    });
  }

  async function initDashboard() {
    if (!token()) {
      window.location.href = '/login.html';
      return;
    }

    try {
      const me = await api('/api/auth/me');
      localStorage.setItem(USER_KEY, JSON.stringify(me.user));
      const currentUser = me.user;
      $('#userBadge').textContent = `${currentUser.name} • ${currentUser.role}`;
      $('#welcomeTitle').textContent = `Welcome, ${currentUser.name.split(' ')[0]}`;
      if (currentUser.role === 'admin') {
        $('#adminPanel').classList.remove('hidden');
        $('#addEquipmentBtn').classList.remove('hidden');
        $('#requestHeading').textContent = 'All Requests';
      }

      const searchFromUrl = new URLSearchParams(location.search).get('search') || '';
      $('#catalogSearch').value = searchFromUrl;
      await refreshCatalog();
      await loadRequests();
      if (currentUser.role === 'admin') await loadAdminRequests();

      $('#filterBtn').addEventListener('click', refreshCatalog);
      $('#catalogSearch').addEventListener('keydown', (event) => { if (event.key === 'Enter') refreshCatalog(); });
      $('#statusFilter').addEventListener('change', refreshCatalog);
      $('#categoryFilter').addEventListener('change', refreshCatalog);
      $('#logoutBtn').addEventListener('click', () => {
        localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); window.location.href = '/';
      });
      $('#addEquipmentBtn').addEventListener('click', () => openEquipmentModal());
      $('#requestForm').addEventListener('submit', submitRequest);
      $('#equipmentForm').addEventListener('submit', saveEquipment);
      $$('.modal-close, [data-close]').forEach((button) => button.addEventListener('click', () => closeModal(`#${button.dataset.close}`)));
      $$('.modal').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) modal.classList.add('hidden'); }));
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); window.location.href = '/login.html';
    }
  }

  async function refreshCatalog() {
    try {
      const equipment = await loadEquipment({
        search: $('#catalogSearch').value.trim(),
        category: $('#categoryFilter').value,
        status: $('#statusFilter').value
      }, $('#catalogGrid'), { admin: user()?.role === 'admin' });
      $('#catalogCount').textContent = `${equipment.length} items`;
      const categories = [...new Set(equipmentCache.map((item) => item.category))].sort();
      const select = $('#categoryFilter');
      const current = select.value;
      select.innerHTML = '<option value="All">All categories</option>' + categories.map((category) => `<option>${escapeHtml(category)}</option>`).join('');
      select.value = categories.includes(current) ? current : 'All';
      bindRequestButtons(document);
      bindAdminEquipmentButtons();
    } catch (error) {
      $('#catalogGrid').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  function bindAdminEquipmentButtons() {
    $$('.edit-equipment-btn').forEach((button) => button.addEventListener('click', () => {
      const item = equipmentCache.find((equipment) => equipment._id === button.dataset.id);
      if (item) openEquipmentModal(item);
    }));
    $$('.delete-equipment-btn').forEach((button) => button.addEventListener('click', async () => {
      if (!confirm('Delete this equipment item?')) return;
      try {
        await api(`/api/equipment/${button.dataset.id}`, { method: 'DELETE' });
        await refreshCatalog();
        showAlert($('#dashboardMessage'), 'Equipment deleted.');
      } catch (error) { showAlert($('#dashboardMessage'), error.message, 'error'); }
    }));
  }

  function openEquipmentModal(item = null) {
    editingEquipmentId = item?._id || null;
    $('#equipmentTitle').textContent = item ? 'Edit Equipment' : 'Add Equipment';
    const form = $('#equipmentForm');
    form.reset();
    if (item) {
      ['name', 'category', 'location', 'description', 'condition'].forEach((field) => { form.elements[field].value = item[field] || ''; });
    }
    openModal('#equipmentModal');
  }

  async function saveEquipment(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = Object.fromEntries(form);
    try {
      await api(editingEquipmentId ? `/api/equipment/${editingEquipmentId}` : '/api/equipment', {
        method: editingEquipmentId ? 'PUT' : 'POST', body: payload
      });
      closeModal('#equipmentModal');
      await refreshCatalog();
      showAlert($('#dashboardMessage'), editingEquipmentId ? 'Equipment updated.' : 'Equipment added.');
    } catch (error) { showAlert($('#dashboardMessage'), error.message, 'error'); }
  }

  async function submitRequest(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      await api('/api/borrow-requests', { method: 'POST', body: Object.fromEntries(form) });
      closeModal('#requestModal');
      event.target.reset();
      showAlert($('#dashboardMessage'), 'Borrow request submitted and is now pending.');
      await loadRequests();
      if (user()?.role === 'admin') await loadAdminRequests();
    } catch (error) { showAlert($('#dashboardMessage'), error.message, 'error'); }
  }

  function requestCard(request, admin = false) {
    const equipmentName = request.equipment?.name || 'Equipment';
    const requesterName = request.requester?.name || 'Member';
    let actions = '';
    if (admin && request.status === 'Pending') {
      actions = `<button class="btn btn-accent review-btn" data-id="${request._id}" data-decision="approve">Approve</button><button class="btn btn-outline review-btn" data-id="${request._id}" data-decision="reject">Reject</button>`;
    } else if (request.status === 'Approved') {
      actions = `<button class="btn btn-dark return-btn" data-id="${request._id}">Mark Returned</button>`;
    }
    return `<article class="request-card">
      <div><h3>${escapeHtml(equipmentName)}</h3><p>${admin ? `Requested by ${escapeHtml(requesterName)} • ` : ''}${escapeHtml(request.purpose)}</p></div>
      <div><p><strong>Start</strong> ${formatDate(request.startDate)}</p><p><strong>End</strong> ${formatDate(request.endDate)}</p></div>
      <div><span class="request-status ${request.status.toLowerCase()}">${escapeHtml(request.status)}</span><p>${request.reviewedAt ? `Reviewed ${formatDate(request.reviewedAt)}` : 'Awaiting review'}</p></div>
      <div class="request-actions">${actions}</div>
    </article>`;
  }

  async function loadRequests() {
    try {
      const data = await api('/api/borrow-requests');
      $('#requestsList').innerHTML = data.requests.length ? data.requests.map((request) => requestCard(request, user()?.role === 'admin')).join('') : '<div class="empty-state">No borrowing requests yet.</div>';
      bindRequestActions($('#requestsList'));
    } catch (error) { $('#requestsList').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
  }

  async function loadAdminRequests() {
    try {
      const data = await api('/api/borrow-requests');
      const pending = data.requests.filter((request) => request.status === 'Pending');
      $('#adminRequests').innerHTML = pending.length ? pending.map((request) => requestCard(request, true)).join('') : '<div class="empty-state">No pending requests. The workflow is clear.</div>';
      bindRequestActions($('#adminRequests'));
    } catch (error) { $('#adminRequests').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
  }

  function bindRequestActions(root) {
    $$('.review-btn', root).forEach((button) => button.addEventListener('click', async () => {
      try {
        await api(`/api/borrow-requests/${button.dataset.id}/review`, { method: 'PATCH', body: { decision: button.dataset.decision } });
        showAlert($('#dashboardMessage'), `Request ${button.dataset.decision}d successfully.`);
        await loadRequests();
        await loadAdminRequests();
        await refreshCatalog();
      } catch (error) { showAlert($('#dashboardMessage'), error.message, 'error'); }
    }));
    $$('.return-btn', root).forEach((button) => button.addEventListener('click', async () => {
      try {
        await api(`/api/borrow-requests/${button.dataset.id}/return`, { method: 'PATCH' });
        showAlert($('#dashboardMessage'), 'Equipment returned and marked Available.');
        await loadRequests();
        if (user()?.role === 'admin') await loadAdminRequests();
        await refreshCatalog();
      } catch (error) { showAlert($('#dashboardMessage'), error.message, 'error'); }
    }));
  }

  window.ShareEquip = { loadHome, initDashboard };
  if (document.querySelector('#loginForm')) setupLogin();
})();
