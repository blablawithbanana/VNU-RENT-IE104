(function () {
  function showError(elementId, error) {
    const message = error && error.message ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
    window.showAlert(elementId, message, 'danger');
  }

  function populateAreaSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select || !Array.isArray(window.VNU_AREAS)) return;

    window.VNU_AREAS.forEach(function (area) {
      const option = document.createElement('option');
      option.value = area;
      option.textContent = area;
      select.appendChild(option);
    });
  }

  function safeLocalRedirect() {
    const requested = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
    try {
      const target = new URL(requested, window.location.href);
      if (target.origin !== window.location.origin) return 'index.html';
      return target.pathname + target.search + target.hash;
    } catch (error) {
      return 'index.html';
    }
  }

  function setButtonBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = label;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    window.hideAlert('auth-alert');
    const button = document.getElementById('login-submit-btn');
    setButtonBusy(button, true, 'Đang đăng nhập...');
    try {
      const { error } = await window.supabaseClient.auth.signInWithPassword({
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value
      });
      if (error) throw error;
      window.location.href = safeLocalRedirect();
    } catch (error) {
      showError('auth-alert', error);
      setButtonBusy(button, false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    window.hideAlert('auth-alert');
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    if (password.length < 6) {
      window.showAlert('auth-alert', 'Mật khẩu cần có ít nhất 6 ký tự.', 'danger');
      return;
    }
    if (password !== confirmPassword) {
      window.showAlert('auth-alert', 'Mật khẩu nhập lại không khớp.', 'danger');
      return;
    }

    const button = document.getElementById('reg-submit-btn');
    setButtonBusy(button, true, 'Đang tạo tài khoản...');
    try {
      const { data, error } = await window.supabaseClient.auth.signUp({
        email: document.getElementById('reg-email').value.trim(),
        password: password,
        options: {
          data: {
            username: document.getElementById('reg-username').value.trim(),
            phone: document.getElementById('reg-phone').value.trim(),
            area: document.getElementById('reg-area').value
          }
        }
      });
      if (error) throw error;
      if (data.session) {
        window.location.href = safeLocalRedirect();
        return;
      }
      window.showAlert('auth-alert', 'Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản trước khi đăng nhập.', 'success');
      window.switchAuthTab('login');
    } catch (error) {
      showError('auth-alert', error);
    } finally {
      setButtonBusy(button, false);
    }
  }

  async function handleOAuth(provider) {
    window.hideAlert('auth-alert');
    const configKey = provider === 'google' ? 'ENABLE_GOOGLE_OAUTH' : 'ENABLE_FACEBOOK_OAUTH';
    if (!window.VNU_CONFIG || !window.VNU_CONFIG[configKey]) {
      window.showAlert('auth-alert', 'Đăng nhập Google/Facebook đang được cấu hình, vui lòng sử dụng Email và Mật khẩu.', 'info');
      return;
    }

    try {
      const redirectTarget = new URL(safeLocalRedirect(), window.location.origin);
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: redirectTarget.href }
      });
      if (error) throw error;
    } catch (error) {
      showError('auth-alert', error);
    }
  }

  async function initPostItemPage() {
    const user = await window.requireAuth('post-item.html');
    if (!user) return;

    const nameInput = document.getElementById('post-contact-name');
    const phoneInput = document.getElementById('post-contact-phone');
    if (nameInput) nameInput.value = user.profile.username || '';
    if (phoneInput) phoneInput.value = user.profile.phone || '';
  }

  async function handlePostItem(event) {
    event.preventDefault();
    window.hideAlert('post-item-alert');
    const fileInput = document.getElementById('post-image-input');
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      window.showAlert('post-item-alert', 'Vui lòng chọn ảnh cho món đồ.', 'danger');
      return;
    }

    const user = await window.requireAuth('post-item.html');
    if (!user) return;

    const button = document.getElementById('post-submit-btn');
    setButtonBusy(button, true, 'Đang đăng tin...');
    try {
      const imageUrl = await window.uploadMediaFile(file, 'items');
      const { data, error } = await window.supabaseClient
        .from('items')
        .insert({
          owner_id: user.id,
          title: document.getElementById('post-title').value.trim(),
          category: document.getElementById('post-category').value,
          description: document.getElementById('post-description').value.trim(),
          price_amount: Number(document.getElementById('post-price-amount').value),
          price_unit: document.getElementById('post-price-unit').value,
          duration: document.getElementById('post-duration').value.trim(),
          area: document.getElementById('post-area').value,
          contact_name: document.getElementById('post-contact-name').value.trim(),
          contact_phone: document.getElementById('post-contact-phone').value.trim(),
          image_url: imageUrl
        })
        .select('id')
        .single();
      if (error) throw error;
      if (!data || !data.id) throw new Error('Không nhận được mã tin đăng sau khi lưu.');
      window.resetPostImagePreview();
      window.location.href = `item-detail.html?id=${encodeURIComponent(data.id)}`;
    } catch (error) {
      if (error && error.message === 'Dung lượng hình ảnh vượt quá giới hạn 2 MB.') {
        window.showPostImageError(error.message);
      } else {
        showError('post-item-alert', error);
      }
      setButtonBusy(button, false);
    }
  }

  function showDetailError(message) {
    const loading = document.getElementById('detail-loading');
    if (loading) loading.classList.add('d-none');
    window.showAlert('detail-alert', message, 'danger');
  }

  async function initItemDetailPage() {
    const loading = document.getElementById('detail-loading');
    const itemId = new URLSearchParams(window.location.search).get('id');
    if (!itemId) {
      showDetailError('Không tìm thấy mã món đồ trong đường dẫn.');
      return;
    }

    try {
      const { data: item, error } = await window.supabaseClient
        .from('items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();
      if (error) throw error;
      if (!item) {
        showDetailError('Tin đăng không tồn tại hoặc đã bị xóa.');
        return;
      }

      const image = document.getElementById('detail-image');
      image.src = item.image_url || window.VNU_CONFIG.DEFAULT_ITEM_IMAGE;
      image.alt = item.title || 'Ảnh món đồ';
      document.getElementById('detail-title').textContent = item.title;
      document.getElementById('detail-status-badge').innerHTML = window.getStatusBadgeHTML(item.status);
      document.getElementById('detail-price').textContent = window.formatRentPrice(item.price_amount, item.price_unit);
      document.getElementById('detail-duration').textContent = item.duration;
      document.getElementById('detail-category').textContent = window.getCategoryLabel(item.category);
      document.getElementById('detail-area').textContent = item.area;
      document.getElementById('detail-description').textContent = item.description;
      document.getElementById('detail-owner-name').textContent = item.contact_name;
      document.getElementById('detail-owner-phone').textContent = item.contact_phone;

      const currentUser = await window.getCurrentUser();
      const isOwner = Boolean(currentUser && currentUser.id === item.owner_id);
      const contactButton = document.getElementById('detail-contact-btn');
      const ownerPanel = document.getElementById('owner-action-panel');
      if (isOwner) {
        contactButton.classList.add('d-none');
        ownerPanel.classList.remove('d-none');
        window.initOwnerContactUrlEditor(`chat.html?partner_id=${encodeURIComponent(item.owner_id)}&item_id=${encodeURIComponent(item.id)}`);
        configureOwnerActions(item);
      } else {
        contactButton.href = `chat.html?partner_id=${encodeURIComponent(item.owner_id)}&item_id=${encodeURIComponent(item.id)}`;
      }

      if (loading) loading.classList.add('d-none');
      document.getElementById('detail-content').classList.remove('d-none');
    } catch (error) {
      showDetailError(error && error.message ? error.message : 'Không thể tải thông tin món đồ.');
    }
  }

  function configureOwnerActions(item) {
    const toggleButton = document.getElementById('btn-toggle-item-status');
    const deleteButton = document.getElementById('btn-delete-item');
    const setToggleLabel = function () {
      toggleButton.innerHTML = item.status === 'available'
        ? '<i class="bi bi-arrow-repeat me-2"></i>Đánh dấu đang cho mượn'
        : '<i class="bi bi-check-circle me-2"></i>Đánh dấu còn trống';
    };
    setToggleLabel();

    toggleButton.addEventListener('click', async function () {
      const nextStatus = item.status === 'available' ? 'rented' : 'available';
      toggleButton.disabled = true;
      try {
        const { data, error } = await window.supabaseClient
          .from('items')
          .update({ status: nextStatus })
          .eq('id', item.id)
          .select('status')
          .single();
        if (error) throw error;
        item.status = data.status;
        document.getElementById('detail-status-badge').innerHTML = window.getStatusBadgeHTML(data.status);
        setToggleLabel();
      } catch (error) {
        window.showAlert('detail-alert', error && error.message ? error.message : 'Không thể cập nhật trạng thái tin đăng.', 'danger');
      } finally {
        toggleButton.disabled = false;
      }
    });

    deleteButton.addEventListener('click', async function () {
      if (!window.confirm('Bạn có chắc muốn xóa tin đăng này?')) return;
      deleteButton.disabled = true;
      try {
        const { error } = await window.supabaseClient.from('items').delete().eq('id', item.id);
        if (error) throw error;
        window.location.href = 'index.html';
      } catch (error) {
        window.showAlert('detail-alert', error && error.message ? error.message : 'Không thể xóa tin đăng.', 'danger');
        deleteButton.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    populateAreaSelect('reg-area');
    populateAreaSelect('post-area');

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const googleButton = document.getElementById('oauth-google-btn');
    if (googleButton) googleButton.addEventListener('click', function () { handleOAuth('google'); });

    const facebookButton = document.getElementById('oauth-facebook-btn');
    if (facebookButton) facebookButton.addEventListener('click', function () { handleOAuth('facebook'); });

    const postForm = document.getElementById('post-item-form');
    if (postForm) {
      initPostItemPage();
      postForm.addEventListener('submit', handlePostItem);
    }

    if (document.getElementById('detail-content')) initItemDetailPage();
  });
})();
