(async function() {
    try {
        while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
        await initApp();
    } catch(e) { console.error('Init failed:', e); return; }

    const user = requireAuth();
    if (!user || !user.is_admin) { alert('Admin access required'); window.location.href = './login.html'; return; }

    const activities = await getActivityLog(100);

    let content = `
    <div class="m-page-header">
        <h1 class="m-page-title">Activity</h1>
        <p class="m-page-sub">Auto-refreshes every 5s</p>
    </div>
    <div class="m-filters">
        <button class="m-filter-pill active" data-filter="all">All</button>
        <button class="m-filter-pill" data-filter="login">Logins</button>
        <button class="m-filter-pill" data-filter="trade">Trades</button>
        <button class="m-filter-pill" data-filter="message">Messages</button>
        <button class="m-filter-pill" data-filter="cards">Cards</button>
    </div>
    <div class="m-section" id="activityFeed">`;

    for (const a of activities) content += formatMobileActivity(a);
    if (activities.length === 0) content += '<div class="m-empty">No activity</div>';
    content += '</div>';

    document.getElementById('app').innerHTML = buildMobilePage('activity', content);
    initMoreSheet();

    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter]').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            document.querySelectorAll('.m-activity-item').forEach(item => {
                const type = item.dataset.activityType || '';
                if (f === 'all') { item.style.display = ''; return; }
                if (f === 'login') { item.style.display = (type === 'login' || type === 'register') ? '' : 'none'; }
                else if (f === 'trade') { item.style.display = type.startsWith('trade') ? '' : 'none'; }
                else if (f === 'message') { item.style.display = type === 'message_sent' ? '' : 'none'; }
                else if (f === 'cards') { item.style.display = (type === 'cards_updated' || type === 'card_search') ? '' : 'none'; }
            });
        });
    });

    setInterval(async () => {
        const acts = await getActivityLog(100);
        const feed = document.getElementById('activityFeed');
        if (feed) {
            let h = '';
            for (const a of acts) h += formatMobileActivity(a);
            if (acts.length === 0) h = '<div class="m-empty">No activity</div>';
            feed.innerHTML = h;
        }
    }, 5000);
})();
