(async function() {
    try {
        while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
        await initApp();
    } catch(e) {
        console.error('Init failed:', e);
        document.getElementById('app').innerHTML = '<div class="app-loading"><div class="loading-bars"><span></span><span></span><span></span><span></span><span></span></div></div>';
        return;
    }

    const user = requireAuth();
    if (!user || !user.is_admin) { alert('Admin access required'); window.location.href = './login.html'; return; }

    const [stats, volume, reports, convos] = await Promise.all([
        adminGetStats(),
        getTradeVolumeStats(),
        getAllReports(),
        adminGetAllConversations()
    ]);

    const pendingCount = stats.trades_pending || 0;
    const openReports = reports.filter(r => r.status === 'open').length;

    let content = `
    <div class="m-page-header">
        <h1 class="m-page-title">Dashboard</h1>
        <p class="m-page-sub">Platform overview</p>
    </div>

    <div class="m-stats">
        <div class="m-stat">
            <div class="m-stat-icon" style="background:rgba(0,212,170,0.12);color:#00d4aa;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div><div class="m-stat-val">${stats.total_users}</div><div class="m-stat-lbl">Users</div></div>
        </div>
        <div class="m-stat">
            <div class="m-stat-icon" style="background:rgba(240,192,64,0.12);color:#f0c040;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/></svg>
            </div>
            <div><div class="m-stat-val">${stats.total_cards}</div><div class="m-stat-lbl">Cards</div></div>
        </div>
        <div class="m-stat">
            <div class="m-stat-icon" style="background:rgba(0,212,170,0.12);color:#00d4aa;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
            </div>
            <div><div class="m-stat-val">${stats.total_trades}</div><div class="m-stat-lbl">Trades</div></div>
        </div>
        <div class="m-stat">
            <div class="m-stat-icon" style="background:${stats.success_rate >= 50 ? 'rgba(0,212,170,0.12)' : 'rgba(255,77,106,0.12)'};color:${stats.success_rate >= 50 ? '#00d4aa' : '#ff4d6a'};">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div><div class="m-stat-val">${stats.success_rate}%</div><div class="m-stat-lbl">Success</div></div>
        </div>
    </div>

    <!-- Quick Actions -->
    <div class="m-section" style="margin-bottom:12px;">
        <div class="m-section-header"><h3 class="m-section-title">Quick Actions</h3></div>
        <div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px;">
            <a href="admin-mobile-trades.html" class="m-quick-action">
                <div style="width:36px;height:36px;border-radius:8px;background:rgba(240,192,64,0.12);display:flex;align-items:center;justify-content:center;color:#f0c040;flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.875rem;color:#fff;">Pending Trades</div><div style="font-size:0.6875rem;color:rgba(255,255,255,0.4);">${pendingCount} awaiting</div></div>
                ${pendingCount > 0 ? `<span style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:0.875rem;color:#f0c040;">${pendingCount}</span>` : ''}
            </a>
            <a href="admin-mobile-reports.html" class="m-quick-action">
                <div style="width:36px;height:36px;border-radius:8px;background:rgba(255,77,106,0.12);display:flex;align-items:center;justify-content:center;color:#ff4d6a;flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.875rem;color:#fff;">Open Reports</div><div style="font-size:0.6875rem;color:rgba(255,255,255,0.4);">${openReports} need attention</div></div>
                ${openReports > 0 ? `<span style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:0.875rem;color:#ff4d6a;">${openReports}</span>` : ''}
            </a>
            <a href="admin-mobile-chats.html" class="m-quick-action">
                <div style="width:36px;height:36px;border-radius:8px;background:rgba(0,212,170,0.12);display:flex;align-items:center;justify-content:center;color:#00d4aa;flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.875rem;color:#fff;">Conversations</div><div style="font-size:0.6875rem;color:rgba(255,255,255,0.4);">${convos.length} active</div></div>
            </a>
            <a href="admin-mobile-users.html" class="m-quick-action">
                <div style="width:36px;height:36px;border-radius:8px;background:rgba(240,192,64,0.12);display:flex;align-items:center;justify-content:center;color:#f0c040;flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>
                </div>
                <div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.875rem;color:#fff;">Manage Users</div><div style="font-size:0.6875rem;color:rgba(255,255,255,0.4);">${stats.total_users} registered</div></div>
            </a>
        </div>
    </div>

    <!-- Trade Volume -->
    <div class="m-section" style="margin-bottom:12px;">
        <div class="m-section-header"><h3 class="m-section-title">Trade Volume (7d)</h3></div>
        <div style="padding:12px 16px;">
            <div style="display:flex;align-items:flex-end;gap:6px;height:80px;margin-bottom:8px;">
                ${volume.daily.map(d => {
                    const maxCount = Math.max(...volume.daily.map(dd => dd.count), 1);
                    const height = Math.max((d.count / maxCount) * 100, 4);
                    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;"><div style="width:100%;border-radius:4px 4px 2px 2px;background:${d.count > 0 ? '#00d4aa' : 'rgba(255,255,255,0.06)'};height:${height}%;position:relative;min-height:4px;">${d.count > 0 ? `<span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:0.5rem;font-weight:700;color:#fff;">${d.count}</span>` : ''}</div><div style="font-size:0.4375rem;color:rgba(255,255,255,0.3);margin-top:4px;">${d.label}</div></div>`;
                }).join('')}
            </div>
            <div style="display:flex;justify-content:space-around;padding-top:8px;border-top:1px solid rgba(255,255,255,0.04);">
                <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.125rem;color:#fff;">${volume.total}</div><div style="font-size:0.4375rem;color:rgba(255,255,255,0.3);text-transform:uppercase;">Total</div></div>
                <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.125rem;color:#fff;">${volume.avg}</div><div style="font-size:0.4375rem;color:rgba(255,255,255,0.3);text-transform:uppercase;">Avg</div></div>
                <div style="text-align:center;"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.125rem;color:${volume.trend >= 0 ? '#00d4aa' : '#ff4d6a'};">${volume.trend >= 0 ? '+' : ''}${volume.trend}%</div><div style="font-size:0.4375rem;color:rgba(255,255,255,0.3);text-transform:uppercase;">Trend</div></div>
            </div>
        </div>
    </div>

    <div class="m-section">
        <div class="m-section-header"><h3 class="m-section-title">Recent Activity</h3></div>
        <div id="activityFeed"></div>
    </div>`;

    document.getElementById('app').innerHTML = buildMobilePage('overview', content);
    initMoreSheet();

    getActivityLog(10).then(activities => {
        const feed = document.getElementById('activityFeed');
        if (feed) {
            let h = '';
            for (const a of activities) h += formatMobileActivity(a);
            if (activities.length === 0) h = '<div class="m-empty">No activity yet</div>';
            feed.innerHTML = h;
        }
    });
})();
