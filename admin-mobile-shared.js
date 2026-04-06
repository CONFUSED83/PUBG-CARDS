/* ============ ADMIN MOBILE SHARED ============ */

function getFavColor(fav) {
    if (fav >= 150) return '#00d4aa';
    if (fav >= 100) return '#f0c040';
    if (fav >= 50) return '#e8a840';
    return '#ff4d6a';
}

function getFavLabel(fav) {
    if (fav >= 150) return 'Elite';
    if (fav >= 100) return 'Trusted';
    if (fav >= 50) return 'Standard';
    return 'Risky';
}

function renderMobileNav(activePage) {
    const pages = [
        { id: 'overview', label: 'Home', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
        { id: 'users', label: 'Users', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
        { id: 'trades', label: 'Trades', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' },
        { id: 'chats', label: 'Chats', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
        { id: 'more', label: 'More', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>' }
    ];

    function pageHref(id) {
        if (id === 'more') return 'javascript:void(0)';
        return id === 'overview' ? 'admin-mobile.html' : 'admin-mobile-' + id + '.html';
    }

    let html = '<div class="m-bottomnav"><div class="m-bottomnav-inner">';
    for (const p of pages) {
        const cls = p.id === activePage ? 'active' : '';
        if (p.id === 'more') {
            html += `<button class="m-nav-item ${cls}" id="moreBtn">${p.icon}<span>${p.label}</span></button>`;
        } else {
            html += `<a class="m-nav-item ${cls}" href="${pageHref(p.id)}">${p.icon}<span>${p.label}</span></a>`;
        }
    }
    html += '</div></div>';
    return html;
}

function renderMoreSheet() {
    const items = [
        { href: 'admin-mobile-cards.html', label: 'Cards', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
        { href: 'admin-mobile-reports.html', label: 'Reports', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
        { href: 'admin-mobile-activity.html', label: 'Activity', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
        { href: 'admin-mobile-settings.html', label: 'Settings', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' }
    ];

    return `
    <div class="m-more-overlay" id="moreOverlay"></div>
    <div class="m-more-sheet" id="moreSheet">
        <div class="m-more-handle"></div>
        <div class="m-more-title">More Options</div>
        <div class="m-more-grid">
            ${items.map(i => `<a class="m-more-item" href="${i.href}">${i.icon}<span>${i.label}</span></a>`).join('')}
        </div>
    </div>`;
}

function buildMobilePage(activePage, contentHtml) {
    return `
    <div class="m-content">${contentHtml}</div>
    ${renderMobileNav(activePage)}
    ${renderMoreSheet()}`;
}

function initMoreSheet() {
    const btn = document.getElementById('moreBtn');
    const overlay = document.getElementById('moreOverlay');
    const sheet = document.getElementById('moreSheet');
    if (!btn || !overlay || !sheet) return;

    btn.addEventListener('click', () => {
        overlay.classList.add('active');
        sheet.classList.add('active');
    });

    overlay.addEventListener('click', () => {
        overlay.classList.remove('active');
        sheet.classList.remove('active');
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatMobileActivity(a) {
    const time = timeAgo(a.created_at);
    const colors = {
        login: '#00d4aa', register: '#f0c040', trade_sent: '#f0c040', trade_status: '#00d4aa',
        cards_updated: 'rgba(255,255,255,0.4)', message_sent: 'rgba(255,255,255,0.4)',
        report_sent: '#ff4d6a', feedback_sent: '#00d4aa', trade_completed: '#00d4aa',
        user_banned: '#ff4d6a', user_unbanned: '#00d4aa', user_deleted: '#ff4d6a',
        favorability_updated: '#f0c040', chat_deleted: '#ff4d6a', card_search: '#f0c040'
    };
    const icons = {
        login: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
        register: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
        trade_sent: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>',
        trade_status: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        cards_updated: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
        message_sent: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        report_sent: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        feedback_sent: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>',
        trade_completed: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        user_banned: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
        user_unbanned: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        user_deleted: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        favorability_updated: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        chat_deleted: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        card_search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    };

    const color = colors[a.activity_type] || 'rgba(255,255,255,0.4)';
    const iconSvg = (icons[a.activity_type] || icons.login).replace('COLOR', color);

    let userHtml = '', actionHtml = '';
    const d = a.details;

    if (a.activity_type === 'login') { const m = d.match(/(\w+) logged in/); userHtml = m ? m[1] : ''; actionHtml = 'Logged in'; }
    else if (a.activity_type === 'register') { const m = d.match(/(\w+) created account/); userHtml = m ? m[1] : ''; actionHtml = 'Created account'; }
    else if (a.activity_type === 'trade_sent') { const m = d.match(/(\w+) sent trade to (\w+)/); userHtml = m ? m[1] : ''; actionHtml = m ? `Sent trade to ${m[2]}` : 'Sent trade'; }
    else if (a.activity_type === 'trade_status') { const m = d.match(/(\S+) → (\w+)/); userHtml = m ? m[1] : ''; actionHtml = m ? `Trade ${m[2]}` : 'Trade changed'; }
    else if (a.activity_type === 'trade_completed') { const m = d.match(/(\w+)/); userHtml = m ? m[1] : ''; actionHtml = 'Completed trade'; }
    else if (a.activity_type === 'cards_updated') { const m = d.match(/(\w+) updated/); userHtml = m ? m[1] : ''; actionHtml = 'Updated cards'; }
    else if (a.activity_type === 'message_sent') { const m = d.match(/(\w+) messaged (\w+)/); userHtml = m ? m[1] : ''; actionHtml = m ? `Messaged ${m[2]}` : 'Sent message'; }
    else if (a.activity_type === 'card_search') { const m = d.match(/(\w+) searched for (.+)/); userHtml = m ? m[1] : ''; actionHtml = m ? `Searched: ${m[2]}` : 'Searched card'; }
    else if (a.activity_type === 'user_banned') { const m = d.match(/banned (\w+)/); userHtml = 'Admin'; actionHtml = m ? `Banned ${m[1]}` : 'Banned user'; }
    else if (a.activity_type === 'user_unbanned') { const m = d.match(/unbanned (\w+)/); userHtml = 'Admin'; actionHtml = m ? `Unbanned ${m[1]}` : 'Unbanned user'; }
    else if (a.activity_type === 'user_deleted') { const m = d.match(/deleted (\w+)/); userHtml = 'Admin'; actionHtml = m ? `Deleted ${m[1]}` : 'Deleted user'; }
    else if (a.activity_type === 'favorability_updated') { const m = d.match(/set (\w+) favorability to (\d+)/); userHtml = 'Admin'; actionHtml = m ? `${m[1]} → ${m[2]}` : 'Updated favorability'; }
    else if (a.activity_type === 'chat_deleted') { userHtml = 'Admin'; actionHtml = 'Deleted chat'; }
    else if (a.activity_type === 'report_sent') { const m = d.match(/(\w+)/); userHtml = m ? m[1] : ''; actionHtml = 'Submitted report'; }
    else if (a.activity_type === 'feedback_sent') { const m = d.match(/(\w+)/); userHtml = m ? m[1] : ''; actionHtml = 'Submitted feedback'; }
    else { const m = d.match(/^(\w+)/); userHtml = m ? m[1] : ''; actionHtml = d.substring(userHtml.length).trim(); }

    return `
    <div class="m-activity-item" data-activity-type="${a.activity_type}">
        <div class="m-activity-icon">${iconSvg}</div>
        <div class="m-activity-info">
            <div class="m-activity-user">${userHtml}</div>
            <div class="m-activity-action">${actionHtml}</div>
        </div>
        <div class="m-activity-time">${time}</div>
    </div>`;
}
