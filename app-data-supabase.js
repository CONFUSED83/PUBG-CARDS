// ============================================
// Card Trading Hub - Supabase Data Layer
// ============================================

const SUPABASE_URL = 'https://jbjsfwkmnjzanbzjkbuv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpianNmd2ttbmp6YW5iemprYnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDE2NTAsImV4cCI6MjA5MDI3NzY1MH0._voRlHP-my4wUQLzTEq_-hLgrqw5r0EgpMnQNjbIk4c';

let supabase = null;

function initSupabase() {
    if (!supabase && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabase;
}

const STORAGE_KEYS = {
    CURRENT_USER: 'cth_current_user',
    IMG_BASE_URL: 'cth_img_base_url'
};

const CARD_CATEGORIES = [
    { id: 'evolving_universe', name: 'Evolving Universe', shortName: 'EU' },
    { id: 'jujutsu_kaisen', name: 'Jujutsu Kaisen', shortName: 'JK' },
    { id: 'anniversary', name: 'Anniversary', shortName: 'ANN' },
    { id: 'pmgc_2025', name: 'PMG 2025', shortName: 'PMG' },
    { id: 'playful_battleground', name: 'Playful Battleground', shortName: 'PB' }
];

const CARD_TYPES = { GOLDEN: 'Golden', SILVER: 'Silver', BASIC: 'Basic' };

// ============ SHA-256 ============
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============ SESSION ============
function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER)); }
    catch { return null; }
}
function setSession(user) { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)); }
function logout() { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); }

// ============ USER OPERATIONS ============
async function createUser(username, password, contactType, contactValue) {
    const db = initSupabase();
    const { data: existing } = await db.from('users').select('username').eq('username', username).maybeSingle();
    if (existing) return { success: false, error: 'Username already taken' };

    const passwordHash = await sha256(password);
    const { error } = await db.from('users').insert({
        username, password_hash: passwordHash,
        whatsapp: contactType === 'whatsapp' ? contactValue : '',
        discord: contactType === 'discord' ? contactValue : '',
        is_admin: false
    });
    if (error) return { success: false, error: error.message };

    const user = { username, is_admin: false };
    setSession(user);
    return { success: true, user };
}

async function loginUser(username, password) {
    const db = initSupabase();
    const { data: user, error } = await db.from('users').select('*').eq('username', username).maybeSingle();
    if (!user) return { success: false, error: 'User not found' };

    const passwordHash = await sha256(password);
    if (user.password_hash !== passwordHash) return { success: false, error: 'Invalid password' };

    await db.from('users').update({ last_login: new Date().toISOString() }).eq('username', username);
    const sessionUser = { username: user.username, is_admin: user.is_admin };
    setSession(sessionUser);
    return { success: true, user: sessionUser };
}

async function getUserByUsername(username) {
    const db = initSupabase();
    const { data } = await db.from('users').select('*').eq('username', username).maybeSingle();
    return data || null;
}

async function getUserContact(username) {
    const user = await getUserByUsername(username);
    if (!user) return null;
    return { whatsapp: user.whatsapp || '', discord: user.discord || '', username: user.username };
}

// ============ CARD OPERATIONS ============
async function getAllCards() {
    const db = initSupabase();
    const { data } = await db.from('cards').select('*').order('card_id');
    return data || [];
}

async function getActiveCards() {
    const db = initSupabase();
    const { data } = await db.from('cards').select('*').eq('is_active', true).order('card_id');
    return data || [];
}

async function getCardsByCategoryAndType(category, type) {
    const db = initSupabase();
    const { data } = await db.from('cards').select('*').eq('category', category).eq('type', type).eq('is_active', true);
    return data || [];
}

async function getCardById(cardId) {
    const db = initSupabase();
    const { data } = await db.from('cards').select('*').eq('card_id', cardId).maybeSingle();
    return data || null;
}

// ============ USER CARDS ============
async function getUserCards(username) {
    const db = initSupabase();
    const { data } = await db.from('user_cards').select('*').eq('username', username);
    return data || [];
}

async function getUserCardQuantity(username, cardId) {
    const db = initSupabase();
    const { data } = await db.from('user_cards').select('quantity').eq('username', username).eq('card_id', cardId).maybeSingle();
    return data ? data.quantity : 0;
}

async function setUserCards(username, entries) {
    const db = initSupabase();
    await db.from('user_cards').delete().eq('username', username);
    if (entries.length > 0) {
        const rows = entries.filter(e => e.quantity > 0).map(e => ({
            username, card_id: e.card_id, quantity: e.quantity
        }));
        if (rows.length > 0) await db.from('user_cards').insert(rows);
    }
}

