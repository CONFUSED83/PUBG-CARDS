(async function() {
    try {
        while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
        await initApp();
    } catch(e) { console.error('Init failed:', e); return; }

    const user = requireAuth();
    if (!user || !user.is_admin) { alert('Admin access required'); window.location.href = './login.html'; return; }

    const msg = await getAdminMessage();

    let content = `
    <div class="m-page-header">
        <h1 class="m-page-title">Settings</h1>
        <p class="m-page-sub">Announcements & data</p>
    </div>

    <div class="m-section">
        <div class="m-section-header"><h3 class="m-section-title">Announcement</h3></div>
        <div style="padding:16px;">
            <div class="m-field">
                <label class="m-label">Heading</label>
                <input type="text" class="m-input" id="adminMsgHeading" value="${msg.heading || ''}" placeholder="e.g. Important Update...">
            </div>
            <div class="m-field">
                <label class="m-label">Message</label>
                <textarea class="m-textarea" id="adminMsgText" placeholder="Write your announcement...">${msg.message || ''}</textarea>
            </div>
            <div class="m-field">
                <label class="m-label">Display Mode</label>
                <div style="display:flex;gap:8px;">
                    <button class="m-filter-pill ${msg.mode==='once'?'active':''}" data-mode="once" style="flex:1;text-align:center;">Show Once</button>
                    <button class="m-filter-pill ${msg.mode==='always'?'active':''}" data-mode="always" style="flex:1;text-align:center;">Always Show</button>
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="m-btn m-btn-teal" style="flex:1;" id="saveAdminMsg">Save</button>
                <button class="m-btn m-btn-danger" style="flex:1;" id="clearAdminMsg">Clear</button>
            </div>
        </div>
    </div>

    <div class="m-section">
        <div class="m-section-header"><h3 class="m-section-title">Data Management</h3></div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:8px;">
            <button class="m-btn m-btn-teal" id="exportBtn">Export All Data</button>
            <button class="m-btn m-btn-outline" id="importBtn">Import Data</button>
            <input type="file" id="importFile" accept=".json" style="display:none;">
        </div>
    </div>

    <div class="m-section" style="border-color:rgba(255,77,106,0.2);">
        <div class="m-section-header"><h3 class="m-section-title" style="color:#ff4d6a;">Danger Zone</h3></div>
        <div style="padding:16px;">
            <button class="m-btn m-btn-danger" id="resetAllBtn">Reset All Data</button>
        </div>
    </div>`;

    document.getElementById('app').innerHTML = buildMobilePage('settings', content);
    initMoreSheet();

    let adminMsgMode = msg.mode || 'once';
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            adminMsgMode = btn.dataset.mode;
            document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.getElementById('saveAdminMsg').addEventListener('click', async () => {
        const heading = document.getElementById('adminMsgHeading').value.trim();
        const message = document.getElementById('adminMsgText').value.trim();
        await setAdminMessage(heading, message, adminMsgMode);
        showToast('Saved!', 'success');
    });

    document.getElementById('clearAdminMsg').addEventListener('click', async () => {
        document.getElementById('adminMsgHeading').value = '';
        document.getElementById('adminMsgText').value = '';
        await setAdminMessage('', '', 'once');
        showToast('Cleared', 'info');
    });

    document.getElementById('exportBtn').addEventListener('click', async () => {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported!', 'success');
    });

    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try { await importAllData(JSON.parse(ev.target.result)); showToast('Imported!', 'success'); }
            catch { showToast('Invalid file', 'error'); }
        };
        reader.readAsText(file);
    });

    document.getElementById('resetAllBtn').addEventListener('click', async () => {
        if (confirm('Reset all data?')) { if (confirm('Final warning?')) { await clearAllData(); showToast('Reset', 'info'); } }
    });
})();
