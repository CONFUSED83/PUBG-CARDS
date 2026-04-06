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
        if (!user) return;

        document.getElementById('backBtn').addEventListener('click', () => navigateTo('home'));

        async function render() {
            const conversations = await getConversations(user.username);
            const deleted = JSON.parse(localStorage.getItem('cth_deleted_chats_' + user.username) || '[]');
            
            const visibleConversations = [];
            for (const conv of conversations) {
                if (!deleted.includes(conv.id)) {
                    visibleConversations.push(conv);
                    continue;
                }
                if (sb) {
                    const { count } = await sb.from('messages').select('*', { count: 'exact', head: true })
                        .eq('conversation_id', conv.id)
                        .neq('sender', user.username)
                        .eq('is_read', false);
                    if (count > 0) {
                        const key = 'cth_deleted_chats_' + user.username;
                        const updatedDeleted = deleted.filter(id => id !== conv.id);
                        localStorage.setItem(key, JSON.stringify(updatedDeleted));
                        visibleConversations.push(conv);
                    }
                }
            }
            
            let html = '<div class="page-wrap"><div style="margin-bottom:16px;"><h2 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.75rem;">Messages</h2><p style="color:var(--text-dim);font-size:0.8125rem;">Your conversations</p></div>';

            if (visibleConversations.length === 0) {
                html += '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3;margin-bottom:12px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No conversations yet</p><p style="font-size:0.75rem;margin-top:4px;">Start chatting by trading with other users</p></div>';
            } else {
                for (const conv of visibleConversations) {
                    const otherUser = conv.user1 === user.username ? conv.user2 : conv.user1;
                    const displayName = otherUser === 'CatLover78' ? 'Admin' : otherUser;
                    
                    let unreadCount = 0;
                    if (sb) {
                        const { count } = await sb.from('messages').select('*', { count: 'exact', head: true })
                            .eq('conversation_id', conv.id)
                            .neq('sender', user.username)
                            .eq('is_read', false);
                        unreadCount = count || 0;
                    }
                    
                    html += `
                    <div class="chat-item" data-chat="${conv.id}|${otherUser}" style="${unreadCount > 0 ? 'background:rgba(0,212,170,0.04);' : ''}">
                        <div class="chat-avatar">${displayName.charAt(0).toUpperCase()}</div>
                        <div class="chat-info">
                            <div class="chat-name" style="${unreadCount > 0 ? 'font-weight:700;' : ''}">${displayName}</div>
                            <div class="chat-preview" style="${unreadCount > 0 ? 'color:var(--text);font-weight:500;' : ''}">${conv.last_message || 'No messages yet'}</div>
                        </div>
                        <div style="text-align:right;flex-shrink:0;">
                            <div class="chat-time">${timeAgo(conv.updated_at)}</div>
                            ${unreadCount > 0 ? '<div style="width:20px;height:20px;border-radius:50%;background:var(--teal);color:var(--bg);font-size:10px;font-weight:700;display:flex;align-items:justify-content:center;margin-left:auto;margin-top:4px;">' + (unreadCount > 9 ? '9+' : unreadCount) + '</div>' : ''}
                        </div>
                    </div>`;
                }
            }

            html += '</div>';
            html += '<button class="new-chat-btn" id="newChatBtn"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>';

            document.getElementById('app').innerHTML = html;

            document.querySelectorAll('[data-chat]').forEach(el => {
                el.addEventListener('click', () => {
                    const parts = el.dataset.chat.split('|');
                    navigateTo('chat-window', parts[0], parts[1]);
                });
            });

            document.getElementById('newChatBtn').addEventListener('click', () => {
                navigateTo('trade-hub');
            });
        }

        render();
    })();
