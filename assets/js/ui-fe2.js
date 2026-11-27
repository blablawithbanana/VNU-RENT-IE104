(function () {
  let previewUrl = null;

  window.switchAuthTab = function (tab) {
    if (tab !== 'login' && tab !== 'register') return;

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginButton = document.getElementById('tab-login-btn');
    const registerButton = document.getElementById('tab-register-btn');
    if (!loginForm || !registerForm || !loginButton || !registerButton) return;

    const loginActive = tab === 'login';
    loginForm.classList.toggle('d-none', !loginActive);
    registerForm.classList.toggle('d-none', loginActive);
    loginButton.classList.toggle('active', loginActive);
    registerButton.classList.toggle('active', !loginActive);
    loginButton.setAttribute('aria-selected', String(loginActive));
    registerButton.setAttribute('aria-selected', String(!loginActive));
  };

  window.showPostImageError = function (message) {
    const error = document.getElementById('post-image-error');
    const errorMessage = document.getElementById('post-image-error-message');
    const input = document.getElementById('post-image-input');
    if (!error || !errorMessage || !input) return;

    errorMessage.textContent = message;
    error.classList.remove('d-none');
    input.setAttribute('aria-invalid', 'true');
  };

  window.clearPostImageError = function () {
    const error = document.getElementById('post-image-error');
    const errorMessage = document.getElementById('post-image-error-message');
    const input = document.getElementById('post-image-input');
    if (error) error.classList.add('d-none');
    if (errorMessage) errorMessage.textContent = '';
    if (input) input.removeAttribute('aria-invalid');
  };

  window.resetPostImagePreview = function () {
    const input = document.getElementById('post-image-input');
    const preview = document.getElementById('post-image-preview');
    if (input) input.setCustomValidity('');
    if (input) input.value = '';
    window.clearPostImageError();
    if (preview) {
      preview.replaceChildren();
      preview.classList.add('d-none');
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    const priceInput = document.getElementById('post-price-amount');
    const priceUnit = document.getElementById('post-price-unit');
    const pricePreview = document.getElementById('post-price-preview');
    if (priceInput && priceUnit && pricePreview) {
      const updatePricePreview = function () {
        if (priceInput.value === '') {
          pricePreview.textContent = 'Nhập giá cho mượn';
          pricePreview.className = 'price-preview d-block text-muted mt-2';
          return;
        }

        const amount = Number(priceInput.value);
        pricePreview.textContent = window.formatRentPrice(amount, priceUnit.value);
        pricePreview.className = `price-preview d-block mt-2 ${window.getPriceClass(amount)}`;
      };

      priceInput.addEventListener('input', updatePricePreview);
      priceUnit.addEventListener('change', updatePricePreview);
      updatePricePreview();
    }

    const imageInput = document.getElementById('post-image-input');
    const preview = document.getElementById('post-image-preview');
    if (!imageInput || !preview) return;

    imageInput.addEventListener('change', function () {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
      }
      preview.replaceChildren();
      imageInput.setCustomValidity('');

      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        window.clearPostImageError();
        preview.classList.add('d-none');
        return;
      }

      if (!file.type.startsWith('image/')) {
        const typeError = 'Vui lòng chọn tệp hình ảnh hợp lệ.';
        imageInput.setCustomValidity(typeError);
        window.showPostImageError(typeError);
        preview.classList.add('d-none');
        return;
      }

      if (file.size > window.VNU_CONFIG.MAX_IMAGE_BYTES) {
        const sizeError = 'Dung lượng hình ảnh vượt quá giới hạn 2 MB.';
        imageInput.setCustomValidity(sizeError);
        window.showPostImageError(sizeError);
        preview.classList.add('d-none');
        return;
      }

      window.clearPostImageError();
      previewUrl = URL.createObjectURL(file);
      const image = document.createElement('img');
      image.src = previewUrl;
      image.alt = 'Ảnh xem trước món đồ';
      preview.appendChild(image);
      preview.classList.remove('d-none');
    });
  });
})();
