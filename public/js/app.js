(() => {
  const TOKEN_KEY = 'shareEquipToken';
  const USER_KEY = 'shareEquipUser';
  let equipmentCache = [];
  let editingEquipmentId = null;

  // Selects the first matching element within the specified root.
  const $ = (selector, root = document) => root.querySelector(selector);

  // Selects all matching elements and returns them as an array.
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Retrieves the authentication token from local storage.
  const token = () => localStorage.getItem(TOKEN_KEY);

  // Retrieves the logged-in user's details from local storage.
  const user = () => JSON.parse(localStorage.getItem(USER_KEY) || 'null');

  // Escapes HTML special characters to prevent HTML injection.
  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[char]);
  }

  // Returns an icon based on the equipment category or name.
  function iconFor(category = '', name = '') {
    const value = `${category} ${name}`.toLowerCase();

    if (value.includes('audio') || value.includes('pa') || value.includes('speaker')) return '🔊';
    if (value.includes('ladder')) return '🪜';
    if (value.includes('saw') || value.includes('tool')) return '🛠️';
    if (value.includes('table')) return '▤';
    if (value.includes('projector') || value.includes('visual')) return '📽️';

    return '▦';
  }

  // Sends API requests and handles authentication, JSON data, and errors.
  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };

    // Converts request body objects into JSON and sets the content type.
    if (options.body && typeof options.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    // Adds the authentication token to the request headers when available.
    if (token()) headers.Authorization = `Bearer ${token()}`;

    const response = await fetch(path, { ...options, headers });
    let data = {};

    // Attempts to parse the API response as JSON.
    try {
      data = await response.json();
    } catch (_) {}

    // Throws an error if the API request was unsuccessful.
    if (!response.ok) throw new Error(data.message || 'Request failed.');

    return data;
  }

  // Displays a success or error alert message.
  function showAlert(element, message, type = 'success') {
    if (!element) return;

    element.textContent = message;
    element.className = `alert ${type}`;
    element.classList.remove('hidden');
  }

  // Formats a date into a readable medium-length date string.
  function formatDate(date) {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(date));
  }

  // Generates an HTML card displaying equipment details and available actions.
  function equipmentCard(item, options = {}) {
    const statusClass = item.status.toLowerCase().replace(' ', '-');

    // Displays a borrowing button for available equipment.
    const action = item.status === 'Available'
      ? `<button class="btn btn-dark request-btn" data-id="${item._id}">Request Loan</button>`
      : `<button class="btn btn-outline" disabled>${escapeHtml(item.status)}</button>`;

    // Adds edit and delete buttons when the current user is an administrator.
    const adminActions = options.admin ? `
      <button class="btn btn-outline edit-equipment-btn" data-id="${item._id}">Edit</button>
      <button class="btn btn-outline delete-equipment-btn" data-id="${item._id}">Delete</button>` : '';

    // Builds and returns the equipment card HTML.
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

  // Loads equipment from the API, applies filters, and optionally renders the results.
  async function loadEquipment(params = {}, target = null, options = {}) {
    const query = new URLSearchParams();

    // Adds active filters to the API query parameters.
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'All') query.set(key, value);
    });

    const data = await api(`/api/equipment${query.toString() ? `?${query}` : ''}`);
    equipmentCache = data.equipment;

    // Displays equipment cards or an empty-state message when a target is provided.
    if (target) {
      target.innerHTML = equipmentCache.length
        ? equipmentCache.map((item) => equipmentCard(item, options)).join('')
        : '<div class="empty-state">No equipment matched your search.</div>';
    }

    return equipmentCache;
  }

  // Loads featured available equipment and configures the home page search.
  async function loadHome() {
    try {
      // Retrieves available equipment and selects the first four items.
      const items = await loadEquipment({ status: 'Available' });
      const featured = items.slice(0, 4);

      // Displays featured equipment and the total number available.
      $('#homeEquipment').innerHTML = featured.length
        ? featured.map(equipmentCard).join('')
        : '<div class="empty-state">No available equipment yet.</div>';
      $('#homeCount').textContent = `${items.length} available`;

      // Enables borrowing buttons on the home page.
      bindRequestButtons(document);

      // Redirects users to the dashboard with their search term.
      $('#homeSearchBtn')?.addEventListener('click', () => {
        const search = $('#homeSearch').value.trim();
        window.location.href = `/dashboard.html${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      });

      // Allows users to search by pressing Enter.
      $('#homeSearch')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') $('#homeSearchBtn').click();
      });
    } catch (error) {
      // Displays a message if equipment cannot be loaded.
      $('#homeEquipment').innerHTML = '<div class="empty-state">Could not load equipment. Start the server and connect MongoDB first.</div>';
      $('#homeCount').textContent = 'Unavailable';
    }
  }

  // Attaches click handlers to equipment borrowing buttons.
  function bindRequestButtons(root) {
    $$('.request-btn', root).forEach((button) => {
      button.addEventListener('click', () => {
        // Redirects unauthenticated users to the login page.
        if (!token()) {
          window.location.href = '/login.html';
          return;
        }

        // Finds the selected equipment and opens its borrowing request form.
        const item = equipmentCache.find((equipment) => equipment._id === button.dataset.id);
        if (item) openRequestModal(item);
      });
    });
  }

  // Displays the specified modal dialog.
  function openModal(id) {
    $(id).classList.remove('hidden');
  }

  // Hides the specified modal dialog.
  function closeModal(id) {
    $(id).classList.add('hidden');
  }

  // Prepares and opens the borrowing request form for selected equipment.
  function openRequestModal(item) {
    $('#requestEquipmentName').textContent = `${item.name} • ${item.location}`;
    $('#requestForm input[name="equipment"]').value = item._id;

    // Sets the earliest permitted borrowing dates to today.
    const today = new Date().toISOString().slice(0, 10);
    $('#requestForm input[name="startDate"]').min = today;
    $('#requestForm input[name="endDate"]').min = today;

    // Resets the form and restores the selected equipment ID.
    $('#requestForm').reset();
    $('#requestForm input[name="equipment"]').value = item._id;

    openModal('#requestModal');
  }

  // Configures the login and registration forms and their tab navigation.
  function setupLogin() {
    // Switches between the login and registration forms.
    $$('.tab').forEach((tab) => tab.addEventListener('click', () => {
      const isLogin = tab.dataset.authTab === 'login';
      $$('.tab').forEach((item) => item.classList.toggle('active', item === tab));
      $('#loginForm').classList.toggle('hidden', !isLogin);
      $('#registerForm').classList.toggle('hidden', isLogin);
      $('#authMessage').classList.add('hidden');
    }));

    // Submits login credentials and stores the returned authentication details.
    $('#loginForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);

      try {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: Object.fromEntries(form)
        });

        // Saves the authentication token and user details before redirecting.
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        window.location.href = '/dashboard.html';
      } catch (error) {
        // Displays an error if login fails.
        showAlert($('#authMessage'), error.message, 'error');
      }
    });

    // Submits registration details and stores the new user's authentication details.
    $('#registerForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);

      try {
        const data = await api('/api/auth/register', {
          method: 'POST',
          body: Object.fromEntries(form)
        });

        // Saves the authentication token and user details before redirecting.
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        window.location.href = '/dashboard.html';
      } catch (error) {
        // Displays an error if registration fails.
        showAlert($('#authMessage'), error.message, 'error');
      }
    });
  }

  // Initializes the dashboard and loads data for the authenticated user.
  async function initDashboard() {
    // Redirects users without an authentication token to the login page.
    if (!token()) {
      window.location.href = '/login.html';
      return;
    }

    try {
      // Verifies the user's session and retrieves their current account details.
      const me = await api('/api/auth/me');
      localStorage.setItem(USER_KEY, JSON.stringify(me.user));
      const currentUser = me.user;

      // Displays the user's name and role on the dashboard.
      $('#userBadge').textContent = `${currentUser.name} • ${currentUser.role}`;
      $('#welcomeTitle').textContent = `Welcome, ${currentUser.name.split(' ')[0]}`;

      // Reveals administrative controls when the user is an administrator.
      if (currentUser.role === 'admin') {
        $('#adminPanel').classList.remove('hidden');
        $('#addEquipmentBtn').classList.remove('hidden');
        $('#requestHeading').textContent = 'All Requests';
      }

      // Restores a search term from the URL and loads dashboard data.
      const searchFromUrl = new URLSearchParams(location.search).get('search') || '';
      $('#catalogSearch').value = searchFromUrl;
      await refreshCatalog();
      await loadRequests();

      // Loads the administrative request list for administrators.
      if (currentUser.role === 'admin') await loadAdminRequests();

      // Connects the catalog search and filter controls to the refresh function.
      $('#filterBtn').addEventListener('click', refreshCatalog);
      $('#catalogSearch').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') refreshCatalog();
      });
      $('#statusFilter').addEventListener('change', refreshCatalog);
      $('#categoryFilter').addEventListener('change', refreshCatalog);

      // Clears the saved session and redirects the user after logout.
      $('#logoutBtn').addEventListener('click', () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/';
      });

      // Connects the dashboard buttons and forms to their respective handlers.
      $('#addEquipmentBtn').addEventListener('click', () => openEquipmentModal());
      $('#requestForm').addEventListener('submit', submitRequest);
      $('#equipmentForm').addEventListener('submit', saveEquipment);

      // Closes modals when their close buttons are clicked.
      $$('.modal-close, [data-close]').forEach((button) => {
        button.addEventListener('click', () => closeModal(`#${button.dataset.close}`));
      });

      // Closes a modal when the user clicks its backdrop.
      $$('.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
          if (event.target === modal) modal.classList.add('hidden');
        });
      });
    } catch (error) {
      // Clears invalid session details and redirects the user to login.
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/login.html';
    }
  }

  // Refreshes the equipment catalog using the selected search and filter values.
  async function refreshCatalog() {
    try {
      // Retrieves matching equipment and displays administrator actions when appropriate.
      const equipment = await loadEquipment({
        search: $('#catalogSearch').value.trim(),
        category: $('#categoryFilter').value,
        status: $('#statusFilter').value
      }, $('#catalogGrid'), { admin: user()?.role === 'admin' });

      // Updates the displayed number of matching equipment items.
      $('#catalogCount').textContent = `${equipment.length} items`;

      // Rebuilds the category filter using categories from the current results.
      const categories = [...new Set(equipmentCache.map((item) => item.category))].sort();
      const select = $('#categoryFilter');
      const current = select.value;
      select.innerHTML = '<option value="All">All categories</option>' +
        categories.map((category) => `<option>${escapeHtml(category)}</option>`).join('');
      select.value = categories.includes(current) ? current : 'All';

      // Reattaches borrowing, editing, and deletion button handlers.
      bindRequestButtons(document);
      bindAdminEquipmentButtons();
    } catch (error) {
      // Displays an error if the equipment catalog cannot be refreshed.
      $('#catalogGrid').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  // Attaches click handlers for equipment editing and deletion.
  function bindAdminEquipmentButtons() {
    // Opens the equipment form with the selected item's existing details.
    $$('.edit-equipment-btn').forEach((button) => button.addEventListener('click', () => {
      const item = equipmentCache.find((equipment) => equipment._id === button.dataset.id);
      if (item) openEquipmentModal(item);
    }));

    // Deletes the selected equipment after user confirmation.
    $$('.delete-equipment-btn').forEach((button) => button.addEventListener('click', async () => {
      if (!confirm('Delete this equipment item?')) return;

      try {
        await api(`/api/equipment/${button.dataset.id}`, { method: 'DELETE' });

        // Refreshes the catalog and displays a success message after deletion.
        await refreshCatalog();
        showAlert($('#dashboardMessage'), 'Equipment deleted.');
      } catch (error) {
        // Displays an error if the equipment cannot be deleted.
        showAlert($('#dashboardMessage'), error.message, 'error');
      }
    }));
  }

  // Opens the equipment form for adding a new item or editing an existing one.
  function openEquipmentModal(item = null) {
    editingEquipmentId = item?._id || null;
    $('#equipmentTitle').textContent = item ? 'Edit Equipment' : 'Add Equipment';
    const form = $('#equipmentForm');
    form.reset();

    // Populates the form fields when editing an existing equipment item.
    if (item) {
      ['name', 'category', 'location', 'description', 'condition'].forEach((field) => {
        form.elements[field].value = item[field] || '';
      });
    }

    openModal('#equipmentModal');
  }

  // Creates a new equipment record or saves changes to an existing record.
  async function saveEquipment(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = Object.fromEntries(form);

    try {
      // Sends a POST request for new equipment or a PUT request for updates.
      await api(
        editingEquipmentId ? `/api/equipment/${editingEquipmentId}` : '/api/equipment',
        {
          method: editingEquipmentId ? 'PUT' : 'POST',
          body: payload
        }
      );

      // Closes the form, refreshes the catalog, and displays a confirmation.
      closeModal('#equipmentModal');
      await refreshCatalog();
      showAlert(
        $('#dashboardMessage'),
        editingEquipmentId ? 'Equipment updated.' : 'Equipment added.'
      );
    } catch (error) {
      // Displays an error if saving the equipment fails.
      showAlert($('#dashboardMessage'), error.message, 'error');
    }
  }

  // Submits a new borrowing request for the selected equipment.
  async function submitRequest(event) {
    event.preventDefault();
    const form = new FormData(event.target);

    try {
      // Sends the borrowing request details to the API.
      await api('/api/borrow-requests', {
        method: 'POST',
        body: Object.fromEntries(form)
      });

      // Closes and resets the form and displays a confirmation message.
      closeModal('#requestModal');
      event.target.reset();
      showAlert($('#dashboardMessage'), 'Borrow request submitted and is now pending.');

      // Refreshes the user's requests and the administrator's request list when applicable.
      await loadRequests();
      if (user()?.role === 'admin') await loadAdminRequests();
    } catch (error) {
      // Displays an error if the borrowing request cannot be submitted.
      showAlert($('#dashboardMessage'), error.message, 'error');
    }
  }

  // Generates an HTML card showing borrowing request details and available actions.
  function requestCard(request, admin = false) {
    const equipmentName = request.equipment?.name || 'Equipment';
    const requesterName = request.requester?.name || 'Member';
    let actions = '';

    // Provides approval and rejection buttons for pending requests viewed by administrators.
    if (admin && request.status === 'Pending') {
      actions = `<button class="btn btn-accent review-btn" data-id="${request._id}" data-decision="approve">Approve</button><button class="btn btn-outline review-btn" data-id="${request._id}" data-decision="reject">Reject</button>`;
    } else if (request.status === 'Approved') {
      // Provides a button for marking approved equipment as returned.
      actions = `<button class="btn btn-dark return-btn" data-id="${request._id}">Mark Returned</button>`;
    }

    // Builds and returns the borrowing request card HTML.
    return `<article class="request-card">
      <div><h3>${escapeHtml(equipmentName)}</h3><p>${admin ? `Requested by ${escapeHtml(requesterName)} • ` : ''}${escapeHtml(request.purpose)}</p></div>
      <div><p><strong>Start</strong> ${formatDate(request.startDate)}</p><p><strong>End</strong> ${formatDate(request.endDate)}</p></div>
      <div><span class="request-status ${request.status.toLowerCase()}">${escapeHtml(request.status)}</span><p>${request.reviewedAt ? `Reviewed ${formatDate(request.reviewedAt)}` : 'Awaiting review'}</p></div>
      <div class="request-actions">${actions}</div>
    </article>`;
  }

  // Loads and displays borrowing requests for the current user.
  async function loadRequests() {
    try {
      const data = await api('/api/borrow-requests');

      // Displays request cards or a message when no requests exist.
      $('#requestsList').innerHTML = data.requests.length
        ? data.requests.map((request) => requestCard(request, user()?.role === 'admin')).join('')
        : '<div class="empty-state">No borrowing requests yet.</div>';

      // Attaches event handlers to the request action buttons.
      bindRequestActions($('#requestsList'));
    } catch (error) {
      // Displays an error if the borrowing requests cannot be loaded.
      $('#requestsList').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  // Loads and displays pending borrowing requests for administrators.
  async function loadAdminRequests() {
    try {
      const data = await api('/api/borrow-requests');

      // Filters the requests to show only those awaiting administrative review.
      const pending = data.requests.filter((request) => request.status === 'Pending');

      // Displays pending request cards or a message when none remain.
      $('#adminRequests').innerHTML = pending.length
        ? pending.map((request) => requestCard(request, true)).join('')
        : '<div class="empty-state">No pending requests. The workflow is clear.</div>';

      // Attaches event handlers to the administrative request buttons.
      bindRequestActions($('#adminRequests'));
    } catch (error) {
      // Displays an error if the administrative requests cannot be loaded.
      $('#adminRequests').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  // Attaches handlers for approving, rejecting, and returning borrowing requests.
  function bindRequestActions(root) {
    // Sends the administrator's approval or rejection decision to the API.
    $$('.review-btn', root).forEach((button) => button.addEventListener('click', async () => {
      try {
        await api(`/api/borrow-requests/${button.dataset.id}/review`, {
          method: 'PATCH',
          body: { decision: button.dataset.decision }
        });

        // Refreshes the request lists and equipment catalog after review.
        showAlert($('#dashboardMessage'), `Request ${button.dataset.decision}d successfully.`);
        await loadRequests();
        await loadAdminRequests();
        await refreshCatalog();
      } catch (error) {
        // Displays an error if the request review fails.
        showAlert($('#dashboardMessage'), error.message, 'error');
      }
    }));

    // Marks approved equipment as returned through the API.
    $$('.return-btn', root).forEach((button) => button.addEventListener('click', async () => {
      try {
        await api(`/api/borrow-requests/${button.dataset.id}/return`, { method: 'PATCH' });

        // Refreshes the request lists and equipment catalog after the return.
        showAlert($('#dashboardMessage'), 'Equipment returned and marked Available.');
        await loadRequests();
        if (user()?.role === 'admin') await loadAdminRequests();
        await refreshCatalog();
      } catch (error) {
        // Displays an error if the equipment return fails.
        showAlert($('#dashboardMessage'), error.message, 'error');
      }
    }));
  }

  // Exposes the home page and dashboard initialization functions globally.
  window.ShareEquip = { loadHome, initDashboard };

  // Initializes the login and registration forms when the login form exists.
  if (document.querySelector('#loginForm')) setupLogin();
})();
