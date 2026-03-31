// ============================================
// Card Trading Hub - Data Layer
// Supabase-only architecture with in-memory cache
// ============================================

const SB_URL = 'https://jbjsfwkmnjzanbzjkbuv.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpianNmd2ttbmp6YW5iemprYnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDE2NTAsImV4cCI6MjA5MDI3NzY1MH0._voRlHP-my4wUQLzTEq_-hLgrqw5r0EgpMnQNjbIk4c';

const SESSION_KEY = 'cth_session';
const IMG_BASE_KEY = 'cth_img_base_url';

let sb = null;

const DB = {
    cards: [],
    users: [],
    userCards: [],
    trades: [],
    tradeHistory: []
};

const CARD_CATEGORIES = [
    { id: 'evolving_universe', name: 'Evolving Universe', shortName: 'Evolving Universe' },
    { id: 'jujutsu_kaisen', name: 'Jujutsu Kaisen', shortName: 'Jujutsu Kaisen' },
    { id: 'anniversary', name: 'Anniversary 2025', shortName: 'Anniversary 2025' },
    { id: 'pmgc_2025', name: 'PMGC', shortName: 'PMGC' },
    { id: 'playful_battleground', name: 'Playful Background', shortName: 'Playful Background' }
];

const CARD_SORT_ORDER = [
    'EU_evacuation_master_golden','EU_melody_strongest_team_golden','EU_raging_rush_strongest_team_golden',
    'EU_music_hall_silver','EU_racing_hall_silver','EU_dynamic_slide_hall_silver','EU_rail_parachute_challenge_silver','EU_racing_challenge_silver','EU_s_rank_vault_silver',
    'EU_a_rank_vault_basic','EU_b_rank_vault_basic','EU_anniversary_lucky_spin_basic','EU_energy_shield_basic','EU_spatial_distribution_zone_1_basic','EU_spatial_distribution_zone_2_basic','EU_floating_thruster_basic',
    'JK_jujutsu_kaisen_golden','JK_ryomen_sukuna_golden','JK_suguru_geto_golden',
    'JK_sataro_gojo_silver','JK_yuji_itadori_silver','JK_megumi_fushigoro_silver','JK_nue_silver','JK_nobara_kugisaki_silver',
    'JK_cathy_basic','JK_cursed_corpse_spear_basic','JK_inverted_spear_of_heaven_basic',
    'ANN_legendary_journey_golden','ANN_elite_collector_golden',
    'ANN_golden_age_silver','ANN_arcade_time_silver','ANN_rhythm_hero_silver','ANN_vibrant_world_silver','ANN_dino_ground_silver','ANN_ocean_odyssey_silver','ANN_golden_dynasty_silver','ANN_temporal_vault_silver',
    'PMG_champion_a7_golden','PMG_bangkok_thailand_golden','PMG_fmvp_apg_top_golden','PMG_2nd_place_ulf_golden','PMG_3rd_place_apg_golden',
    'PMG_tt_silver','PMG_dk_silver','PMG_drx_silver','PMG_dk_r_silver','PMG_ae_silver','PMG_ae_rosemary_silver','PMG_r8_amoori_silver','PMG_kara_ceo_silver','PMG_ulf_kecth_silver',
    'PMG_goat_basic','PMG_reg_basic','PMG_mad_basic','PMG_ea_basic','PMG_r8_basic','PMG_kara_basic','PMG_vpe_basic','PMG_fl_basic',
    'PB_mrbeast_golden','PB_ray_silver','PB_garand_basic','PB_tracked_amphicarrier_basic'
];

