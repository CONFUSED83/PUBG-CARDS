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

    const params = new URLSearchParams(window.location.search);
    const viewUser = params.get('user');

    if (viewUser) {
        await renderUserCards(viewUser);
    } else {
        await renderAllCards();
    }

    async function renderAllCards() {
        const allCards = getAllCards().filter(c => c.is_active);
        const categories = CARD_CATEGORIES;

        let content = `
        <div class="admin-header">
            <h1>Card Registry</h1>
            <p>${allCards.length} active cards across ${categories.length} categories</p>
        </div>`;

        for (const cat of categories) {
            const catCards = allCards.filter(c => c.category === cat.id);
            if (catCards.length === 0) continue;

            const sortedCards = sortCardsByOrder(catCards);

            content += `
            <div class="panel" style="margin-bottom:12px;">
                <h3 class="panel-title">${cat.name} <span class="badge">${catCards.length}</span></h3>
                <div class="card-registry-grid">`;

            for (const c of sortedCards) {
                const img = getCardImageUrl(c);
                content += `
                <div class="registry-card-img card-${c.type.toLowerCase()}">
                    ${img ? `<img src="${img}" alt="${c.card_name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="registry-card-fallback" style="display:none;">${c.card_name}</div>` : `<div class="registry-card-fallback">${c.card_name}</div>`}
                </div>`;
            }

            content += '</div></div>';
        }

        document.getElementById('app').innerHTML = buildPage('cards', content);
    }

    async function renderUserCards(username) {
        const profile = await adminGetUserProfile(username);
        if (!profile) {
            document.getElementById('app').innerHTML = buildPage('cards', '<div class="panel"><p>User not found</p></div>');
            return;
        }

        let content = `
        <div class="admin-header">
            <div>
                <a href="admin-users.html?user=${encodeURIComponent(username)}" style="display:inline-flex;align-items:center;gap:6px;color:var(--text-dim);text-decoration:none;font-size:0.8125rem;margin-bottom:8px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    Back to ${username}'s Profile
                </a>
                <h1>${username}'s Cards</h1>
                <p>${profile.cards.length} unique cards · ${profile.cards.reduce((s, c) => s + (c.quantity || 1), 0)} total copies</p>
            </div>
        </div>`;

        if (profile.cards.length === 0) {
            content += '<div class="panel"><div class="empty-state"><p>This user has no cards yet.</p></div></div>';
        } else {
            for (const cat of CARD_CATEGORIES) {
                let catCards = profile.cards.filter(uc => {
                    const card = getCardById(uc.card_id);
                    return card && card.category === cat.id;
                });
                if (catCards.length === 0) continue;

                const cardObjs = catCards.map(uc => getCardById(uc.card_id)).filter(Boolean);
                const sortedCards = sortCardsByOrder(cardObjs);

                content += `
                <div class="panel" style="margin-bottom:12px;">
                    <h3 class="panel-title">${cat.name} (${catCards.length})</h3>
                    <div class="user-cards-grid">
                        ${sortedCards.map(sortedCard => {
                            const uc = profile.cards.find(u => u.card_id === sortedCard.card_id);
                            if (!uc) return '';
                            const img = getCardImageUrl(sortedCard);
                            const qty = uc.quantity || 1;
                            return `<div class="user-card-item card-${sortedCard.type.toLowerCase()}">
                                ${img ? `<img src="${img}" onerror="this.style.display='none'">` : ''}
                                ${qty > 1 ? `<div class="user-card-qty">×${qty}</div>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            }
        }

        document.getElementById('app').innerHTML = buildPage('cards', content);
    }
})();
