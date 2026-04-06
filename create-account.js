(async function() {
        try {
            while (typeof initApp !== 'function') await new Promise(r => setTimeout(r, 10));
            await initApp();
        } catch(e) {
            console.error('Init failed:', e);
            document.getElementById('app').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);"><p>Failed to load.</p><button class="btn btn-teal btn-sm" onclick="location.reload()" style="margin-top:12px;">Refresh</button></div>';
            return;
        }


        document.getElementById('app').innerHTML = `
        <div class="page-wrapper">
            <header class="page-header">
                <h1 class="page-title">CREATE ACCOUNT</h1>
                <p class="page-subtitle">Join the Trading Community</p>
            </header>
            <div class="glass form-card">
                <form id="createForm" onsubmit="return false;">
                    <div class="input-row">
                        <label for="username">Username</label>
                        <input type="text" id="username" placeholder="Choose a username" autocomplete="off" required>
                        <div class="val-icon" id="userValid"></div>
                        <div class="field-msg" id="userMsg"></div>
                    </div>
                    <div class="input-row">
                        <label for="password">Password</label>
                        <input type="password" id="password" placeholder="Min 5 characters" autocomplete="new-password" required>
                        <div class="val-icon" id="pwValid" style="right:40px;"></div>
                        <button type="button" class="pw-toggle">
                            <svg id="pwEye1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <svg id="pwEye2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        </button>
                    </div>
                    <div class="input-row">
                        <label for="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" placeholder="Re-enter password" autocomplete="new-password" required>
                        <div class="val-icon" id="cpwValid" style="right:40px;"></div>
                        <button type="button" class="pw-toggle">
                            <svg id="cpwEye1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <svg id="cpwEye2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        </button>
                    </div>
                    <div class="contact-section">
                        <h3>Contact Method (or skip)</h3>
                        <div class="toggle-group" style="margin-bottom:14px;">
                            <button type="button" class="toggle-btn active" data-type="whatsapp">WhatsApp</button>
                            <button type="button" class="toggle-btn" data-type="discord">Discord</button>
                        </div>
                        <div class="input-row" style="margin-bottom:0;">
                            <input type="text" id="contactWhatsApp" placeholder="Enter WhatsApp number" autocomplete="off">
                            <input type="text" id="contactDiscord" placeholder="@username" autocomplete="off" style="display:none;">
                        </div>
                    </div>
                    <button type="submit" class="btn btn-teal btn-full btn-create" id="createBtn">
                        CREATE ACCOUNT
                    </button>
                </form>
                <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px;">
                    <span style="color:var(--text-dim);font-size:0.8125rem;">Already have an account?</span>
                    <a href="./login.html" class="btn btn-outline btn-sm" style="text-decoration:none;">Login</a>
                </div>
            </div>
        </div>`;

        const SVG_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        const SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

        let contactType = 'whatsapp';

        window.toggleField = function(fieldId, eye1Id, eye2Id) {
            const inp = document.getElementById(fieldId);
            const e1 = document.getElementById(eye1Id);
            const e2 = document.getElementById(eye2Id);
            if (inp.type === 'password') {
                inp.type = 'text'; e1.style.display = 'none'; e2.style.display = 'block';
            } else {
                inp.type = 'password'; e1.style.display = 'block'; e2.style.display = 'none';
            }
        };

        window.setContactType = function(type) {
            contactType = type;
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === type);
            });
            document.getElementById('contactWhatsApp').style.display = type === 'whatsapp' ? 'block' : 'none';
            document.getElementById('contactDiscord').style.display = type === 'discord' ? 'block' : 'none';
        };

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => window.setContactType(btn.dataset.type));
        });

        document.querySelectorAll('.pw-toggle').forEach((btn, i) => {
            const fields = [
                ['password', 'pwEye1', 'pwEye2'],
                ['confirmPassword', 'cpwEye1', 'cpwEye2']
            ];
            btn.addEventListener('click', () => window.toggleField(...fields[i]));
        });

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        let usernameCheckTimeout = null;
        usernameInput.addEventListener('input', () => {
            const val = usernameInput.value.trim();
            const el = document.getElementById('userValid');
            const msg = document.getElementById('userMsg');
            
            clearTimeout(usernameCheckTimeout);
            
            if (val.length < 3) {
                el.innerHTML = SVG_X; el.className = 'val-icon show invalid';
                msg.textContent = 'Min 3 characters'; msg.style.color = 'var(--red)';
            } else if (val.toLowerCase() === 'admin') {
                el.innerHTML = SVG_X; el.className = 'val-icon show invalid';
                msg.textContent = 'Reserved username'; msg.style.color = 'var(--red)';
            } else {
                el.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div>';
                el.className = 'val-icon show';
                msg.textContent = 'Checking...'; msg.style.color = 'var(--text-dim)';
                
                // Debounce: check after 500ms of no typing
                usernameCheckTimeout = setTimeout(async () => {
                    try {
                        const { data } = await sb.from('users').select('username').ilike('username', val).maybeSingle();
                        if (data) {
                            el.innerHTML = SVG_X; el.className = 'val-icon show invalid';
                            msg.textContent = 'Username taken'; msg.style.color = 'var(--red)';
                        } else {
                            el.innerHTML = SVG_CHECK; el.className = 'val-icon show valid';
                            msg.textContent = 'Available'; msg.style.color = 'var(--teal)';
                        }
                    } catch {
                        el.innerHTML = SVG_CHECK; el.className = 'val-icon show valid';
                        msg.textContent = 'Available'; msg.style.color = 'var(--teal)';
                    }
                }, 500);
            }
        });

        function validateConfirm() {
            const el = document.getElementById('cpwValid');
            if (confirmPasswordInput.value.length === 0) {
                el.className = 'val-icon';
            } else if (confirmPasswordInput.value === passwordInput.value && passwordInput.value.length >= 5) {
                el.innerHTML = SVG_CHECK; el.className = 'val-icon show valid';
            } else {
                el.innerHTML = SVG_X; el.className = 'val-icon show invalid';
            }
        }

        passwordInput.addEventListener('input', () => {
            const el = document.getElementById('pwValid');
            if (passwordInput.value.length >= 5) {
                el.innerHTML = SVG_CHECK; el.className = 'val-icon show valid';
            } else if (passwordInput.value.length > 0) {
                el.innerHTML = SVG_X; el.className = 'val-icon show invalid';
            } else {
                el.className = 'val-icon';
            }
            validateConfirm();
        });

        confirmPasswordInput.addEventListener('input', validateConfirm);

        document.getElementById('createForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const confirmPw = confirmPasswordInput.value;
            const waVal = document.getElementById('contactWhatsApp').value.trim();
            const dcVal = document.getElementById('contactDiscord').value.trim();
            const contact = contactType === 'whatsapp' ? waVal : dcVal;
            const btn = document.getElementById('createBtn');

            if (!username || !password || !confirmPw) {
                showToast('Please fill in all fields', 'error'); return;
            }
            if (username.length < 3) {
                showToast('Username must be at least 3 characters', 'error'); return;
            }
            if (password.length < 5) {
                showToast('Password must be at least 5 characters', 'error'); return;
            }
            if (password !== confirmPw) {
                showToast('Passwords do not match', 'error'); return;
            }

            btn.innerHTML = '<div class="spinner"></div> Creating...';
            btn.disabled = true;

            try {
                const result = await createUser(username, password, contactType, contact);
                if (result.success) {
                    showToast('Account created! Welcome, ' + username, 'success');
                    setTimeout(() => {
                        window.location.href = './card-setup.html';
                    }, 600);
                } else {
                    showToast(result.error, 'error');
                    btn.innerHTML = 'CREATE ACCOUNT';
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('Registration error:', err);
                showToast('Registration failed: ' + (err.message || err), 'error');
                btn.innerHTML = 'CREATE ACCOUNT';
                btn.disabled = false;
            }
        });

        if (getCurrentUser()) {
            window.location.href = './home.html';
        }
    })();
