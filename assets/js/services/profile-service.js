/*
  VNU-RENT — profile-service.js
  Kết nối Supabase cho profile.html (Thành viên 3 phụ trách)
  Quản lý Hồ sơ cá nhân, Danh sách đồ đăng cho mượn & Nhu cầu cần mượn
 */

(function () {
  let currentUser = null;

  // Khởi chạy khi DOM sẵn sàng
  async function initProfilePage() {
    // 1. Kiểm tra xác thực (Bắt buộc đăng nhập để vào profile)
    currentUser = await window.requireAuth('profile.html');
    if (!currentUser) return;

    // 2. Điền thông tin người dùng vào Form
    fillProfileForm(currentUser);

    // 3. Gán sự kiện cho Nút Đăng xuất
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi VNU-RENT?')) {
          await window.signOutUser();
        }
      });
    }

    // 4. Gán sự kiện Lưu thông tin hồ sơ
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', handleProfileSave);
    }

    // 5. Tải danh sách đồ cho mượn (Tab 1) & Nhu cầu cần mượn (Tab 2)
    await Promise.all([
      loadUserItems(currentUser.id),
      loadUserBorrowRequests(currentUser.id)
    ]);
  }

  // Điền dữ liệu vào form hồ sơ cá nhân
  function fillProfileForm(user) {
    const avatarImg = document.getElementById('profile-avatar-img');
    const usernameInput = document.getElementById('profile-username');
    const emailInput = document.getElementById('profile-email');
    const phoneInput = document.getElementById('profile-phone');
    const areaSelect = document.getElementById('profile-area');

    if (avatarImg) {
      avatarImg.src = user.profile.avatar_url || window.VNU_CONFIG.DEFAULT_AVATAR;
    }

    if (usernameInput) {
      usernameInput.value = user.profile.username || '';
    }

    if (emailInput) {
      emailInput.value = user.email || '';
    }

    if (phoneInput) {
      phoneInput.value = user.profile.phone || '';
    }

    // Đổ danh sách khu vực chuẩn Làng ĐHQG vào select
    if (areaSelect) {
      areaSelect.innerHTML = '<option value="">-- Chọn khu vực tại Làng ĐHQG --</option>';
      window.VNU_AREAS.forEach((area) => {
        const opt = document.createElement('option');
        opt.value = area;
        opt.textContent = area;
        if (user.profile.area === area) {
          opt.selected = true;
        }
        areaSelect.appendChild(opt);
      });
      // Nếu user có khu vực khác chưa có trong danh sách
      if (user.profile.area && !window.VNU_AREAS.includes(user.profile.area)) {
        const customOpt = document.createElement('option');
        customOpt.value = user.profile.area;
        customOpt.textContent = user.profile.area;
        customOpt.selected = true;
        areaSelect.appendChild(customOpt);
      }
    }
  }

  // Xử lý lưu hồ sơ cá nhân & upload avatar mới
  async function handleProfileSave(e) {
    e.preventDefault();
    window.hideAlert('profile-alert');

    const saveBtn = document.getElementById('profile-save-btn');
    const usernameInput = document.getElementById('profile-username');
    const phoneInput = document.getElementById('profile-phone');
    const areaSelect = document.getElementById('profile-area');
    const avatarInput = document.getElementById('profile-avatar-input');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const area = areaSelect ? areaSelect.value : '';

    if (!username) {
      window.showAlert('profile-alert', 'Họ tên hiển thị không được để trống.', 'warning');
      return;
    }

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Đang lưu...';
      }

      let newAvatarUrl = null;
      // Nếu người dùng chọn ảnh đại diện mới
      if (avatarInput && avatarInput.files && avatarInput.files[0]) {
        const file = avatarInput.files[0];
        newAvatarUrl = await window.uploadMediaFile(file, 'avatars');
      }

      // Chuẩn bị payload cập nhật bảng profiles
      const updateData = {
        username: username,
        phone: phone,
        area: area || 'Làng ĐHQG TP.HCM'
      };

      if (newAvatarUrl) {
        updateData.avatar_url = newAvatarUrl;
        if (avatarInput) avatarInput.value = '';
      }

      const { error } = await window.supabaseClient
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id);

      if (error) {
        throw new Error(error.message);
      }

      // Cập nhật lại đối tượng currentUser trong bộ nhớ
      currentUser.profile.username = username;
      currentUser.profile.phone = phone;
      currentUser.profile.area = updateData.area;
      if (newAvatarUrl) {
        currentUser.profile.avatar_url = newAvatarUrl;
      }

      // Cập nhật nhãn tên trên Navbar
      const navUserLabel = document.getElementById('nav-user-label');
      if (navUserLabel) {
        navUserLabel.textContent = username;
      }

      window.showAlert('profile-alert', 'Đã cập nhật thông tin cá nhân thành công!', 'success');
    } catch (err) {
      console.error('[VNU-RENT] Lỗi cập nhật hồ sơ:', err);
      window.showAlert('profile-alert', `Cập nhật thất bại: ${err.message}`, 'danger');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Lưu thay đổi';
      }
    }
  }

  // QUẢN LÝ ĐỒ DÙNG CHO MƯỢN CỦA TÔI

  async function loadUserItems(userId) {
    const listContainer = document.getElementById('my-items-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="text-muted mt-2 mb-0">Đang tải danh sách đồ cho mượn...</p>
      </div>
    `;

    try {
      const { data: items, error } = await window.supabaseClient
        .from('items')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!items || items.length === 0) {
        listContainer.innerHTML = `
          <div class="text-center py-5 bg-white rounded border">
            <i class="bi bi-box2 text-muted" style="font-size: 2.5rem;"></i>
            <h6 class="mt-3 text-secondary">Bạn chưa đăng tin cho mượn món đồ nào</h6>
            <p class="text-muted small">Chia sẻ đồ dùng không dùng tới để hỗ trợ bạn bè cùng Làng ĐHQG!</p>
            <a href="post-item.html" class="btn btn-ct-orange btn-sm mt-2">
              <i class="bi bi-plus-circle me-1"></i>Đăng tin ngay
            </a>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = '';
      items.forEach((item) => {
        const row = createItemRowElement(item);
        listContainer.appendChild(row);
      });
    } catch (err) {
      console.error('[VNU-RENT] Lỗi tải danh sách items:', err);
      listContainer.innerHTML = `
        <div class="alert alert-danger">
          Không thể tải danh sách đồ cho mượn: ${window.escapeHTML(err.message)}
        </div>
      `;
    }
  }

  function createItemRowElement(item) {
    const row = document.createElement('div');
    row.className = 'profile-item-row';
    row.id = `item-row-${item.id}`;

    const imageUrl = item.image_url || window.VNU_CONFIG.DEFAULT_ITEM_IMAGE;
    const isAvailable = item.status === 'available';

    row.innerHTML = `
      <img src="${window.escapeHTML(imageUrl)}" alt="${window.escapeHTML(item.title)}" class="profile-item-thumb" onerror="this.src='${window.VNU_CONFIG.DEFAULT_ITEM_IMAGE}'">
      <div class="profile-item-content">
        <a href="item-detail.html?id=${item.id}" class="profile-item-title mb-1">
          ${window.escapeHTML(item.title)}
        </a>
        <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
          <span class="${window.getPriceClass(item.price_amount)} fw-bold" style="font-size: 0.95rem;">
            ${window.formatRentPrice(item.price_amount, item.price_unit)}
          </span>
          <span class="text-muted small">&bull;</span>
          <span class="text-muted small"><i class="bi bi-geo-alt me-1"></i>${window.escapeHTML(item.area)}</span>
          <span class="item-status-badge" id="badge-item-${item.id}">
            ${window.getStatusBadgeHTML(item.status)}
          </span>
        </div>
        <div class="text-muted small">
          Đăng ngày: ${new Date(item.created_at).toLocaleDateString('vi-VN')}
        </div>
      </div>
      <div class="profile-item-actions">
        <button type="button" class="btn btn-sm ${isAvailable ? 'btn-outline-secondary' : 'btn-outline-success'} btn-toggle-status" data-id="${item.id}" data-status="${item.status}">
          <i class="bi ${isAvailable ? 'bi-lock' : 'bi-unlock'} me-1"></i>
          <span>${isAvailable ? 'Đánh dấu Đang cho mượn' : 'Đánh dấu Còn trống'}</span>
        </button>
        <button type="button" class="btn btn-sm btn-outline-danger btn-delete-item" data-id="${item.id}" title="Xóa tin này">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;

    // Gán sự kiện đổi trạng thái
    const toggleBtn = row.querySelector('.btn-toggle-status');
    toggleBtn.addEventListener('click', () => handleToggleItemStatus(item.id, toggleBtn));

    // Gán sự kiện xóa tin
    const deleteBtn = row.querySelector('.btn-delete-item');
    deleteBtn.addEventListener('click', () => handleDeleteItem(item.id));

    return row;
  }

  async function handleToggleItemStatus(itemId, button) {
    const currentStatus = button.getAttribute('data-status');
    const newStatus = currentStatus === 'available' ? 'rented' : 'available';

    button.disabled = true;
    try {
      const { error } = await window.supabaseClient
        .from('items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (error) throw error;

      button.setAttribute('data-status', newStatus);
      const isNowAvailable = newStatus === 'available';

      button.className = `btn btn-sm ${isNowAvailable ? 'btn-outline-secondary' : 'btn-outline-success'} btn-toggle-status`;
      button.innerHTML = `
        <i class="bi ${isNowAvailable ? 'bi-lock' : 'bi-unlock'} me-1"></i>
        <span>${isNowAvailable ? 'Đánh dấu Đang cho mượn' : 'Đánh dấu Còn trống'}</span>
      `;

      const badgeContainer = document.getElementById(`badge-item-${itemId}`);
      if (badgeContainer) {
        badgeContainer.innerHTML = window.getStatusBadgeHTML(newStatus);
      }
    } catch (err) {
      alert(`Không thể đổi trạng thái: ${err.message}`);
    } finally {
      button.disabled = false;
    }
  }

  async function handleDeleteItem(itemId) {
    if (!confirm('Bạn có chắc chắn muốn xóa tin đăng cho mượn này không? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      const { error } = await window.supabaseClient
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      const row = document.getElementById(`item-row-${itemId}`);
      if (row) {
        row.style.transition = 'opacity 0.3s';
        row.style.opacity = '0';
        setTimeout(() => {
          row.remove();
          const list = document.getElementById('my-items-list');
          if (list && list.children.length === 0) {
            loadUserItems(currentUser.id);
          }
        }, 300);
      }
    } catch (err) {
      alert(`Xóa tin thất bại: ${err.message}`);
    }
  }

  // QUẢN LÝ NHU CẦU CẦN MƯỢN CỦA TÔI

  async function loadUserBorrowRequests(userId) {
    const listContainer = document.getElementById('my-requests-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="text-muted mt-2 mb-0">Đang tải nhu cầu cần mượn...</p>
      </div>
    `;

    try {
      const { data: requests, error } = await window.supabaseClient
        .from('borrow_requests')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!requests || requests.length === 0) {
        listContainer.innerHTML = `
          <div class="text-center py-5 bg-white rounded border">
            <i class="bi bi-megaphone text-muted" style="font-size: 2.5rem;"></i>
            <h6 class="mt-3 text-secondary">Bạn chưa có yêu cầu cần mượn nào</h6>
            <p class="text-muted small">Đang cần gấp giáo trình, máy tính hay dụng cụ? Đăng yêu cầu để sinh viên quanh bạn giúp đỡ.</p>
            <a href="borrow-requests.html" class="btn btn-ct-orange btn-sm mt-2">
              <i class="bi bi-send me-1"></i>Đăng yêu cầu mượn
            </a>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = '';
      requests.forEach((req) => {
        const row = createRequestRowElement(req);
        listContainer.appendChild(row);
      });
    } catch (err) {
      console.error('[VNU-RENT] Lỗi tải danh sách requests:', err);
      listContainer.innerHTML = `
        <div class="alert alert-danger">
          Không thể tải danh sách nhu cầu mượn: ${window.escapeHTML(err.message)}
        </div>
      `;
    }
  }

  function createRequestRowElement(req) {
    const row = document.createElement('div');
    row.className = 'profile-item-row';
    row.id = `request-row-${req.id}`;

    const isOpen = req.status === 'open';

    row.innerHTML = `
      <div class="rounded-circle d-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning flex-shrink-0" style="width: 50px; height: 50px;">
        <i class="bi bi-megaphone-fill fs-4 text-warning"></i>
      </div>
      <div class="profile-item-content">
        <h6 class="mb-1 fw-bold text-dark">${window.escapeHTML(req.item_name)}</h6>
        <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
          <span class="text-danger fw-bold small"><i class="bi bi-cash me-1"></i>${window.escapeHTML(req.desired_price)}</span>
          <span class="text-muted small">&bull;</span>
          <span class="text-muted small"><i class="bi bi-clock-history me-1"></i>Cần trong: ${window.escapeHTML(req.desired_duration)}</span>
          <span class="req-status-badge" id="badge-request-${req.id}">
            ${window.getStatusBadgeHTML(req.status)}
          </span>
        </div>
        ${req.note ? `<p class="text-muted small mb-1"><i class="bi bi-chat-left-quote me-1"></i>${window.escapeHTML(req.note)}</p>` : ''}
        <div class="text-muted small">
          Tạo lúc: ${new Date(req.created_at).toLocaleDateString('vi-VN')}
        </div>
      </div>
      <div class="profile-item-actions">
        ${isOpen ? `
          <button type="button" class="btn btn-sm btn-outline-success btn-close-request" data-id="${req.id}">
            <i class="bi bi-check-circle me-1"></i>Đã mượn được
          </button>
        ` : `
          <button type="button" class="btn btn-sm btn-secondary" disabled>
            <i class="bi bi-check2-all me-1"></i>Đã hoàn thành
          </button>
        `}
        <button type="button" class="btn btn-sm btn-outline-danger btn-delete-request" data-id="${req.id}" title="Xóa yêu cầu này">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;

    // Gán sự kiện Đánh dấu Đã mượn được
    const closeBtn = row.querySelector('.btn-close-request');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => handleCloseBorrowRequest(req.id, closeBtn));
    }

    // Gán sự kiện Xóa yêu cầu
    const deleteBtn = row.querySelector('.btn-delete-request');
    deleteBtn.addEventListener('click', () => handleDeleteBorrowRequest(req.id));

    return row;
  }

  async function handleCloseBorrowRequest(reqId, button) {
    button.disabled = true;
    try {
      const { error } = await window.supabaseClient
        .from('borrow_requests')
        .update({ status: 'closed' })
        .eq('id', reqId);

      if (error) throw error;

      button.className = 'btn btn-sm btn-secondary';
      button.innerHTML = '<i class="bi bi-check2-all me-1"></i>Đã hoàn thành';
      button.disabled = true;

      const badgeContainer = document.getElementById(`badge-request-${reqId}`);
      if (badgeContainer) {
        badgeContainer.innerHTML = window.getStatusBadgeHTML('closed');
      }
    } catch (err) {
      alert(`Không thể cập nhật yêu cầu: ${err.message}`);
      button.disabled = false;
    }
  }

  async function handleDeleteBorrowRequest(reqId) {
    if (!confirm('Bạn có chắc chắn muốn xóa yêu cầu cần mượn này không?')) {
      return;
    }

    try {
      const { error } = await window.supabaseClient
        .from('borrow_requests')
        .delete()
        .eq('id', reqId);

      if (error) throw error;

      const row = document.getElementById(`request-row-${reqId}`);
      if (row) {
        row.style.transition = 'opacity 0.3s';
        row.style.opacity = '0';
        setTimeout(() => {
          row.remove();
          const list = document.getElementById('my-requests-list');
          if (list && list.children.length === 0) {
            loadUserBorrowRequests(currentUser.id);
          }
        }, 300);
      }
    } catch (err) {
      alert(`Xóa yêu cầu thất bại: ${err.message}`);
    }
  }

  // Khởi động khi tải xong trang
  document.addEventListener('DOMContentLoaded', initProfilePage);
})();