function sortCardsByOrder(cards) {
    if (!cards || !Array.isArray(cards)) return [];
    return cards.slice().sort((a, b) => {
        const idxA = CARD_SORT_ORDER.indexOf(a.card_id);
        const idxB = CARD_SORT_ORDER.indexOf(b.card_id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    });
}

function sha256(ascii) {
    var maxWord = Math.pow(2, 32);
    var result = '';

    var words = [];
    var asciiBitLength = ascii.length * 8;

    var hash = [];
    var k = [];

    var isComposite = {};
    for (var candidate = 2; hash.length < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (var i = 0; i < 313; i += candidate) isComposite[i] = candidate;
            hash.push((Math.pow(candidate, 0.5) * maxWord) | 0);
            k.push((Math.pow(candidate, 1 / 3) * maxWord) | 0);
        }
    }

    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (var i = 0; i < ascii.length; i++) {
        var j = ascii.charCodeAt(i);
        if (j >> 8) return '';
        words[i >> 2] = (words[i >> 2] || 0) | j << ((3 - i) % 4) * 8;
    }
    words.push((asciiBitLength / maxWord) | 0);
    words.push(asciiBitLength | 0);

    for (var j = 0; j < words.length;) {
        var w = words.slice(j, j += 16);
        var oldHash = hash.slice(0, 8);
        for (var i = 0; i < 64; i++) {
            var w15 = w[i - 15] || 0, w2 = w[i - 2] || 0;
            var a = hash[0], e = hash[4];
            var sigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
            var sigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
            var maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
            var ch = (e & hash[5]) ^ (~e & hash[6]);
            if (w[i] === undefined) {
                w[i] = (w[i - 16] + (((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3))
                    + w[i - 7] + (((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10))) | 0;
            }
            var temp1 = (hash[7] + sigma1 + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + (w[i] || 0)) | 0;
            var temp2 = (sigma0 + maj) | 0;
            hash = [temp1 + temp2, a, hash[1], hash[2], hash[3] + temp1, hash[4], hash[5], hash[6]];
        }
        for (var i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }

    for (var i = 0; i < 8; i++) {
        for (var j = 3; j >= 0; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += (b < 16 ? '0' : '') + b.toString(16);
        }
    }
    return result;
}

function getImgBaseUrl() {
    return localStorage.getItem(IMG_BASE_KEY) || '';
}

function setImgBaseUrl(url) {
    localStorage.setItem(IMG_BASE_KEY, url);
}

function getCardImageUrl(card) {
    // Check for manually set URL first
    const base = getImgBaseUrl();
    if (base) return base.replace(/\/$/, '') + '/' + card.image_filename;
    
    // Auto-construct Supabase Storage URL
    // Convert .png filename to .webp (or use as-is)
    const filename = card.image_filename.replace(/\.png$/, '.webp');
    return `${SB_URL}/storage/v1/object/public/card-images/${filename}`;
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
        return null;
    }
}

function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
}

async function getUserContact(username) {
    if (!sb) return { whatsapp: '', discord: '', username };
    try {
        const { data } = await sb.from('users').select('whatsapp, discord, username').eq('username', username).maybeSingle();
        return data || { whatsapp: '', discord: '', username };
    } catch {
        return { whatsapp: '', discord: '', username };
    }
}

function showToast(msg, type) {
    if (typeof window.showToast === 'function') {
        window.showToast(msg, type);
    } else {
        console.log(`[${type || 'info'}] ${msg}`);
    }
}

function showLoading(el) {
    if (el) {
        el.classList.add('loading');
    }
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return date.toLocaleDateString();
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch {
        showToast('Failed to copy', 'error');
    }
}

// ============ ACTIVITY LOGGING ============

async function logActivity(username, activityType, details) {
    if (!sb) return;
    try {
        await sb.from('activity_log').insert({
            username: username,
            activity_type: activityType,
            details: details
        });
    } catch {}
}

async function getActivityLog(limit = 50) {
    if (!sb) return [];
    try {
        const { data } = await sb.from('activity_log').select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        return data || [];
    } catch { return []; }
}

// ============ REPORTS / FEEDBACK ============

async function submitReport(username, type, subject, content) {
    if (!sb) return { success: false, error: 'Not connected' };
    try {
        const { error } = await sb.from('reports').insert({
            username: username,
            report_type: type,
            subject: subject,
            content: content
        });
        if (error) return { success: false, error: error.message };
        logActivity(username, type === 'report' ? 'report_sent' : 'feedback_sent', username + ' sent ' + type + ': ' + subject);
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

async function getAllReports() {
    if (!sb) return [];
    try {
        const { data } = await sb.from('reports').select('*').order('created_at', { ascending: false });
        return data || [];
    } catch { return []; }
}

async function updateReportStatus(reportId, status, adminResponse = '') {
    if (!sb) return;
    try {
        await sb.from('reports').update({ status, admin_response: adminResponse }).eq('id', reportId);
    } catch {}
}

async function loadCardsFromSB() {
    // Check cache first (cards rarely change)
    const cached = localStorage.getItem('cth_cards_cache');
    const cacheTime = localStorage.getItem('cth_cards_cache_time');
    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 3600000) {
        DB.cards = JSON.parse(cached);
        return;
    }
    if (!sb) return;
    try {
        const { data } = await sb.from('cards').select('*').eq('is_active', true).order('card_id');
        if (data) {
            DB.cards = data;
            localStorage.setItem('cth_cards_cache', JSON.stringify(data));
            localStorage.setItem('cth_cards_cache_time', Date.now().toString());
        }
    } catch (e) {
        console.warn('Load cards failed:', e);
    }
}

async function initApp() {
    console.time('initApp');
    
    // Wait for Supabase CDN to load (max 5 seconds)
    for (let i = 0; i < 50; i++) {
        if (window.supabase) break;
        await new Promise(r => setTimeout(r, 100));
    }
    
    if (window.supabase && !sb) {
        sb = window.supabase.createClient(SB_URL, SB_KEY);
        console.log('SB: Client initialized');
    }
    
    await loadCardsFromSB();
    console.log('SB: Cards loaded:', DB.cards.length);
    
    if (sb) {
        try {
            // Create admin if not exists
            const { data: adminUser } = await sb.from('users').select('username').eq('username', 'CatLover78').maybeSingle();
            if (!adminUser) {
                const hash = sha256('Ilovecutecats.75');
                await sb.from('users').insert({ username: 'CatLover78', password_hash: hash, is_admin: true, favorability: 100 });
                console.log('SB: Admin account created');
            }

            // If user is logged in, load their data (with cache check)
            const session = getCurrentUser();
            if (session) {
                const userCacheTime = parseInt(localStorage.getItem('cth_user_cache_time') || '0');
                const cacheAge = Date.now() - userCacheTime;
                
                if (cacheAge > 15000 || DB.userCards.length === 0) {
                    const { data: sbCards } = await sb.from('user_cards').select('*').eq('username', session.username);
                    if (sbCards) {
                        DB.userCards = DB.userCards.filter(uc => uc.username !== session.username);
                        DB.userCards.push(...sbCards);
                        console.log('SB: Loaded', sbCards.length, 'cards for', session.username);
                    }
                    const { data: sbTrades } = await sb.from('trades').select('*')
                        .or(`requester.eq.${session.username},receiver.eq.${session.username}`);
                    if (sbTrades) {
                        DB.trades = DB.trades.filter(t => t.requester !== session.username && t.receiver !== session.username);
                        DB.trades.push(...sbTrades);
                    }
                    localStorage.setItem('cth_user_cache_time', Date.now().toString());
                }
            }
            // Auto-clear chats older than 5 days (fire and forget)
            clearOldChats();
            console.log('SB: Init complete');
        } catch (e) {
            console.warn('SB Init error:', e);
        }
    } else {
        console.warn('SB: Supabase client not available');
    }
    console.timeEnd('initApp');
}

function getAllCards() {
    return DB.cards;
}

function getActiveCards() {
    return DB.cards.filter(c => c.is_active);
}

function getCardsByCategoryAndType(cat, type) {
    return DB.cards.filter(c => c.category === cat && c.type === type);
}

function getCardById(id) {
    return DB.cards.find(c => c.card_id === id) || null;
}

async function getUserCards(username) {
    if (!sb) return [];
    try {
        const { data, error } = await sb.from('user_cards').select('*').eq('username', username);
        if (!error && data) {
            DB.userCards = DB.userCards.filter(uc => uc.username !== username);
            DB.userCards.push(...data);
            return data;
        }
    } catch (e) {
        console.warn('Failed to get user cards:', e);
    }
    return [];
}

async function getUserCardQuantity(username, cardId) {
    if (!sb) return 0;
    try {
        const { data } = await sb.from('user_cards').select('quantity').eq('username', username).eq('card_id', cardId).maybeSingle();
        return data ? data.quantity : 0;
    } catch {
        return 0;
    }
}

async function setUserCards(username, entries) {
    if (!sb) return;
    const now = new Date().toISOString();
    for (const entry of entries) {
        if (entry.quantity > 0) {
            await sb.from('user_cards').upsert({
                username: username,
                card_id: entry.card_id,
                quantity: entry.quantity,
                last_updated: now
            }, { onConflict: 'username,card_id' });
        }
    }
    
    DB.userCards = DB.userCards.filter(uc => uc.username !== username);
    entries.forEach(entry => {
        if (entry.quantity > 0) {
            DB.userCards.push({
                username: username,
                card_id: entry.card_id,
                quantity: entry.quantity,
                last_updated: now
            });
        }
    });
    localStorage.setItem('cth_user_cache_time', '0'); // invalidate cache
    logActivity(username, 'cards_updated', username + ' updated collection');
}

async function updateUserCardQty(username, cardId, qty) {
    if (!sb) return;
    const now = new Date().toISOString();
    
    if (qty <= 0) {
        await sb.from('user_cards').delete().eq('username', username).eq('card_id', cardId);
        DB.userCards = DB.userCards.filter(uc => !(uc.username === username && uc.card_id === cardId));
    } else {
        await sb.from('user_cards').upsert({
            username: username,
            card_id: cardId,
            quantity: qty,
            last_updated: now
        }, { onConflict: 'username,card_id' });
        
        const idx = DB.userCards.findIndex(uc => uc.username === username && uc.card_id === cardId);
        if (idx >= 0) {
            DB.userCards[idx].quantity = qty;
            DB.userCards[idx].last_updated = now;
        } else {
            DB.userCards.push({ username, card_id: cardId, quantity: qty, last_updated: now });
        }
    }
}

function hasCompletedSetup(username) {
    return DB.userCards.filter(uc => uc.username === username).length > 0;
}

async function createUser(username, password, contactType, contactValue) {
    if (!sb) return { success: false, error: 'Supabase not initialized' };
    if (username.toLowerCase() === 'admin') return { success: false, error: 'Reserved username' };
    
    try {
        const { data: existing } = await sb.from('users').select('username').ilike('username', username).maybeSingle();
        if (existing) {
            return { success: false, error: 'Username already taken' };
        }
    } catch (e) {
        console.warn('Check existing:', e);
    }
    
    const passwordHash = sha256(password);
    const now = new Date().toISOString();
    
    try {
        const { data, error } = await sb.from('users').insert({
            username: username,
            password_hash: passwordHash,
            whatsapp: contactType === 'whatsapp' ? contactValue : '',
            discord: contactType === 'discord' ? contactValue : '',
            favorability: 100,
            created_at: now,
            last_login: now,
            is_admin: false
        }).select().single();
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        const user = data;
        DB.users.push(user);
        
        setSession({ username: user.username, is_admin: user.is_admin });
        logActivity(username, 'register', username + ' created account');
        return { success: true, user: { username: user.username, is_admin: user.is_admin } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function loginUser(username, password) {
    if (!sb) return { success: false, error: 'Supabase not initialized' };
    
    try {
        const { data: user, error } = await sb.from('users').select('*').ilike('username', username).maybeSingle();
        if (error || !user) {
            return { success: false, error: 'User not found' };
        }
        
        const passwordHash = sha256(password);
        if (user.password_hash !== passwordHash) {
            return { success: false, error: 'Invalid password' };
        }
        
        user.last_login = new Date().toISOString();
        await sb.from('users').update({ last_login: user.last_login }).eq('username', user.username);
        
        const idx = DB.users.findIndex(u => u.username === user.username);
        if (idx >= 0) {
            DB.users[idx] = user;
        } else {
            DB.users.push(user);
        }
        
        const { data: sbCards } = await sb.from('user_cards').select('*').eq('username', user.username);
        if (sbCards) {
            DB.userCards = DB.userCards.filter(uc => uc.username !== user.username);
            DB.userCards.push(...sbCards);
        }
        
        const { data: sbTrades } = await sb.from('trades').select('*')
            .or(`requester.eq.${user.username},receiver.eq.${user.username}`);
        if (sbTrades) {
            DB.trades = DB.trades.filter(t => t.requester !== user.username && t.receiver !== user.username);
            DB.trades.push(...sbTrades);
        }
        
        setSession({ username: user.username, is_admin: user.is_admin });
        logActivity(username, 'login', username + ' logged in');
        return { success: true, user: { username: user.username, is_admin: user.is_admin } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getIncomingTrades(username) {
    if (!sb) return [];
    try {
        const { data } = await sb.from('trades').select('*').eq('receiver', username).eq('status', 'pending');
        return data || [];
    } catch {
        return [];
    }
}

async function getOutgoingTrades(username) {
    if (!sb) return [];
    try {
        const { data } = await sb.from('trades').select('*').eq('requester', username);
        return data || [];
    } catch {
        return [];
    }
}

async function getTradesForUser(username) {
    if (!sb) return [];
    try {
        const { data } = await sb.from('trades').select('*')
            .or(`requester.eq.${username},receiver.eq.${username}`)
            .order('created_at', { ascending: false });
        return data || [];
    } catch { return []; }
}

async function createTrade(requester, receiver, requesterCardId, receiverCardId, cardType) {
    if (!sb) return { success: false, error: 'Supabase not initialized' };
    
    try {
        // Check for existing pending trade between these users
        const { data: existing } = await sb.from('trades').select('*')
            .eq('status', 'pending')
            .or(`and(requester.eq.${requester},receiver.eq.${receiver}),and(requester.eq.${receiver},receiver.eq.${requester})`)
            .maybeSingle();
        
        if (existing) {
            return { success: false, error: 'You already have a pending trade with this user' };
        }

        // 3-day cooldown for same card pair
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentTrades } = await sb.from('trades').select('*')
            .or(`and(requester.eq.${requester},receiver.eq.${receiver}),and(requester.eq.${receiver},receiver.eq.${requester})`)
            .gte('created_at', threeDaysAgo)
            .in('status', ['completed', 'rejected']);

        if (recentTrades && recentTrades.length > 0) {
            const hasSamePair = recentTrades.some(t =>
                (t.requester_card_id === requesterCardId && t.receiver_card_id === receiverCardId) ||
                (t.requester_card_id === receiverCardId && t.receiver_card_id === requesterCardId)
            );
            if (hasSamePair) {
                return { success: false, error: 'This card pair was already traded recently. Wait 3 days.' };
            }
        }
    } catch {}
    
    const now = new Date().toISOString();
    const tradeId = 'T' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    try {
        const { data, error } = await sb.from('trades').insert({
            trade_id: tradeId,
            requester: requester,
            receiver: receiver,
            requester_card_id: requesterCardId,
            receiver_card_id: receiverCardId,
            card_type: cardType,
            status: 'pending',
            created_at: now,
            updated_at: now,
            reject_reason: '',
            confirmed_by_requester: false,
            confirmed_by_receiver: false
        }).select().single();
        
        if (error) return { success: false, error: error.message };
        
        DB.trades.push(data);
        logActivity(requester, 'trade_sent', requester + ' sent trade to ' + receiver);
        return { success: true, trade: data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function updateTradeStatus(tradeId, status, reason = '') {
    if (!sb) return false;
    
    const now = new Date().toISOString();
    
    try {
        const updateObj = { status, updated_at: now };
        if (reason) updateObj.reject_reason = reason;
        
        const { error } = await sb.from('trades').update(updateObj).eq('trade_id', tradeId);
        if (error) return false;
        
        const idx = DB.trades.findIndex(t => t.trade_id === tradeId);
        if (idx >= 0) {
            DB.trades[idx].status = status;
            DB.trades[idx].updated_at = now;
            if (reason) DB.trades[idx].reject_reason = reason;
        }
        
        if (status === 'rejected' && DB.trades[idx]) {
            const requester = DB.trades[idx].requester;
            await adjustFavorability(requester, -10);
        }
        
        logActivity('system', 'trade_status', tradeId + ' → ' + status);
        return true;
    } catch {
        return false;
    }
}

async function adjustFavorability(username, delta) {
    if (!sb) return;
    try {
        const { data: user } = await sb.from('users').select('favorability').eq('username', username).maybeSingle();
        if (user) {
            const newFav = Math.max(0, (user.favorability || 100) + delta);
            await sb.from('users').update({ favorability: newFav }).eq('username', username);
        }
    } catch {}
}

async function confirmTrade(tradeId, username) {
    if (!sb) return false;
    
    try {
        console.time('confirmTrade');
        
        // Call the atomic RPC function
        const { data, error } = await sb.rpc('confirm_and_execute_trade', {
            p_trade_id: tradeId,
            p_confirming_user: username
        });
        
        console.log('RPC result:', data, 'error:', error);
        
        if (error) {
            console.warn('Confirm trade RPC error:', error.message);
            console.timeEnd('confirmTrade');
            return false;
        }
        
        if (!data) {
            console.warn('RPC returned null data');
            console.timeEnd('confirmTrade');
            return false;
        }
        
        // Update local cache
        const idx = DB.trades.findIndex(t => t.trade_id === tradeId);
        if (idx >= 0) {
            if (data.both_confirmed) {
                DB.trades[idx].status = 'completed';
            } else {
                const { data: updated } = await sb.from('trades').select('*').eq('trade_id', tradeId).maybeSingle();
                if (updated) DB.trades[idx] = updated;
            }
        }
        
        // If trade completed, refresh user cards from DB
        if (data.both_confirmed) {
            console.log('Both confirmed - refreshing cards');
            const session = getCurrentUser();
            if (session) {
                const { data: freshCards } = await sb.from('user_cards').select('*').eq('username', session.username);
                if (freshCards) {
                    DB.userCards = DB.userCards.filter(uc => uc.username !== session.username);
                    DB.userCards.push(...freshCards);
                    console.log('Cards refreshed:', freshCards.length);
                }
            }
            logActivity(username, 'trade_completed', 'Trade ' + tradeId + ' completed');
        }
        
        console.timeEnd('confirmTrade');
        return true;
    } catch (e) {
        console.warn('Confirm trade failed:', e);
        return false;
    }
}

async function getTradeHistory() {
    if (!sb) return [];
    try {
        const { data } = await sb.from('trade_history').select('*').order('completed_at', { ascending: false });
        return data || [];
    } catch {
        return [];
    }
}

async function getTradeById(tradeId) {
    if (!sb) return null;
    try {
        const { data } = await sb.from('trades').select('*').eq('trade_id', tradeId).maybeSingle();
        return data;
    } catch { return null; }
}

async function findMatches(username, wantedCardId) {
    if (!sb) return [];
    
    const wantedCard = getCardById(wantedCardId);
    if (!wantedCard) return [];
    
    try {
        console.time('findMatches');
        
        // BULK QUERY 1: Get ALL extra cards from ALL users (quantity >= 2)
        const { data: globalPool } = await sb.from('user_cards')
            .select('username, card_id, quantity')
            .gte('quantity', 2)
            .neq('username', username);
        
        if (!globalPool || globalPool.length === 0) {
            console.timeEnd('findMatches');
            return [];
        }
        
        // BULK QUERY 2: Get my cards
        const { data: myCards } = await sb.from('user_cards')
            .select('card_id, quantity')
            .eq('username', username);
        
        const myCardsList = myCards || [];
        
        // In-memory processing (takes < 5ms)
        // Find who has the wanted card (quantity >= 2)
        const owners = globalPool.filter(uc => uc.card_id === wantedCardId);
        
        if (owners.length === 0) {
            console.timeEnd('findMatches');
            return [];
        }
        
        // Build lookup: which cards does each owner have?
        const ownerCardsMap = {};
        for (const uc of globalPool) {
            if (!ownerCardsMap[uc.username]) ownerCardsMap[uc.username] = new Set();
            ownerCardsMap[uc.username].add(uc.card_id);
        }
        
        // My extra cards of the same type
        const myExtraSameType = myCardsList.filter(mc => {
            const card = getCardById(mc.card_id);
            return card && card.type === wantedCard.type && mc.quantity >= 2;
        }).map(mc => mc.card_id);
        
        // Score each owner
        const matches = [];
        const seenUsers = new Set();
        
        for (const owner of owners) {
            if (seenUsers.has(owner.username)) continue;
            seenUsers.add(owner.username);
            
            const ownerCards = ownerCardsMap[owner.username] || new Set();
            
            // How many of my extra same-type cards does this owner NOT have?
            const mutualNeeds = myExtraSameType.filter(cardId => !ownerCards.has(cardId));
            
            matches.push({
                username: owner.username,
                wanted_card_id: wantedCardId,
                they_have: wantedCardId,
                they_need: mutualNeeds,
                mutual_score: mutualNeeds.length
            });
        }
        
        // Sort: mutual score desc, then username for stability
        matches.sort((a, b) => b.mutual_score - a.mutual_score || a.username.localeCompare(b.username));
        
        console.timeEnd('findMatches');
        return matches;
    } catch (e) {
        console.warn('Find matches failed:', e);
        return [];
    }
}

async function adminGetAllUsers() {
    if (!sb) return [];
    try {
        const { data: users } = await sb.from('users').select('*');
        if (!users) return [];
        
        const result = [];
        for (const user of users) {
            const { data: cards } = await sb.from('user_cards').select('quantity').eq('username', user.username);
            const { count: tradesCount } = await sb.from('trade_history').select('id', { count: 'exact' })
                .or(`requester.eq.${user.username},receiver.eq.${user.username}`);
            
            result.push({
                username: user.username,
                whatsapp: user.whatsapp,
                discord: user.discord,
                created_at: user.created_at,
                last_login: user.last_login,
                is_admin: user.is_admin,
                favorability: user.favorability,
                cards_owned: (cards || []).reduce((sum, c) => sum + c.quantity, 0),
                trades_completed: tradesCount || 0
            });
        }
        
        return result;
    } catch {
        return [];
    }
}

async function adminGetStats() {
    if (!sb) return { total_users: 0, total_cards: 0, total_trades: 0, success_rate: 0, trades_completed: 0, trades_rejected: 0, trades_pending: 0, most_owned: [] };
    
    try {
        const { count: userCount } = await sb.from('users').select('*', { count: 'exact', head: true });
        const { count: tradeCount } = await sb.from('trades').select('*', { count: 'exact', head: true });
        const { count: pendingCount } = await sb.from('trades').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: completedCount } = await sb.from('trades').select('*', { count: 'exact', head: true }).eq('status', 'completed');
        const { count: rejectedCount } = await sb.from('trades').select('*', { count: 'exact', head: true }).eq('status', 'rejected');
        
        const successRate = tradeCount > 0 ? Math.round((completedCount / tradeCount) * 100) : 0;
        
        // Get most owned cards
        const { data: cardCounts } = await sb.from('user_cards').select('card_id, quantity');
        const cardMap = {};
        if (cardCounts) {
            cardCounts.forEach(c => { cardMap[c.card_id] = (cardMap[c.card_id] || 0) + c.quantity; });
        }
        const mostOwned = Object.entries(cardMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([cardId, count]) => ({ card: getCardById(cardId), count }));
        
        return {
            total_users: userCount || 0,
            total_cards: getActiveCards().length,
            total_trades: tradeCount || 0,
            success_rate: successRate,
            trades_completed: completedCount || 0,
            trades_rejected: rejectedCount || 0,
            trades_pending: pendingCount || 0,
            most_owned: mostOwned
        };
    } catch (e) {
        console.warn('Stats error:', e);
        return { total_users: 0, total_cards: 0, total_trades: 0, success_rate: 0, trades_completed: 0, trades_rejected: 0, trades_pending: 0, most_owned: [] };
    }
}

async function adminResetUserCards(username) {
    if (!sb) return;
    await sb.from('user_cards').delete().eq('username', username);
    DB.userCards = DB.userCards.filter(uc => uc.username !== username);
}

async function adminToggleAdmin(username) {
    if (!sb) return;
    try {
        const { data: user } = await sb.from('users').select('is_admin').eq('username', username).maybeSingle();
        if (user) {
            await sb.from('users').update({ is_admin: !user.is_admin }).eq('username', username);
        }
    } catch {}
}

async function adminUpdateFavorability(username, delta) {
    await adjustFavorability(username, delta);
}

async function exportAllData() {
    if (!sb) return null;
    
    try {
        const { data: users } = await sb.from('users').select('*');
        const { data: cards } = await sb.from('cards').select('*');
        const { data: userCards } = await sb.from('user_cards').select('*');
        const { data: trades } = await sb.from('trades').select('*');
        const { data: tradeHistory } = await sb.from('trade_history').select('*');
        
        return {
            users,
            cards,
            user_cards: userCards,
            trades,
            trade_history: tradeHistory,
            exported_at: new Date().toISOString()
        };
    } catch (e) {
        console.warn('Export failed:', e);
        return null;
    }
}

// ============ CHAT FUNCTIONS ============

function getConversationId(user1, user2) {
    return [user1, user2].sort().join('_');
}

async function getConversations(username) {
    if (!sb) return [];
    try {
        const { data } = await sb.from('conversations').select('*')
            .or(`user1.eq.${username},user2.eq.${username}`)
            .order('updated_at', { ascending: false });
        return data || [];
    } catch { return []; }
}

async function getMessages(conversationId) {
    if (!sb) return [];
    try {
        const { data } = await sb.from('messages').select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        return data || [];
    } catch { return []; }
}

async function sendMessage(conversationId, sender, receiver, content, messageType = 'text', tradeId = null) {
    if (!sb) return null;
    try {
        await sb.from('conversations').upsert({
            id: conversationId,
            user1: sender < receiver ? sender : receiver,
            user2: sender < receiver ? receiver : sender,
            last_message: content.substring(0, 100),
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        // Clear deleted flag for both users when a new message is sent
        for (const u of [sender, receiver]) {
            const key = 'cth_deleted_chats_' + u;
            const deleted = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = deleted.filter(id => id !== conversationId);
            if (filtered.length !== deleted.length) {
                localStorage.setItem(key, JSON.stringify(filtered));
            }
        }

        const { data, error } = await sb.from('messages').insert({
            conversation_id: conversationId,
            sender: sender,
            content: content,
            message_type: messageType,
            trade_id: tradeId
        }).select().single();

        if (error) { console.warn('Send msg error:', error); return null; }
        logActivity(sender, 'message_sent', sender + ' → ' + receiver);
        return data;
    } catch (e) { console.warn('Send msg error:', e); return null; }
}

async function getUnreadCount(username) {
    if (!sb) return 0;
    try {
        const conversations = await getConversations(username);
        let total = 0;
        for (const conv of conversations) {
            const { count } = await sb.from('messages').select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender', username)
                .eq('is_read', false);
            total += (count || 0);
        }
        return total;
    } catch { return 0; }
}

async function markMessagesRead(conversationId, username) {
    if (!sb) return;
    try {
        await sb.from('messages').update({ is_read: true })
            .eq('conversation_id', conversationId)
            .neq('sender', username)
            .eq('is_read', false);
    } catch {}
}

async function clearOldChats() {
    if (!sb) return;
    try {
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        // Delete old messages
        await sb.from('messages').delete().lt('created_at', fiveDaysAgo);
        // Delete old conversations with no recent messages
        await sb.from('conversations').delete().lt('updated_at', fiveDaysAgo);
    } catch (e) {
        console.warn('Clear old chats:', e.message);
    }
}

// ============ ADMIN MESSAGE ============

async function getAdminMessage() {
    if (!sb) return { heading: '', message: '', mode: 'once' };
    try {
        const { data: headingData } = await sb.from('app_config').select('value').eq('key', 'admin_msg_heading').maybeSingle();
        const { data: msgData } = await sb.from('app_config').select('value').eq('key', 'admin_message').maybeSingle();
        const { data: modeData } = await sb.from('app_config').select('value').eq('key', 'admin_message_mode').maybeSingle();
        return {
            heading: headingData?.value || '',
            message: msgData?.value || '',
            mode: modeData?.value || 'once'
        };
    } catch { return { heading: '', message: '', mode: 'once' }; }
}

async function setAdminMessage(heading, message, mode) {
    if (!sb) return;
    try {
        await sb.from('app_config').upsert({ key: 'admin_msg_heading', value: heading }, { onConflict: 'key' });
        await sb.from('app_config').upsert({ key: 'admin_message', value: message }, { onConflict: 'key' });
        await sb.from('app_config').upsert({ key: 'admin_message_mode', value: mode }, { onConflict: 'key' });
    } catch {}
}

initApp();

// Global error handler for cached file issues
window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('is not defined')) {
        var app = document.getElementById('app');
        if (app && !app.querySelector('.cache-error')) {
            app.innerHTML = '<div class="cache-error" style="text-align:center;padding:40px;color:var(--text-dim);"><p style="margin-bottom:12px;">Your browser has cached an old version.</p><button onclick="location.href=location.pathname+\'?v=\'+Date.now()" class="btn btn-teal" style="padding:12px 24px;border:none;border-radius:12px;background:var(--teal);color:var(--bg);font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;letter-spacing:0.05em;">REFRESH NOW</button></div>';
        }
    }
});