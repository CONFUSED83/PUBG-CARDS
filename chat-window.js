(async function() {
        try {
            while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
            await initApp();
        } catch(e) { console.error('Init failed:', e); return; }

        const user = requireAuth();
        if (!user) return;

        const params = getNavParams();
        const conversationId = params[0];
        const otherUser = params[1];

        if (!conversationId || !otherUser) { navigateTo('chat'); return; }

        const displayUser = otherUser === 'CatLover78' ? 'Admin' : otherUser;
        document.getElementById('chatUserName').textContent = displayUser;
        document.getElementById('chatAvatar').textContent = displayUser.charAt(0).toUpperCase();
        document.getElementById('backBtn').addEventListener('click', () => navigateTo('chat'));

        document.getElementById('moreBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('moreMenu').style.display = document.getElementById('moreMenu').style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', () => {
            document.getElementById('moreMenu').style.display = 'none';
        });

        function showDeleteModal() {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
            <div class="modal-content" style="text-align:center;">
                <h3 style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.25rem;margin-bottom:8px;">Delete Chat?</h3>
                <p style="color:var(--text-dim);font-size:0.8125rem;margin-bottom:20px;">This chat will be removed from your list only. The other user will still see it.</p>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-outline btn-sm" style="flex:1;" id="deleteCancel">Cancel</button>
                    <button class="btn btn-danger btn-sm" style="flex:1;" id="deleteConfirm">Delete</button>
                </div>
            </div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('#deleteCancel').onclick = () => overlay.remove();
            overlay.querySelector('#deleteConfirm').onclick = async () => {
                if (sb) {
                    const { data: pendingTrades } = await sb.from('trades').select('*')
                        .or(`and(requester.eq.${user.username},receiver.eq.${otherUser}),and(requester.eq.${otherUser},receiver.eq.${user.username})`)
                        .eq('status', 'pending');
                    
                    if (pendingTrades && pendingTrades.length > 0) {
                        for (const trade of pendingTrades) {
                            await sb.from('trades').update({ status: 'rejected', reject_reason: 'Chat deleted' }).eq('trade_id', trade.trade_id);
                        }
                        await sendMessage(conversationId, user.username, otherUser, user.username + ' cancelled the trade and deleted this chat.', 'system');
                    }
                }
                const deleted = JSON.parse(localStorage.getItem('cth_deleted_chats_' + user.username) || '[]');
                if (!deleted.includes(conversationId)) deleted.push(conversationId);
                localStorage.setItem('cth_deleted_chats_' + user.username, JSON.stringify(deleted));
                overlay.remove();
                showToast('Chat deleted from your list', 'info');
                navigateTo('chat');
            };
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        }

        document.getElementById('deleteChatBtn').addEventListener('click', () => {
            showDeleteModal();
        });

        await markMessagesRead(conversationId, user.username);

        async function loadMessages() {
            const messages = await getMessages(conversationId);
            const container = document.getElementById('chatMessages');
            
            if (messages.length === 0) {
                container.innerHTML = '<div class="system-message">Start of conversation</div>';
            } else {
                let html = '';
                for (const msg of messages) {
                    const isMine = msg.sender === user.username;
                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    if (msg.message_type === 'system') {
                        let msgClass = 'system-message';
                        if (msg.content.includes('accepted') || msg.content.includes('completed')) msgClass += ' system-message-trade';
                        if (msg.content.includes('declined') || msg.content.includes('cancelled') || msg.content.includes('rejected')) msgClass += ' system-message-reject';
                        html += '<div class="' + msgClass + '">' + escapeHtml(msg.content) + '</div>';
                    } else if (msg.message_type === 'trade_request') {
                        html += await renderTradeMessage(msg, isMine, time);
                    } else {
                        html += '<div class="message ' + (isMine ? 'message-sent' : 'message-received') + '">' + escapeHtml(msg.content) + '<div class="message-time">' + time + '</div></div>';
                    }
                }
                container.innerHTML = html;

                container.querySelectorAll('[data-accept-trade]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const tradeId = btn.dataset.acceptTrade;
                        await updateTradeStatus(tradeId, 'accepted');
                        await sendMessage(conversationId, user.username, otherUser, 'Trade accepted! Let\'s complete it.', 'system');
                        showToast('Trade accepted!', 'success');
                        await loadMessages();
                    });
                });

                container.querySelectorAll('[data-reject-trade]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const tradeId = btn.dataset.rejectTrade;
                        await updateTradeStatus(tradeId, 'rejected', 'Declined in chat');
                        await sendMessage(conversationId, user.username, otherUser, 'Trade declined.', 'system');
                        showToast('Trade declined.', 'info');
                        await loadMessages();
                    });
                });
            }
            container.scrollTop = container.scrollHeight;
        }

        async function renderTradeMessage(msg, isMine, time) {
            let giveCard = null;
            let getCard = null;
            let tradeStatus = 'pending';

            if (msg.trade_id) {
                const trade = await getTradeById(msg.trade_id);
                if (trade) {
                    const isRequester = trade.requester === user.username;
                    // For the message sender's perspective:
                    const giveCardId = isRequester ? trade.requester_card_id : trade.receiver_card_id;
                    const getCardId = isRequester ? trade.receiver_card_id : trade.requester_card_id;
                    giveCard = getCardById(giveCardId);
                    getCard = getCardById(getCardId);
                    tradeStatus = trade.status;
                }
            }

            const giveImg = giveCard ? getCardImageUrl(giveCard) : null;
            const getImg = getCard ? getCardImageUrl(getCard) : null;
            const isPending = tradeStatus === 'pending';
            const isAccepted = tradeStatus === 'accepted';
            const isRejected = tradeStatus === 'rejected';

            let statusLabel = '';
            if (isAccepted) statusLabel = '<div style="color:var(--teal);font-size:0.6875rem;font-weight:600;margin-top:6px;">Accepted</div>';
            if (isRejected) statusLabel = '<div style="color:var(--red);font-size:0.6875rem;font-weight:600;margin-top:6px;">Declined</div>';

            return `
            <div style="font-size:0.5625rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--gold);font-weight:600;text-align:center;margin-bottom:4px;">Trade Offer</div>
            <div class="trade-card-msg ${isMine ? 'trade-card-msg-sent' : 'trade-card-msg-received'} ${isAccepted ? 'trade-accepted-msg' : ''} ${isRejected ? 'trade-rejected-msg' : ''}">
                ${giveCard && getCard ? `
                <div class="trade-swap-mini">
                    <div style="text-align:center;">
                        <div class="trade-label trade-label-give">YOU GIVE</div>
                        <div class="trade-mini-card card-${giveCard.type.toLowerCase()}">
                            ${giveImg ? '<img src="' + giveImg + '" onerror="this.style.display=\'none\'">' : ''}
                        </div>
                    </div>
                    <div class="trade-mini-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
                    </div>
                    <div style="text-align:center;">
                        <div class="trade-label trade-label-get">YOU GET</div>
                        <div class="trade-mini-card card-${getCard.type.toLowerCase()}">
                            ${getImg ? '<img src="' + getImg + '" onerror="this.style.display=\'none\'">' : ''}
                        </div>
                    </div>
                </div>` : '<div style="font-size:0.8125rem;color:var(--text-muted);margin:8px 0;">' + escapeHtml(msg.content) + '</div>'}
                ${statusLabel}
                ${!isMine && isPending && msg.trade_id ? `
                <div class="trade-actions-mini">
                    <button class="btn-accept-trade" data-accept-trade="${msg.trade_id}">Accept</button>
                    <button class="btn-reject-trade" data-reject-trade="${msg.trade_id}">Decline</button>
                </div>` : ''}
                <div class="message-time">${time}</div>
            </div>`;
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        await loadMessages();

        async function sendMsg() {
            const input = document.getElementById('chatInput');
            const content = input.value.trim();
            if (!content) return;
            input.value = '';
            await sendMessage(conversationId, user.username, otherUser, content);
            await loadMessages();
        }

        document.getElementById('sendBtn').addEventListener('click', sendMsg);
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMsg();
        });

        setInterval(async () => {
            await markMessagesRead(conversationId, user.username);
            await loadMessages();
        }, 5000);
    })();
