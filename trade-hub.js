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
                <button class="back-btn" id="backBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                </button>
                <span class="top-bar-brand">PUBG CARDS</span>
                <div style="width:28px;"></div>
            </div>
        </div>
        <div class="page-wrap" id="content"></div>`;

        document.getElementById('backBtn').addEventListener('click', () => navigateTo('home'));

        const CATS = CARD_CATEGORIES;
        const typeOrder = { 'Golden': 0, 'Silver': 1, 'Basic': 2 };
        let mode = 'find';
        let selectedCategory = 'all';
        let selectedCard = null;
        let matches = [];
        let offerMatches = [];
        let searchQuery = '';

        const preselectCard = getNavParams()[0];
        if (preselectCard) {
            const card = getCardById(preselectCard);
            if (card) {
                selectedCategory = card.category;
                selectedCard = preselectCard;
                await loadMatches();
            }
        }

        function sortCards(cards) {
            return sortCardsByOrder(cards);
        }

        async function render() {
            const myCards = await getUserCards(user.username);
            const allCards = getActiveCards() || [];
            const missingCards = allCards.filter(c => !myCards.find(uc => uc.card_id === c.card_id));
            const extraCards = myCards.filter(uc => uc.quantity >= 2).map(uc => getCardById(uc.card_id)).filter(Boolean);

            let html = `
            <div class="mode-tabs">
                <button class="tab ${mode==='find'?'active':''}" data-mode="find">FIND A CARD</button>
                <button class="tab ${mode==='offer'?'active':''}" data-mode="offer">OFFER A CARD</button>
            </div>`;

            if (mode === 'find') {
                html += await renderFindMode(myCards, missingCards);
            } else {
                html += renderOfferMode(myCards, extraCards);
            }

            html += renderBottomNav('trades');
            document.getElementById('content').innerHTML = html;

            document.getElementById('content').querySelectorAll('[data-mode]').forEach(btn => {
                btn.addEventListener('click', () => window.setMode(btn.dataset.mode));
            });

            document.getElementById('content').querySelectorAll('[data-cat]').forEach(btn => {
                btn.addEventListener('click', () => window.setCat(btn.dataset.cat));
            });

            document.getElementById('content').querySelectorAll('[data-card-select]').forEach(el => {
                el.addEventListener('click', () => window.selectCard(el.dataset.cardSelect));
            });

            document.getElementById('content').querySelectorAll('[data-trade-match]').forEach(el => {
                el.addEventListener('click', () => {
                    const parts = el.dataset.tradeMatch.split('|');
                    window.goToTradeDetail(parts[0], parts[1]);
                });
            });

            const searchInput = document.getElementById('cardSearch');
            if (searchInput) {
                searchInput.value = searchQuery;
                searchInput.addEventListener('input', (e) => {
                    searchQuery = e.target.value.toLowerCase();
                    render();
                });
            }

            document.getElementById('content').querySelectorAll('[data-nav-screen]').forEach(btn => {
                btn.addEventListener('click', () => navigateTo(btn.dataset.navScreen));
            });

            document.getElementById('content').querySelectorAll('[data-trade-match]').forEach(el => {
                el.addEventListener('click', () => {
                    const parts = el.dataset.tradeMatch.split('|');
                    const targetUser = parts[1];
                    // Find what card to offer in exchange
                    const myGiveCard = mode === 'offer' ? selectedCard : null;
                    const theirCard = mode === 'find' ? parts[0] : null;
                    
                    if (mode === 'find') {
                        // Find mode: I want theirCard, they need something from me
                        const match = matches.find(m => m.username === targetUser);
                        const myOffer = match && match.they_need && match.they_need[0];
                        if (myOffer) {
                            navigateTo('trade-detail', myOffer, theirCard, targetUser);
                        }
                    } else {
                        // Offer mode: I offer myGiveCard, they have something I might want
                        const match = offerMatches.find(m => m.username === targetUser);
                        const theirOffer = match && match.they_have && match.they_have[0];
                        if (theirOffer) {
                            navigateTo('trade-detail', myGiveCard, theirOffer, targetUser);
                        }
                    }
                });
            });

            document.getElementById('content').querySelectorAll('[data-blocked-user]').forEach(el => {
                el.addEventListener('click', () => {
                    const targetUser = el.dataset.blockedUser;
                    const tradeId = el.dataset.blockedTrade;
                    showBlockedTradePopup(targetUser, tradeId);
                });
            });
        }

        function renderSearchBar() {
            return `
            <div class="search-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="cardSearch" placeholder="Search cards by name...">
            </div>`;
        }

        function filterCards(cards) {
            if (!searchQuery) return cards;
            return cards.filter(c => c.card_name.toLowerCase().includes(searchQuery));
        }

        async function renderFindMode(myCards, missingCards) {
            const allCount = missingCards.length;
            const wantedCard = selectedCard ? getCardById(selectedCard) : null;
            let html = `
            <div class="selector-section">
                <div class="category-pills" style="margin-bottom:14px;">
                    <button class="category-pill ${selectedCategory==='all'?'active':''}" data-cat="all">All (${allCount})</button>
                    ${CATS.map(c => {
                        const catMissing = missingCards.filter(card => card.category === c.id);
                        return `<button class="category-pill ${selectedCategory===c.id?'active':''}" data-cat="${c.id}">${c.name} (${catMissing.length})</button>`;
                    }).join('')}
                </div>`;

            const displayCards = selectedCategory === 'all'
                ? sortCards(missingCards)
                : selectedCategory
                    ? sortCards(missingCards.filter(c => c.category === selectedCategory))
                    : [];

            if (selectedCategory) {
                const filteredDisplay = filterCards(displayCards);
                if (filteredDisplay.length > 0) {
                    html += renderSearchBar();
                    html += `
                    <div class="selector-label" style="margin-top:4px;">Select Card You Want</div>
                    <div class="selector-grid">`;
                    for (const card of filteredDisplay) {
                        html += `
                        <div class="selector-card ${selectedCard===card.card_id?'selected':''}" data-card-select="${card.card_id}">
                            ${renderCardThumbnail(card, { owned: false })}
                            ${selectedCard===card.card_id && mode==='find' && matches.length===0 ? '<div style="position:absolute;bottom:8px;left:0;right:0;text-align:center;"><span style="background:rgba(255,77,106,0.9);color:white;padding:2px 8px;border-radius:6px;font-size:0.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Not Available</span></div>' : ''}
                            ${selectedCard===card.card_id && mode==='find' && matches.length>0 ? '<div style="position:absolute;bottom:8px;left:0;right:0;text-align:center;"><span style="background:rgba(0,212,170,0.9);color:var(--bg);padding:2px 8px;border-radius:6px;font-size:0.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Selected</span></div>' : ''}
                        </div>`;
                    }
                    html += `</div>`;
                } else if (searchQuery) {
                    html += renderSearchBar();
                    html += `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:0.8125rem;">No cards match "${searchQuery}"</div>`;
                } else {
                    html += `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:0.8125rem;">You own all cards in this category!</div>`;
                }
            }

            html += `</div>`;

            if (selectedCard && matches.length > 0) {
                const activeTradeMatches = matches.filter(m => m.existingTrade);
                const regularMatches = matches.filter(m => !m.existingTrade);
                const displayMatches = [...regularMatches, ...activeTradeMatches];

                html += `
                <div class="matches-section">
                    <div class="section-title">
                        <div class="section-title-bar"></div>
                        <h3>Top Matches</h3>
                    </div>
                    <div class="match-count">${regularMatches.length} trader${regularMatches.length!==1?'s':''} found${activeTradeMatches.length > 0 ? ' · ' + activeTradeMatches.length + ' active trade' + (activeTradeMatches.length>1?'s':'') : ''}</div>`;

                for (let i = 0; i < displayMatches.length; i++) {
                    const m = displayMatches[i];
                    const existingTrade = m.existingTrade || await getExistingTradeBetween(user.username, m.username);
                    const isActiveTrade = !!existingTrade && ['pending', 'accepted'].includes(existingTrade.status);
                    const isBlocked = !!existingTrade && !isActiveTrade;
                    const theyNeedCards = m.they_need.map(id => getCardById(id)).filter(Boolean);

                    html += `
                    <div class="glass-sm match-item" style="position:relative;${(isBlocked || isActiveTrade) ? 'opacity:0.45;filter:grayscale(30%);' : ''}" ${(isBlocked || isActiveTrade) ? 'data-blocked-user="' + m.username + '" data-blocked-trade="' + existingTrade.trade_id + '"' : 'data-trade-match="' + selectedCard + '|' + m.username + '"'}>
                        ${!isActiveTrade && !isBlocked && i === 0 ? '<div class="best-badge">BEST MATCH</div>' : ''}
                        <div class="match-header">
                            <div class="match-user">
                                <div class="match-avatar">${m.username.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div class="match-name">${m.username}</div>
                                    <div class="match-trades" style="display:flex;align-items:center;gap:6px;">
                                        ${isActiveTrade ? `<span style="color:var(--gold);font-size:0.6875rem;font-weight:600;">⏳ Trade in progress (${existingTrade.status})</span>` : `<span style="color:${getFavorabilityBadge(m.favorability || 100).color};">${getFavorabilityBadge(m.favorability || 100).icon} ${m.favorability || 100}</span><span style="color:var(--text-dim);">·</span><span>${m.mutual_score} mutual</span>`}
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${theyNeedCards.length > 0 ? renderTradeSwap(
                            theyNeedCards[0],
                            getCardById(m.they_have),
                            { giveLabel: 'THEY NEED', receiveLabel: 'THEY HAVE' }
                        ) : `<div style="text-align:center;padding:12px;font-size:0.75rem;color:var(--text-dim);">
                            <div style="margin-bottom:4px;">You: ${wantedCard.card_name} (${wantedCard.type})</div>
                            <div style="color:var(--gold);">${m.username}: ${wantedCard.card_name} (${wantedCard.type})</div>
                        </div>`}
                        ${isActiveTrade ? '<div style="text-align:center;margin-top:8px;font-size:0.6875rem;color:var(--gold);">Trade in progress — complete this first</div>' : ''}
                        ${isBlocked ? '<div style="text-align:center;margin-top:8px;font-size:0.6875rem;color:var(--gold);">Complete existing trade first</div>' : ''}
                        ${theyNeedCards.length > 1 ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:0.6875rem;color:var(--text-dim);">Also needs: ${theyNeedCards.slice(1,4).map(c => c.card_name).join(', ')}${theyNeedCards.length > 4 ? ' +' + (theyNeedCards.length-4) + ' more' : ''}</div>` : ''}
                    </div>`;
                }
                html += `</div>`;
            } else if (selectedCard && matches.length === 0) {
                html += `
                <div class="no-results">
                    No traders found with this card right now.
                    <div class="no-results-sub">You need at least 2 of the same type card to trade. Check back later!</div>
                </div>`;
            }

            return html;
        }

        function renderOfferMode(myCards, extraCards) {
            if (extraCards.length === 0) {
                return `<div class="no-results">You don't have any extra cards to offer.<br><div class="no-results-sub">You need at least 2 of a card to trade one away.</div></div>`;
            }

            let html = `
            <div class="selector-section">
                <div class="category-pills" style="margin-bottom:14px;">
                    <button class="category-pill ${selectedCategory==='all'?'active':''}" data-cat="all">All (${extraCards.length})</button>
                    ${CATS.map(c => {
                        const catOwned = extraCards.filter(card => card.category === c.id);
                        return `<button class="category-pill ${selectedCategory===c.id?'active':''}" data-cat="${c.id}">${c.name} (${catOwned.length})</button>`;
                    }).join('')}
                </div>`;

            if (selectedCategory) {
                const displayCards = selectedCategory === 'all'
                    ? sortCards(extraCards)
                    : sortCards(extraCards.filter(card => card.category === selectedCategory));

                const filteredDisplay = filterCards(displayCards);

                html += renderSearchBar();
                html += `<div class="selector-grid">`;
                for (const card of filteredDisplay) {
                    const uc = myCards.find(u => u.card_id === card.card_id);
                    html += `
                    <div class="selector-card ${selectedCard===card.card_id?'selected':''}" data-card-select="${card.card_id}">
                        ${renderCardThumbnail(card, { owned: true, quantity: uc.quantity, showQty: true })}
                    </div>`;
                }
                html += `</div>`;
            }

            html += `</div>`;

            if (selectedCard) {
                const card = getCardById(selectedCard);
                html += `
                <div class="matches-section">
                    <div class="offer-card-display" style="margin:12px auto;max-width:140px;">
                        <div class="card-wrapper">${renderCardThumbnail(card, { owned: true })}</div>
                    </div>`;

                if (offerMatches.length > 0) {
                    html += `
                    <div class="selector-label" style="margin-bottom:10px;">${offerMatches.length} user${offerMatches.length>1?'s':''} need${offerMatches.length===1?'s':''} this card</div>`;

                    for (const om of offerMatches) {
                        const isBlocked = !!om.existingTrade;
                        const thumbCards = om.they_have.slice(0, 3).map(id => getCardById(id)).filter(Boolean);
                        html += `
                        <div class="glass-sm" style="padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;${isBlocked ? 'opacity:0.45;filter:grayscale(30%);' : ''}" ${isBlocked ? 'data-blocked-user="' + om.username + '" data-blocked-trade="' + om.existingTrade.trade_id + '"' : 'data-trade-match="' + selectedCard + '|' + om.username + '"'}>
                            <div style="text-align:center;flex-shrink:0;">
                                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--teal));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:var(--bg);">${om.username.charAt(0).toUpperCase()}</div>
                                <div style="font-size:0.75rem;font-weight:600;margin-top:4px;">${om.username}</div>
                            </div>
                            <div style="flex:1;"></div>
                            <div style="display:flex;gap:8px;align-items:center;">
                                ${thumbCards.map(c => `<div style="width:72px;border-radius:8px;overflow:hidden;" class="card-${c.type.toLowerCase()}"><img src="${getCardImageUrl(c)||''}" style="width:100%;height:auto;object-fit:contain;display:block;" onerror="this.parentElement.style.display='none'"></div>`).join('')}
                            </div>
                        </div>`;
                    }
                } else {
                    html += `
                    <div class="no-results">
                        No users currently need this card.
                        <div class="no-results-sub">Check back later or try a different card!</div>
                    </div>`;
                }

                html += `</div>`;
            }

            return html;
        }

        async function loadMatches() {
            if (!selectedCard) return;

            const myCards = await getUserCards(user.username);
            const wantedCard = getCardById(selectedCard);
            if (!wantedCard) return;

            const myExtras = myCards.filter(uc => {
                const card = getCardById(uc.card_id);
                return card && card.type === wantedCard.type && uc.quantity >= 2 && uc.card_id !== selectedCard;
            });

            if (myExtras.length === 0) {
                // Even if I have no extras, check if there are active trades for this card
                const myTrades = await getTradesForUser(user.username);
                const activeTrades = myTrades.filter(t => 
                    (t.requester_card_id === selectedCard || t.receiver_card_id === selectedCard) &&
                    ['pending', 'accepted'].includes(t.status)
                );
                matches = activeTrades.map(t => {
                    const otherUser = t.requester === user.username ? t.receiver : t.requester;
                    return {
                        username: otherUser,
                        wanted_card_id: selectedCard,
                        they_have: selectedCard,
                        they_need: [],
                        mutual_score: 0,
                        favorability: 100,
                        existingTrade: t
                    };
                });
                return;
            }

            const rawMatches = await findMatches(user.username, selectedCard);
            const myTrades = await getTradesForUser(user.username);
            const threeDaysAgo = Date.now() - 3 * 24 * 60 * 1000;
            
            // Filter out users on cooldown (completed/rejected same pair within 3 days)
            matches = rawMatches.filter(m => {
                if (m.they_have_quantity !== undefined && m.they_have_quantity < 2) return false;
                const onCooldown = myTrades.some(t => {
                    if (new Date(t.created_at).getTime() < threeDaysAgo) return false;
                    if (!['completed','rejected'].includes(t.status)) return false;
                    const sameUsers = (t.requester === user.username && t.receiver === m.username) || (t.receiver === user.username && t.requester === m.username);
                    const samePair = (t.requester_card_id === selectedCard && t.receiver_card_id === (m.they_need[0] || '')) || (t.receiver_card_id === selectedCard && t.requester_card_id === (m.they_need[0] || ''));
                    return sameUsers && samePair;
                });
                return !onCooldown;
            });

            // Add back users with active trades for this card as dulled reminders
            const activeTradesForCard = myTrades.filter(t => 
                (t.requester_card_id === selectedCard || t.receiver_card_id === selectedCard) &&
                ['pending', 'accepted'].includes(t.status)
            );
            for (const trade of activeTradesForCard) {
                const otherUser = trade.requester === user.username ? trade.receiver : trade.requester;
                // Only add if not already in matches
                if (!matches.find(m => m.username === otherUser)) {
                    matches.push({
                        username: otherUser,
                        wanted_card_id: selectedCard,
                        they_have: selectedCard,
                        they_need: [],
                        mutual_score: 0,
                        favorability: 100,
                        existingTrade: trade
                    });
                }
            }
        }

        async function loadOfferMatches() {
            if (!selectedCard) { offerMatches = []; return; }

            const myCards = await getUserCards(user.username);
            const myCardIds = myCards.map(uc => uc.card_id);
            const allCards = getActiveCards();

            const { data: allUserCards, error } = await sb.from('user_cards').select('*').neq('username', user.username);
            if (error || !allUserCards) { offerMatches = []; return; }

            const selectedCardData = getCardById(selectedCard);
            if (!selectedCardData) { offerMatches = []; return; }

            const myTrades = await getTradesForUser(user.username);
            const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

            const results = [];
            const userAppearCount = {};

            for (const uc of allUserCards) {
                if (uc.card_id === selectedCard) continue;
                const card = getCardById(uc.card_id);
                if (!card || card.type !== selectedCardData.type) continue;
                if (myCardIds.includes(uc.card_id)) continue;
                if (uc.quantity < 2) continue;

                const userNeedsIt = !allUserCards.some(u => u.username === uc.username && u.card_id === selectedCard);
                if (!userNeedsIt) continue;

                const count = userAppearCount[uc.username] || 0;
                if (count >= 2) continue;

                const onCooldown = myTrades.some(t => {
                    if (new Date(t.created_at).getTime() < threeDaysAgo) return false;
                    if (!['completed','rejected'].includes(t.status)) return false;
                    const sameUsers = (t.requester === user.username && t.receiver === uc.username) || (t.receiver === user.username && t.requester === uc.username);
                    const samePair = (t.requester_card_id === selectedCard && t.receiver_card_id === uc.card_id) || (t.receiver_card_id === selectedCard && t.requester_card_id === uc.card_id);
                    return sameUsers && samePair;
                });
                if (onCooldown) continue;

                userAppearCount[uc.username] = count + 1;

                const existingTrade = await getExistingTradeBetween(user.username, uc.username);

                results.push({
                    username: uc.username,
                    they_have: [uc.card_id],
                    card_name: card.card_name,
                    mutual_score: 1,
                    existingTrade: existingTrade
                });
            }

            results.sort((a, b) => b.mutual_score - a.mutual_score);
            offerMatches = results.slice(0, 10);
        }

        window.setMode = function(m) {
            mode = m;
            selectedCard = null;
            matches = [];
            offerMatches = [];
            searchQuery = '';
            render();
        };

        window.setCat = function(cat) {
            selectedCategory = cat;
            selectedCard = null;
            matches = [];
            offerMatches = [];
            searchQuery = '';
            render();
        };

        window.selectCard = async function(cardId) {
            selectedCard = cardId;
            const card = getCardById(cardId);
            if (typeof logActivity === 'function') {
                logActivity(user.username, 'card_search', user.username + ' searched for ' + (card ? card.card_name : cardId));
            }
            if (mode === 'find') {
                await loadMatches();
            } else {
                await loadOfferMatches();
            }
            render();
            setTimeout(() => {
                const target = document.querySelector('.matches-section') || document.querySelector('.no-results');
                if (target) {
                    window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
                }
            }, 100);
        };

        window.goToTradeDetail = function(wantedCardId, matchUser) {
            const wantedCard = getCardById(wantedCardId);
            const match = matches.find(m => m.username === matchUser) || offerMatches.find(m => m.username === matchUser);
            if (!match) return;
            const myGiveCardId = mode === 'find' ? (match.they_need ? match.they_need[0] : null) : selectedCard;
            if (!myGiveCardId) return;
            const targetCard = mode === 'find' ? wantedCardId : match.they_have[0];
            navigateTo('trade-detail', myGiveCardId, targetCard, matchUser);
        };

        async function showBlockedTradePopup(targetUser, tradeId) {
            const trade = await getTradeById(tradeId);
            if (!trade) { showToast('Trade not found', 'error'); return; }

            const giveCard = getCardById(trade.requester === user.username ? trade.requester_card_id : trade.receiver_card_id);
            const getCard = getCardById(trade.requester === user.username ? trade.receiver_card_id : trade.requester_card_id);
            const convId = getConversationId(user.username, targetUser);

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.style.zIndex = '300';
            overlay.innerHTML = `
            <div class="modal-content" style="text-align:center;">
                <div style="width:50px;height:50px;border-radius:50%;background:rgba(240,192,64,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:var(--gold);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.125rem;margin-bottom:4px;">Existing Trade</h3>
                <p style="color:var(--text-dim);font-size:0.8125rem;margin-bottom:16px;">Complete your trade with <strong style="color:var(--teal);">${targetUser}</strong> first.</p>
                ${giveCard && getCard ? `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                    <div style="flex:1;text-align:center;">
                        <div style="font-size:0.5rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--red);margin-bottom:4px;font-weight:600;">You give</div>
                        <div class="card-placeholder card-${giveCard.type.toLowerCase()}" style="width:70px;margin:0 auto;border-radius:8px;overflow:hidden;">
                            ${getCardImageUrl(giveCard) ? '<img src="' + getCardImageUrl(giveCard) + '" style="width:100%;height:auto;display:block;" onerror="this.style.display=\'none\'">' : ''}
                        </div>
                    </div>
                    <div style="color:var(--teal);flex-shrink:0;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
                    </div>
                    <div style="flex:1;text-align:center;">
                        <div style="font-size:0.5rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--teal);margin-bottom:4px;font-weight:600;">You get</div>
                        <div class="card-placeholder card-${getCard.type.toLowerCase()}" style="width:70px;margin:0 auto;border-radius:8px;overflow:hidden;">
                            ${getCardImageUrl(getCard) ? '<img src="' + getCardImageUrl(getCard) + '" style="width:100%;height:auto;display:block;" onerror="this.style.display=\'none\'">' : ''}
                        </div>
                    </div>
                </div>` : ''}
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button class="btn btn-teal btn-full" id="blockedComplete2">Complete Trade</button>
                    <button class="btn btn-danger btn-full btn-sm" id="blockedCancel2">Cancel Previous Trade</button>
                    <button class="btn btn-outline btn-full btn-sm" id="blockedClose2" style="color:var(--text-dim);">Close</button>
                </div>
            </div>`;
            document.body.appendChild(overlay);

            document.getElementById('blockedComplete2').addEventListener('click', () => {
                overlay.remove();
                navigateTo('chat-window', convId, targetUser);
            });

            document.getElementById('blockedCancel2').addEventListener('click', async () => {
                await cancelTradeAsReject(tradeId, user.username);
                overlay.remove();
                showToast('Previous trade cancelled', 'info');
                await loadMatches();
                render();
            });

            document.getElementById('blockedClose2').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        }

        render();
    })();
