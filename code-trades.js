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
    if (!user) { window.location.href = './login.html'; return; }

    let activeTab = 'browse';
    let showRelevantOnly = localStorage.getItem('ct_relevant_toggle') !== 'false';
    let myCards = [];
    let myCardIds = new Set();
    let currentCopyTrade = null;

    await expireOldCodeTrades();
    if (typeof cancelOldCodeCopies === 'function') {
        try { await cancelOldCodeCopies(); } catch(e) { /* Table may not exist yet */ }
    }
    await loadMyCards();
    await render();

    async function loadMyCards() {
        myCards = await getUserCards(user.username);
        myCardIds = new Set(myCards.map(mc => mc.card_id));
    }

    async function render() {
        let allTrades = await getActiveCodeTrades();

        // Get user's copies to track which trades they've initiated
        var userCopies = [];
        try { userCopies = await getUserCodeCopies(user.username); } catch(e) {}
        var copiedTradeIds = new Set(userCopies.map(function(c) { return c.code_trade_id; }));

        let trades;
        if (activeTab === 'my') {
            var myTrades = await getUserCodeTrades(user.username);
            trades = myTrades;
        } else if (showRelevantOnly) {
            // Only show trades where user has at least one card of the same type as the wanted card
            trades = allTrades.filter(function(t) {
                var wantedCard = getCardById(t.wanted_card_id);
                if (!wantedCard) return false;
                return myCards.some(function(mc) {
                    var card = getCardById(mc.card_id);
                    return card && card.type === wantedCard.type && mc.quantity >= 1;
                });
            });
        } else {
            trades = allTrades;
        }

        let content = '';

        // Toolbar
        content += '<div class="ct-toolbar">';
        if (activeTab === 'browse') {
            content += '<div class="ct-toggle-group">';
            content += '<span class="ct-toggle-label' + (!showRelevantOnly ? ' active' : '') + '">All</span>';
            content += '<div class="ct-toggle-switch' + (showRelevantOnly ? ' on' : '') + '" id="ctToggle"></div>';
            content += '<span class="ct-toggle-label' + (showRelevantOnly ? ' active' : '') + '">Relevant</span>';
            content += '</div>';
        } else {
            content += '<div></div>';
        }
        content += '<button class="ct-create-btn" id="ctCreateBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Create Trade</button>';
        content += '</div>';

        // Tabs
        content += '<div class="ct-tabs">';
        content += '<button class="ct-tab' + (activeTab === 'browse' ? ' active' : '') + '" data-ct-tab="browse">Browse Trades</button>';
        content += '<button class="ct-tab' + (activeTab === 'my' ? ' active' : '') + '" data-ct-tab="my">My Trades</button>';
        content += '</div>';

        // Grid
        content += '<div class="ct-grid" id="ctGrid">';

        if (trades.length === 0) {
            content += '<div class="ct-empty"><div class="ct-empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div><div>' + (activeTab === 'my' ? 'You have no code trades yet' : 'No active code trades') + '</div></div>';
        } else {
            for (var i = 0; i < trades.length; i++) {
                content += renderTradeCard(trades[i], copiedTradeIds.has(trades[i].id));
            }
        }

        content += '</div>';
        content += renderBottomNav('code-trades');
        document.getElementById('app').innerHTML = content;

        // Create button
        document.getElementById('ctCreateBtn').addEventListener('click', function() { showCreateFlow(); });

        // Tabs
        document.querySelectorAll('[data-ct-tab]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                activeTab = btn.dataset.ctTab;
                render();
            });
        });

        // Toggle
        var toggle = document.getElementById('ctToggle');
        if (toggle) {
            toggle.addEventListener('click', function() {
                showRelevantOnly = !showRelevantOnly;
                localStorage.setItem('ct_relevant_toggle', showRelevantOnly ? 'true' : 'false');
                render();
            });
        }

        // Copy code buttons
        document.querySelectorAll('[data-ct-copy]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var tradeId = parseInt(btn.dataset.ctCopy);
                var trade = trades.find(function(t) { return t.id === tradeId; });
                if (trade) showCopyCodeFlow(trade);
            });
        });

        // Delete
        document.querySelectorAll('[data-ct-delete]').forEach(function(btn) {
            btn.addEventListener('click', async function() {
                if (confirm('Delete this trade?')) {
                    await deleteCodeTrade(parseInt(btn.dataset.ctDelete), user.username);
                    showToast('Trade deleted', 'success');
                    render();
                }
            });
        });
    }

    function renderTradeCard(t, isCopied) {
        var wantedCard = getCardById(t.wanted_card_id);
        var offeredCards = t.offered_card_ids.map(function(id) { return getCardById(id); }).filter(Boolean);
        var wantedImg = wantedCard ? getCardImageUrl(wantedCard) : null;
        var isOwner = t.username === user.username;
        var isActive = t.status === 'active';
        var isExpired = t.status === 'expired';
        var isCompleted = t.status === 'completed';
        var copyCount = t.copy_count || 0;

        var html = '<div class="ct-card' + (isExpired ? ' ct-expired-card' : '') + (isCompleted ? ' ct-expired-card' : '') + (isCopied ? ' ct-copied-card' : '') + '">';

        // Header
        html += '<div class="ct-card-header">';
        html += '<div class="ct-card-header-left">';
        html += '<div class="ct-card-avatar">' + t.username.charAt(0).toUpperCase() + '</div>';
        html += '<div><div class="ct-card-user-name">' + t.username + '</div><div class="ct-card-user-time">' + timeAgo(t.created_at) + (copyCount > 0 ? ' · ' + copyCount + ' cop' + (copyCount > 1 ? 'ies' : 'y') : '') + '</div></div>';
        html += '</div>';
        if (isExpired || isCompleted) {
            html += '<span class="ct-your-offer-pill">' + (isCompleted ? 'Completed' : 'Expired') + '</span>';
        } else if (isCopied) {
            html += '<span class="ct-your-offer-pill" style="background:rgba(255,255,255,0.08);color:var(--text-dim);">Exchange Initiated</span>';
        } else if (isActive && !isOwner) {
            // Normal trade: Copy Code button at top right
            html += '<button class="ct-copy-code-btn" data-ct-copy="' + t.id + '"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy Code</button>';
        } else if (isActive && isOwner) {
            html += '<span class="ct-your-offer-pill">Your Offer</span>';
        }
        html += '</div>';

        // Body
        html += '<div class="ct-card-body">';
        html += '<div class="ct-card-trade-row">';

        html += '<div class="ct-card-side"><div class="ct-card-side-label offers">Offers</div><div class="ct-card-side-cards">';
        for (var i = 0; i < offeredCards.length; i++) {
            var img = getCardImageUrl(offeredCards[i]);
            if (img) html += '<div class="ct-card-side-card"><img src="' + img + '" onerror="this.style.display=\'none\'"></div>';
        }
        html += '</div></div>';

        html += '<div class="ct-card-arrow"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>';

        html += '<div class="ct-card-side"><div class="ct-card-side-label wants">Wants</div><div class="ct-card-side-cards">';
        if (wantedImg) html += '<div class="ct-card-side-card"><img src="' + wantedImg + '" onerror="this.style.display=\'none\'"></div>';
        html += '</div></div>';

        html += '</div></div>';

        // Footer
        html += '<div class="ct-card-footer">';
        if (isCopied) {
            // Grayed out: show Copy Code button at bottom right
            html += '<div style="font-size:0.625rem;color:var(--text-dim);flex:1;">You have initiated this exchange.</div>';
            html += '<button class="btn btn-teal btn-sm" data-ct-copy="' + t.id + '">Copy Code</button>';
        }
        if ((isActive || isExpired || isCompleted) && isOwner && activeTab === 'my') html += '<button class="btn btn-danger-outline btn-sm" data-ct-delete="' + t.id + '">Delete</button>';
        html += '</div></div>';

        return html;
    }

    // ============ COPY CODE FLOW ============

    function showCopyCodeFlow(trade) {
        var wantedCard = getCardById(trade.wanted_card_id);
        var wantedType = wantedCard ? wantedCard.type : '';

        // Check if user has any card of the same type
        var matchingCards = myCards.filter(function(mc) {
            var card = getCardById(mc.card_id);
            return card && card.type === wantedType && mc.quantity >= 1;
        });

        if (matchingCards.length === 0) {
            showToast('You do not have any ' + wantedType + ' cards to offer for this trade.', 'error');
            return;
        }

        var offeredCards = trade.offered_card_ids.map(function(id) { return getCardById(id); }).filter(Boolean);
        var wantedImg = wantedCard ? getCardImageUrl(wantedCard) : null;
        var myCard = getCardById(matchingCards[0].card_id);
        var myCardImg = myCard ? getCardImageUrl(myCard) : null;

        currentCopyTrade = trade;

        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay active ct-copy-modal';

        var bodyHtml = '<h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.0625rem;margin-bottom:4px;">Exchange Code</h3>';
        bodyHtml += '<p style="font-size:0.6875rem;color:var(--text-dim);margin-bottom:12px;">Trading with ' + trade.username + '</p>';

        // Cards: You Get (all their offers) ← You Give (your matching card)
        bodyHtml += '<div class="ct-confirm-trade">';

        // You Get - show all offered cards
        bodyHtml += '<div class="ct-confirm-side"><div class="ct-confirm-side-cards">';
        for (var i = 0; i < offeredCards.length; i++) {
            var oImg = getCardImageUrl(offeredCards[i]);
            bodyHtml += '<div class="ct-card-side-card">' + (oImg ? '<img src="' + oImg + '" onerror="this.style.display=\'none\'">' : '') + '</div>';
        }
        bodyHtml += '</div><div class="ct-confirm-side-label wants">You Get</div></div>';

        bodyHtml += '<div class="ct-confirm-arrow">←</div>';

        // You Give - show actual card image
        bodyHtml += '<div class="ct-confirm-side"><div class="ct-card-side-card">' + (myCardImg ? '<img src="' + myCardImg + '" onerror="this.style.display=\'none\'">' : '') + '</div><div class="ct-confirm-side-label offers">You Give</div></div>';

        bodyHtml += '</div>';

        // Code display
        bodyHtml += '<div class="ct-copy-modal-code" id="ctTradeCode">' + escapeHtml(trade.trade_code) + '</div>';

        // Instructions
        bodyHtml += '<div class="ct-copy-modal-instructions"><strong>How to trade:</strong><br><br>1. Tap "Copy Code" to copy the code<br>2. Open PUBG Mobile<br>3. Go to Cards → Exchange Records<br>4. Paste the code and click Exchange<br>5. Confirm the exchange and click OK</div>';

        // Actions
        bodyHtml += '<div class="ct-copy-modal-actions">';
        bodyHtml += '<button class="btn btn-outline btn-sm" id="ctCopyCancel">Cancel</button>';
        bodyHtml += '<button class="btn btn-teal btn-sm" id="ctCopyCode">Copy Code</button>';
        bodyHtml += '</div>';

        overlay.innerHTML = '<div class="modal-content">' + bodyHtml + '</div>';
        document.body.appendChild(overlay);

        overlay.querySelector('#ctCopyCancel').onclick = function() { overlay.remove(); currentCopyTrade = null; };
        overlay.querySelector('#ctCopyCode').onclick = function() {
            var code = trade.trade_code;

            // Copy to clipboard
            var ta = document.createElement('textarea');
            ta.value = code;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);

            // Create copy record (auto-select first matching card)
            var selectedOffer = matchingCards[0].card_id;
            copyCodeTrade(trade.id, user.username, selectedOffer).then(function(result) {
                if (result) {
                    showToast('Code copied! Trade added to your outgoing trades.', 'success');
                } else {
                    showToast('Code copied!', 'success');
                }
                overlay.remove();
                currentCopyTrade = null;
            });
        };
        overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.remove(); currentCopyTrade = null; } });
    }

    // ============ CREATE FLOW ============

    var createStep = 1;
    var createWantedCard = null;
    var createOfferCards = [];
    var createExpireDays = 3;
    var createCode = '';

    function showCreateFlow() {
        createStep = 1;
        createWantedCard = null;
        createOfferCards = [];
        createExpireDays = 3;
        createCode = '';
        renderCreateStep();
    }

    function renderCreateStep() {
        var existing = document.querySelector('.ct-flow-modal');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay active ct-flow-modal';

        var bodyHtml = '';

        if (createStep === 1) {
            var allCards = getAllCards();
            var categories = CARD_CATEGORIES;

            bodyHtml = '<div class="ct-flow-header"><h3 class="ct-flow-title">Select Card You Want</h3><span class="ct-flow-step">Step 1 of 4</span></div>';
            bodyHtml += '<div class="ct-flow-progress"><div class="ct-flow-dot active"></div><div class="ct-flow-dot"></div><div class="ct-flow-dot"></div><div class="ct-flow-dot"></div></div>';
            bodyHtml += '<div class="ct-flow-body">';
            bodyHtml += '<span class="ct-flow-section-label">Choose any card you want</span>';

            for (var ci = 0; ci < categories.length; ci++) {
                var cat = categories[ci];
                var catCards = sortCardsByOrder(allCards.filter(function(c) { return c.category === cat.id && c.is_active; }));
                if (catCards.length === 0) continue;

                bodyHtml += '<div class="ct-flow-category"><div class="ct-flow-category-title">' + cat.name + '</div>';
                bodyHtml += '<div class="ct-flow-card-grid">';
                for (var j = 0; j < catCards.length; j++) {
                    var c = catCards[j];
                    var img = getCardImageUrl(c);
                    var selected = (createWantedCard && createWantedCard.card_id === c.card_id) ? 'selected' : '';
                    bodyHtml += '<div class="ct-flow-card-item ' + selected + '" data-ct-want="' + c.card_id + '">' + (img ? '<img src="' + img + '" onerror="this.style.display=\'none\'">' : '') + '</div>';
                }
                bodyHtml += '</div></div>';
            }
            bodyHtml += '</div>';
            bodyHtml += '<div class="ct-flow-actions"><button class="btn btn-outline btn-sm ct-flow-cancel">Cancel</button><button class="btn btn-teal btn-sm ct-flow-next"' + (!createWantedCard ? ' disabled style="opacity:0.4;pointer-events:none;"' : '') + '>Next</button></div>';
        }

        else if (createStep === 2) {
            var wantedType = createWantedCard.type;
            var offerableCards = myCards.filter(function(mc) {
                var card = getCardById(mc.card_id);
                // Only show cards of the same type with 2+ copies, excluding the wanted card
                return card && card.type === wantedType && mc.quantity >= 2 && mc.card_id !== createWantedCard.card_id;
            }).map(function(mc) { return getCardById(mc.card_id); }).filter(Boolean);

            bodyHtml = '<div class="ct-flow-header"><h3 class="ct-flow-title">Cards to Offer</h3><span class="ct-flow-step">Step 2 of 4</span></div>';
            bodyHtml += '<div class="ct-flow-progress"><div class="ct-flow-dot active"></div><div class="ct-flow-dot active"></div><div class="ct-flow-dot"></div><div class="ct-flow-dot"></div></div>';
            bodyHtml += '<div class="ct-flow-body">';

            if (offerableCards.length === 0) {
                bodyHtml += '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:0.8125rem;">No ' + wantedType + ' cards in your collection to offer</div>';
            } else {
                bodyHtml += '<span class="ct-flow-section-label">Select 1-3 ' + wantedType + ' cards to offer</span>';
                bodyHtml += '<div class="ct-flow-card-grid">';
                for (var k = 0; k < offerableCards.length; k++) {
                    var oc = offerableCards[k];
                    var oimg = getCardImageUrl(oc);
                    var oMc = myCards.find(function(m) { return m.card_id === oc.card_id; });
                    var isSelected = createOfferCards.indexOf(oc.card_id) !== -1;
                    var isDisabled = !isSelected && createOfferCards.length >= 3;
                    bodyHtml += '<div class="ct-flow-card-item ' + (isSelected ? 'selected' : '') + (isDisabled ? 'disabled' : '') + '" data-ct-offer="' + oc.card_id + '" title="' + oc.card_name + ' (x' + (oMc ? oMc.quantity : 0) + ')">' + (oimg ? '<img src="' + oimg + '" onerror="this.style.display=\'none\'">' : '') + '</div>';
                }
                bodyHtml += '</div>';
                bodyHtml += '<div style="font-size:0.5625rem;color:var(--text-dim);text-align:center;margin-bottom:12px;">Selected: ' + createOfferCards.length + '/3</div>';
            }
            bodyHtml += '</div>';
            bodyHtml += '<div class="ct-flow-actions"><button class="btn btn-outline btn-sm ct-flow-back">Back</button><button class="btn btn-teal btn-sm ct-flow-next"' + (createOfferCards.length === 0 ? ' disabled style="opacity:0.4;pointer-events:none;"' : '') + '>Next</button></div>';
        }

        else if (createStep === 3) {
            var today = new Date();
            var dayOptions = [];
            for (var d = 1; d <= CODE_TRADE_MAX_DAYS; d++) {
                var dayDate = new Date(today);
                dayDate.setDate(dayDate.getDate() + d);
                dayOptions.push({
                    days: d,
                    num: dayDate.getDate(),
                    lbl: dayDate.toLocaleDateString('en', { weekday: 'short' }).charAt(0),
                    fullDate: dayDate.toISOString().split('T')[0],
                    label: dayDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })
                });
            }

            bodyHtml = '<div class="ct-flow-header"><h3 class="ct-flow-title">Enter Trade Code</h3><span class="ct-flow-step">Step 3 of 4</span></div>';
            bodyHtml += '<div class="ct-flow-progress"><div class="ct-flow-dot active"></div><div class="ct-flow-dot active"></div><div class="ct-flow-dot active"></div><div class="ct-flow-dot"></div></div>';
            bodyHtml += '<div class="ct-flow-body">';

            bodyHtml += '<span class="ct-flow-section-label">Enter 8-digit trade code</span>';
            bodyHtml += '<input type="text" class="ct-flow-input" id="ctCodeInput" placeholder="12345678" maxlength="8" inputmode="numeric" value="' + escapeHtml(createCode) + '">';
            bodyHtml += '<div class="ct-flow-hint">Enter the 8-digit code from the game</div>';

            bodyHtml += '<span class="ct-flow-section-label">Expires on</span>';
            bodyHtml += '<div class="ct-flow-day-picker">';
            for (var di = 0; di < dayOptions.length; di++) {
                var sel = (createExpireDays === dayOptions[di].days) ? 'selected' : '';
                bodyHtml += '<div class="ct-flow-day-pill ' + sel + '" data-ct-days="' + dayOptions[di].days + '" title="' + dayOptions[di].label + '"><span class="day-num">' + dayOptions[di].num + '</span><span class="day-lbl">' + dayOptions[di].lbl + '</span></div>';
            }
            bodyHtml += '</div>';
            bodyHtml += '<div class="ct-flow-hint">Trade expires on ' + dayOptions[createExpireDays - 1].label + '</div>';

            bodyHtml += '</div>';
            bodyHtml += '<div class="ct-flow-actions"><button class="btn btn-outline btn-sm ct-flow-back">Back</button><button class="btn btn-teal btn-sm ct-flow-next">Review</button></div>';
        }

        else if (createStep === 4) {
            var wantedImg = getCardImageUrl(createWantedCard);
            var expireDate = new Date(Date.now() + createExpireDays * 86400000);
            var expireStr = expireDate.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
            var offeredFirst = getCardById(createOfferCards[0]);
            var offeredImg = offeredFirst ? getCardImageUrl(offeredFirst) : null;

            bodyHtml = '<div class="ct-flow-header"><h3 class="ct-flow-title">Review Trade</h3><span class="ct-flow-step">Step 4 of 4</span></div>';
            bodyHtml += '<div class="ct-flow-progress"><div class="ct-flow-dot active"></div><div class="ct-flow-dot active"></div><div class="ct-flow-dot active"></div><div class="ct-flow-dot active"></div></div>';
            bodyHtml += '<div class="ct-flow-body" style="text-align:center;">';

            bodyHtml += '<div class="ct-summary-cards">';
            bodyHtml += '<div class="ct-summary-side"><div class="ct-card-side-card">';
            bodyHtml += (offeredImg ? '<img src="' + offeredImg + '" onerror="this.style.display=\'none\'">' : '');
            bodyHtml += '</div><div class="ct-summary-side-label offers">You Offer</div></div>';
            bodyHtml += '<div class="ct-summary-arrow">→</div>';
            bodyHtml += '<div class="ct-summary-side"><div class="ct-card-side-card">' + (wantedImg ? '<img src="' + wantedImg + '" onerror="this.style.display=\'none\'">' : '') + '</div><div class="ct-summary-side-label wants">You Want</div></div>';
            bodyHtml += '</div>';

            if (createOfferCards.length > 1) {
                bodyHtml += '<div style="font-size:0.5625rem;color:var(--text-dim);margin-bottom:12px;">+' + (createOfferCards.length - 1) + ' more offer option' + (createOfferCards.length > 2 ? 's' : '') + '</div>';
            }

            bodyHtml += '<div class="ct-summary-details">';
            bodyHtml += '<div class="ct-summary-row"><span class="ct-summary-row-label">Code</span><span class="ct-summary-row-value code">' + escapeHtml(createCode) + '</span></div>';
            bodyHtml += '<div class="ct-summary-row"><span class="ct-summary-row-label">Expires</span><span class="ct-summary-row-value">' + expireStr + '</span></div>';
            bodyHtml += '</div>';

            bodyHtml += '</div>';
            bodyHtml += '<div class="ct-flow-actions"><button class="btn btn-outline btn-sm ct-flow-back">Back</button><button class="btn btn-teal btn-sm ct-flow-submit">Create Trade</button></div>';
        }

        overlay.innerHTML = '<div class="modal-content">' + bodyHtml + '</div>';
        document.body.appendChild(overlay);

        overlay.querySelectorAll('[data-ct-want]').forEach(function(el) {
            el.addEventListener('click', function() {
                createWantedCard = getCardById(el.dataset.ctWant);
                overlay.remove();
                renderCreateStep();
            });
        });

        overlay.querySelectorAll('[data-ct-offer]').forEach(function(el) {
            el.addEventListener('click', function() {
                var cardId = el.dataset.ctOffer;
                var idx = createOfferCards.indexOf(cardId);
                if (idx !== -1) {
                    createOfferCards.splice(idx, 1);
                } else {
                    if (createOfferCards.length >= 3) return;
                    createOfferCards.push(cardId);
                }
                overlay.remove();
                renderCreateStep();
            });
        });

        overlay.querySelectorAll('[data-ct-days]').forEach(function(el) {
            el.addEventListener('click', function() {
                var codeInput = document.getElementById('ctCodeInput');
                if (codeInput) createCode = codeInput.value.trim();
                createExpireDays = parseInt(el.dataset.ctDays);
                overlay.remove();
                renderCreateStep();
            });
        });

        var cancelBtn = overlay.querySelector('.ct-flow-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', function() { overlay.remove(); });

        var backBtn = overlay.querySelector('.ct-flow-back');
        if (backBtn) backBtn.addEventListener('click', function() { createStep--; overlay.remove(); renderCreateStep(); });

        var nextBtn = overlay.querySelector('.ct-flow-next');
        if (nextBtn) nextBtn.addEventListener('click', function() {
            if (createStep === 3) {
                var codeInput = document.getElementById('ctCodeInput');
                var code = codeInput ? codeInput.value.trim() : '';
                if (!/^[0-9]{8}$/.test(code)) { showToast('Enter a valid 8-digit code', 'error'); return; }
                createCode = code;
            }
            createStep++;
            overlay.remove();
            renderCreateStep();
        });

        var submitBtn = overlay.querySelector('.ct-flow-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', async function() {
                var expireDate = new Date(Date.now() + createExpireDays * 86400000);
                var result = await createCodeTrade(user.username, createCode, expireDate.toISOString(), createWantedCard.card_id, createOfferCards);
                if (result) {
                    showToast('Code trade created!', 'success');
                    overlay.remove();
                    render();
                } else {
                    showToast('Failed to create trade', 'error');
                }
            });
        }

        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    }
})();
