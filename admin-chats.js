(async function() {
    try {
        while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
        await initApp();
    } catch(e) {
        console.error('Init failed:', e);
        document.getElementById('app').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);"><p>Failed to load.</p><button class="btn btn-teal btn-sm" onclick="location.reload()" style="margin-top:12px;">Refresh</button></div>';
        return;
    }

    const user = requireAuth();
    if (!user || !user.is_admin) { alert('Admin access required'); window.location.href = './login.html'; return; }

    const params = new URLSearchParams(window.location.search);
    const filterUser = params.get('user');
    const viewChat = params.get('chat');

    if (viewChat) {
        const parts = viewChat.split('|');
        await renderChatViewer(parts[0], parts[1]);
    } else if (filterUser) {
        await renderUserChats(filterUser);
    } else {
        await renderAllChats();
    }

    async function renderAllChats() {
        const convos = await adminGetAllConversations();

        let content = `
        <div class="admin-header">
            <h1>All Conversations</h1>
            <p>${convos.length} conversations across all users</p>
        </div>

        <div class="panel">
            <div class="panel-toolbar">
                <input type="text" class="search-input" id="chatSearch" placeholder="Search by username..." style="max-width:320px;">
            </div>
            <div id="chatsList">`;

        if (convos.length === 0) {
            content += '<div class="empty-state"><p>No conversations yet</p></div>';
        } else {
            for (const conv of convos) {
                content += `
                <div class="chat-convo-card" data-search="${conv.user1.toLowerCase()} ${conv.user2.toLowerCase()}" style="cursor:pointer;" onclick="window.openChat('${conv.id}','${conv.user1}')">
                    <div class="chat-list-avatar" style="background:linear-gradient(135deg,var(--gold),var(--teal));">${conv.user1.charAt(0).toUpperCase()}</div>
                    <svg class="chat-convo-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    <div class="chat-list-avatar" style="background:linear-gradient(135deg,var(--teal),var(--gold));">${conv.user2.charAt(0).toUpperCase()}</div>
                    <div class="chat-convo-users">
                        <div class="chat-convo-names">${conv.user1} & ${conv.user2}</div>
                        <div class="chat-convo-preview">${conv.last_message ? conv.last_message.substring(0, 70) + (conv.last_message.length > 70 ? '...' : '') : 'No messages'}</div>
                    </div>
                    <div class="chat-convo-meta">
                        <span class="chat-convo-time">${timeAgo(conv.updated_at)}</span>
                    </div>
                </div>`;
            }
        }

        content += '</div></div>';
        document.getElementById('app').innerHTML = buildPage('chats', content);

        const searchInput = document.getElementById('chatSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.toLowerCase();
                document.querySelectorAll('.chat-convo-card').forEach(item => {
                    item.style.display = item.dataset.search.includes(q) ? '' : 'none';
                });
            });
        }
    }

    async function renderUserChats(username) {
        const profile = await adminGetUserProfile(username);
        if (!profile) {
            document.getElementById('app').innerHTML = buildPage('chats', '<div class="panel"><p>User not found</p></div>');
            return;
        }

        let content = `
        <div class="admin-header">
            <div>
                <a href="admin-chats.html" style="display:inline-flex;align-items:center;gap:6px;color:var(--text-dim);text-decoration:none;font-size:0.8125rem;margin-bottom:8px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    Back to All Chats
                </a>
                <h1>${username}'s Chats</h1>
                <p>${profile.conversations.length} conversations</p>
            </div>
        </div>

        <div class="panel"><div class="chat-list">`;

        if (profile.conversations.length === 0) {
            content += '<div class="empty-state"><p>No conversations yet.</p></div>';
        } else {
            for (const conv of profile.conversations) {
                const otherUser = conv.user1 === username ? conv.user2 : conv.user1;
                content += `
                <div class="chat-list-item" style="cursor:pointer;" onclick="window.openChat('${conv.id}','${otherUser}')">
                    <div class="chat-list-avatar">${otherUser.charAt(0).toUpperCase()}</div>
                    <div class="chat-list-info">
                        <div class="chat-list-name">${otherUser}</div>
                        <div class="chat-list-preview">${conv.last_message ? conv.last_message.substring(0, 60) + (conv.last_message.length > 60 ? '...' : '') : 'No messages'}</div>
                    </div>
                    <div class="chat-list-meta">
                        <span class="chat-list-time">${timeAgo(conv.updated_at)}</span>
                    </div>
                </div>`;
            }
        }

        content += '</div></div>';
        document.getElementById('app').innerHTML = buildPage('chats', content);
    }

    async function renderChatViewer(convId, otherUser) {
        const messages = await adminGetConversationMessages(convId);

        let content = `
        <div class="admin-header">
            <div>
                <button class="btn btn-sm btn-outline" id="backToChats" style="margin-bottom:8px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    Back to Chats
                </button>
                <h1>Chat: ${otherUser}</h1>
                <p>${messages.length} messages · Live polling every 5s</p>
            </div>
        </div>

        <div class="panel" style="padding:0;overflow:hidden;">
            <div class="chat-viewer-header">
                <span>Conversation with ${otherUser}</span>
                <button class="btn btn-danger btn-sm" id="deleteChatBtn">Delete Conversation</button>
            </div>
            <div id="adminChatMessages" class="admin-chat-viewer">`;

        if (messages.length === 0) {
            content += '<div class="empty-state"><p>No messages</p></div>';
        } else {
            for (const msg of messages) {
                const isSystem = msg.message_type === 'system';
                const isTrade = msg.message_type === 'trade';
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const date = new Date(msg.created_at).toLocaleDateString();

                if (isSystem) {
                    content += `<div class="admin-chat-msg system">${escapeHtml(msg.content)} <span>${date} ${time}</span></div>`;
                } else if (isTrade) {
                    content += renderTradeMessage(msg, time, date);
                } else {
                    const isOther = msg.sender === otherUser;
                    content += `
                    <div class="admin-chat-msg ${isOther ? 'user-other' : 'user-self'}">
                        <div class="admin-chat-sender">${msg.sender}</div>
                        <div class="admin-chat-text">${escapeHtml(msg.content)}</div>
                        <div class="admin-chat-time">${date} ${time}</div>
                    </div>`;
                }
            }
        }

        content += '</div></div>';
        document.getElementById('app').innerHTML = buildPage('chats', content);

        document.getElementById('backToChats').addEventListener('click', () => {
            window.location.href = filterUser ? 'admin-chats.html?user=' + encodeURIComponent(filterUser) : 'admin-chats.html';
        });

        document.getElementById('deleteChatBtn').addEventListener('click', async () => {
            if (confirm('Delete this entire conversation for both users?')) {
                await adminDeleteConversation(convId);
                showToast('Conversation deleted', 'success');
                window.location.href = 'admin-chats.html';
            }
        });

        setInterval(async () => {
            const fresh = await adminGetConversationMessages(convId);
            const container = document.getElementById('adminChatMessages');
            if (!container) return;
            let h = '';
            for (const msg of fresh) {
                const isSystem = msg.message_type === 'system';
                const isTrade = msg.message_type === 'trade';
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const date = new Date(msg.created_at).toLocaleDateString();
                if (isSystem) {
                    h += `<div class="admin-chat-msg system">${escapeHtml(msg.content)} <span>${date} ${time}</span></div>`;
                } else if (isTrade) {
                    h += renderTradeMessage(msg, time, date);
                } else {
                    const isOther = msg.sender === otherUser;
                    h += `<div class="admin-chat-msg ${isOther ? 'user-other' : 'user-self'}"><div class="admin-chat-sender">${msg.sender}</div><div class="admin-chat-text">${escapeHtml(msg.content)}</div><div class="admin-chat-time">${date} ${time}</div></div>`;
                }
            }
            if (fresh.length === 0) h = '<div class="empty-state"><p>No messages</p></div>';
            container.innerHTML = h;
            container.scrollTop = container.scrollHeight;
        }, 5000);
    }

    function renderTradeMessage(msg, time, date) {
        const content = msg.content;
        const tradeMatch = content.match(/trade request:?\s*(.*)/i);
        const tradeData = tradeMatch ? tradeMatch[1] : content;

        let cardHtml = '';
        const cardIds = [];
        const idRegex = /([a-z0-9_]+)/gi;
        let m;
        while ((m = idRegex.exec(tradeData)) !== null) {
            const card = getCardById(m[1]);
            if (card) cardIds.push(m[1]);
        }

        if (cardIds.length >= 2) {
            const giveCard = getCardById(cardIds[0]);
            const getCard = getCardById(cardIds[1]);
            const giveImg = giveCard ? getCardImageUrl(giveCard) : null;
            const getImg = getCard ? getCardImageUrl(getCard) : null;

            cardHtml = `
            <div class="trade-msg-cards">
                <div class="trade-msg-side">
                    <div class="trade-msg-label">GIVES</div>
                    <div class="trade-msg-img card-${giveCard ? giveCard.type.toLowerCase() : 'basic'}">
                        ${giveImg ? `<img src="${giveImg}" onerror="this.style.display='none'">` : ''}
                    </div>
                    <div class="trade-msg-name">${giveCard ? giveCard.card_name : cardIds[0]}</div>
                </div>
                <div class="trade-msg-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
                </div>
                <div class="trade-msg-side">
                    <div class="trade-msg-label">GETS</div>
                    <div class="trade-msg-img card-${getCard ? getCard.type.toLowerCase() : 'basic'}">
                        ${getImg ? `<img src="${getImg}" onerror="this.style.display='none'">` : ''}
                    </div>
                    <div class="trade-msg-name">${getCard ? getCard.card_name : cardIds[1]}</div>
                </div>
            </div>`;
        }

        return `
        <div class="admin-chat-msg trade">
            <div class="trade-msg-header">🔄 Trade Request</div>
            ${cardHtml || `<div class="trade-msg-text">${escapeHtml(content)}</div>`}
            <div class="admin-chat-time">${date} ${time}</div>
        </div>`;
    }

    window.openChat = function(convId, otherUser) {
        window.location.href = 'admin-chats.html?chat=' + encodeURIComponent(convId + '|' + otherUser);
    };
})();
