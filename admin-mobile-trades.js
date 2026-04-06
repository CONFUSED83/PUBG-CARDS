(async function() {
    try {
        while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
        await initApp();
    } catch(e) { console.error('Init failed:', e); return; }

    const user = requireAuth();
    if (!user || !user.is_admin) { alert('Admin access required'); window.location.href = './login.html'; return; }

    let allTrades = [];
    if (sb) { const { data } = await sb.from('trades').select('*').order('created_at', { ascending: false }); allTrades = data || []; }

    let content = `
    <div class="m-page-header">
        <h1 class="m-page-title">Trades</h1>
        <p class="m-page-sub">${allTrades.length} total</p>
    </div>
    <div class="m-filters">
        <button class="m-filter-pill active" data-filter="all">All</button>
        <button class="m-filter-pill" data-filter="pending">Pending</button>
        <button class="m-filter-pill" data-filter="accepted">Accepted</button>
        <button class="m-filter-pill" data-filter="completed">Done</button>
        <button class="m-filter-pill" data-filter="rejected">Rejected</button>
    </div>
    <div class="m-section" id="tradesList">`;

    for (const t of allTrades) content += renderTradeCard(t);
    content += '</div>';

    document.getElementById('app').innerHTML = buildMobilePage('trades', content);
    initMoreSheet();

    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter]').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const s = btn.dataset.filter;
            document.querySelectorAll('.m-trade-card').forEach(c => { c.style.display = (s === 'all' || c.dataset.status === s) ? '' : 'none'; });
        });
    });

    document.querySelectorAll('[data-complete]').forEach(btn => {
        btn.addEventListener('click', async () => { if (confirm('Complete?')) { await adminCompleteTrade(btn.dataset.complete); showToast('Done', 'success'); window.location.reload(); } });
    });
    document.querySelectorAll('[data-reject]').forEach(btn => {
        btn.addEventListener('click', async () => { if (confirm('Reject?')) { await adminRejectTrade(btn.dataset.reject, 'Admin rejected'); showToast('Rejected', 'success'); window.location.reload(); } });
    });

    function renderTradeCard(t) {
        const reqCard = getCardById(t.requester_card_id);
        const recCard = getCardById(t.receiver_card_id);
        const reqImg = reqCard ? getCardImageUrl(reqCard) : null;
        const recImg = recCard ? getCardImageUrl(recCard) : null;
        const canAct = t.status === 'pending' || t.status === 'accepted';

        return `
        <div class="m-trade-card" data-status="${t.status}">
            <div class="m-trade-top">
                <div class="m-trade-users">${t.requester} <span class="m-trade-arrow">→</span> ${t.receiver}</div>
                <span class="m-trade-status ${t.status}">${t.status}</span>
            </div>
            <div class="m-trade-body m-trade-body-mobile">
                <div class="m-trade-side">
                    <div class="m-trade-side-name">${t.requester}</div>
                    <div class="m-trade-side-label give">Offers</div>
                    <div class="m-trade-img card-${reqCard ? reqCard.type.toLowerCase() : 'basic'}">
                        ${reqImg ? `<img src="${reqImg}" onerror="this.style.display='none'">` : ''}
                    </div>
                    <div class="m-trade-card-name">${reqCard ? reqCard.card_name : t.requester_card_id}</div>
                </div>
                <svg class="m-trade-exchange" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                <div class="m-trade-side">
                    <div class="m-trade-side-name">${t.receiver}</div>
                    <div class="m-trade-side-label get">Offers</div>
                    <div class="m-trade-img card-${recCard ? recCard.type.toLowerCase() : 'basic'}">
                        ${recImg ? `<img src="${recImg}" onerror="this.style.display='none'">` : ''}
                    </div>
                    <div class="m-trade-card-name">${recCard ? recCard.card_name : t.receiver_card_id}</div>
                </div>
            </div>
            <div class="m-trade-footer">
                <span class="m-trade-time">${timeAgo(t.created_at)}</span>
                ${canAct ? `<div class="m-trade-actions"><button class="m-btn m-btn-teal" style="padding:6px 12px;font-size:0.6875rem;" data-complete="${t.trade_id}">Complete</button><button class="m-btn m-btn-danger" style="padding:6px 12px;font-size:0.6875rem;" data-reject="${t.trade_id}">Reject</button></div>` : ''}
            </div>
        </div>`;
    }
})();
