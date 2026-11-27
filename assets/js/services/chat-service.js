/**
 * VNU-RENT — chat-service.js (Nhóm trưởng: Nguyễn Hữu Việt Hoàng)
 * Chat P2P Thời gian thực (Supabase Realtime), gửi Ảnh/Video ngắn & Chế độ mặc định kiểu Messenger
 */

(function () {
  let currentUser = null;
  let activePartnerId = null;
  let activeItemId = null;
  let conversations = []; // [{ partnerId, partner, lastMessage, lastTime, lastItemId, unreadCount }]
  let realtimeChannel = null;
  const renderedMessageIds = new Set();
  const profileCache = new Map();

  const byId = (id) => document.getElementById(id);

  // ==========================================
  // 1. TIỆN ÍCH HIỂN THỊ & BẢO MẬT
  // ==========================================
  function safeUrl(url) {
    return /^https?:\/\//i.test(url || '') ? url : '';
  }

  function formatTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  function getAvatarUrl(profile) {
    if (profile && safeUrl(profile.avatar_url)) return profile.avatar_url;
    const name = encodeURIComponent(profile?.username || 'SV');
    return `https://ui-avatars.com/api/?background=FFBA00&color=222222&bold=true&name=${name}`;
  }

  function getPreviewText(msg) {
    if (!msg) return 'Bắt đầu cuộc trò chuyện...';
    if (msg.content && msg.content.trim()) return msg.content.trim();
    if (msg.media_type === 'image') return '[Hình ảnh]';
    if (msg.media_type === 'video') return '[Video ngắn]';
    return 'Tin nhắn mới';
  }

  function showChatBanner(message, type = 'danger') {
    let box = byId('chat-inline-alert');
    if (!box) {
      const inputBar = document.querySelector('.chat-input-bar');
      if (!inputBar) return;
      box = document.createElement('div');
      box.id = 'chat-inline-alert';
      inputBar.prepend(box);
    }
    box.className = `alert alert-${type} mb-2 py-2 px-3 small d-flex justify-content-between align-items-center`;
    box.innerHTML = `
      <span>${window.escapeHTML(message)}</span>
      <button type="button" class="btn-close btn-sm" aria-label="Đóng"></button>
    `;
    box.querySelector('.btn-close').addEventListener('click', () => box.classList.add('d-none'));
  }

  function hideChatBanner() {
    const box = byId('chat-inline-alert');
    if (box) box.classList.add('d-none');
  }

  function setChatPaneVisible(visible) {
    const header = document.querySelector('.chat-header');
    const inputBar = document.querySelector('.chat-input-bar');
    if (header) header.classList.toggle('d-none', !visible);
    if (inputBar) inputBar.classList.toggle('d-none', !visible);
  }

  function setChatInputEnabled(enabled) {
    const textInput = byId('chat-text-input');
    const mediaInput = byId('chat-media-input');
    const sendBtn = byId('chat-send-btn');
    const quickReplies = byId('chat-quick-replies');

    if (textInput) {
      textInput.disabled = !enabled;
      textInput.placeholder = enabled
        ? 'Nhập tin nhắn trao đổi mượn đồ...'
        : 'Chọn một cuộc trò chuyện để bắt đầu nhắn tin';
    }
    if (mediaInput) mediaInput.disabled = !enabled;
    if (sendBtn) sendBtn.disabled = !enabled;
    if (quickReplies) quickReplies.classList.toggle('d-none', !enabled);
  }

  function updateSidebarCount(count) {
    const badge = byId('chat-conv-count') || document.querySelector('.chat-sidebar-header .badge');
    if (badge) badge.textContent = `${count} cuộc trò chuyện`;
  }

  function updatePartnerHeader(profile) {
    const nameEl = byId('chat-partner-name');
    const avatarEl = byId('chat-partner-avatar') || document.querySelector('.chat-header img.rounded-circle');
    const subEl = byId('chat-partner-sub') || (nameEl ? nameEl.nextElementSibling : null);

    if (!profile) {
      if (nameEl) nameEl.textContent = 'Chưa chọn đoạn chat';
      if (avatarEl) avatarEl.src = window.VNU_CONFIG.DEFAULT_AVATAR;
      if (subEl) subEl.textContent = 'VNU-RENT Chat P2P';
      return;
    }

    if (nameEl) nameEl.textContent = profile.username || 'Sinh viên VNU';
    if (avatarEl) avatarEl.src = getAvatarUrl(profile);
    if (subEl) {
      subEl.className = 'text-muted d-flex align-items-center gap-1';
      subEl.innerHTML = `<i class="bi bi-geo-alt-fill text-warning"></i> ${window.escapeHTML(profile.area || 'Làng ĐHQG TP.HCM')}`;
    }
  }

  // ==========================================
  // 2. TẢI HỒ SƠ & NGỮ CẢNH MÓN ĐỒ
  // ==========================================
  async function fetchProfilesByIds(ids) {
    const missing = [...new Set(ids)].filter((id) => id && !profileCache.has(id));
    if (missing.length === 0) return;

    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('id, username, area, avatar_url')
      .in('id', missing);

    if (!error && Array.isArray(data)) {
      data.forEach((p) => profileCache.set(p.id, p));
    }
  }

  async function renderItemContext(itemId) {
    const container = byId('chat-item-context');
    if (!container) return;

    if (!itemId) {
      container.classList.add('d-none');
      container.innerHTML = '';
      return;
    }

    const { data: item, error } = await window.supabaseClient
      .from('items')
      .select('id, title, price_amount, price_unit, image_url, status')
      .eq('id', itemId)
      .maybeSingle();

    if (error || !item) {
      container.classList.add('d-none');
      container.innerHTML = '';
      return;
    }

    const imgSrc = safeUrl(item.image_url) || window.VNU_CONFIG.DEFAULT_ITEM_IMAGE;
    const priceText = window.formatRentPrice(item.price_amount, item.price_unit);
    const priceClass = window.getPriceClass(item.price_amount);

    container.classList.remove('d-none');
    container.innerHTML = `
      <a href="item-detail.html?id=${encodeURIComponent(item.id)}" class="d-flex align-items-center gap-2 text-decoration-none min-w-0">
        <img src="${window.escapeHTML(imgSrc)}" alt="Món đồ" class="chat-item-context-img">
        <div class="text-truncate">
          <div class="fw-semibold text-dark text-truncate" style="max-width: 170px;">${window.escapeHTML(item.title)}</div>
          <small class="${priceClass} fw-bold" style="font-size: 0.8rem;">${window.escapeHTML(priceText)}</small>
        </div>
      </a>
      <span class="ms-1 d-none d-md-inline-block">${window.getStatusBadgeHTML(item.status)}</span>
    `;
  }

  // ==========================================
  // 3. DANH SÁCH HỘI THOẠI (CỘT TRÁI)
  // ==========================================
  async function loadConversations(urlPartnerId, urlItemId) {
    const listEl = byId('chat-conversations-list');
    if (listEl) {
      listEl.innerHTML = `
        <div class="text-center py-4 text-muted small">
          <span class="spinner-border spinner-border-sm text-warning me-1"></span>Đang tải hội thoại...
        </div>
      `;
    }

    const { data: rows, error } = await window.supabaseClient
      .from('messages')
      .select('id, sender_id, receiver_id, item_id, content, media_type, is_read, created_at')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      if (listEl) {
        listEl.innerHTML = `<div class="p-3 text-danger small">Lỗi tải hội thoại: ${window.escapeHTML(error.message)}</div>`;
      }
      return;
    }

    const map = new Map();
    (rows || []).forEach((msg) => {
      const otherId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
      if (!otherId || otherId === currentUser.id) return;

      if (!map.has(otherId)) {
        map.set(otherId, {
          partnerId: otherId,
          partner: null,
          lastMessage: msg,
          lastTime: msg.created_at,
          lastItemId: msg.item_id || null,
          unreadCount: 0
        });
      }
      const entry = map.get(otherId);
      if (!entry.lastItemId && msg.item_id) entry.lastItemId = msg.item_id;
      if (msg.receiver_id === currentUser.id && !msg.is_read) entry.unreadCount += 1;
    });

    if (urlPartnerId && urlPartnerId !== currentUser.id && !map.has(urlPartnerId)) {
      map.set(urlPartnerId, {
        partnerId: urlPartnerId,
        partner: null,
        lastMessage: null,
        lastTime: new Date().toISOString(),
        lastItemId: urlItemId || null,
        unreadCount: 0
      });
    } else if (urlPartnerId && map.has(urlPartnerId) && urlItemId) {
      map.get(urlPartnerId).lastItemId = urlItemId;
    }

    const partnerIds = [...map.keys()];
    await fetchProfilesByIds(partnerIds);

    conversations = partnerIds.map((pid) => {
      const entry = map.get(pid);
      entry.partner = profileCache.get(pid) || {
        id: pid,
        username: 'Sinh viên VNU',
        area: 'Làng ĐHQG TP.HCM',
        avatar_url: null
      };
      return entry;
    });

    conversations.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    renderConversationsList();
  }

  function renderConversationsList() {
    const listEl = byId('chat-conversations-list');
    updateSidebarCount(conversations.length);
    if (!listEl) return;

    if (conversations.length === 0) {
      listEl.innerHTML = `
        <div class="text-center p-4 text-muted small">
          <i class="bi bi-chat-square-dots fs-3 d-block mb-2"></i>
          Chưa có cuộc trò chuyện nào.
        </div>
      `;
      return;
    }

    listEl.innerHTML = conversations
      .map((conv) => {
        const isActive = conv.partnerId === activePartnerId;
        const avatar = getAvatarUrl(conv.partner);
        const preview = getPreviewText(conv.lastMessage);
        const timeStr = conv.lastMessage ? formatTime(conv.lastMessage.created_at) : 'Mới';
        const unreadBadge =
          conv.unreadCount > 0
            ? `<span class="badge bg-danger rounded-pill" style="font-size: 0.7rem;">${conv.unreadCount}</span>`
            : '';

        return `
          <div class="chat-conversation-item ${isActive ? 'active' : ''}" data-partner-id="${window.escapeHTML(conv.partnerId)}">
            <img src="${window.escapeHTML(avatar)}" alt="Avatar" class="chat-avatar-thumb">
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex justify-content-between align-items-baseline mb-1 gap-1">
                <strong class="text-dark text-truncate" style="font-size: 0.95rem;">${window.escapeHTML(conv.partner.username)}</strong>
                <small class="text-muted flex-shrink-0" style="font-size: 0.75rem;">${window.escapeHTML(timeStr)}</small>
              </div>
              <div class="chat-conv-preview">${window.escapeHTML(preview)}</div>
            </div>
            ${unreadBadge}
          </div>
        `;
      })
      .join('');

    listEl.querySelectorAll('.chat-conversation-item').forEach((el) => {
      el.addEventListener('click', () => {
        const pid = el.getAttribute('data-partner-id');
        if (pid && pid !== activePartnerId) {
          const conv = conversations.find((c) => c.partnerId === pid);
          openConversation(pid, conv?.lastItemId || null);
        }
      });
    });
  }

  // ==========================================
  // 4. TRẠNG THÁI CHƯA CHỌN ĐOẠN CHAT & MỞ HỘI THOẠI
  // ==========================================
  function buildBubbleElement(msg) {
    const isSelf = msg.sender_id === currentUser.id;
    const row = document.createElement('div');
    row.className = `chat-bubble-row ${isSelf ? 'self' : 'partner'}`;
    if (msg.id) row.dataset.msgId = msg.id;

    let mediaHTML = '';
    const validMediaUrl = safeUrl(msg.media_url);
    if (validMediaUrl && msg.media_type === 'image') {
      mediaHTML = `<a href="${window.escapeHTML(validMediaUrl)}" target="_blank" rel="noopener noreferrer"><img src="${window.escapeHTML(validMediaUrl)}" alt="Ảnh đính kèm" loading="lazy"></a>`;
    } else if (validMediaUrl && msg.media_type === 'video') {
      mediaHTML = `<video src="${window.escapeHTML(validMediaUrl)}" controls preload="metadata"></video>`;
    }

    const textHTML = msg.content ? `<div style="white-space: pre-wrap;">${window.escapeHTML(msg.content)}</div>` : '';

    row.innerHTML = `
      <div class="chat-bubble">
        ${textHTML}
        ${mediaHTML}
      </div>
      <span class="chat-bubble-time">${window.escapeHTML(formatTime(msg.created_at))}</span>
    `;
    return row;
  }

  function renderEmptyChatState(noticeMessage = '') {
    activePartnerId = null;
    activeItemId = null;
    updatePartnerHeader(null);
    renderItemContext(null);
    setChatInputEnabled(false);
    setChatPaneVisible(false);

    const container = byId('chat-messages-container');
    if (container) {
      const hasContacts = conversations.length > 0;
      const noticeHTML = noticeMessage
        ? `<div class="alert alert-warning py-2 px-3 small mb-3 mx-auto" style="max-width: 360px;">${window.escapeHTML(noticeMessage)}</div>`
        : '';
      const subText = hasContacts
        ? 'Chọn một liên hệ ở danh sách bên trái để xem và gửi tin nhắn.'
        : 'Bạn chưa có cuộc trò chuyện nào. Hãy chọn một món đồ và bấm <strong>Liên hệ</strong> để nhắn tin.';
      const actionBtn = hasContacts
        ? ''
        : `<a href="index.html" class="btn btn-ct-orange btn-sm mt-2"><i class="bi bi-search me-1"></i>Khám phá đồ dùng</a>`;

      container.innerHTML = `
        <div class="my-auto text-center py-5 px-3 text-muted">
          ${noticeHTML}
          <i class="bi bi-chat-dots text-secondary opacity-50" style="font-size: 3.2rem;"></i>
          <h6 class="mt-3 fw-bold text-dark">Chưa chọn đoạn chat</h6>
          <p class="small mb-2">${subText}</p>
          ${actionBtn}
        </div>
      `;
    }
  }

  async function markConversationAsRead(partnerId) {
    if (!partnerId || !currentUser) return;
    await window.supabaseClient
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', currentUser.id)
      .eq('is_read', false);

    const conv = conversations.find((c) => c.partnerId === partnerId);
    if (conv) {
      conv.unreadCount = 0;
      renderConversationsList();
    }
    if (typeof window.refreshNavbarUnreadChat === 'function') {
      window.refreshNavbarUnreadChat(currentUser.id);
    }
  }

  async function openConversation(partnerId, itemId = null) {
    if (!partnerId || partnerId === currentUser.id) {
      renderEmptyChatState();
      return;
    }

    hideChatBanner();
    setChatPaneVisible(true);
    activePartnerId = partnerId;
    activeItemId = itemId;
    renderedMessageIds.clear();
    setChatInputEnabled(true);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('partner_id', partnerId);
    if (itemId) nextUrl.searchParams.set('item_id', itemId);
    else nextUrl.searchParams.delete('item_id');
    history.replaceState(null, '', nextUrl);

    await fetchProfilesByIds([partnerId]);
    const partnerProfile = profileCache.get(partnerId) || {
      id: partnerId,
      username: 'Sinh viên VNU',
      area: 'Làng ĐHQG TP.HCM'
    };
    updatePartnerHeader(partnerProfile);
    renderConversationsList();
    renderItemContext(itemId);

    const container = byId('chat-messages-container');
    if (container) {
      container.innerHTML = `
        <div class="my-auto text-center text-muted small">
          <span class="spinner-border spinner-border-sm text-warning me-2"></span>Đang tải lịch sử tin nhắn...
        </div>
      `;
    }

    const filterExpr = `and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`;
    const { data: msgs, error } = await window.supabaseClient
      .from('messages')
      .select('*')
      .or(filterExpr)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      if (container) {
        container.innerHTML = `<div class="alert alert-danger m-3 small">Không thể tải tin nhắn: ${window.escapeHTML(error.message)}</div>`;
      }
      return;
    }

    if (container) {
      container.innerHTML = '';
      if (!msgs || msgs.length === 0) {
        container.innerHTML = `
          <div class="my-auto text-center text-muted small py-4" id="chat-first-msg-placeholder">
            <i class="bi bi-chat-heart text-warning fs-3 d-block mb-2"></i>
            Chưa có tin nhắn nào với <strong>${window.escapeHTML(partnerProfile.username)}</strong>.<br>
            Chọn một câu gợi ý bên dưới hoặc nhập tin nhắn để bắt đầu!
          </div>
        `;
      } else {
        msgs.forEach((m) => {
          renderedMessageIds.add(m.id);
          container.appendChild(buildBubbleElement(m));
        });
      }
    }

    if (typeof window.scrollToBottomChat === 'function') {
      window.scrollToBottomChat();
    }
    await markConversationAsRead(partnerId);
  }

  // ==========================================
  // 5. GỬI TIN NHẮN (CHỮ + ẢNH + VIDEO NGẮN)
  // ==========================================
  async function handleSendMessage(event) {
    event.preventDefault();
    if (!activePartnerId || !currentUser) return;
    hideChatBanner();

    const textInput = byId('chat-text-input');
    const mediaInput = byId('chat-media-input');
    const sendBtn = byId('chat-send-btn');

    const content = textInput ? textInput.value.trim() : '';
    const file = mediaInput && mediaInput.files ? mediaInput.files[0] : null;

    if (!content && !file) return;

    if (file) {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      if (!isImg && !isVid) {
        showChatBanner('Chỉ hỗ trợ gửi tệp hình ảnh hoặc video ngắn.');
        return;
      }
      if (isImg && file.size > window.VNU_CONFIG.MAX_IMAGE_BYTES) {
        showChatBanner('Dung lượng hình ảnh vượt quá giới hạn 2 MB.');
        return;
      }
      if (isVid && file.size > window.VNU_CONFIG.MAX_VIDEO_BYTES) {
        showChatBanner('Dung lượng video ngắn vượt quá giới hạn 10 MB.');
        return;
      }
    }

    if (sendBtn) sendBtn.disabled = true;
    try {
      let mediaUrl = null;
      let mediaType = 'text';

      if (file) {
        mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        mediaUrl = await window.uploadMediaFile(file, 'chat');
      }

      const payload = {
        sender_id: currentUser.id,
        receiver_id: activePartnerId,
        item_id: activeItemId || null,
        content: content || null,
        media_url: mediaUrl,
        media_type: mediaType
      };

      const { data: inserted, error } = await window.supabaseClient
        .from('messages')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      if (textInput) textInput.value = '';
      if (typeof window.clearChatMediaPreview === 'function') {
        window.clearChatMediaPreview();
      }

      appendMessageIfNew(inserted);
      await upsertConversationPreview(inserted);
    } catch (err) {
      showChatBanner(`Gửi tin nhắn thất bại: ${err.message}`);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      if (textInput) textInput.focus();
    }
  }

  function appendMessageIfNew(msg) {
    if (!msg || !msg.id || renderedMessageIds.has(msg.id)) return;
    const isCurrentChat =
      (msg.sender_id === currentUser.id && msg.receiver_id === activePartnerId) ||
      (msg.sender_id === activePartnerId && msg.receiver_id === currentUser.id);

    if (!isCurrentChat) return;

    renderedMessageIds.add(msg.id);
    const placeholder = byId('chat-first-msg-placeholder');
    if (placeholder) placeholder.remove();

    const container = byId('chat-messages-container');
    if (container) {
      container.appendChild(buildBubbleElement(msg));
      if (typeof window.scrollToBottomChat === 'function') {
        window.scrollToBottomChat();
      }
    }
  }

  async function upsertConversationPreview(msg) {
    const otherId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
    if (!otherId || otherId === currentUser.id) return;

    let conv = conversations.find((c) => c.partnerId === otherId);
    if (!conv) {
      await fetchProfilesByIds([otherId]);
      conv = {
        partnerId: otherId,
        partner: profileCache.get(otherId) || { id: otherId, username: 'Sinh viên VNU', area: 'Làng ĐHQG TP.HCM' },
        lastMessage: msg,
        lastTime: msg.created_at,
        lastItemId: msg.item_id || null,
        unreadCount: 0
      };
      conversations.unshift(conv);
    } else {
      conv.lastMessage = msg;
      conv.lastTime = msg.created_at;
      if (msg.item_id) conv.lastItemId = msg.item_id;
    }

    if (msg.receiver_id === currentUser.id && msg.sender_id !== activePartnerId) {
      conv.unreadCount += 1;
    }

    conversations.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    renderConversationsList();
  }

  // ==========================================
  // 6. ĐĂNG KÝ SUPABASE REALTIME (WEBSOCKET)
  // ==========================================
  function subscribeRealtimeMessages() {
    if (!window.supabaseClient || !currentUser) return;
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
    }

    const onNewMessage = async (payload) => {
      const msg = payload.new;
      if (!msg) return;

      const isActiveIncoming = msg.sender_id === activePartnerId && msg.receiver_id === currentUser.id;
      const isActiveSelfSync = msg.sender_id === currentUser.id && msg.receiver_id === activePartnerId;

      if (isActiveIncoming || isActiveSelfSync) {
        appendMessageIfNew(msg);
        if (isActiveIncoming) {
          await markConversationAsRead(activePartnerId);
        }
      }
      await upsertConversationPreview(msg);
      if (msg.receiver_id === currentUser.id && !isActiveIncoming && typeof window.refreshNavbarUnreadChat === 'function') {
        window.refreshNavbarUnreadChat(currentUser.id);
      }
    };

    realtimeChannel = window.supabaseClient
      .channel(`vnu-chat-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` },
        onNewMessage
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUser.id}` },
        onNewMessage
      )
      .subscribe();
  }

  // ==========================================
  // 7. KHỞI TẠO TRANG CHAT
  // ==========================================
  async function initChatPage() {
    if (!byId('chat-messages-container')) return;

    currentUser = await window.requireAuth();
    if (!currentUser) return;

    const params = new URLSearchParams(window.location.search);
    let urlPartnerId = params.get('partner_id');
    const urlItemId = params.get('item_id');
    let selfChatNotice = '';

    if (urlPartnerId && urlPartnerId === currentUser.id) {
      selfChatNotice = 'Bạn không thể tự nhắn tin với chính mình.';
      urlPartnerId = null;
    }

    await loadConversations(urlPartnerId, urlItemId);

    const form = byId('chat-message-form');
    if (form) form.addEventListener('submit', handleSendMessage);

    subscribeRealtimeMessages();

    // Chỉ tự mở khi vào từ nút Liên hệ (?partner_id=...), mặc định để trống "Chưa chọn đoạn chat"
    if (urlPartnerId) {
      await openConversation(urlPartnerId, urlItemId);
    } else {
      renderEmptyChatState(selfChatNotice);
    }
  }

  document.addEventListener('DOMContentLoaded', initChatPage);
})();