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
        if (!user) return;

        document.getElementById('app').innerHTML = `
        <div class="top-bar">
            <div class="top-bar-inner">
                <div style="width:28px;"></div>
                <span class="top-bar-brand">PUBG CARDS</span>
                <div style="width:28px;"></div>
            </div>
        </div>
        <div class="page-wrap" id="content"></div>`;

        const CATS = CARD_CATEGORIES;
        const typeOrder = { 'Golden': 0, 'Silver': 1, 'Basic': 2 };
        let activeCategory = 'all';

        async function render() {
            try {
            // Show skeleton while loading
            document.getElementById('content').innerHTML = `
            <header class="page-header"><h2 class="page-title">My Collection</h2></header>
            <div class="stats-mini">
                <div class="glass-sm stat-mini-card"><div class="skeleton skeleton-text" style="width:40px;height:20px;margin:0;"></div></div>
                <div class="glass-sm stat-mini-card"><div class="skeleton skeleton-text" style="width:40px;height:20px;margin:0;"></div></div>
            </div>
            <div class="cards-grid" style="margin-top:16px;">
                ${Array(9).fill('<div class="skeleton skeleton-card"></div>').join('')}
            </div>`;

            const myCards = await getUserCards(user.username);
            const allCards = getActiveCards() || [];
            const uniqueOwned = myCards.length;
            const totalOwned = myCards.reduce((s, uc) => s + uc.quantity, 0);

            let filteredCards = activeCategory === 'all'
                ? allCards
                : allCards.filter(c => c.category === activeCategory);

            filteredCards = sortCardsByOrder(filteredCards);

            let html = `
            <header class="page-header">
                <h2 class="page-title">My Collection</h2>
                <p class="page-sub">Your digital card archive</p>
            </header>
            <div class="stats-mini">
                <div class="glass-sm stat-mini-card">
                    <div class="stat-mini-val" style="color:var(--teal)">${totalOwned}</div>
                    <div class="stat-mini-label">Total Cards</div>
                </div>
                <div class="glass-sm stat-mini-card">
                    <div class="stat-mini-val">${uniqueOwned}/${allCards.length}</div>
                    <div class="stat-mini-label">Unique Owned</div>
                </div>
            </div>
            <div class="category-pills" style="margin-bottom:16px;">
                <button class="category-pill ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">All</button>
                ${CATS.map(c => `<button class="category-pill ${activeCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>`).join('')}
            </div>
            <div class="cards-grid">`;

            for (const card of filteredCards) {
                const owned = myCards.find(uc => uc.card_id === card.card_id);
                const qty = owned ? owned.quantity : 0;
                const isOwned = qty > 0;

                html += `
                <div class="card-item" data-card-id="${card.card_id}" data-owned="${isOwned}">
                    ${renderCardThumbnail(card, { owned: isOwned, quantity: qty, showQty: true })}
                </div>`;
            }

            if (filteredCards.length === 0) {
                html += `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);">No cards in this category</div>`;
            }

            html += `</div>`;
            html += renderBottomNav('collection');
            const content = document.getElementById('content');
            content.innerHTML = html;
            content.classList.add('page-enter');

            document.getElementById('content').querySelectorAll('[data-cat]').forEach(btn => {
                btn.addEventListener('click', () => {
                    window.setCat(btn.dataset.cat);
                });
            });

            const activePill = document.querySelector('.category-pill.active');
            if (activePill) {
                activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }

            document.getElementById('content').querySelectorAll('.card-item[data-card-id]').forEach(el => {
                el.style.cursor = 'pointer';
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cardId = el.dataset.cardId;
                    const owned = el.dataset.owned === 'true';
                    if (cardId) window.onCardClick(cardId, owned);
                });
            });

            document.getElementById('content').querySelectorAll('[data-nav-screen]').forEach(btn => {
                btn.addEventListener('click', () => navigateTo(btn.dataset.navScreen));
            });

            } catch(e) {
                console.error('Collection render error:', e);
                const content = document.getElementById('content');
                if (content) content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--red);">Error: ' + e.message + '</div>';
            }
        }

        window.setCat = function(cat) {
            activeCategory = cat;
            render();
        };

        window.onCardClick = function(cardId, isOwned) {
            if (isOwned) {
                showOwnedModal(cardId);
            } else {
                showUnownedModal(cardId);
            }
        };

        async function showOwnedModal(cardId) {
            const card = getCardById(cardId);
            const qty = await getUserCardQuantity(user.username, cardId);
            const CATS = CARD_CATEGORIES;
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
            <div class="modal-content" style="text-align:center;position:relative;max-height:85vh;overflow:hidden;">
                <button class="modal-close-btn" id="ownedCloseBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:rgba(0,212,170,0.15);color:var(--teal);font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Owned x${qty}</div>
                ${renderCardThumbnail(card, { owned: true, size: 'lg' })}
                <p style="color:var(--text-dim);font-size:0.6875rem;margin:8px 0 4px;">${CATS.find(c=>c.id===card.category)?.name || card.category} · ${card.type}</p>
                <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:12px 0;">
                    <button class="qty-btn" id="modalQtyMinus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <span class="qty-value" id="modalQty" style="font-size:1.5rem;">${qty}</span>
                    <button class="qty-btn" id="modalQtyPlus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
                <button class="btn btn-teal btn-full btn-sm" id="modalDoneBtn">DONE</button>
            </div>`;
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                document.getElementById('ownedCloseBtn').addEventListener('click', () => { overlay.remove(); render(); });
                document.getElementById('modalQtyMinus').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const cur = await getUserCardQuantity(user.username, cardId);
                    const next = Math.max(0, cur - 1);
                    await updateUserCardQty(user.username, cardId, next);
                    document.getElementById('modalQty').textContent = next;
                });
                document.getElementById('modalQtyPlus').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const cur = await getUserCardQuantity(user.username, cardId);
                    const next = Math.min(99, cur + 1);
                    await updateUserCardQty(user.username, cardId, next);
                    document.getElementById('modalQty').textContent = next;
                });
                document.getElementById('modalDoneBtn').addEventListener('click', (e) => {
                    e.stopPropagation(); overlay.remove(); render();
                });
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) { overlay.remove(); render(); }
                });
            });
        }

        function showUnownedModal(cardId) {
            const card = getCardById(cardId);
            let selectedQty = 0;
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
            <div class="modal-content" style="text-align:center;position:relative;max-height:85vh;overflow:hidden;">
                <button class="modal-close-btn" id="unownedCloseBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:rgba(255,77,106,0.15);color:var(--red);font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Missing</div>
                ${renderCardThumbnail(card, { owned: false, size: 'lg' })}
                <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:16px 0;">
                    <button class="qty-btn" id="unownedQtyMinus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <span class="qty-value" id="unownedQtyVal" style="font-size:1.5rem;">0</span>
                    <button class="qty-btn" id="unownedQtyPlus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-teal btn-sm" style="flex:1;" id="unownedAddBtn">ADD</button>
                    <button class="btn btn-outline btn-sm" style="flex:1;" id="unownedTradeBtn">FIND TRADES</button>
                </div>
            </div>`;
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                document.getElementById('unownedCloseBtn').addEventListener('click', () => { overlay.remove(); render(); });
                document.getElementById('unownedQtyMinus').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (selectedQty > 0) { selectedQty--; document.getElementById('unownedQtyVal').textContent = selectedQty; }
                });
                document.getElementById('unownedQtyPlus').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (selectedQty < 99) { selectedQty++; document.getElementById('unownedQtyVal').textContent = selectedQty; }
                });
                document.getElementById('unownedAddBtn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (selectedQty > 0) {
                        await updateUserCardQty(user.username, cardId, selectedQty);
                        showToast('Added ' + selectedQty + '!', 'success');
                        overlay.remove(); render();
                    } else { showToast('Set quantity first', 'info'); }
                });
                document.getElementById('unownedTradeBtn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    overlay.remove(); navigateTo('trade-hub', cardId);
                });
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) { overlay.remove(); render(); }
                });
            });
        }

        window.updateModalQty = async function(cardId, delta) {
            const current = await getUserCardQuantity(user.username, cardId);
            const next = Math.max(0, Math.min(99, current + delta));
            await updateUserCardQty(user.username, cardId, next);
            const qtyEl = document.getElementById('modalQty');
            if (qtyEl) qtyEl.textContent = next;
            const badge = document.querySelector('.modal-overlay .modal-content div[style*="Owned"]');
            if (badge) badge.textContent = 'Owned x' + next;
        };

        window.closeModal = function(el) {
            const overlay = el.closest ? el.closest('.modal-overlay') : el;
            if (overlay) overlay.remove();
            render();
        };

        render();
    })();
