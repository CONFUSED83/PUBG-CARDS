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

    const msg = await getAdminMessage();

    let content = `
    <div class="admin-header">
        <h1>Settings</h1>
        <p>Announcements, data management, and system controls</p>
    </div>

    <div class="grid-2">
        <div class="panel">
            <h3 class="panel-title">Announcement to All Users</h3>
            <p class="panel-desc">This message appears as a popup on every user's home page.</p>
            <div class="input-group">
                <label>Heading</label>
                <input type="text" id="adminMsgHeading" placeholder="e.g. Important Update..." value="${msg.heading || ''}">
            </div>
            <div class="input-group">
                <label>Message</label>
                <textarea id="adminMsgText" rows="4" placeholder="Write your announcement..." style="resize:vertical;">${msg.message || ''}</textarea>
            </div>
            <div class="input-group">
                <label>Display Mode</label>
                <div class="msg-mode-selector">
                    <button class="msg-mode-btn ${msg.mode==='once'?'active':''}" data-mode="once">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Show Once Per User
                    </button>
                    <button class="msg-mode-btn ${msg.mode==='always'?'active':''}" data-mode="always">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        Show Every Time
                    </button>
                </div>
            </div>
            <div class="msg-actions">
                <button class="btn btn-teal" id="saveAdminMsg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Save Message
                </button>
                <button class="btn btn-danger" id="clearAdminMsg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Clear Message
                </button>
            </div>
        </div>

        <div class="panel">
            <h3 class="panel-title">Preview</h3>
            <div class="msg-preview">
                <div style="width:50px;height:50px;border-radius:50%;background:rgba(240,192,64,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:var(--gold);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h4 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1rem;margin-bottom:8px;" id="previewHeading">${msg.heading || 'Your Heading'}</h4>
                <p style="color:var(--text-muted);font-size:0.8125rem;line-height:1.5;" id="previewMsg">${msg.message || 'Your message will appear here...'}</p>
            </div>
            <div class="msg-status">
                <div class="msg-status-row">
                    <span class="msg-status-label">Status</span>
                    <span class="msg-status-val" style="color:${msg.message ? 'var(--teal)' : 'var(--text-dim)'};">${msg.message ? 'Active' : 'No message set'}</span>
                </div>
                <div class="msg-status-row">
                    <span class="msg-status-label">Display Mode</span>
                    <span class="msg-status-val">${msg.mode === 'once' ? 'Show Once Per User' : msg.mode === 'always' ? 'Show Every Time' : 'Not set'}</span>
                </div>
                <div class="msg-status-row">
                    <span class="msg-status-label">Heading</span>
                    <span class="msg-status-val">${msg.heading || '—'}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="panel" style="margin-top:16px;">
        <h3 class="panel-title">Data Management</h3>
        <div class="data-actions">
            <button class="btn btn-teal" id="exportBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export All Data
            </button>
            <button class="btn btn-outline" id="importBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import Data
            </button>
            <input type="file" id="importFile" accept=".json" style="display:none;">
        </div>
    </div>

    <div class="panel danger-panel" style="margin-top:16px;">
        <h3 class="panel-title" style="color:var(--red);">Danger Zone</h3>
        <p class="panel-desc">Reset all data to defaults. This cannot be undone.</p>
        <button class="btn btn-danger" id="resetAllBtn">Reset All Data</button>
    </div>`;

    document.getElementById('app').innerHTML = buildPage('settings', content);

    let adminMsgMode = msg.mode || 'once';

    document.querySelectorAll('.msg-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            adminMsgMode = btn.dataset.mode;
            document.querySelectorAll('.msg-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    const headingInput = document.getElementById('adminMsgHeading');
    const msgInput = document.getElementById('adminMsgText');
    if (headingInput) headingInput.addEventListener('input', () => {
        const preview = document.getElementById('previewHeading');
        if (preview) preview.textContent = headingInput.value || 'Your Heading';
    });
    if (msgInput) msgInput.addEventListener('input', () => {
        const preview = document.getElementById('previewMsg');
        if (preview) preview.textContent = msgInput.value || 'Your message will appear here...';
    });

    const saveBtn = document.getElementById('saveAdminMsg');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const heading = document.getElementById('adminMsgHeading').value.trim();
            const message = document.getElementById('adminMsgText').value.trim();
            await setAdminMessage(heading, message, adminMsgMode);
            showToast('Message saved!', 'success');
        });
    }

    const clearBtn = document.getElementById('clearAdminMsg');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            document.getElementById('adminMsgHeading').value = '';
            document.getElementById('adminMsgText').value = '';
            await setAdminMessage('', '', 'once');
            showToast('Message cleared', 'info');
            const previewH = document.getElementById('previewHeading');
            const previewM = document.getElementById('previewMsg');
            if (previewH) previewH.textContent = 'Your Heading';
            if (previewM) previewM.textContent = 'Your message will appear here...';
        });
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', async () => {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `card-trading-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported!', 'success');
    });

    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.addEventListener('click', () => document.getElementById('importFile').click());

    const importFile = document.getElementById('importFile');
    if (importFile) importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                await importAllData(data);
                showToast('Data imported successfully!', 'success');
            } catch {
                showToast('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);
    });

    const resetAllBtn = document.getElementById('resetAllBtn');
    if (resetAllBtn) resetAllBtn.addEventListener('click', async () => {
        if (confirm('Are you sure? This will delete ALL data including users, cards, and trades.')) {
            if (confirm('This is irreversible. Continue?')) {
                await clearAllData();
                showToast('All data reset to defaults', 'info');
            }
        }
    });
})();
