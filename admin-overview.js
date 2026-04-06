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
    if (!user || !user.is_admin) {
        alert('Admin access required');
        window.location.href = './login.html';
        return;
    }

    const [stats, volume, reports, convos] = await Promise.all([
        adminGetStats(),
        getTradeVolumeStats(),
        getAllReports(),
        adminGetAllConversations()
    ]);

    const pendingCount = stats.trades_pending || 0;
    const openReports = reports.filter(r => r.status === 'open').length;

    let content = `
    <div class="admin-header">
        <h1>Dashboard Overview</h1>
        <p>Platform statistics at a glance</p>
    </div>

    <div class="stats-grid-4">
        <div class="stat-card">
            <div class="stat-icon" style="background:rgba(0,212,170,0.12);color:var(--teal);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.total_users}</div>
                <div class="stat-label">Total Users</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:rgba(240,192,64,0.12);color:var(--gold);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.total_cards}</div>
                <div class="stat-label">Active Cards</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:rgba(0,212,170,0.12);color:var(--teal);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.total_trades}</div>
                <div class="stat-label">Total Trades</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:${stats.success_rate >= 50 ? 'rgba(0,212,170,0.12)' : 'rgba(255,77,106,0.12)'};color:${stats.success_rate >= 50 ? 'var(--teal)' : 'var(--red)'};">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.success_rate}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
        </div>
    </div>

    <!-- Quick Actions -->
    <div class="panel" style="margin-bottom:16px;">
        <h3 class="panel-title">Quick Actions</h3>
        <div class="quick-actions-grid">
            <a href="admin-trades.html" class="quick-action-card" style="${pendingCount > 0 ? 'border-color:rgba(240,192,64,0.3);background:rgba(240,192,64,0.04);' : ''}">
                <div class="quick-action-icon" style="background:rgba(240,192,64,0.12);color:var(--gold);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div class="quick-action-info">
                    <div class="quick-action-label">Pending Trades</div>
                    <div class="quick-action-count">${pendingCount} awaiting response</div>
                </div>
                ${pendingCount > 0 ? `<span class="quick-action-badge">${pendingCount}</span>` : ''}
            </a>
            <a href="admin-reports.html" class="quick-action-card" style="${openReports > 0 ? 'border-color:rgba(255,77,106,0.3);background:rgba(255,77,106,0.04);' : ''}">
                <div class="quick-action-icon" style="background:rgba(255,77,106,0.12);color:var(--red);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div class="quick-action-info">
                    <div class="quick-action-label">Open Reports</div>
                    <div class="quick-action-count">${openReports} need attention</div>
                </div>
                ${openReports > 0 ? `<span class="quick-action-badge" style="background:rgba(255,77,106,0.15);color:var(--red);">${openReports}</span>` : ''}
            </a>
            <a href="admin-chats.html" class="quick-action-card">
                <div class="quick-action-icon" style="background:rgba(0,212,170,0.12);color:var(--teal);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div class="quick-action-info">
                    <div class="quick-action-label">Conversations</div>
                    <div class="quick-action-count">${convos.length} active chats</div>
                </div>
            </a>
            <a href="admin-users.html" class="quick-action-card">
                <div class="quick-action-icon" style="background:rgba(240,192,64,0.12);color:var(--gold);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </div>
                <div class="quick-action-info">
                    <div class="quick-action-label">Manage Users</div>
                    <div class="quick-action-count">${stats.total_users} registered</div>
                </div>
            </a>
        </div>
    </div>

    <!-- Trade Status -->
    <div class="panel" style="margin-bottom:16px;">
        <h3 class="panel-title">Trade Status</h3>
        <div class="trade-status-table">
            <div class="trade-status-row-item">
                <div class="trade-status-dot" style="background:var(--gold);"></div>
                <span class="trade-status-label-text">Pending</span>
                <span class="trade-status-value" style="color:var(--gold);">${stats.trades_pending}</span>
            </div>
            <div class="trade-status-row-item">
                <div class="trade-status-dot" style="background:var(--teal);"></div>
                <span class="trade-status-label-text">Completed</span>
                <span class="trade-status-value" style="color:var(--teal);">${stats.trades_completed}</span>
            </div>
            <div class="trade-status-row-item">
                <div class="trade-status-dot" style="background:var(--red);"></div>
                <span class="trade-status-label-text">Rejected</span>
                <span class="trade-status-value" style="color:var(--red);">${stats.trades_rejected}</span>
            </div>
            <div class="trade-status-divider-row"></div>
            <div class="trade-status-row-item">
                <span class="trade-status-label-text" style="color:var(--text-dim);">Success Rate</span>
                <span class="trade-status-value" style="color:${stats.success_rate >= 50 ? 'var(--teal)' : 'var(--red)'};">${stats.success_rate}%</span>
            </div>
        </div>
    </div>

    <!-- Trade Volume Chart -->
    <div class="panel" style="margin-bottom:16px;">
        <h3 class="panel-title">Trade Volume</h3>
        <div class="trade-chart">
            <div class="trade-chart-bars">
                ${volume.daily.map(d => {
                    const maxCount = Math.max(...volume.daily.map(dd => dd.count), 1);
                    const height = Math.max((d.count / maxCount) * 100, 4);
                    return `
                    <div class="trade-chart-bar">
                        <div class="trade-chart-bar-fill" style="height:${height}%;background:${d.count > 0 ? 'rgba(0,212,170,0.6)' : 'rgba(255,255,255,0.04)'};">
                            ${d.count > 0 ? `<span class="trade-chart-bar-value">${d.count}</span>` : ''}
                        </div>
                        <div class="trade-chart-bar-label">${d.label}</div>
                    </div>`;
                }).join('')}
            </div>
            <div class="trade-chart-stats">
                <div class="trade-chart-stat">
                    <div class="trade-chart-stat-val">${volume.total}</div>
                    <div class="trade-chart-stat-lbl">Total (7d)</div>
                </div>
                <div class="trade-chart-stat">
                    <div class="trade-chart-stat-val">${volume.avg}</div>
                    <div class="trade-chart-stat-lbl">Daily Avg</div>
                </div>
                <div class="trade-chart-stat">
                    <div class="trade-chart-stat-val" style="color:${volume.trend >= 0 ? 'var(--teal)' : 'var(--red)'};">${volume.trend >= 0 ? '+' : ''}${volume.trend}%</div>
                    <div class="trade-chart-stat-lbl">Trend</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Activity -->
    <div class="panel">
        <h3 class="panel-title">Recent Activity</h3>
        <div id="activityFeed"></div>
    </div>`;

    document.getElementById('app').innerHTML = buildPage('overview', content);

    getActivityLog(20).then(activities => {
        const feed = document.getElementById('activityFeed');
        if (feed) {
            let h = '';
            for (const a of activities) h += formatActivityRich(a);
            if (activities.length === 0) h = '<div class="empty-state"><p>No activity yet</p></div>';
            feed.innerHTML = h;
        }
    });
})();
