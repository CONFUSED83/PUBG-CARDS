(async function() {
    try {
        while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
        await initApp();
    } catch(e) { console.error('Init failed:', e); return; }

    const user = requireAuth();
    if (!user || !user.is_admin) { alert('Admin access required'); window.location.href = './login.html'; return; }

    const reports = await getAllReports();
    const openCount = reports.filter(r => r.status === 'open').length;

    let content = '<div class="m-page-header"><h1 class="m-page-title">Reports</h1><p class="m-page-sub">' + reports.length + ' total &middot; ' + openCount + ' open</p></div>';
    content += '<div class="m-filters">';
    content += '<button class="m-filter-pill active" data-filter="all">All</button>';
    content += '<button class="m-filter-pill" data-filter="report">Reports</button>';
    content += '<button class="m-filter-pill" data-filter="feedback">Feedback</button>';
    content += '<button class="m-filter-pill" data-filter="open">Open</button>';
    content += '</div>';
    content += '<div id="reportsList">';

    if (reports.length === 0) {
        content += '<div class="m-empty">No reports</div>';
    } else {
        for (var i = 0; i < reports.length; i++) {
            var r = reports[i];
            var typeColor = r.report_type === 'report' ? '#ff4d6a' : '#00d4aa';
            var statusLabel = r.status === 'open' ? 'pending' : 'completed';

            content += '<div class="m-report-item" data-report-type="' + r.report_type + '" data-report-status="' + r.status + '" data-report-id="' + r.id + '" style="border-left:3px solid ' + typeColor + ';">';
            content += '<div class="m-report-header">';
            content += '<div class="m-report-avatar">' + r.username.charAt(0).toUpperCase() + '</div>';
            content += '<div style="flex:1;min-width:0;"><div class="m-report-user">' + r.username + '</div><div class="m-report-time">' + timeAgo(r.created_at) + '</div></div>';
            content += '<span class="m-trade-status ' + statusLabel + '">' + r.status + '</span>';
            content += '</div>';
            content += '<div class="m-report-body">';
            content += '<div style="font-size:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:' + typeColor + ';margin-bottom:10px;">' + r.report_type + '</div>';
            content += '<div class="m-report-section m-report-section-centered"><span class="m-report-section-label">Subject</span><div class="m-report-section-value m-report-subject-text">' + r.subject + '</div></div>';
            content += '<div class="m-report-section"><span class="m-report-section-label">Details</span><div class="m-report-section-body">' + r.content + '</div></div>';
            if (r.admin_response) {
                content += '<div style="padding:8px 10px;background:rgba(0,212,170,0.06);border-radius:8px;font-size:0.6875rem;color:#00d4aa;margin-top:6px;"><strong>Admin Response:</strong> ' + r.admin_response + '</div>';
            }
            if (r.status === 'open') {
                content += '<div class="m-report-actions"><button class="m-btn m-btn-teal resolve-btn" data-report-id="' + r.id + '">Mark Resolved</button></div>';
            } else {
                content += '<div class="m-report-actions"><span class="m-trade-status completed">Resolved</span></div>';
            }
            content += '</div></div>';
        }
    }
    content += '</div>';

    document.getElementById('app').innerHTML = buildMobilePage('reports', content);
    initMoreSheet();

    // Event delegation for resolve buttons
    document.getElementById('reportsList').addEventListener('click', function(e) {
        var btn = e.target.closest('.resolve-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var reportId = parseInt(btn.getAttribute('data-report-id'));
        console.log('Mobile: Resolving report ID:', reportId);
        updateReportStatus(reportId, 'resolved').then(function(success) {
            if (success) {
                showToast('Resolved', 'success');
                var item = btn.closest('.m-report-item');
                if (item) {
                    item.setAttribute('data-report-status', 'resolved');
                    var actionsDiv = btn.closest('.m-report-actions');
                    if (actionsDiv) {
                        actionsDiv.innerHTML = '<span class="m-trade-status completed">Resolved</span>';
                    }
                    var badge = item.querySelector('.m-report-header .m-trade-status');
                    if (badge) {
                        badge.textContent = 'resolved';
                        badge.className = 'm-trade-status completed';
                    }
                }
            } else {
                showToast('Failed to resolve', 'error');
            }
        }).catch(function(err) {
            console.error('Mobile: Resolve failed:', err);
            showToast('Failed to resolve', 'error');
        });
    });

    // Filter pills
    document.querySelectorAll('[data-filter]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-filter]').forEach(function(p) { p.classList.remove('active'); });
            btn.classList.add('active');
            var f = btn.dataset.filter;
            document.querySelectorAll('.m-report-item').forEach(function(el) {
                if (f === 'all') { el.style.display = ''; return; }
                if (f === 'report' || f === 'feedback') {
                    el.style.display = el.dataset.reportType === f ? '' : 'none';
                } else if (f === 'open') {
                    el.style.display = el.dataset.reportStatus === 'open' ? '' : 'none';
                }
            });
        });
    });
})();
