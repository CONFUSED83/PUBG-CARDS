(async function() {
    try {
        while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
        await initApp();
    } catch(e) { console.error('Init failed:', e); return; }

    const user = requireAuth();
    if (!user || !user.is_admin) { alert('Admin access required'); window.location.href = './login.html'; return; }

    const params = new URLSearchParams(window.location.search);
    const viewChat = params.get('chat');

    if (viewChat) {
        const parts = viewChat.split('|');
        await renderChatViewer(parts[0], parts[1]);
    } else {
        await renderAllChats();
    }

    async function renderAllChats() {
        const convos = await adminGetAllConversations();
        let content = `
        <div class="m-page-header">
            <h1 class="m-page-title">Chats</h1>
            <p class="m-page-sub">${convos.length} conversations</p>
        </div>
        <div class="m-section" id="chatsList">`;

        if (convos.length === 0) {
            content += '<div class="m-empty">No conversations</div>';
        } else {
            for (const conv of convos) {
                content += `
                <a class="m-chat-item" href="admin-mobile-chats.html?chat=${encodeURIComponent(conv.id + '|' + conv.user1)}">
                    <div class="m-chat-avatar">${conv.user1.charAt(0).toUpperCase()}</div>
                    <div class="m-chat-info">
                        <div class="m-chat-name">${conv.user1} & ${conv.user2}</div>
                        <div class="m-chat-preview">${conv.last_message ? conv.last_message.substring(0, 50) : 'No messages'}</div>
                    </div>
                    <div class="m-chat-time">${timeAgo(conv.updated_at)}</div>
                </a>`;
            }
        }
        content += '</div>';
        document.getElementById('app').innerHTML = buildMobilePage('chats', content);
        initMoreSheet();
    }

    async function renderChatViewer(convId, otherUser) {
        const messages = await adminGetConversationMessages(convId);
        let content = `
        <button class="m-back-btn" onclick="window.location.href='admin-mobile-chats.html'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Chats
        </button>
        <div class="m-page-header" style="margin-bottom:12px;">
            <h1 class="m-page-title" style="font-size:1.25rem;">${otherUser}</h1>
            <p class="m-page-sub">${messages.length} messages</p>
        </div>
        <div class="m-chat-viewer" id="chatViewer">`;

        if (messages.length === 0) {
            content += '<div class="m-empty">No messages</div>';
        } else {
            for (const msg of messages) {
                const isSystem = msg.message_type === 'system';
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (isSystem) {
                    content += `<div class="m-msg system">${escapeHtml(msg.content)}</div>`;
                } else {
                    const isOther = msg.sender === otherUser;
                    content += `<div class="m-msg ${isOther ? 'other' : 'self'}"><div class="m-msg-sender">${msg.sender}</div><div class="m-msg-text">${escapeHtml(msg.content)}</div><div class="m-msg-time">${time}</div></div>`;
                }
            }
        }
        content += '</div>';
        document.getElementById('app').innerHTML = buildMobilePage('chats', content);
        initMoreSheet();
        const viewer = document.getElementById('chatViewer');
        if (viewer) viewer.scrollTop = viewer.scrollHeight;

        setInterval(async () => {
            const fresh = await adminGetConversationMessages(convId);
            const container = document.getElementById('chatViewer');
            if (!container) return;
            let h = '';
            for (const msg of fresh) {
                const isSystem = msg.message_type === 'system';
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (isSystem) { h += `<div class="m-msg system">${escapeHtml(msg.content)}</div>`; }
                else { const isOther = msg.sender === otherUser; h += `<div class="m-msg ${isOther ? 'other' : 'self'}"><div class="m-msg-sender">${msg.sender}</div><div class="m-msg-text">${escapeHtml(msg.content)}</div><div class="m-msg-time">${time}</div></div>`; }
            }
            container.innerHTML = h;
            container.scrollTop = container.scrollHeight;
        }, 5000);
    }
})();
