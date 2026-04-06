(async function() {
        try {
            while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
            await initApp();
        } catch(e) {
            console.error('Init failed:', e);
            document.getElementById('app').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">Failed to load</div>';
            return;
        }

        async function render() {
            let trades = [];
            if (sb) {
                const { data } = await sb.from('trades').select('*')
                    .in('status', ['pending', 'accepted'])
                    .order('created_at', { ascending: false })
                    .limit(20);
                trades = data || [];
            }

            let availableCards = [];
            if (sb) {
                const { data } = await sb.from('user_cards').select('card_id, quantity')
                    .gte('quantity', 2);
                if (data) {
                    const cardCounts = {};
                    data.forEach(uc => { cardCounts[uc.card_id] = (cardCounts[uc.card_id] || 0) + 1; });
                    availableCards = Object.entries(cardCounts)
                        .filter(([_, count]) => count >= 1)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 20)
                        .map(([cardId, count]) => ({ card: getCardById(cardId), traders: count }));
                }
            }

            let html = `
            <div class="page-wrap">
                <div class="hero">
                    <h1>Browse Available Trades</h1>
                    <p>See what cards are available for trading. Login to start trading!</p>
                </div>`;

            if (availableCards.length > 0) {
                html += `
                <div style="margin-bottom:20px;">
                    <div class="section-title"><div class="section-title-bar"></div><h3>Available For Trade</h3></div>
                    <div class="trade-list">`;

                for (const ac of availableCards) {
                    if (!ac.card) continue;
                    const cardImg = getCardImageUrl(ac.card);
                    html += `
                    <div class="glass-sm trade-item" onclick="showLoginPopup()">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div class="card-placeholder card-${ac.card.type.toLowerCase()}" style="width:40px;border-radius:8px;overflow:hidden;flex-shrink:0;">
                                ${cardImg ? '<img src="' + cardImg + '" style="width:100%;height:auto;display:block;" onerror="this.style.display=\'none\'">' : ''}
                            </div>
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:0.875rem;">${ac.card.card_name}</div>
                                <div style="font-size:0.6875rem;color:var(--text-dim);">${ac.traders} trader${ac.traders > 1 ? 's' : ''} available</div>
                            </div>
                            <span class="trade-item-type badge-${ac.card.type.toLowerCase()}">${ac.card.type}</span>
                        </div>
                    </div>`;
                }
                html += '</div></div>';
            }

            if (trades.length > 0) {
                html += `
                <div style="margin-bottom:20px;">
                    <div class="section-title"><div class="section-title-bar" style="background:var(--gold);"></div><h3>Recent Trades</h3></div>
                    <div class="trade-list">`;

                for (const t of trades) {
                    const reqCard = getCardById(t.requester_card_id);
                    const recCard = getCardById(t.receiver_card_id);
                    if (!reqCard || !recCard) continue;
                    const reqImg = getCardImageUrl(reqCard);
                    const recImg = getCardImageUrl(recCard);

                    html += `
                    <div class="glass-sm trade-item" onclick="showLoginPopup()">
                        <div class="trade-item-top">
                            <span class="trade-item-type status-${t.status}">${t.status}</span>
                            <span class="trade-item-time">${timeAgo(t.created_at)}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="text-align:center;flex:1;">
                                <div class="card-placeholder card-${reqCard.type.toLowerCase()}" style="width:50px;margin:0 auto;border-radius:8px;overflow:hidden;">
                                    ${reqImg ? '<img src="' + reqImg + '" style="width:100%;height:auto;display:block;" onerror="this.style.display=\'none\'">' : ''}
                                </div>
                                <div style="font-size:0.625rem;color:var(--text-dim);margin-top:4px;">${reqCard.card_name}</div>
                            </div>
                            <div style="color:var(--teal);flex-shrink:0;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
                            </div>
                            <div style="text-align:center;flex:1;">
                                <div class="card-placeholder card-${recCard.type.toLowerCase()}" style="width:50px;margin:0 auto;border-radius:8px;overflow:hidden;">
                                    ${recImg ? '<img src="' + recImg + '" style="width:100%;height:auto;display:block;" onerror="this.style.display=\'none\'">' : ''}
                                </div>
                                <div style="font-size:0.625rem;color:var(--text-dim);margin-top:4px;">${recCard.card_name}</div>
                            </div>
                        </div>
                    </div>`;
                }
                html += '</div></div>';
            }

            if (availableCards.length === 0 && trades.length === 0) {
                html += '<div class="empty-state"><p>No trades available yet. Be the first to trade!</p></div>';
            }

            html += `
                <div class="footer-cta">
                    <p>Want to trade? Create a free account!</p>
                    <a href="./create-account.html" class="btn btn-teal" style="text-decoration:none;">Create Account</a>
                    <p style="margin-top:12px;">Already have an account? <a href="./login.html">Login</a></p>
                </div>
            </div>`;

            document.getElementById('app').innerHTML = html;
        }

        window.showLoginPopup = function() {
            document.getElementById('loginPopup').classList.add('active');
        };

        window.closePopup = function() {
            document.getElementById('loginPopup').classList.remove('active');
        };

        document.getElementById('loginPopup').addEventListener('click', (e) => {
            if (e.target === document.getElementById('loginPopup')) closePopup();
        });

        render();
    })();
