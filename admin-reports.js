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

    const reports = await getAllReports();
    const openCount = reports.filter(r => r.status === 'open').length;
    const reportCount = reports.filter(r => r.report_type === 'report').length;
    const feedbackCount = reports.filter(r => r.report_type === 'feedback').length;

    let content = '<div class="admin-header"><h1>Reports &amp; Feedback</h1><p>' + reports.length + ' total &middot; ' + openCount + ' open</p></div>';

    content += '<div class="stats-grid-4" style="margin-bottom:20px;">';
    content += '<div class="stat-card"><div class="stat-icon" style="background:rgba(255,77,106,0.12);color:var(--red);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="stat-info"><div class="stat-value" style="color:var(--red);">' + reportCount + '</div><div class="stat-label">Reports</div></div></div>';
    content += '<div class="stat-card"><div class="stat-icon" style="background:rgba(0,212,170,0.12);color:var(--teal);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></div><div class="stat-info"><div class="stat-value" style="color:var(--teal);">' + feedbackCount + '</div><div class="stat-label">Feedback</div></div></div>';
    content += '<div class="stat-card"><div class="stat-icon" style="background:rgba(240,192,64,0.12);color:var(--gold);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><div class="stat-value" style="color:var(--gold);">' + openCount + '</div><div class="stat-label">Open</div></div></div>';
    content += '<div class="stat-card"><div class="stat-icon" style="background:rgba(0,212,170,0.12);color:var(--teal);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="stat-info"><div class="stat-value" style="color:var(--teal);">' + (reports.length - openCount) + '</div><div class="stat-label">Resolved</div></div></div>';
    content += '</div>';

    content += '<div class="panel" id="reportsPanel"><div class="panel-toolbar"><div class="filter-pills">';
    content += '<button class="filter-pill active" data-filter-report="all">All</button>';
    content += '<button class="filter-pill" data-filter-report="report">Reports</button>';
    content += '<button class="filter-pill" data-filter-report="feedback">Feedback</button>';
    content += '<button class="filter-pill" data-filter-report="open">Open</button>';
    content += '</div></div><div class="reports-list">';

    if (reports.length === 0) {
        content += '<div class="empty-state"><p>No reports or feedback yet</p></div>';
    } else {
        for (var i = 0; i < reports.length; i++) {
            var r = reports[i];
            var typeIcon = r.report_type === 'report'
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>';

            var statusClass = r.status === 'open' ? 'status-pending' : (r.status === 'reviewed' ? 'status-accepted' : 'status-completed');

            content += '<div class="report-item" data-report-type="' + r.report_type + '" data-report-status="' + r.status + '">';
            content += '<div class="report-item-header"><div class="report-item-user"><div class="report-item-avatar">' + r.username.charAt(0).toUpperCase() + '</div><div class="report-item-user-info"><div class="report-item-name">' + r.username + '</div><div class="report-item-time">' + timeAgo(r.created_at) + '</div></div></div>';
            content += '<div style="display:flex;align-items:center;gap:8px;"><span class="report-item-type-icon">' + typeIcon + '</span><span class="report-item-type-label">' + r.report_type + '</span><span class="status-badge ' + statusClass + '">' + r.status + '</span></div></div>';
            content += '<div class="report-item-body">';
            content += '<div class="report-section report-section-centered"><span class="report-section-label">Subject</span><div class="report-section-value report-subject-text">' + r.subject + '</div></div>';
            content += '<div class="report-section"><span class="report-section-label">Details</span><div class="report-section-value report-section-body">' + r.content + '</div></div>';
            if (r.admin_response) {
                content += '<div class="report-item-admin-response"><strong>Admin Response:</strong> ' + r.admin_response + '</div>';
            }
            if (r.status === 'open') {
                content += '<div class="report-item-actions"><button class="btn btn-teal btn-sm resolve-btn" data-report-id="' + r.id + '">Mark Resolved</button></div>';
            } else {
                content += '<div class="report-item-actions"><span class="status-badge status-completed">Resolved</span></div>';
            }
            content += '</div></div>';
        }
    }

    content += '</div></div>';
    document.getElementById('app').innerHTML = buildPage('reports', content);

    // Event delegation for resolve buttons
    document.getElementById('reportsPanel').addEventListener('click', function(e) {
        var btn = e.target.closest('.resolve-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var reportId = parseInt(btn.getAttribute('data-report-id'));
        console.log('Resolving report ID:', reportId);
        updateReportStatus(reportId, 'resolved').then(function(success) {
            if (success) {
                showToast('Marked as resolved', 'success');
                // Update UI immediately without reload
                var item = btn.closest('.report-item');
                if (item) {
                    item.setAttribute('data-report-status', 'resolved');
                    var actionsDiv = btn.closest('.report-item-actions');
                    if (actionsDiv) {
                        actionsDiv.innerHTML = '<span class="status-badge status-completed">Resolved</span>';
                    }
                    // Update status badge in header
                    var badge = item.querySelector('.report-item-header .status-badge');
                    if (badge) {
                        badge.textContent = 'resolved';
                        badge.className = 'status-badge status-completed';
                    }
                }
            } else {
                showToast('Failed to resolve report', 'error');
            }
        }).catch(function(err) {
            console.error('Resolve failed:', err);
            showToast('Failed to resolve report', 'error');
        });
    });

    // Filter pills
    document.querySelectorAll('[data-filter-report]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-filter-report]').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var filter = btn.dataset.filterReport;
            document.querySelectorAll('.report-item').forEach(function(el) {
                if (filter === 'all') { el.style.display = ''; return; }
                if (filter === 'report' || filter === 'feedback') {
                    el.style.display = el.dataset.reportType === filter ? '' : 'none';
                } else if (filter === 'open') {
                    el.style.display = el.dataset.reportStatus === 'open' ? '' : 'none';
                }
            });
        });
    });
})();
