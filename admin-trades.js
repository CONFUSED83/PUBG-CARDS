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

    let allTrades = [];
    if (sb) {
        const { data } = await sb.from('trades').select('*').order('created_at', { ascending: false });
        allTrades = data || [];
    }
    const history = await getTradeHistory();
    const pendingCount = allTrades.filter(t => t.status === 'pending').length;
    const acceptedCount = allTrades.filter(t => t.status === 'accepted').length;

    let content = `
    <div class="admin-header">
        <h1>Trade Monitor</h1>
        <p>${allTrades.length} total · ${pendingCount} pending · ${acceptedCount} accepted</p>
    </div>

    <div class="trade-status-bar">
        <div class="trade-status-chip"><div class="num" style="color:var(--gold);">${pendingCount}</div><div class="lbl">Pending</div></div>
        <div class="trade-status-chip"><div class="num" style="color:#e8a840;">${acceptedCount}</div><div class="lbl">Accepted</div></div>
        <div class="trade-status-chip"><div class="num" style="color:var(--teal);">${allTrades.filter(t=>t.status==='completed').length}</div><div class="lbl">Completed</div></div>
        <div class="trade-status-chip"><div class="num" style="color:var(--red);">${allTrades.filter(t=>t.status==='rejected').length}</div><div class="lbl">Rejected</div></div>
    </div>

    <div class="panel">
        <div class="panel-toolbar">
            <div class="filter-pills">
                <button class="filter-pill active" data-filter-trade="all">All</button>
                <button class="filter-pill" data-filter-trade="pending">Pending</button>
                <button class="filter-pill" data-filter-trade="accepted">Accepted</button>
                <button class="filter-pill" data-filter-trade="completed">Completed</button>
                <button class="filter-pill" data-filter-trade="rejected">Rejected</button>
            </div>
        </div>
        <div id="tradesList">`;

    for (const t of allTrades) {
        content += renderTradeCard(t);
    }

    content += '</div></div>';

    if (history.length > 0) {
        content += `
        <div class="panel" style="margin-top:16px;">
            <h3 class="panel-title">Trade History</h3>
            <div class="table-responsive">
                <table class="data-table">
                    <thead><tr><th>From</th><th>To</th><th>Gave</th><th>Got</th><th>Date</th></tr></thead>
                    <tbody>
                        ${history.map(h => `<tr>
                            <td style="font-weight:600;">${h.requester}</td>
                            <td style="font-weight:600;">${h.receiver}</td>
                            <td style="font-size:0.8125rem;">${h.requester_card}</td>
                            <td style="font-size:0.8125rem;">${h.receiver_card}</td>
                            <td style="font-size:0.75rem;color:var(--text-dim);">${timeAgo(h.completed_at)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    document.getElementById('app').innerHTML = buildPage('trades', content);

    document.querySelectorAll('[data-filter-trade]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter-trade]').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const status = btn.dataset.filterTrade;
            document.querySelectorAll('.trade-card').forEach(card => {
                card.style.display = (status === 'all' || card.dataset.status === status) ? '' : 'none';
            });
        });
    });

    bindTradeActions();

    setInterval(async () => {
        const { data } = await sb.from('trades').select('*').order('created_at', { ascending: false });
        if (!data) return;
        const list = document.getElementById('tradesList');
        if (!list) return;
        let h = '';
        for (const t of data) h += renderTradeCard(t);
        list.innerHTML = h;
        bindTradeActions();
    }, 15000);

    function renderTradeCard(t) {
        const reqCard = getCardById(t.requester_card_id);
        const recCard = getCardById(t.receiver_card_id);
        const reqImg = reqCard ? getCardImageUrl(reqCard) : null;
        const recImg = recCard ? getCardImageUrl(recCard) : null;
        const canAct = t.status === 'pending' || t.status === 'accepted';

        return `
        <div class="trade-card" data-status="${t.status}">
            <div class="trade-card-body">
                <div class="trade-offer-side">
                    <div class="trade-offer-name">${t.requester}</div>
                    <div class="trade-offer-role">Initiator — Offers</div>
                    <div class="trade-offer-card card-${reqCard ? reqCard.type.toLowerCase() : 'basic'}">
                        ${reqImg ? `<img src="${reqImg}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="trade-offer-card-fallback" style="display:none;">${reqCard ? reqCard.card_name : t.requester_card_id}</div>` : `<div class="trade-offer-card-fallback">${reqCard ? reqCard.card_name : t.requester_card_id}</div>`}
                    </div>
                    <div class="trade-offer-card-name">${reqCard ? reqCard.card_name : t.requester_card_id}</div>
                </div>
                <div class="trade-exchange-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
                        <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
                    </svg>
                </div>
                <div class="trade-offer-side">
                    <div class="trade-offer-name">${t.receiver}</div>
                    <div class="trade-offer-role">Receiver — Offers</div>
                    <div class="trade-offer-card card-${recCard ? recCard.type.toLowerCase() : 'basic'}">
                        ${recImg ? `<img src="${recImg}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="trade-offer-card-fallback" style="display:none;">${recCard ? recCard.card_name : t.receiver_card_id}</div>` : `<div class="trade-offer-card-fallback">${recCard ? recCard.card_name : t.receiver_card_id}</div>`}
                    </div>
                    <div class="trade-offer-card-name">${recCard ? recCard.card_name : t.receiver_card_id}</div>
                </div>
            </div>
            <div class="trade-card-footer">
                <div class="trade-card-footer-left">
                    ${canAct ? `
                    <button class="btn btn-sm btn-teal-outline" data-force-complete="${t.trade_id}">Complete</button>
                    <button class="btn btn-sm btn-danger-outline" data-force-reject="${t.trade_id}">Reject</button>
                    ` : '<span style="font-size:0.625rem;color:var(--text-dim);">Finalized</span>'}
                </div>
                <div class="trade-card-footer-right">
                    <span class="status-badge status-${t.status}">${t.status}</span>
                    <span class="trade-time">${timeAgo(t.created_at)}</span>
                </div>
            </div>
        </div>`;
    }

    function bindTradeActions() {
        document.querySelectorAll('[data-force-complete]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Force complete this trade?')) {
                    await adminCompleteTrade(btn.dataset.forceComplete);
                    showToast('Trade completed', 'success');
                    window.location.reload();
                }
            });
        });
        document.querySelectorAll('[data-force-reject]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Force reject this trade?')) {
                    await adminRejectTrade(btn.dataset.forceReject, 'Admin rejected');
                    showToast('Trade rejected', 'success');
                    window.location.reload();
                }
            });
        });
    }
})();
