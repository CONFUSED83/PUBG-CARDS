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
    const viewUser = params.get('user');

    if (viewUser) {
        await renderUserDetail(viewUser);
    } else {
        await renderUserList();
    }

    async function renderUserList() {
        const users = await adminGetAllUsers();

        let content = `
        <div class="admin-header">
            <h1>User Management</h1>
            <p>${users.length} users · Tap any user for full details</p>
        </div>

        <div class="panel">
            <div class="panel-toolbar">
                <input type="text" class="search-input" id="userSearch" placeholder="Search users..." style="max-width:320px;">
            </div>
            <div class="users-list" id="usersList">`;

        for (const u of users) {
            const isBanned = u.is_banned || false;
            const isDeleted = u.is_deleted || false;
            const isAdmin = u.is_admin || false;

            let cls = '';
            if (isDeleted) cls = 'deleted';
            else if (isBanned) cls = 'banned';

            let tags = '';
            if (isDeleted) {
                const deletedDate = u.deleted_at ? new Date(u.deleted_at).toLocaleDateString() : '';
                tags += `<span class="user-tag deleted">Deleted${deletedDate ? ' ' + deletedDate : ''}</span>`;
            }
            if (isBanned) tags += '<span class="user-tag banned">Banned</span>';
            if (isAdmin) tags += '<span class="user-tag admin">Admin</span>';

            const banIcon = isBanned && !isDeleted ? '<span class="ban-icon">✕</span>' : '';
            const href = isDeleted ? 'javascript:void(0)' : `admin-users.html?user=${encodeURIComponent(u.username)}`;

            content += `
            <a class="user-list-item ${cls}" href="${href}" data-search="${u.username.toLowerCase()}">
                <div class="user-list-avatar">
                    ${u.username.charAt(0).toUpperCase()}
                    ${banIcon}
                </div>
                <div class="user-list-info">
                    <div class="user-list-name">${u.username} ${tags}</div>
                    <div class="user-list-meta">Joined ${new Date(u.created_at).toLocaleDateString()}</div>
                </div>
                <div class="user-list-stats">
                    <div class="user-stat-mini">
                        <div class="val" style="color:var(--teal);">${u.cards_owned}</div>
                        <div class="lbl">Cards</div>
                    </div>
                    <div class="user-stat-mini">
                        <div class="val" style="color:var(--gold);">${u.trades_completed}</div>
                        <div class="lbl">Trades</div>
                    </div>
                    <div class="user-stat-mini">
                        <div class="val" style="color:${getFavColor(u.favorability)};">${u.favorability}</div>
                        <div class="lbl">${getFavLabel(u.favorability)}</div>
                    </div>
                </div>
            </a>`;
        }

        content += '</div></div>';
        document.getElementById('app').innerHTML = buildPage('users', content);

        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.toLowerCase();
                document.querySelectorAll('.user-list-item').forEach(item => {
                    item.style.display = item.dataset.search.includes(q) ? '' : 'none';
                });
            });
        }
    }

    async function renderUserDetail(username) {
        const [profile, timeline, notes] = await Promise.all([
            adminGetUserProfile(username),
            getUserActivityTimeline(username, 30),
            getAdminNotes(username)
        ]);
        if (!profile) {
            document.getElementById('app').innerHTML = buildPage('users', '<div class="panel"><p>User not found</p><a href="admin-users.html" class="btn btn-teal btn-sm">Back to Users</a></div>');
            return;
        }

        const favColor = getFavColor(profile.favorability);
        const favLabel = getFavLabel(profile.favorability);
        const isBanned = profile.is_banned || false;
        const banIcon = isBanned ? '<span class="ban-icon">✕</span>' : '';
        const banBadge = isBanned ? '<span class="user-tag banned" style="font-size:0.625rem;">Banned</span>' : '';

        let content = `
        <div class="admin-header">
            <div>
                <a href="admin-users.html" style="display:inline-flex;align-items:center;gap:6px;color:var(--text-dim);text-decoration:none;font-size:0.8125rem;margin-bottom:8px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    Back to Users
                </a>
                <h1>${username}</h1>
                <p>User profile & management ${banBadge}</p>
            </div>
        </div>

        <div class="detail-header">
            <div class="detail-avatar">
                ${username.charAt(0).toUpperCase()}
                ${banIcon}
            </div>
            <div class="detail-info">
                <h2>${username} ${banBadge}</h2>
                <div class="meta">Joined ${new Date(profile.created_at).toLocaleDateString()}${profile.last_login ? ' · Last seen ' + timeAgo(profile.last_login) : ''}</div>
                <div class="meta" style="margin-top:2px;">
                    ${profile.whatsapp ? 'WhatsApp: <strong>' + profile.whatsapp + '</strong>' : ''}${profile.whatsapp && profile.discord ? ' · ' : ''}${profile.discord ? 'Discord: <strong>' + profile.discord + '</strong>' : ''}
                </div>
            </div>
        </div>

        <div class="detail-stats">
            <div class="detail-stat">
                <div class="val" style="color:var(--teal);">${profile.cards.length}</div>
                <div class="lbl">Cards Owned</div>
            </div>
            <div class="detail-stat">
                <div class="val" style="color:var(--gold);">${profile.total_trades}</div>
                <div class="lbl">Total Trades</div>
            </div>
            <div class="detail-stat">
                <div class="val" style="color:${favColor};">${profile.favorability}</div>
                <div class="lbl">${favLabel}</div>
            </div>
            <div class="detail-stat">
                <div class="val">${profile.conversations.length}</div>
                <div class="lbl">Conversations</div>
            </div>
        </div>

        <div class="detail-actions">
            <button class="btn btn-teal" onclick="window.messageUser('${username}')">Send Message</button>
            <button class="btn btn-gold-outline" onclick="window.viewUserCards('${username}')">View Cards</button>
            <button class="btn btn-gold-outline" onclick="window.viewUserChats('${username}')">View Chats</button>
            ${isBanned 
                ? `<button class="btn btn-teal-outline" onclick="window.unbanUser('${username}')" style="border-color:rgba(0,212,170,0.3);color:var(--teal);">Unban User</button>`
                : `<button class="btn btn-danger-outline" onclick="window.banUser('${username}')">Ban User</button>`
            }
            <button class="btn btn-danger-outline" onclick="window.deleteUser('${username}')">Delete User</button>
            <button class="btn btn-danger-outline" onclick="window.resetUserCards('${username}')">Reset Cards</button>
        </div>`;

        // Activity Timeline
        content += `
        <div class="panel" style="margin-bottom:16px;">
            <h3 class="panel-title">Activity Timeline</h3>`;
        if (timeline.length === 0) {
            content += '<div class="empty-state" style="padding:20px;">No activity found</div>';
        } else {
            content += '<div class="timeline">';
            for (const ev of timeline) {
                let dotClass = 'login';
                if (ev.type.startsWith('trade')) dotClass = 'trade';
                else if (ev.type === 'message') dotClass = 'message';
                else if (ev.type === 'cards_updated') dotClass = 'cards';
                content += `
                <div class="timeline-item">
                    <div class="timeline-dot ${dotClass}"></div>
                    <div class="timeline-content">
                        <div class="timeline-action">${ev.details}</div>
                        <div class="timeline-time">${timeAgo(ev.created_at)}</div>
                    </div>
                </div>`;
            }
            content += '</div>';
        }
        content += '</div>';

        // Admin Notes
        content += `
        <div class="panel">
            <h3 class="panel-title">Admin Notes</h3>
            <div class="notes-list" id="notesList">`;
        if (notes.length === 0) {
            content += '<div class="empty-state" style="padding:20px;">No notes yet</div>';
        } else {
            for (const n of notes) {
                content += `
                <div class="note-item" data-note-id="${n.id}">
                    <div class="note-text">${escapeHtml(n.note)}</div>
                    <div class="note-time">${timeAgo(n.created_at)}</div>
                    <button class="note-delete" data-note-id="${n.id}" title="Delete note">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>`;
            }
        }
        content += `
            </div>
            <div class="note-input-row">
                <input type="text" id="noteInput" placeholder="Add a note about this user...">
                <button id="noteAddBtn">Add Note</button>
            </div>
        </div>`;

        document.getElementById('app').innerHTML = buildPage('users', content);

        const favSlider = document.getElementById('favSlider');
        const favValue = document.getElementById('favValue');
        if (favSlider && favValue) {
            favSlider.addEventListener('input', () => {
                favValue.textContent = favSlider.value;
                favValue.style.color = getFavColor(parseInt(favSlider.value));
            });
        }

        const saveFavBtn = document.getElementById('saveFavBtn');
        if (saveFavBtn) {
            saveFavBtn.addEventListener('click', async () => {
                const newFav = parseInt(document.getElementById('favSlider').value);
                await adminSetFavorability(username, newFav);
                showToast(`Favorability set to ${newFav}`, 'success');
            });
        }

        // Note handling
        const noteInput = document.getElementById('noteInput');
        const noteAddBtn = document.getElementById('noteAddBtn');
        if (noteInput && noteAddBtn) {
            noteAddBtn.addEventListener('click', async () => {
                const note = noteInput.value.trim();
                if (!note) return;
                await addAdminNote(username, note);
                noteInput.value = '';
                renderUserDetail(username);
            });
            noteInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') noteAddBtn.click();
            });
        }

        document.querySelectorAll('.note-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Delete this note?')) {
                    await deleteAdminNote(parseInt(btn.dataset.noteId));
                    renderUserDetail(username);
                }
            });
        });
    }

    window.messageUser = function(username) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
        <div class="modal-content">
            <h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.125rem;margin-bottom:12px;">Message ${username}</h3>
            <textarea id="adminMsgContent" rows="3" placeholder="Type your message..." style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.875rem;resize:vertical;font-family:inherit;"></textarea>
            <div style="display:flex;gap:8px;margin-top:12px;">
                <button class="btn btn-outline btn-sm" style="flex:1;" id="msgCancel">Cancel</button>
                <button class="btn btn-teal btn-sm" style="flex:1;" id="msgSend">Send</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#msgCancel').onclick = () => overlay.remove();
        overlay.querySelector('#msgSend').onclick = async () => {
            const content = document.getElementById('adminMsgContent').value.trim();
            if (!content) { showToast('Message cannot be empty', 'error'); return; }
            await adminSendSystemMessage(username, content);
            showToast('Message sent!', 'success');
            overlay.remove();
        };
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    };

    window.banUser = async function(username) {
        if (confirm(`Ban ${username}? They will have favorability set to 0.`)) {
            await adminBanUser(username);
            showToast(`${username} has been banned`, 'success');
            window.location.reload();
        }
    };

    window.unbanUser = async function(username) {
        if (confirm(`Unban ${username}?`)) {
            await adminUnbanUser(username);
            showToast(`${username} has been unbanned`, 'success');
            window.location.reload();
        }
    };

    window.deleteUser = async function(username) {
        if (confirm(`Permanently delete ${username} and all data?`)) {
            if (confirm(`Final warning: Delete ${username}?`)) {
                await adminDeleteUser(username);
                showToast(`${username} deleted`, 'success');
                window.location.href = 'admin-users.html';
            }
        }
    };

    window.resetUserCards = async function(username) {
        if (confirm(`Reset all card data for ${username}?`)) {
            await adminResetUserCards(username);
            showToast(`Cards reset for ${username}`, 'info');
            window.location.reload();
        }
    };

    window.viewUserCards = function(username) {
        window.location.href = 'admin-cards.html?user=' + encodeURIComponent(username);
    };

    window.viewUserChats = function(username) {
        window.location.href = 'admin-chats.html?user=' + encodeURIComponent(username);
    };
})();
