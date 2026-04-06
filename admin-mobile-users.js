(async function() {
    try {
        while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
        await initApp();
    } catch(e) { console.error('Init failed:', e); return; }

    const user = requireAuth();
    if (!user || !user.is_admin) { alert('Admin access required'); window.location.href = './login.html'; return; }

    const params = new URLSearchParams(window.location.search);
    const viewUser = params.get('user');

    if (viewUser) await renderUserDetail(viewUser);
    else await renderUserList();

    async function renderUserList() {
        const users = await adminGetAllUsers();
        let content = `
        <div class="m-page-header">
            <h1 class="m-page-title">Users</h1>
            <p class="m-page-sub">${users.length} registered</p>
        </div>
        <input type="text" class="m-search" id="userSearch" placeholder="Search users...">
        <div class="m-section" id="usersList">`;

        for (const u of users) {
            const isBanned = u.is_banned || false;
            const isDeleted = u.is_deleted || false;
            let cls = '';
            if (isDeleted) cls = 'deleted';
            else if (isBanned) cls = 'banned';
            const href = isDeleted ? 'javascript:void(0)' : `admin-mobile-users.html?user=${encodeURIComponent(u.username)}`;

            content += `
            <a class="m-user-card ${cls}" href="${href}" data-search="${u.username.toLowerCase()}">
                <div class="m-user-avatar">${u.username.charAt(0).toUpperCase()}</div>
                <div class="m-user-info">
                    <div class="m-user-name">${u.username}</div>
                    <div class="m-user-meta">${new Date(u.created_at).toLocaleDateString()}${isBanned ? ' · Banned' : ''}${isDeleted ? ' · Deleted' : ''}</div>
                </div>
                <div class="m-user-stats">
                    <div class="m-user-stat-val" style="color:#00d4aa;">${u.cards_owned}</div>
                    <div class="m-user-stat-lbl">cards</div>
                </div>
            </a>`;
        }

        content += '</div>';
        document.getElementById('app').innerHTML = buildMobilePage('users', content);
        initMoreSheet();

        document.getElementById('userSearch').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.m-user-card').forEach(item => {
                item.style.display = item.dataset.search.includes(q) ? '' : 'none';
            });
        });
    }

    async function renderUserDetail(username) {
        const [profile, timeline, notes] = await Promise.all([
            adminGetUserProfile(username),
            getUserActivityTimeline(username, 20),
            getAdminNotes(username)
        ]);
        if (!profile) { document.getElementById('app').innerHTML = buildMobilePage('users', '<div class="m-section"><div class="m-empty">User not found</div></div>'); return; }

        const favColor = getFavColor(profile.favorability);
        const isBanned = profile.is_banned || false;

        let content = `
        <button class="m-back-btn" onclick="window.location.href='admin-mobile-users.html'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Users
        </button>

        <div class="m-section" style="margin-bottom:12px;">
            <div style="padding:20px;text-align:center;">
                <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#f0c040,#00d4aa);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#0d0f1a;margin:0 auto 12px;">${username.charAt(0).toUpperCase()}</div>
                <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.375rem;color:#fff;margin-bottom:4px;">${username}${isBanned ? ' 🔴' : ''}</div>
                <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">Joined ${new Date(profile.created_at).toLocaleDateString()}</div>
                ${profile.last_login ? `<div style="font-size:0.6875rem;color:rgba(255,255,255,0.3);">Last active ${timeAgo(profile.last_login)}</div>` : ''}
            </div>
        </div>

        <div class="m-section" style="margin-bottom:12px;">
            <div class="m-section-header"><h3 class="m-section-title">Contact</h3></div>
            <div class="m-settings-item">
                <span class="m-settings-label">WhatsApp</span>
                <span class="m-settings-value">${profile.whatsapp || 'Not set'}</span>
            </div>
            <div class="m-settings-item">
                <span class="m-settings-label">Discord</span>
                <span class="m-settings-value">${profile.discord || 'Not set'}</span>
            </div>
        </div>

        <div class="m-section" style="margin-bottom:12px;">
            <div class="m-section-header"><h3 class="m-section-title">Statistics</h3></div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px;">
                <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.5rem;color:#00d4aa;line-height:1;">${profile.cards.length}</div><div style="font-size:0.5rem;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-top:2px;">Cards</div></div>
                <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.5rem;color:#f0c040;line-height:1;">${profile.total_trades}</div><div style="font-size:0.5rem;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-top:2px;">Trades</div></div>
                <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.5rem;color:${favColor};line-height:1;">${profile.favorability}</div><div style="font-size:0.5rem;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-top:2px;">${getFavLabel(profile.favorability)}</div></div>
                <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.5rem;color:#fff;line-height:1;">${profile.conversations.length}</div><div style="font-size:0.5rem;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-top:2px;">Chats</div></div>
            </div>
        </div>

        <div class="m-section" style="margin-bottom:12px;">
            <div class="m-section-header"><h3 class="m-section-title">Actions</h3></div>
            <div style="padding:16px;display:flex;flex-direction:column;gap:8px;">
                <button class="m-btn m-btn-teal" onclick="window.messageUser('${username}')">Send Message</button>
                <button class="m-btn m-btn-gold" onclick="window.viewUserCards('${username}')">View Cards</button>
                <button class="m-btn m-btn-gold" onclick="window.viewUserChats('${username}')">View Chats</button>
                ${isBanned
                    ? `<button class="m-btn m-btn-teal" onclick="window.unbanUser('${username}')" style="border-color:rgba(0,212,170,0.25);">Unban User</button>`
                    : `<button class="m-btn m-btn-danger" onclick="window.banUser('${username}')">Ban User</button>`
                }
                <button class="m-btn m-btn-danger" onclick="window.deleteUser('${username}')">Delete User</button>
            </div>
        </div>

        <div class="m-section" style="margin-bottom:12px;">
            <div class="m-section-header"><h3 class="m-section-title">Favorability</h3></div>
            <div style="padding:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <input type="range" id="favSlider" min="0" max="200" value="${profile.favorability}" style="flex:1;accent-color:#00d4aa;">
                    <span id="favValue" style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.375rem;min-width:44px;text-align:center;color:${favColor};">${profile.favorability}</span>
                </div>
                <button class="m-btn m-btn-teal" id="saveFavBtn">Update Favorability</button>
            </div>
        </div>

        <!-- Activity Timeline -->
        <div class="m-section" style="margin-bottom:12px;">
            <div class="m-section-header"><h3 class="m-section-title">Activity Timeline</h3></div>`;
        if (timeline.length === 0) {
            content += '<div class="m-empty" style="padding:20px;">No activity</div>';
        } else {
            content += '<div class="m-timeline">';
            for (const ev of timeline) {
                let dotClass = 'login';
                if (ev.type.startsWith('trade')) dotClass = 'trade';
                else if (ev.type === 'message') dotClass = 'message';
                else if (ev.type === 'cards_updated') dotClass = 'cards';
                content += `
                <div class="m-timeline-item">
                    <div class="m-timeline-dot ${dotClass}"></div>
                    <div>
                        <div class="m-timeline-action">${ev.details}</div>
                        <div class="m-timeline-time">${timeAgo(ev.created_at)}</div>
                    </div>
                </div>`;
            }
            content += '</div>';
        }
        content += '</div>';

        <!-- Admin Notes -->
        content += `
        <div class="m-section">
            <div class="m-section-header"><h3 class="m-section-title">Admin Notes</h3></div>
            <div class="m-notes-list" id="notesList">`;
        if (notes.length === 0) {
            content += '<div class="m-empty" style="padding:16px;">No notes</div>';
        } else {
            for (const n of notes) {
                content += `
                <div class="m-note-item" data-note-id="${n.id}">
                    <div class="m-note-text">${escapeHtml(n.note)}</div>
                    <div class="m-note-time">${timeAgo(n.created_at)}</div>
                </div>`;
            }
        }
        content += `
            </div>
            <div class="m-note-input-row">
                <input type="text" id="noteInput" placeholder="Add a note...">
                <button id="noteAddBtn">Add</button>
            </div>
        </div>`;

        document.getElementById('app').innerHTML = buildMobilePage('users', content);
        initMoreSheet();

        const favSlider = document.getElementById('favSlider');
        const favValue = document.getElementById('favValue');
        if (favSlider && favValue) {
            favSlider.addEventListener('input', () => {
                favValue.textContent = favSlider.value;
                favValue.style.color = getFavColor(parseInt(favSlider.value));
            });
        }
        document.getElementById('saveFavBtn').addEventListener('click', async () => {
            await adminSetFavorability(username, parseInt(document.getElementById('favSlider').value));
            showToast('Updated', 'success');
        });

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
    }

    window.messageUser = function(username) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `<div class="modal-content"><h3 style="font-family:Rajdhani,sans-serif;font-weight:700;margin-bottom:12px;">Message ${username}</h3><textarea id="adminMsgContent" rows="3" placeholder="Type message..." style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.875rem;resize:vertical;"></textarea><div style="display:flex;gap:8px;margin-top:12px;"><button class="btn btn-outline btn-sm" style="flex:1;" id="msgCancel">Cancel</button><button class="btn btn-teal btn-sm" style="flex:1;" id="msgSend">Send</button></div></div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#msgCancel').onclick = () => overlay.remove();
        overlay.querySelector('#msgSend').onclick = async () => {
            const c = document.getElementById('adminMsgContent').value.trim();
            if (!c) { showToast('Empty', 'error'); return; }
            await adminSendSystemMessage(username, c);
            showToast('Sent!', 'success');
            overlay.remove();
        };
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    };

    window.banUser = async function(username) { if (confirm(`Ban ${username}?`)) { await adminBanUser(username); showToast('Banned', 'success'); window.location.reload(); } };
    window.unbanUser = async function(username) { if (confirm(`Unban ${username}?`)) { await adminUnbanUser(username); showToast('Unbanned', 'success'); window.location.reload(); } };
    window.deleteUser = async function(username) { if (confirm(`Delete ${username}?`)) { if (confirm(`Final warning?`)) { await adminDeleteUser(username); showToast('Deleted', 'success'); window.location.href = 'admin-mobile-users.html'; } } };
    window.viewUserCards = function(username) { window.location.href = 'admin-mobile-cards.html?user=' + encodeURIComponent(username); };
    window.viewUserChats = function(username) { window.location.href = 'admin-mobile-chats.html?user=' + encodeURIComponent(username); };
})();
