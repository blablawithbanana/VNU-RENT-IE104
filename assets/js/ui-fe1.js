(() => {
  const modal = document.getElementById('create-request-modal');

  window.openRequestModal = function () {
    if (modal) window.bootstrap.Modal.getOrCreateInstance(modal).show();
  };

  window.closeRequestModal = function () {
    if (modal) window.bootstrap.Modal.getInstance(modal)?.hide();
  };

  if (!modal) return;

  const form = document.getElementById('create-request-form');
  const imageInput = document.getElementById('req-image-input');
  const imageError = document.getElementById('req-image-error');
  const preview = document.getElementById('req-image-preview');
  let previewUrl;

  function clearPreview() {
    preview.hidden = true;
    preview.removeAttribute('src');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    imageInput.setCustomValidity('');
    imageInput.classList.remove('is-invalid');
    imageError.textContent = '';
  }

  imageInput.addEventListener('change', () => {
    clearPreview();
    const file = imageInput.files[0];
    if (!file) return;

    let message = '';
    if (!file.type.startsWith('image/')) message = 'Vui lòng chọn một tệp hình ảnh.';
    else if (file.size > window.VNU_CONFIG.MAX_IMAGE_BYTES) message = 'Ảnh vượt quá giới hạn 2 MB.';
    if (message) {
      imageInput.setCustomValidity(message);
      imageInput.classList.add('is-invalid');
      imageError.textContent = message;
      return;
    }

    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.hidden = false;
  });

  modal.addEventListener('shown.bs.modal', () => document.getElementById('req-item-name').focus());
  modal.addEventListener('hide.bs.modal', (event) => {
    if (form.getAttribute('aria-busy') === 'true') event.preventDefault();
  });
  modal.addEventListener('hidden.bs.modal', () => {
    form.reset();
    clearPreview();
    window.hideAlert('request-form-error');
    document.getElementById('open-request-modal-btn').focus();
  });
})();
