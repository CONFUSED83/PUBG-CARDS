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

    const activities = await getActivityLog(200);

    let content = `
    <div class="admin-header">
        <h1>Activity Log</h1>
        <p>Auto-refreshes every 5 seconds · Showing last ${activities.length} entries</p>
    </div>

    <div class="panel" style="padding:0;overflow:hidden;">
        <div class="activity-toolbar">
            <input type="text" class="search-input" id="activitySearch" placeholder="Search activity..." style="max-width:320px;">
            <div class="filter-pills">
                <button class="filter-pill active" data-filter-activity="all">All</button>
                <button class="filter-pill" data-filter-activity="login">Logins</button>
                <button class="filter-pill" data-filter-activity="trade">Trades</button>
                <button class="filter-pill" data-filter-activity="message">Messages</button>
                <button class="filter-pill" data-filter-activity="cards">Cards</button>
                <button class="filter-pill" data-filter-activity="admin">Admin</button>
            </div>
        </div>
        <div id="activityFeed" class="activity-feed">`;

    for (const a of activities) {
        content += formatActivityRich(a);
    }

    if (activities.length === 0) {
        content += '<div class="empty-state"><p>No activity yet</p></div>';
    }

    content += '</div></div>';
    document.getElementById('app').innerHTML = buildPage('activity', content);

    document.getElementById('activitySearch')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.activity-item').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    });

    document.querySelectorAll('[data-filter-activity]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter-activity]').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filterActivity;
            document.querySelectorAll('.activity-item').forEach(item => {
                const type = item.dataset.activityType || '';
                if (filter === 'all') { item.style.display = ''; return; }
                if (filter === 'login') { item.style.display = (type === 'login' || type === 'register') ? '' : 'none'; }
                else if (filter === 'trade') { item.style.display = type.startsWith('trade') ? '' : 'none'; }
                else if (filter === 'message') { item.style.display = type === 'message_sent' ? '' : 'none'; }
                else if (filter === 'cards') { item.style.display = (type === 'cards_updated' || type === 'card_search') ? '' : 'none'; }
                else if (filter === 'admin') { item.style.display = (type.startsWith('user_') || type === 'favorability_updated' || type === 'chat_deleted') ? '' : 'none'; }
            });
        });
    });

    setInterval(async () => {
        const acts = await getActivityLog(200);
        const feed = document.getElementById('activityFeed');
        if (feed) {
            let h = '';
            for (const a of acts) h += formatActivityRich(a);
            if (acts.length === 0) h = '<div class="empty-state"><p>No activity yet</p></div>';
            feed.innerHTML = h;
        }
    }, 5000);
})();
