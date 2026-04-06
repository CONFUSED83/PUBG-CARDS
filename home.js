(async function() {
        try {
            while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
            await initApp();
        } catch(e) {
            console.error('Init failed:', e);
            document.getElementById('app').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);"><p>Failed to load. Please refresh.</p><button class="btn btn-teal btn-sm" onclick="location.reload()" style="margin-top:12px;">Refresh</button></div>';
            return;
        }

        const user = requireAuth();
        if (!user) return;

        document.getElementById('app').innerHTML = `
        <div class="top-bar">
            <div class="top-bar-inner">
                <span class="top-bar-brand">PUBG CARDS</span>
                <div class="top-bar-actions">
                    <button class="msg-btn" id="msgBtn">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <span class="msg-badge" id="msgBadge" style="display:none;">0</span>
                    </button>
                    <div class="profile-wrapper">
                        <div class="avatar-circle" id="avatarBtn"></div>
                        <div class="dropdown-menu" id="profileDropdown">
                            <button class="dropdown-item" id="adminLink" style="display:none;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                Admin Console
                            </button>
                            <button class="dropdown-item" id="reportBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                Report Issue
                            </button>
                            <button class="dropdown-item" id="feedbackBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                Send Feedback
                            </button>
                            <button class="dropdown-item danger" id="logoutBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="home-wrapper" id="homeContent"></div>`;

        document.getElementById('avatarBtn').textContent = user.username.charAt(0).toUpperCase();
        if (user.is_admin) {
            document.getElementById('adminLink').style.display = 'flex';
        }

        document.getElementById('msgBtn').addEventListener('click', () => navigateTo('chat'));
        document.getElementById('adminLink').addEventListener('click', () => navigateTo('admin'));

        window.doLogout = function() {
            logout();
            window.location.href = './login.html';
        };

        document.getElementById('logoutBtn').addEventListener('click', window.doLogout);

        window.toggleDropdown = function() {
            document.getElementById('profileDropdown').classList.toggle('show');
        };

        document.getElementById('avatarBtn').addEventListener('click', window.toggleDropdown);

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.profile-wrapper')) {
                document.getElementById('profileDropdown').classList.remove('show');
            }
        });

        window.showReportModal = function(type) {
            document.getElementById('profileDropdown').classList.remove('show');
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
            <div class="modal-content" style="max-height:80vh;overflow-y:auto;">
                <h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.25rem;margin-bottom:16px;">${type === 'report' ? 'Report an Issue' : 'Send Feedback'}</h3>
                <div class="input-group">
                    <label>Subject</label>
                    <input type="text" id="reportSubject" placeholder="Brief description...">
                </div>
                <div class="input-group">
                    <label>Details</label>
                    <textarea id="reportContent" rows="4" placeholder="Describe your ${type === 'report' ? 'issue' : 'feedback'}..." style="resize:vertical;"></textarea>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-outline btn-sm" style="flex:1;" id="reportCancel">Cancel</button>
                    <button class="btn btn-teal btn-sm" style="flex:1;" id="reportSubmit">Submit</button>
                </div>
            </div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('#reportCancel').onclick = () => overlay.remove();
            overlay.querySelector('#reportSubmit').onclick = async () => {
                const subject = document.getElementById('reportSubject').value.trim();
                const content = document.getElementById('reportContent').value.trim();
                if (!subject || !content) { showToast('Please fill in all fields', 'error'); return; }
                const result = await submitReport(user.username, type, subject, content);
                if (result.success) {
                    showToast(type === 'report' ? 'Report submitted!' : 'Feedback sent!', 'success');
                    overlay.remove();
                } else {
                    showToast(result.error, 'error');
                }
            };
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        };

        document.getElementById('reportBtn').addEventListener('click', () => window.showReportModal('report'));
        document.getElementById('feedbackBtn').addEventListener('click', () => window.showReportModal('feedback'));

        async function renderHome() {
            let html = `
            <section class="hero-section">
                <h2 class="hero-greeting">Welcome back, <span>${user.username}</span></h2>
                <div class="stats-row" id="statsRow">
                    <div class="glass-sm stat-card"><div class="stat-value" style="color:var(--teal)"><div class="spinner" style="width:16px;height:16px;"></div></div><div class="stat-label">Owned</div></div>
                    <div class="glass-sm stat-card"><div class="stat-value"><div class="spinner" style="width:16px;height:16px;"></div></div><div class="stat-label">Missing</div></div>
                    <div class="glass-sm stat-card"><div class="stat-value" style="color:var(--gold)"><div class="spinner" style="width:16px;height:16px;"></div></div><div class="stat-label">Rep</div></div>
                </div>
            </section>

            <div class="actions-row">
                <div class="glass action-card" data-nav="collection">
                    <div class="action-icon" style="background:rgba(0,212,170,0.12);color:var(--teal);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    </div>
                    <div class="action-title">My Collection</div>
                    <div class="action-desc" id="collectionCount">...</div>
                </div>
                <div class="glass action-card" data-nav="trade-hub" style="border-color:rgba(240,192,64,0.2);">
                    <div class="action-icon" style="background:rgba(240,192,64,0.12);color:var(--gold);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    </div>
                    <div class="action-title">Trade Hub</div>
                    <div class="action-desc">Find matches</div>
                </div>
            </div>

            <div id="pendingTradesSection"><div style="text-align:center;padding:20px;"><div class="spinner"></div></div></div>
            <div id="suggestedTradesSection"></div>`;

            html += renderBottomNav('home');
            const homeContent = document.getElementById('homeContent');
            homeContent.innerHTML = html;
            homeContent.classList.add('page-enter');

            (async () => {
                const adminMsg = await getAdminMessage();
                if (adminMsg.message) {
                    const msgHash = btoa(adminMsg.heading + adminMsg.message).substring(0, 30);
                    const dismissedKey = 'cth_admin_msg_' + msgHash;
                    const wasSeen = localStorage.getItem(dismissedKey);

                    if (adminMsg.mode === 'always' || !wasSeen) {
                        setTimeout(() => {
                            const overlay = document.createElement('div');
                            overlay.className = 'modal-overlay active';
                            overlay.innerHTML = `
                            <div class="modal-content" style="text-align:center;border:1px solid rgba(240,192,64,0.2);">
                                <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,rgba(240,192,64,0.15),rgba(0,212,170,0.1));display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--gold);">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                </div>
                                ${adminMsg.heading ? '<h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.375rem;margin-bottom:8px;background:linear-gradient(135deg,var(--gold),var(--teal));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">' + adminMsg.heading + '</h3>' : ''}
                                <p style="color:var(--text);font-size:0.875rem;line-height:1.6;margin-bottom:24px;white-space:pre-wrap;">${adminMsg.message}</p>
                                <button class="btn btn-teal btn-full" id="adminMsgOk">Got it!</button>
                            </div>`;
                            document.body.appendChild(overlay);

                            overlay.querySelector('#adminMsgOk').addEventListener('click', () => {
                                localStorage.setItem(dismissedKey, '1');
                                overlay.remove();
                            });
                            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
                        }, 1500);
                    }
                }
            })();

            document.getElementById('homeContent').querySelectorAll('[data-nav]').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-accept') || e.target.closest('.btn-reject')) return;
                    navigateTo(el.dataset.nav);
                });
            });
            document.getElementById('homeContent').querySelectorAll('[data-nav-screen]').forEach(btn => {
                btn.addEventListener('click', () => navigateTo(btn.dataset.navScreen));
            });

            loadStats();
            loadPendingTrades().catch(e => console.error('loadPendingTrades error:', e));
            setTimeout(() => loadSuggestedTrades().catch(e => console.error('loadSuggestedTrades error:', e)), 100);
        }

        async function loadStats() {
            const myCards = await getUserCards(user.username);
            const allCards = getActiveCards();
            const totalOwned = myCards.reduce((s, uc) => s + uc.quantity, 0);
            const uniqueOwned = myCards.length;
            const missing = allCards.length - uniqueOwned;
            const favorability = await getUserFavorability(user.username);
            const favBadge = getFavorabilityBadge(favorability);

            document.getElementById('statsRow').innerHTML = `
                <div class="glass-sm stat-card"><div class="stat-value" style="color:var(--teal)">${totalOwned}</div><div class="stat-label">Owned</div></div>
                <div class="glass-sm stat-card"><div class="stat-value">${missing}</div><div class="stat-label">Missing</div></div>
                <div class="glass-sm stat-card"><div class="stat-value" style="color:${favBadge.color}">${favorability}</div><div class="stat-label">${favBadge.label}</div></div>`;
            document.getElementById('collectionCount').textContent = uniqueOwned + ' cards';

            const unreadCount = await getUnreadCount(user.username);
            const msgBadge = document.getElementById('msgBadge');
            if (unreadCount > 0) {
                msgBadge.style.display = 'flex';
                msgBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            }

            checkTradeConfirmations();
            checkCodeTradeConfirmations();
        }

        async function checkCodeTradeConfirmations() {
            try {
                var copies = await getUserCodeCopies(user.username);
                var pending = copies.filter(function(c) { return c.status === 'pending'; });
                if (pending.length === 0) return;

                // Show confirmation for the most recent pending copy
                var copy = pending[0];
                showCodeTradeConfirmPopup(copy);
            } catch(e) { console.warn('Code trade confirmation check failed:', e); }
        }

        function showCodeTradeConfirmPopup(copy) {
            var codeTrade = copy.code_trades;
            var offeredCard = getCardById(copy.selected_offer_card_id);
            var creatorOfferedCard = getCardById(codeTrade.offered_card_ids[0]);
            var offeredImg = offeredCard ? getCardImageUrl(offeredCard) : null;
            var creatorOfferedImg = creatorOfferedCard ? getCardImageUrl(creatorOfferedCard) : null;
            var overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = '<div class="modal-content" style="text-align:center;">' +
                '<div style="width:50px;height:50px;border-radius:50%;background:rgba(0,212,170,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--teal);">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg></div>' +
                '<h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.25rem;margin-bottom:4px;">Code Exchange</h3>' +
                '<p style="color:var(--text-dim);font-size:0.75rem;margin-bottom:16px;">Trading with <strong style="color:var(--teal);">' + codeTrade.username + '</strong></p>' +
                (offeredCard && creatorOfferedCard ? '<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;">' +
                '<div style="text-align:center;"><div style="font-size:0.5rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--red);font-weight:600;margin-bottom:4px;">You give</div>' +
                '<div style="width:56px;height:75px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);margin:0 auto;">' +
                (offeredImg ? '<img src="' + offeredImg + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">' : '') +
                '</div></div>' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>' +
                '<div style="text-align:center;"><div style="font-size:0.5rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--teal);font-weight:600;margin-bottom:4px;">You get</div>' +
                '<div style="width:56px;height:75px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);margin:0 auto;">' +
                (creatorOfferedImg ? '<img src="' + creatorOfferedImg + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">' : '') +
                '</div></div></div>' : '') +
                '<p style="color:var(--text-dim);font-size:0.75rem;margin-bottom:16px;">Did the exchange code work successfully?</p>' +
                '<div style="display:flex;flex-direction:column;gap:8px;">' +
                '<button class="btn btn-teal btn-full btn-sm" id="codeConfirmYes">Yes, Trade Successful</button>' +
                '<button class="btn btn-full btn-sm" id="codeConfirmLater" style="background:rgba(240,192,64,0.15);color:var(--gold);border:1px solid rgba(240,192,64,0.3);">I\'ll Confirm Later</button>' +
                '<button class="btn btn-danger btn-full btn-sm" id="codeConfirmNo">No, Had Issues</button>' +
                '</div></div>';
            document.body.appendChild(overlay);

            overlay.querySelector('#codeConfirmYes').addEventListener('click', async function() {
                var btn = overlay.querySelector('#codeConfirmYes');
                btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;"></div> Confirming...';
                btn.disabled = true;
                var result = await confirmCodeTradeCopy(copy.id, user.username);
                overlay.remove();
                if (result.success) {
                    showToast('Trade completed! Your collection has been updated.', 'success');
                    // Refresh home
                    setTimeout(function() { window.location.reload(); }, 500);
                } else {
                    showToast('Could not confirm. Please try again.', 'error');
                }
            });

            overlay.querySelector('#codeConfirmLater').addEventListener('click', function() {
                overlay.remove();
                showToast('You can confirm later from your outgoing trades.', 'info');
            });

            overlay.querySelector('#codeConfirmNo').addEventListener('click', function() {
                overlay.remove();
                showCodeTradeIssueModal(copy);
            });

            overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
        }

        function showCodeTradeIssueModal(copy) {
            var reasons = ['Code already used by another player', 'Exchange code invalid', 'No such trade exists', 'Other issue'];
            var overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = '<div class="modal-content" style="text-align:center;">' +
                '<h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.25rem;margin-bottom:12px;">Exchange Issue</h3>' +
                '<p style="color:var(--text-dim);font-size:0.8125rem;margin-bottom:16px;">What went wrong?</p>' +
                '<div style="display:flex;flex-direction:column;gap:8px;">' +
                reasons.map(function(r) { return '<button class="btn btn-outline btn-sm code-reason-btn" data-reason="' + r + '">' + r + '</button>'; }).join('') +
                '</div></div>';
            document.body.appendChild(overlay);

            overlay.querySelectorAll('.code-reason-btn').forEach(function(btn) {
                btn.addEventListener('click', async function() {
                    await failCodeTradeCopy(copy.id, user.username, btn.dataset.reason);
                    showToast('Issue reported. This trade has been cancelled.', 'info');
                    overlay.remove();
                });
            });
            overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
        }

        async function checkTradeConfirmations() {
            if (!sb) return;
            try {
                const { data: acceptedTrades } = await sb.from('trades').select('*')
                    .or(`requester.eq.${user.username},receiver.eq.${user.username}`)
                    .eq('status', 'accepted');
                
                if (!acceptedTrades || acceptedTrades.length === 0) return;

                for (const trade of acceptedTrades) {
                    const needsConfirm = (trade.requester === user.username && !trade.confirmed_by_requester) ||
                                         (trade.receiver === user.username && !trade.confirmed_by_receiver);
                    if (needsConfirm) {
                        const snoozeKey = 'cth_trade_snooze_' + trade.trade_id;
                        const snoozeUntil = parseInt(localStorage.getItem(snoozeKey) || '0');
                        if (snoozeUntil > Date.now()) continue;

                        showTradeConfirmPopup(trade);
                        return;
                    }
                }
            } catch {}
        }

        function showTradeConfirmPopup(trade) {
            const otherUser = trade.requester === user.username ? trade.receiver : trade.requester;
            const giveCard = getCardById(trade.requester === user.username ? trade.requester_card_id : trade.receiver_card_id);
            const getCard = getCardById(trade.requester === user.username ? trade.receiver_card_id : trade.requester_card_id);

            // Check if other user has already confirmed
            const otherConfirmed = (trade.requester === user.username && trade.confirmed_by_receiver) ||
                                   (trade.receiver === user.username && trade.confirmed_by_requester);

            const confirmMsg = otherConfirmed
                ? `<strong style="color:var(--teal);">${otherUser}</strong> has confirmed this trade. Confirm on your end to complete the swap.`
                : `Did you successfully trade with <strong style="color:var(--teal);">${otherUser}</strong> in-game?`;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
            <div class="modal-content" style="text-align:center;">
                <div style="width:50px;height:50px;border-radius:50%;background:rgba(240,192,64,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--gold);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
                </div>
                <h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.25rem;margin-bottom:8px;">Trade Confirmation</h3>
                <p style="color:var(--text-dim);font-size:0.8125rem;margin-bottom:16px;">${confirmMsg}</p>
                ${giveCard && getCard ? `<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;">
                    <div style="text-align:center;">
                        <div style="font-size:0.5rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--red);font-weight:600;margin-bottom:4px;">You give</div>
                        <div class="card-placeholder card-${giveCard.type.toLowerCase()}" style="width:60px;border-radius:8px;overflow:hidden;">
                            ${getCardImageUrl(giveCard) ? '<img src="' + getCardImageUrl(giveCard) + '" style="width:100%;height:auto;display:block;" onerror="this.style.display=\'none\'">' : ''}
                        </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
                    <div style="text-align:center;">
                        <div style="font-size:0.5rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--teal);font-weight:600;margin-bottom:4px;">You get</div>
                        <div class="card-placeholder card-${getCard.type.toLowerCase()}" style="width:60px;border-radius:8px;overflow:hidden;">
                            ${getCardImageUrl(getCard) ? '<img src="' + getCardImageUrl(getCard) + '" style="width:100%;height:auto;display:block;" onerror="this.style.display=\'none\'">' : ''}
                        </div>
                    </div>
                </div>` : ''}
                <p style="color:var(--text-dim);font-size:0.75rem;margin-bottom:16px;">Confirming will update your collection automatically.</p>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button class="btn btn-teal btn-full btn-sm" id="tradeConfirmYes">Yes, Trade Successful</button>
                    <button class="btn btn-full btn-sm" id="tradeConfirmInProgress" style="background:rgba(240,192,64,0.15);color:var(--gold);border:1px solid rgba(240,192,64,0.3);">Currently In Progress</button>
                    <button class="btn btn-danger btn-full btn-sm" id="tradeConfirmNo">No, Had Issues</button>
                </div>
            </div>`;
            document.body.appendChild(overlay);

            overlay.querySelector('#tradeConfirmYes').addEventListener('click', async () => {
                const btn = overlay.querySelector('#tradeConfirmYes');
                btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;"></div> Confirming...';
                btn.disabled = true;
                
                const result = await confirmTrade(trade.trade_id, user.username);
                overlay.remove();
                
                if (result) {
                    // Send system message in chat
                    const convId = getConversationId(user.username, otherUser);
                    await sendMessage(convId, user.username, otherUser, 'Trade marked as completed by ' + user.username, 'system');
                    showToast('Your collection has been updated!', 'success');
                    renderHome();
                } else {
                    showToast('Could not confirm. Please try again.', 'error');
                }
            });

            overlay.querySelector('#tradeConfirmInProgress').addEventListener('click', () => {
                const snoozeUntil = Date.now() + (2 * 60 * 60 * 1000);
                const snoozeKey = 'cth_trade_snooze_' + trade.trade_id;
                localStorage.setItem(snoozeKey, snoozeUntil.toString());
                overlay.remove();
                showToast('Trade snoozed for 2 hours', 'info');
            });

            overlay.querySelector('#tradeConfirmNo').addEventListener('click', () => {
                overlay.remove();
                showTradeIssueModal(trade, otherUser);
            });

            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        }

        function showTradeIssueModal(trade, otherUser) {
            const reasons = ['Card not received', 'Wrong card received', 'Other user didn\'t respond', 'Changed my mind', 'Other'];
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
            <div class="modal-content" style="text-align:center;">
                <h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.25rem;margin-bottom:12px;">Trade Issue</h3>
                <p style="color:var(--text-dim);font-size:0.8125rem;margin-bottom:16px;">What went wrong?</p>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${reasons.map(r => `<button class="btn btn-outline btn-sm trade-reason-btn" data-reason="${r}">${r}</button>`).join('')}
                </div>
            </div>`;
            document.body.appendChild(overlay);

            overlay.querySelectorAll('.trade-reason-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await updateTradeStatus(trade.trade_id, 'rejected', btn.dataset.reason);
                    showToast('Trade marked as unsuccessful.', 'info');
                    overlay.remove();
                });
            });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        }

        async function loadPendingTrades() {
            const section = document.getElementById('pendingTradesSection');
            if (!section) { console.warn('pendingTradesSection not found'); return; }

            if (!sb) { console.warn('Supabase not initialized for pending trades'); section.innerHTML = ''; return; }

            let incoming = [], outgoing = [];
            try {
                incoming = await getIncomingTrades(user.username);
                outgoing = (await getOutgoingTrades(user.username)).filter(t => t.status === 'pending');
            } catch(e) { console.error('Error fetching trades:', e); section.innerHTML = ''; return; }

            // Get pending code exchanges
            let codeCopies = [];
            try {
                var allCopies = await getUserCodeCopies(user.username);
                codeCopies = allCopies.filter(function(c) { return c.status === 'pending'; });
            } catch(e) { console.warn('Code copies fetch failed:', e); }

            if (incoming.length === 0 && outgoing.length === 0 && codeCopies.length === 0) {
                section.innerHTML = '';
                return;
            }

            let html = `<section style="margin-top:20px;">
                <div class="section-title"><div class="section-title-bar" style="background:var(--gold);"></div><h3>Pending Trades</h3><a class="view-all" data-nav="trades">VIEW ALL</a></div>`;

            for (const trade of incoming.slice(0, 3)) {
                const theirCard = getCardById(trade.requester_card_id);
                const myCard = getCardById(trade.receiver_card_id);
                if (!theirCard || !myCard) continue;
                html += `
                <div class="glass-sm pending-item" data-nav="trades">
                    <div class="pending-header">
                        <div class="pending-user">
                            <div class="pending-avatar">${trade.requester.charAt(0).toUpperCase()}</div>
                            <div><div class="pending-name">From: ${trade.requester}</div><div class="pending-time">${timeAgo(trade.created_at)}</div></div>
                        </div>
                        <span class="status-badge status-pending">PENDING</span>
                    </div>
                    ${renderTradeSwap(myCard, theirCard, { giveLabel: 'YOU GIVE', receiveLabel: 'THEY GIVE' })}
                    <div class="pending-actions">
                        <button class="btn btn-teal btn-sm btn-accept" style="flex:1;" data-trade-id="${trade.trade_id}">ACCEPT</button>
                        <button class="btn btn-danger btn-sm btn-reject" style="flex:1;" data-trade-id="${trade.trade_id}">REJECT</button>
                    </div>
                </div>`;
            }

            // Code exchanges
            for (const copy of codeCopies.slice(0, 2)) {
                var ct = copy.code_trades;
                var wantedCard = getCardById(ct.wanted_card_id);
                var offeredCard = getCardById(copy.selected_offer_card_id);
                if (!wantedCard || !offeredCard) continue;
                html += `
                <div class="glass-sm pending-item" data-nav="code-trades" style="border-color:rgba(240,192,64,0.2);">
                    <div class="pending-header">
                        <div class="pending-user">
                            <div class="pending-avatar" style="background:linear-gradient(135deg,#f0c040,#00d4aa);">${ct.username.charAt(0).toUpperCase()}</div>
                            <div><div class="pending-name">Code Exchange: ${ct.username}</div><div class="pending-time">${timeAgo(copy.created_at)}</div></div>
                        </div>
                        <span class="status-badge status-pending">CODE</span>
                    </div>
                    ${renderTradeSwap(offeredCard, wantedCard, { giveLabel: 'YOU GIVE', receiveLabel: 'YOU GET' })}
                    <div style="margin-top:8px;padding:6px 10px;background:rgba(0,212,170,0.06);border-radius:6px;font-size:0.6875rem;color:var(--teal);text-align:center;">Paste code in game → Confirm when done</div>
                </div>`;
            }

            for (const trade of outgoing.slice(0, 2)) {
                const giveCard = getCardById(trade.requester_card_id);
                const receiveCard = getCardById(trade.receiver_card_id);
                if (!giveCard || !receiveCard) continue;
                html += `
                <div class="glass-sm pending-item" style="opacity:0.7;">
                    <div class="pending-header">
                        <div class="pending-user">
                            <div class="pending-avatar">${trade.receiver.charAt(0).toUpperCase()}</div>
                            <div><div class="pending-name">To: ${trade.receiver}</div><div class="pending-time">${timeAgo(trade.created_at)}</div></div>
                        </div>
                        <span class="status-badge status-pending">WAITING</span>
                    </div>
                    ${renderTradeSwap(giveCard, receiveCard, { giveLabel: 'YOU GIVE', receiveLabel: 'YOU GET' })}
                </div>`;
            }

            html += '</section>';
            section.innerHTML = html;

            document.getElementById('homeContent').querySelectorAll('[data-nav]').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-accept') || e.target.closest('.btn-reject')) return;
                    navigateTo(el.dataset.nav);
                });
            });
            document.getElementById('homeContent').querySelectorAll('.btn-accept').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const tradeId = btn.dataset.tradeId;
                    const allIncoming = await getIncomingTrades(user.username);
                    const tradeInfo = allIncoming.find(t => t.trade_id === tradeId);
                    
                    await updateTradeStatus(tradeId, 'accepted');
                    showToast('Trade accepted!', 'success');
                    
                    if (tradeInfo) {
                        const convId = getConversationId(user.username, tradeInfo.requester);
                        await sendMessage(convId, user.username, tradeInfo.requester, 'Trade accepted! Check your trades to confirm when complete.', 'system');
                        navigateTo('chat-window', convId, tradeInfo.requester);
                    } else {
                        renderHome();
                    }
                });
            });
            document.getElementById('homeContent').querySelectorAll('.btn-reject').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await updateTradeStatus(btn.dataset.tradeId, 'rejected', 'Not interested');
                    showToast('Trade rejected.', 'info');
                    renderHome();
                });
            });
        }

        async function loadSuggestedTrades() {
            const section = document.getElementById('suggestedTradesSection');
            if (!section) return;

            try {
                const myCards = await getUserCards(user.username);
                const allCards = getActiveCards() || [];
                const missingCards = allCards.filter(c => !myCards.find(uc => uc.card_id === c.card_id));
                const dismissed = JSON.parse(localStorage.getItem('cth_dismissed_suggestions') || '[]');
                const suggestions = [];
                const myTrades = await getTradesForUser(user.username);
                const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

                for (const wanted of missingCards.slice(0, 15)) {
                    if (dismissed.includes(wanted.card_id)) continue;
                    if (myCards.find(uc => uc.card_id === wanted.card_id)) continue;
                    
                    const matches = await findMatches(user.username, wanted.card_id);
                    
                    // Also check for active trades with users who have this card
                    const activeTradeMatches = [];
                    for (const t of myTrades) {
                        if (!['pending', 'accepted'].includes(t.status)) continue;
                        const otherUser = t.requester === user.username ? t.receiver : t.requester;
                        const tradeCardId = t.requester === user.username ? t.receiver_card_id : t.requester_card_id;
                        if (tradeCardId === wanted.card_id && !matches.find(m => m.username === otherUser)) {
                            const myGiveCardId = t.requester === user.username ? t.requester_card_id : t.receiver_card_id;
                            activeTradeMatches.push({
                                username: otherUser,
                                they_need: [myGiveCardId],
                                mutual_score: 0,
                                existingTrade: t
                            });
                        }
                    }
                    
                    const allMatches = [...matches, ...activeTradeMatches];
                    if (allMatches.length > 0) {
                        const topMatch = allMatches.find(m => m.mutual_score > 0) || allMatches[0];
                        const myGiveCardId = topMatch.they_need && topMatch.they_need[0];
                        if (myGiveCardId) {
                            const onCooldown = myTrades.some(t => {
                                if (new Date(t.created_at).getTime() < threeDaysAgo) return false;
                                if (!['completed','rejected'].includes(t.status)) return false;
                                const sameUsers = (t.requester === user.username && t.receiver === topMatch.username) || (t.receiver === user.username && t.requester === topMatch.username);
                                const samePair = (t.requester_card_id === myGiveCardId && t.receiver_card_id === wanted.card_id) || (t.receiver_card_id === myGiveCardId && t.requester_card_id === wanted.card_id);
                                return sameUsers && samePair;
                            });
                            if (!onCooldown) {
                                let existingTrade = topMatch.existingTrade || null;
                                if (!existingTrade) {
                                    try {
                                        existingTrade = await getExistingTradeBetween(user.username, topMatch.username);
                                    } catch(e) { console.warn('getExistingTradeBetween error:', e); }
                                }
                                suggestions.push({
                                    wanted: wanted,
                                    give: getCardById(myGiveCardId),
                                    matchUser: topMatch.username,
                                    score: topMatch.mutual_score,
                                    existingTrade: existingTrade
                                });
                            }
                        }
                    }
                    if (suggestions.length >= 3) break;
                }

                if (suggestions.length > 0) {
                    let html = `
                    <section style="margin-top:20px;">
                        <div class="section-title">
                            <div class="section-title-bar"></div>
                            <h3>Suggested Trades</h3>
                            <a class="view-all" data-nav="trade-hub">VIEW ALL</a>
                        </div>
                        <div class="suggested-trades">`;

                    for (let si = 0; si < suggestions.length; si++) {
                        const s = suggestions[si];
                        const hasExisting = !!s.existingTrade;
                        const giveImg = getCardImageUrl(s.give);
                        const wantImg = getCardImageUrl(s.wanted);
                        html += `
                        <div class="glass-sm suggested-trade-item" style="padding:12px;margin-bottom:10px;${hasExisting ? 'opacity:0.45;filter:grayscale(30%);' : ''}" data-suggest-idx="${si}">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="flex:1;text-align:center;">
                                    <span class="label" style="color:var(--red);display:block;margin-bottom:6px;">YOU GIVE</span>
                                    <div class="card-placeholder card-${s.give.type.toLowerCase()}" style="width:100%;max-width:100px;margin:0 auto;">
                                        ${giveImg ? '<img src="' + giveImg + '" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'">' : ''}
                                    </div>
                                </div>
                                <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:6px;">
                                    <div style="padding:6px 12px;border-radius:20px;background:rgba(0,212,170,0.1);display:flex;align-items:center;gap:6px;">
                                        <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--teal));display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--bg);">${s.matchUser.charAt(0).toUpperCase()}</div>
                                        <span style="font-size:0.75rem;font-weight:600;color:var(--teal);">${s.matchUser}</span>
                                    </div>
                                    <div style="width:32px;height:32px;border-radius:50%;background:rgba(0,212,170,0.15);display:flex;align-items:center;justify-content:center;color:var(--teal);">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                                    </div>
                                </div>
                                <div style="flex:1;text-align:center;">
                                    <span class="label" style="color:var(--teal);display:block;margin-bottom:6px;">YOU GET</span>
                                    <div class="card-placeholder card-${s.wanted.type.toLowerCase()}" style="width:100%;max-width:100px;margin:0 auto;">
                                        ${wantImg ? '<img src="' + wantImg + '" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'">' : ''}
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex;gap:8px;margin-top:10px;">
                                ${hasExisting
                                    ? '<button class="btn btn-outline btn-sm" style="flex:1;color:var(--gold);border-color:rgba(240,192,64,0.3);" data-view-blocked="' + s.matchUser + '|' + s.existingTrade.trade_id + '">VIEW EXISTING TRADE</button>'
                                    : '<button class="btn btn-teal btn-sm" style="flex:1;" data-interested="' + s.give.card_id + '|' + s.wanted.card_id + '|' + s.matchUser + '">INTERESTED</button><button class="btn btn-outline btn-sm" style="flex:1;" data-dismiss="' + s.wanted.card_id + '">NOT INTERESTED</button>'
                                }
                            </div>
                        </div>`;
                    }
                    html += '</div></section>';
                    section.innerHTML = html;

                    document.getElementById('homeContent').querySelectorAll('[data-interested]').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            navigateTo('trade-detail', ...btn.dataset.interested.split('|'));
                        });
                    });
                    document.getElementById('homeContent').querySelectorAll('[data-dismiss]').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const cardId = btn.dataset.dismiss;
                            const dismissed = JSON.parse(localStorage.getItem('cth_dismissed_suggestions') || '[]');
                            if (!dismissed.includes(cardId)) dismissed.push(cardId);
                            localStorage.setItem('cth_dismissed_suggestions', JSON.stringify(dismissed));
                            btn.closest('.suggested-trade-item').style.display = 'none';
                        });
                    });
                    document.getElementById('homeContent').querySelectorAll('[data-nav]').forEach(el => {
                        el.addEventListener('click', () => navigateTo(el.dataset.nav));
                    });

                    document.getElementById('homeContent').querySelectorAll('[data-view-blocked]').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const parts = btn.dataset.viewBlocked.split('|');
                            showExistingTradePopup(parts[0], parts[1]);
                        });
                    });
                } else {
                    section.innerHTML = '';
                }
            } catch (e) {
                console.warn('Load suggestions failed:', e);
                if (section) section.innerHTML = '';
            }
        }

        async function showExistingTradePopup(targetUser, tradeId) {
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
                    <button class="btn btn-teal btn-full" id="blockedComplete">Complete Trade</button>
                    <button class="btn btn-danger btn-full btn-sm" id="blockedCancelTrade">Cancel Previous Trade</button>
                    <button class="btn btn-outline btn-full btn-sm" id="blockedClose" style="color:var(--text-dim);">Close</button>
                </div>
            </div>`;
            document.body.appendChild(overlay);

            document.getElementById('blockedComplete').addEventListener('click', () => {
                overlay.remove();
                navigateTo('chat-window', convId, targetUser);
            });

            document.getElementById('blockedCancelTrade').addEventListener('click', async () => {
                await cancelTradeAsReject(tradeId, user.username);
                overlay.remove();
                showToast('Previous trade cancelled', 'info');
                renderHome();
            });

            document.getElementById('blockedClose').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        }

        window.acceptTrade = async function(tradeId) {
            await updateTradeStatus(tradeId, 'accepted');
            showToast('Trade accepted! Check contact details.', 'success');
            renderHome();
        };

        window.rejectTrade = async function(tradeId) {
            await updateTradeStatus(tradeId, 'rejected', 'Not interested');
            showToast('Trade rejected.', 'info');
            renderHome();
        };

        renderHome();

        // Poll for new messages every 5 seconds
        setInterval(async () => {
            try {
                const unreadCount = await getUnreadCount(user.username);
                const msgBadge = document.getElementById('msgBadge');
                if (msgBadge) {
                    if (unreadCount > 0) {
                        msgBadge.style.display = 'flex';
                        msgBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    } else {
                        msgBadge.style.display = 'none';
                    }
                }
            } catch {}
        }, 5000);
    })();
