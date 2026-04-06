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

        let tab = localStorage.getItem('cth_trades_tab') || 'incoming';
        localStorage.removeItem('cth_trades_tab');
        let rejectModal = null;

        async function render() {
            const incoming = await getIncomingTrades(user.username);
            const outgoing = await getOutgoingTrades(user.username);
            const codeCopies = await getUserCodeCopies(user.username);
            const pendingCopies = codeCopies.filter(function(c) { return c.status === 'pending'; });

            // Get user's created code trades for outgoing display
            var createdCodeTrades = [];
            try { createdCodeTrades = await getUserCodeTrades(user.username); } catch(e) {}

            let html = `
            <header style="margin-bottom:16px;">
                <h2 class="page-title">Trades</h2>
                <p class="page-sub">Manage your trade requests</p>
            </header>

            <div class="tabs">
                <button class="tab ${tab==='incoming'?'active':''}" data-tab="incoming">
                    INCOMING (${incoming.length + pendingCopies.length})
                </button>
                <button class="tab ${tab==='outgoing'?'active':''}" data-tab="outgoing">
                    OUTGOING (${outgoing.length + createdCodeTrades.length})
                </button>
            </div>`;

            if (tab === 'incoming') {
                // Incoming: regular incoming trades + code exchanges (user copied code, needs to confirm)
                html += renderIncoming(incoming, pendingCopies);
            } else {
                // Outgoing: regular outgoing trades + user's created code trades (with copy stats)
                html += await renderOutgoing(outgoing, createdCodeTrades);
            }

            html += renderBottomNav('trades');
            document.getElementById('content').innerHTML = html;

            document.getElementById('content').querySelectorAll('[data-tab]').forEach(btn => {
                btn.addEventListener('click', () => window.setTab(btn.dataset.tab));
            });

            document.getElementById('content').querySelectorAll('[data-accept]').forEach(btn => {
                btn.addEventListener('click', () => window.acceptTrade(btn.dataset.accept));
            });

            document.getElementById('content').querySelectorAll('[data-reject]').forEach(btn => {
                btn.addEventListener('click', () => window.showRejectModal(btn.dataset.reject));
            });

            document.getElementById('content').querySelectorAll('[data-confirm-trade]').forEach(btn => {
                btn.addEventListener('click', () => window.confirmTradeComplete(btn.dataset.confirmTrade));
            });

            document.getElementById('content').querySelectorAll('[data-copy]').forEach(el => {
                el.addEventListener('click', () => copyToClipboard(el.dataset.copy));
            });

            document.getElementById('content').querySelectorAll('[data-nav-screen]').forEach(btn => {
                btn.addEventListener('click', () => navigateTo(btn.dataset.navScreen));
            });
        }

        function renderIncoming(trades, pendingCopies) {
            let html = '';

            // Code exchanges (incoming to the creator - people who copied their code)
            if (pendingCopies.length > 0) {
                html += '<div style="margin-bottom:16px;"><div style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--teal);margin-bottom:8px;padding-left:4px;">Code Exchange Requests</div>';
                for (var i = 0; i < pendingCopies.length; i++) {
                    var copy = pendingCopies[i];
                    var ct = copy.code_trades;
                    var myOfferedCard = getCardById(ct.offered_card_ids[0]);
                    var theirCard = getCardById(copy.selected_offer_card_id);
                    if (!myOfferedCard || !theirCard) continue;

                    html += '<div class="glass trade-card">';
                    html += '<div class="trade-header"><div class="trade-user"><div class="trade-avatar">' + copy.copier_username.charAt(0).toUpperCase() + '</div><div><div class="trade-name">Code Exchange: ' + copy.copier_username + '</div><div class="trade-time">' + timeAgo(copy.created_at) + '</div></div></div>';
                    html += '<span class="status-badge status-pending">PENDING</span></div>';
                    html += renderTradeSwap(theirCard, myOfferedCard, { giveLabel: 'THEY GIVE', receiveLabel: 'YOU GET' });
                    html += '<div style="margin-top:10px;padding:10px;background:rgba(0,212,170,0.06);border-radius:8px;font-size:0.75rem;color:var(--teal);">Waiting for ' + copy.copier_username + ' to confirm the trade in-game.</div>';
                    html += '</div>';
                }
                html += '</div>';
            }

            if (trades.length === 0 && pendingCopies.length === 0) {
                html += '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg><p>No incoming trades</p></div>';
            }

            for (const trade of trades) {
                const giveCard = getCardById(trade.requester_card_id);
                const receiveCard = getCardById(trade.receiver_card_id);
                if (!giveCard || !receiveCard) continue;

                html += '<div class="glass trade-card"><div class="trade-header"><div class="trade-user"><div class="trade-avatar">' + trade.requester.charAt(0).toUpperCase() + '</div><div><div class="trade-name">' + trade.requester + '</div><div class="trade-time">' + timeAgo(trade.created_at) + '</div></div></div><span class="status-badge status-pending">PENDING</span></div>';
                html += renderTradeSwap(giveCard, receiveCard, { giveLabel: 'THEY GIVE', receiveLabel: 'YOU GIVE' });
                html += '<div class="trade-actions"><button class="btn btn-teal btn-sm" style="flex:1;" data-accept="' + trade.trade_id + '">ACCEPT</button><button class="btn btn-danger btn-sm" style="flex:1;" data-reject="' + trade.trade_id + '">REJECT</button></div></div>';
            }
            return html;
        }

        async function renderOutgoing(trades, createdCodeTrades) {
            const pending = trades.filter(t => t.status === 'pending');
            const other = trades.filter(t => t.status !== 'pending');

            let html = '';

            // User's created code trades (showing copy stats)
            if (createdCodeTrades && createdCodeTrades.length > 0) {
                html += '<div style="margin-bottom:16px;"><div style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--gold);margin-bottom:8px;padding-left:4px;">Your Code Trades</div>';
                for (var ct = 0; ct < createdCodeTrades.length; ct++) {
                    var ctTrade = createdCodeTrades[ct];
                    var ctWanted = getCardById(ctTrade.wanted_card_id);
                    var ctOffered = ctTrade.offered_card_ids.map(function(id) { return getCardById(id); }).filter(Boolean);
                    if (!ctWanted || ctOffered.length === 0) continue;

                    var copyCount = ctTrade.copy_count || 0;
                    var statusLabel = ctTrade.status === 'active' ? 'ACTIVE' : ctTrade.status === 'completed' ? 'COMPLETED' : ctTrade.status === 'expired' ? 'EXPIRED' : ctTrade.status.toUpperCase();
                    var statusClass = ctTrade.status === 'active' ? 'status-pending' : ctTrade.status === 'completed' ? 'status-completed' : 'status-rejected';
                    var isGrayed = ctTrade.status !== 'active';

                    html += '<div class="glass trade-card"' + (isGrayed ? ' style="opacity:0.5;"' : '') + '>';
                    html += '<div class="trade-header"><div class="trade-user"><div class="trade-avatar" style="background:linear-gradient(135deg,#f0c040,#00d4aa);">CT</div><div><div class="trade-name">Code Trade: ' + ctWanted.card_name + '</div><div class="trade-time">' + timeAgo(ctTrade.created_at) + '</div></div></div>';
                    html += '<span class="status-badge ' + statusClass + '">' + statusLabel + '</span></div>';
                    html += renderTradeSwap(ctOffered[0], ctWanted, { giveLabel: 'YOU OFFER', receiveLabel: 'YOU WANT' });
                    html += '<div style="margin-top:10px;padding:10px;background:rgba(240,192,64,0.08);border-radius:8px;font-size:0.75rem;color:var(--gold);">' + copyCount + ' user' + (copyCount !== 1 ? 's' : '') + ' copied this code</div>';
                    html += '</div>';
                }
                html += '</div>';
            }

            if (pending.length > 0) {
                for (const trade of pending) {
                    const giveCard = getCardById(trade.requester_card_id);
                    const receiveCard = getCardById(trade.receiver_card_id);
                    if (!giveCard || !receiveCard) continue;

                    html += `
                    <div class="glass trade-card">
                        <div class="trade-header">
                            <div class="trade-user">
                                <div class="trade-avatar">${trade.receiver.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div class="trade-name">To: ${trade.receiver}</div>
                                    <div class="trade-time">${timeAgo(trade.created_at)}</div>
                                </div>
                            </div>
                            <span class="status-badge status-pending">PENDING</span>
                        </div>
                        ${renderTradeSwap(giveCard, receiveCard, {
                            giveLabel: 'YOU GIVE',
                            receiveLabel: 'YOU GET'
                        })}
                    </div>`;
                }
            }

            for (const trade of other) {
                const giveCard = getCardById(trade.requester_card_id);
                const receiveCard = getCardById(trade.receiver_card_id);
                if (!giveCard || !receiveCard) continue;

                const statusClass = `status-${trade.status}`;
                const showContact = trade.status === 'accepted';
                const contact = getUserContact(trade.receiver);

                html += `
                <div class="glass trade-card" style="opacity:0.8;">
                    <div class="trade-header">
                        <div class="trade-user">
                            <div class="trade-avatar">${trade.receiver.charAt(0).toUpperCase()}</div>
                            <div>
                                <div class="trade-name">To: ${trade.receiver}</div>
                                <div class="trade-time">${timeAgo(trade.updated_at)}</div>
                            </div>
                        </div>
                        <span class="status-badge ${statusClass}">${trade.status.toUpperCase()}</span>
                    </div>
                    ${renderTradeSwap(giveCard, receiveCard, {
                        giveLabel: 'YOU GIVE',
                        receiveLabel: 'YOU GET'
                    })}
                    ${trade.status === 'rejected' && trade.reject_reason ? `
                        <div style="margin-top:10px;padding:10px;background:rgba(255,77,106,0.08);border-radius:8px;font-size:0.75rem;color:var(--red);">
                            Reason: ${trade.reject_reason}
                        </div>` : ''}
                    ${showContact && contact ? `
                        <div class="contact-reveal">
                            <div style="font-size:0.6875rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Contact ${trade.receiver}</div>
                            ${contact.whatsapp ? `
                                <a href="https://wa.me/${contact.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" class="btn btn-teal btn-sm" style="text-decoration:none;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    WhatsApp
                                </a>` : ''}
                            ${contact.discord ? `
                                <div class="copy-box" data-copy="${contact.discord}" style="margin-top:8px;">
                                    <span style="font-weight:600;font-size:0.875rem;">${contact.discord}</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </div>` : ''}
                            ${trade.status === 'accepted' ? `
                                <button class="btn btn-teal btn-sm btn-full" style="margin-top:10px;" data-confirm-trade="${trade.trade_id}">
                                    CONFIRM TRADE COMPLETED
                                </button>` : ''}
                        </div>` : ''}
                    ${trade.status === 'accepted' && (trade.confirmed_by_requester || trade.confirmed_by_receiver) ? `
                        <div style="margin-top:10px;padding:8px;background:rgba(0,212,170,0.08);border-radius:8px;font-size:0.75rem;color:var(--teal);">
                            ${trade.confirmed_by_requester && trade.confirmed_by_receiver ? 'Both confirmed - Trade completed!' :
                              trade.confirmed_by_requester && trade.requester === user.username ? 'You confirmed. Your collection has been updated.' :
                              trade.confirmed_by_receiver && trade.receiver === user.username ? 'You confirmed. Your collection has been updated.' :
                              trade.confirmed_by_requester ? trade.requester + ' confirmed. Waiting for you to confirm.' :
                              trade.receiver + ' confirmed. Waiting for you to confirm.'}
                        </div>` : ''}
                </div>`;
            }

            if (!html) {
                html = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                    <p>No outgoing trades</p>
                </div>`;
            }

            return html;
        }

        window.setTab = function(t) {
            tab = t;
            render();
        };

        window.acceptTrade = async function(tradeId) {
            await updateTradeStatus(tradeId, 'accepted');
            showToast('Trade accepted!', 'success');
            render();
        };

        window.showRejectModal = function(tradeId) {
            const reasons = ['Card already traded', 'No longer available', 'Not interested', 'Wrong card type', 'Other'];
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
            <div class="modal-content">
                <h3 style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.25rem;margin-bottom:16px;">Reject Trade</h3>
                <p style="color:var(--text-dim);font-size:0.8125rem;margin-bottom:16px;">Select a reason:</p>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${reasons.map(r => `
                        <button class="btn btn-outline btn-sm reject-reason-btn" data-trade-id="${tradeId}" data-reason="${r}" style="text-align:left;justify-content:flex-start;">
                            ${r}
                        </button>
                    `).join('')}
                </div>
                <button class="btn btn-danger btn-sm btn-full" style="margin-top:12px;" id="rejectCancelBtn">
                    CANCEL
                </button>
            </div>`;
            document.body.appendChild(overlay);

            overlay.querySelectorAll('.reject-reason-btn').forEach(btn => {
                btn.addEventListener('click', () => window.rejectTrade(btn.dataset.tradeId, btn.dataset.reason));
            });

            document.getElementById('rejectCancelBtn').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });
        };

        window.rejectTrade = async function(tradeId, reason) {
            await updateTradeStatus(tradeId, 'rejected', reason);
            document.querySelector('.modal-overlay')?.remove();
            showToast('Trade rejected.', 'info');
            render();
        };

        window.confirmTradeComplete = async function(tradeId) {
            await confirmTrade(tradeId, user.username);
            showToast('Trade confirmed!', 'success');
            render();
        };

        render();
    })();
