(async function() {
    try {
        while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
        await initApp();
    } catch(e) { console.error('Init failed:', e); return; }

    const user = requireAuth();
    if (!user || !user.is_admin) { alert('Admin access required'); window.location.href = './login.html'; return; }

    const params = new URLSearchParams(window.location.search);
    const viewUser = params.get('user');

    if (viewUser) await renderUserCards(viewUser);
    else await renderAllCards();

    async function renderAllCards() {
        const allCards = getAllCards().filter(c => c.is_active);
        let content = `
        <div class="m-page-header">
            <h1 class="m-page-title">Cards</h1>
            <p class="m-page-sub">${allCards.length} active cards</p>
        </div>`;

        for (const cat of CARD_CATEGORIES) {
            const catCards = sortCardsByOrder(allCards.filter(c => c.category === cat.id));
            if (catCards.length === 0) continue;
            content += `<div class="m-section"><div class="m-section-header"><h3 class="m-section-title">${cat.name}</h3><span class="m-section-count">${catCards.length}</span></div><div class="m-card-grid">`;
            for (const c of catCards) {
                const img = getCardImageUrl(c);
                content += `<div class="m-card-item card-${c.type.toLowerCase()}">${img ? `<img src="${img}" onerror="this.style.display='none'">` : ''}</div>`;
            }
            content += '</div></div>';
        }
        document.getElementById('app').innerHTML = buildMobilePage('cards', content);
        initMoreSheet();
    }

    async function renderUserCards(username) {
        const profile = await adminGetUserProfile(username);
        if (!profile) { document.getElementById('app').innerHTML = buildMobilePage('cards', '<div class="m-section"><div class="m-empty">Not found</div></div>'); return; }

        let content = `
        <button class="m-back-btn" onclick="window.location.href='admin-mobile-users.html?user=${encodeURIComponent(username)}'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back
        </button>
        <div class="m-page-header">
            <h1 class="m-page-title">${username}'s Cards</h1>
            <p class="m-page-sub">${profile.cards.length} cards</p>
        </div>`;

        for (const cat of CARD_CATEGORIES) {
            let catCards = profile.cards.filter(uc => { const card = getCardById(uc.card_id); return card && card.category === cat.id; });
            if (catCards.length === 0) continue;
            const sortedCards = sortCardsByOrder(catCards.map(uc => getCardById(uc.card_id)).filter(Boolean)).map(sc => profile.cards.find(u => u.card_id === sc.card_id)).filter(Boolean);
            content += `<div class="m-section"><div class="m-section-header"><h3 class="m-section-title">${cat.name}</h3></div><div class="m-card-grid">`;
            for (const uc of sortedCards) {
                const card = getCardById(uc.card_id);
                if (!card) continue;
                const img = getCardImageUrl(card);
                const qty = uc.quantity || 1;
                content += `<div class="m-card-item card-${card.type.toLowerCase()}">${img ? `<img src="${img}" onerror="this.style.display='none'">` : ''}${qty > 1 ? `<div class="m-card-qty">×${qty}</div>` : ''}</div>`;
            }
            content += '</div></div>';
        }
        document.getElementById('app').innerHTML = buildMobilePage('cards', content);
        initMoreSheet();
    }
})();
