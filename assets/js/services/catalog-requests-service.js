(() => {
  const byId = (id) => document.getElementById(id);
  const escape = window.escapeHTML;
  const itemFields = 'id,title,category,image_url,price_amount,price_unit,duration,area,status,created_at';
  const requestFields = 'id,requester_id,item_name,image_url,desired_price,desired_duration,note,status,created_at,profiles(username)';
  const dateFormat = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });

  function imageUrl(value) {
    return /^https?:\/\//i.test(value || '') ? escape(value) : '';
  }

  function postedDate(value) {
    const date = value && new Date(value);
    if (!date || Number.isNaN(date.getTime())) return '';
    return `<time class="posted-date" datetime="${date.toISOString()}">Đăng ngày ${dateFormat.format(date)}</time>`;
  }

  function itemCard(item, heading) {
    const price = window.formatRentPrice(item.price_amount, item.price_unit);
    const src = imageUrl(item.image_url) || imageUrl(window.VNU_CONFIG.DEFAULT_ITEM_IMAGE);
    return `<a class="ct-card catalog-card-link" href="item-detail.html?id=${encodeURIComponent(item.id)}">
      <div class="item-photo">
        <img class="ct-card-img" src="${src}" alt="" loading="lazy" decoding="async">
        ${window.getStatusBadgeHTML(item.status)}
      </div>
      <div class="item-copy">
        <${heading} class="card-name">${escape(item.title)}</${heading}>
        <span class="${window.getPriceClass(item.price_amount)}">${escape(price)}</span>
        <span class="card-meta item-duration"><i class="bi bi-clock" aria-hidden="true"></i>${escape(item.duration)}</span>
        <span class="card-meta"><i class="bi bi-geo-alt" aria-hidden="true"></i>${escape(item.area)}</span>
        ${postedDate(item.created_at)}
      </div>
    </a>`;
  }

  function requestCard(request, detailed, viewerId) {
    const heading = detailed ? 'h2' : 'h3';
    const src = imageUrl(request.image_url);
    const thumbnail = src
      ? `<img class="request-thumb" src="${src}" alt="" loading="lazy" decoding="async">`
      : '<span class="request-thumb request-thumb-placeholder" aria-hidden="true"><i class="bi bi-megaphone"></i></span>';
    const contact = detailed && request.requester_id !== viewerId
      ? `<a class="btn request-contact" href="chat.html?partner_id=${encodeURIComponent(request.requester_id)}"><i class="bi bi-chat-dots me-1" aria-hidden="true"></i>Liên hệ cho mượn</a>`
      : '';
    return `<article class="ct-card request-card">
      <div class="request-identity">
        <div>${window.getStatusBadgeHTML(request.status)}<${heading} class="card-name">${escape(request.item_name)}</${heading}></div>
        ${thumbnail}
      </div>
      <span class="card-meta"><i class="bi bi-wallet2" aria-hidden="true"></i><span><span class="visually-hidden">Giá mong muốn: </span>${escape(request.desired_price)}</span></span>
      <span class="card-meta"><i class="bi bi-clock" aria-hidden="true"></i>${escape(request.desired_duration)}</span>
      ${detailed && request.note ? `<p class="request-note">${escape(request.note)}</p>` : ''}
      <span class="card-meta request-byline"><i class="bi bi-person-circle" aria-hidden="true"></i>${escape(request.profiles?.username || 'Sinh viên')}</span>
      ${contact}
    </article>`;
  }

  async function readRows(query) {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // PostgREST giới hạn số dòng mỗi phản hồi. Giữ thứ tự cố định khi đọc từng trang.
  async function readAll(makeQuery) {
    const pageSize = 100;
    const rows = [];
    while (true) {
      const page = await readRows(makeQuery().range(rows.length, rows.length + pageSize - 1));
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }

  function newestFirst(query) {
    return query.order('created_at', { ascending: false }).order('id', { ascending: false });
  }

  function openRequests() {
    return newestFirst(window.supabaseClient.from('borrow_requests').select(requestFields).eq('status', 'open'));
  }

  function gridLoader(gridId, emptyId, loadRows, renderCard) {
    const grid = byId(gridId);
    const empty = byId(emptyId);
    const spinner = grid.innerHTML;
    let revision = 0;

    return async function refresh() {
      const current = ++revision;
      empty.hidden = true;
      grid.setAttribute('aria-busy', 'true');
      grid.innerHTML = spinner;
      try {
        if (!window.supabaseClient) throw new Error('Chưa kết nối được với Supabase.');
        const rows = await loadRows();
        if (current !== revision) return;
        grid.innerHTML = rows.map((row) => renderCard(row)).join('');
        empty.hidden = rows.length > 0;
      } catch (error) {
        if (current !== revision) return;
        grid.innerHTML = `<div class="alert alert-danger mb-0" role="alert">Không thể tải dữ liệu. ${escape(error.message)}
          <button type="button" class="btn btn-sm btn-outline-dark ms-2">Thử lại</button></div>`;
        grid.querySelector('button').addEventListener('click', refresh, { once: true });
      } finally {
        if (current === revision) grid.setAttribute('aria-busy', 'false');
      }
    };
  }

  function initHome() {
    const loadItems = () => readRows(newestFirst(window.supabaseClient.from('items')
      .select(itemFields).eq('status', 'available')).limit(8));
    gridLoader('home-items-grid', 'home-items-empty', loadItems, (row) => itemCard(row, 'h3'))();
    gridLoader('home-requests-grid', 'home-requests-empty', () => readRows(openRequests().limit(4)),
      (row) => requestCard(row, false))();
  }

  function initCategory() {
    const category = byId('filter-category');
    const area = byId('filter-area');
    const sort = byId('filter-price-sort');
    const search = byId('category-search-input');
    for (const [code, label] of Object.entries(window.VNU_CATEGORIES)) category.add(new Option(label, code));
    for (const label of window.VNU_AREAS) area.add(new Option(label, label));

    const params = new URLSearchParams(location.search);
    const initialCategory = params.get('cat');
    if (Object.hasOwn(window.VNU_CATEGORIES, initialCategory)) category.value = initialCategory;
    if (window.VNU_AREAS.includes(params.get('area'))) area.value = params.get('area');
    if ([...sort.options].some((option) => option.value === params.get('sort'))) sort.value = params.get('sort');
    search.value = params.get('q') || '';

    function loadItems() {
      const categoryCode = category.value;
      const selectedArea = area.value;
      const ordering = sort.value;
      const term = search.value.trim();
      return readAll(() => {
        let query = window.supabaseClient.from('items').select(itemFields);
        if (categoryCode !== 'all') query = query.eq('category', categoryCode);
        if (selectedArea !== 'all') query = query.eq('area', selectedArea);
        if (term) query = query.ilike('title', `%${term.replace(/[\\%_]/g, '\\$&')}%`);
        if (ordering === 'free_only') query = query.eq('price_amount', 0);
        if (ordering === 'price_asc' || ordering === 'price_desc') {
          query = query.order('price_amount', { ascending: ordering === 'price_asc' });
        }
        return newestFirst(query);
      });
    }

    const refresh = gridLoader('category-items-grid', 'category-empty-state', loadItems, (row) => itemCard(row, 'h2'));
    let searchTimer;
    function applyFilters() {
      clearTimeout(searchTimer);
      const term = search.value.trim();
      const label = category.value === 'all' ? 'Tất cả đồ dùng' : window.getCategoryLabel(category.value);
      byId('category-title').textContent = term ? `${label} · “${term}”` : label;
      const url = new URL(location.href);
      for (const [name, value, fallback] of [
        ['cat', category.value, 'all'], ['q', term, ''], ['area', area.value, 'all'], ['sort', sort.value, 'newest']
      ]) {
        if (value === fallback) url.searchParams.delete(name);
        else url.searchParams.set(name, value);
      }
      if (url.href !== location.href) history.replaceState(null, '', url);
      refresh();
    }
    for (const control of [category, area, sort]) control.addEventListener('change', applyFilters);
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 200);
    });
    applyFilters();
  }

  function initRequests() {
    const form = byId('create-request-form');
    const open = byId('open-request-modal-btn');
    const submit = byId('req-submit-btn');
    let viewerId;
    async function loadRequests() {
      const [rows, user] = await Promise.all([readAll(openRequests), window.getCurrentUser()]);
      viewerId = user?.id;
      return rows;
    }
    const refresh = gridLoader('requests-list-grid', 'requests-empty-state', loadRequests,
      (row) => requestCard(row, true, viewerId));
    refresh();

    open.addEventListener('click', async () => {
      open.disabled = true;
      try {
        window.hideAlert('requests-notice');
        if (await window.requireAuth('borrow-requests.html')) window.openRequestModal();
      } catch (error) {
        window.showAlert('requests-notice', `Không thể mở biểu mẫu. ${error.message}`);
      } finally {
        open.disabled = false;
      }
    });

    function setSaving(saving) {
      form.setAttribute('aria-busy', String(saving));
      byId('request-fields').disabled = saving;
      submit.disabled = saving;
      submit.textContent = saving ? 'Đang đăng…' : 'Đăng yêu cầu';
      byId('create-request-modal').querySelectorAll('[data-bs-dismiss]').forEach((button) => {
        button.disabled = saving;
      });
    }

    // Dùng lại ảnh đã tải nếu người dùng thử lại sau lỗi ghi bản ghi.
    let uploaded;
    form.addEventListener('reset', () => { uploaded = null; });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled || !form.reportValidity()) return;
      window.hideAlert('request-form-error');
      const fields = new FormData(form);
      const file = byId('req-image-input').files[0];
      const draft = {
        item_name: fields.get('item_name').trim(),
        desired_price: fields.get('desired_price').trim(),
        desired_duration: fields.get('desired_duration').trim(),
        note: fields.get('note').trim() || null
      };
      if (!draft.item_name || !draft.desired_price || !draft.desired_duration) {
        window.showAlert('request-form-error', 'Vui lòng nhập tên đồ dùng, giá và thời gian cần mượn.');
        return;
      }

      setSaving(true);
      try {
        const user = await window.requireAuth('borrow-requests.html');
        if (!user) return;
        if (file && (uploaded?.file !== file || uploaded.userId !== user.id)) {
          const url = await window.uploadMediaFile(file, 'requests');
          uploaded = { file, userId: user.id, url };
        }
        const { error } = await window.supabaseClient.from('borrow_requests').insert({
          ...draft, requester_id: user.id, image_url: file ? uploaded.url : null, status: 'open'
        });
        if (error) throw error;
      } catch (error) {
        window.showAlert('request-form-error', `Chưa đăng được yêu cầu. ${error.message}`);
        return;
      } finally {
        setSaving(false);
      }
      window.closeRequestModal();
      window.showAlert('requests-notice', 'Đã đăng yêu cầu mượn của bạn.', 'success');
      refresh();
    });
  }

  if (byId('home-items-grid')) initHome();
  if (byId('category-items-grid')) initCategory();
  if (byId('requests-list-grid')) initRequests();
})();