async function updateUserCardQty(username, cardId, quantity) {
    const db = initSupabase();
    if (quantity <= 0) {
        await db.from('user_cards').delete().eq('username', username).eq('card_id', cardId);
    } else {
        const { data: existing } = await db.from('user_cards').select('id').eq('username', username).eq('card_id', cardId).maybeSingle();
        if (existing) {
            await db.from('user_cards').update({ quantity, last_updated: new Date().toISOString() }).eq('username', username).eq('card_id', cardId);
        } else {
            await db.from('user_cards').insert({ username, card_id: cardId, quantity });
        }
    }
}

async function hasCompletedSetup(username) {
    const cards = await getUserCards(username);
    return cards.length > 0;
}

// ============ TRADES ============
function generateTradeId() { return 'T' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

async function getAllTrades() {
    const db = initSupabase();
    const { data } = await db.from('trades').select('*').order('created_at', { ascending: false });
    return data || [];
}

async function getTradesForUser(username) {
    const db = initSupabase();
    const { data } = await db.from('trades').select('*').or(`requester.eq.${username},receiver.eq.${username}`).order('created_at', { ascending: false });
    return data || [];
}

async function getIncomingTrades(username) {
    const db = initSupabase();
    const { data } = await db.from('trades').select('*').eq('receiver', username).eq('status', 'pending').order('created_at', { ascending: false });
    return data || [];
}

async function getOutgoingTrades(username) {
    const db = initSupabase();
    const { data } = await db.from('trades').select('*').eq('requester', username).order('created_at', { ascending: false });
    return data || [];
}

async function createTrade(requester, receiver, requesterCardId, receiverCardId, cardType) {
    const db = initSupabase();
    const { data: existing } = await db.from('trades').select('trade_id').eq('status', 'pending')
        .or(`and(requester.eq.${requester},receiver.eq.${receiver}),and(requester.eq.${receiver},receiver.eq.${requester})`)
        .or(`and(requester_card_id.eq.${requesterCardId},receiver_card_id.eq.${receiverCardId}),and(requester_card_id.eq.${receiverCardId},receiver_card_id.eq.${requesterCardId})`)
        .maybeSingle();
    if (existing) return { success: false, error: 'A similar pending trade already exists' };

    const tradeId = generateTradeId();
    const { error } = await db.from('trades').insert({
        trade_id: tradeId, requester, receiver,
        requester_card_id: requesterCardId, receiver_card_id: receiverCardId,
        card_type: cardType, status: 'pending'
    });
    if (error) return { success: false, error: error.message };
    return { success: true, trade_id: tradeId };
}

async function updateTradeStatus(tradeId, status, rejectReason = '') {
    const db = initSupabase();
    const updates = { status, updated_at: new Date().toISOString() };
    if (rejectReason) updates.reject_reason = rejectReason;
    await db.from('trades').update(updates).eq('trade_id', tradeId);
}

async function confirmTrade(tradeId, username) {
    const db = initSupabase();
    const { data: trade } = await db.from('trades').select('*').eq('trade_id', tradeId).maybeSingle();
    if (!trade || trade.status !== 'accepted') return false;

    const updates = { updated_at: new Date().toISOString() };
    if (trade.requester === username) updates.confirmed_by_requester = true;
    if (trade.receiver === username) updates.confirmed_by_receiver = true;
    await db.from('trades').update(updates).eq('trade_id', tradeId);

    const bothConfirmed = (trade.requester === username ? true : trade.confirmed_by_requester) &&
                          (trade.receiver === username ? true : trade.confirmed_by_receiver);

    if (bothConfirmed) {
        const reqQty = await getUserCardQuantity(trade.requester, trade.requester_card_id);
        const recQty = await getUserCardQuantity(trade.receiver, trade.receiver_card_id);
        if (reqQty >= 1 && recQty >= 1) {
            await updateUserCardQty(trade.requester, trade.requester_card_id, reqQty - 1);
            await updateUserCardQty(trade.requester, trade.receiver_card_id, await getUserCardQuantity(trade.requester, trade.receiver_card_id) + 1);
            await updateUserCardQty(trade.receiver, trade.receiver_card_id, recQty - 1);
            await updateUserCardQty(trade.receiver, trade.requester_card_id, await getUserCardQuantity(trade.receiver, trade.requester_card_id) + 1);
        }
        await db.from('trades').update({ status: 'completed' }).eq('trade_id', tradeId);
        const reqCard = await getCardById(trade.requester_card_id);
        const recCard = await getCardById(trade.receiver_card_id);
        await db.from('trade_history').insert({
            trade_id: tradeId, requester: trade.requester, receiver: trade.receiver,
            requester_card: reqCard ? reqCard.card_name : trade.requester_card_id,
            receiver_card: recCard ? recCard.card_name : trade.receiver_card_id,
            card_type: trade.card_type
        });
    }
    return true;
}

async function getTradeHistory() {
    const db = initSupabase();
    const { data } = await db.from('trade_history').select('*').order('completed_at', { ascending: false });
    return data || [];
}

async function getUserTradeCount(username) {
    const db = initSupabase();
    const { count } = await db.from('trade_history').select('*', { count: 'exact', head: true })
        .or(`requester.eq.${username},receiver.eq.${username}`);
    return count || 0;
}

// ============ MATCHING ============
async function findMatches(username, wantedCardId) {
    const wantedCard = await getCardById(wantedCardId);
    if (!wantedCard) return [];

    const db = initSupabase();
    const { data: owners } = await db.from('user_cards').select('username, quantity')
        .eq('card_id', wantedCardId).gte('quantity', 1).neq('username', username);

    if (!owners || owners.length === 0) return [];

    const myCards = await getUserCards(username);
    const myTrades = await getTradesForUser(username);
    const pendingPairs = new Set();
    myTrades.filter(t => t.status === 'pending').forEach(t => {
        pendingPairs.add(`${t.requester}_${t.receiver}`);
        pendingPairs.add(`${t.receiver}_${t.requester}`);
    });

    const matches = [];
    for (const owner of owners) {
        if (pendingPairs.has(`${username}_${owner.username}`)) continue;

        const ownerCards = await getUserCards(owner.username);
        const theyNeed = [];
        for (const myCard of myCards) {
            const card = await getCardById(myCard.card_id);
            if (card && card.type === wantedCard.type && myCard.quantity >= 1) {
                const hasIt = ownerCards.find(oc => oc.card_id === myCard.card_id);
                if (!hasIt || hasIt.quantity === 0) {
                    theyNeed.push(myCard.card_id);
                }
            }
        }

        const tradeCount = await getUserTradeCount(owner.username);
        matches.push({
            username: owner.username,
            wanted_card_id: wantedCardId,
            they_have: wantedCardId,
            they_need: theyNeed,
            mutual_score: theyNeed.length,
            trade_count: tradeCount
        });
    }

    matches.sort((a, b) => b.mutual_score - a.mutual_score || b.trade_count - a.trade_count);
    return matches;
}

// ============ ADMIN ============
async function adminGetAllUsers() {
    const db = initSupabase();
    const { data: users } = await db.from('users').select('*');
    if (!users) return [];
    return users.map(u => ({
        username: u.username, whatsapp: u.whatsapp, discord: u.discord,
        created_at: u.created_at, last_login: u.last_login, is_admin: u.is_admin
    }));
}

async function adminGetStats() {
    const db = initSupabase();
    const [{ count: userCount }, { count: cardCount }, { count: tradeCount }] = await Promise.all([
        db.from('users').select('*', { count: 'exact', head: true }),
        db.from('cards').select('*', { count: 'exact', head: true }).eq('is_active', true),
        db.from('trades').select('*', { count: 'exact', head: true })
    ]);
    const { count: completed } = await db.from('trades').select('*', { count: 'exact', head: true }).eq('status', 'completed');
    const { count: rejected } = await db.from('trades').select('*', { count: 'exact', head: true }).eq('status', 'rejected');
    const { count: pending } = await db.from('trades').select('*', { count: 'exact', head: true }).eq('status', 'pending');

    return {
        total_users: userCount || 0,
        total_cards: cardCount || 0,
        total_trades: tradeCount || 0,
        trades_completed: completed || 0,
        trades_rejected: rejected || 0,
        trades_pending: pending || 0,
        success_rate: tradeCount > 0 ? Math.round(((completed || 0) / tradeCount) * 100) : 0
    };
}

async function adminResetUserCards(username) {
    const db = initSupabase();
    await db.from('user_cards').delete().eq('username', username);
}

async function adminToggleAdmin(username) {
    const db = initSupabase();
    const { data: user } = await db.from('users').select('is_admin').eq('username', username).maybeSingle();
    if (user) await db.from('users').update({ is_admin: !user.is_admin }).eq('username', username);
}

// ============ IMAGE URL ============
function getImgBaseUrl() { return localStorage.getItem(STORAGE_KEYS.IMG_BASE_URL) || ''; }
function setImgBaseUrl(url) { localStorage.setItem(STORAGE_KEYS.IMG_BASE_URL, url); }

function getCardImageUrl(card) {
    const base = getImgBaseUrl();
    if (base) return base.replace(/\/$/, '') + '/' + card.image_filename;
    return null;
}

// ============ AUTH CHECK ============
function requireAuth() {
    const user = getCurrentUser();
    if (!user) { showScreen('login'); return null; }
    return user;
}
