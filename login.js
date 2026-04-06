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
        <div class="bg-float bg-float-1"></div>
        <div class="bg-float bg-float-2"></div>
        <div class="login-wrapper">
            <header class="brand-header">
                <h1 class="brand-title">PUBG CARDS</h1>
                <p class="brand-sub">Trade Smart. Collect More.</p>
            </header>
            <div class="glass login-card">
                <h2>Welcome Back</h2>
                <p class="subtitle">Sign in to your collection</p>
                <form id="loginForm" onsubmit="return false;">
                    <div class="input-row">
                        <label for="username">Username</label>
                        <div class="input-icon-wrap">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <input type="text" id="username" placeholder="Enter your username" autocomplete="username" required>
                    </div>
                    <div class="input-row">
                        <label for="password">Password</label>
                        <div class="input-icon-wrap">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                        <input type="password" id="password" placeholder="Enter your password" autocomplete="current-password" required>
                        <button type="button" class="pw-toggle" id="pwToggle">
                            <svg id="pwEyeOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <svg id="pwEyeClosed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        </button>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full btn-login" id="loginBtn">LOGIN</button>
                </form>
                <div style="display:flex;gap:8px;margin-top:14px;">
                    <a href="./guest.html" class="btn btn-outline btn-sm" style="flex:1;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Guest
                    </a>
                    <a href="./create-account.html" class="btn btn-outline btn-sm" style="flex:1;text-decoration:none;">
                        Create Account
                    </a>
                </div>
            </div>
        </div>`;

        window.togglePw = function() {
            const inp = document.getElementById('password');
            const open = document.getElementById('pwEyeOpen');
            const closed = document.getElementById('pwEyeClosed');
            if (inp.type === 'password') {
                inp.type = 'text';
                open.style.display = 'none';
                closed.style.display = 'block';
            } else {
                inp.type = 'password';
                open.style.display = 'block';
                closed.style.display = 'none';
            }
        };

        document.getElementById('pwToggle').addEventListener('click', window.togglePw);

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const btn = document.getElementById('loginBtn');

            if (!username || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }

            btn.innerHTML = '<div class="spinner"></div>';
            btn.disabled = true;

            try {
                const result = await loginUser(username, password);
                if (result.success) {
                    showToast('Welcome back!', 'success');
                    setTimeout(async () => {
                        if (!await hasCompletedSetup(result.user.username)) {
                            window.location.href = './card-setup.html';
                        } else {
                            window.location.href = './home.html';
                        }
                    }, 400);
                } else {
                    showToast(result.error, 'error');
                    btn.innerHTML = 'LOGIN';
                    btn.disabled = false;
                }
            } catch (err) {
                showToast('Login failed. Try again.', 'error');
                btn.innerHTML = 'LOGIN';
                btn.disabled = false;
            }
        });

        if (getCurrentUser()) {
            window.location.href = './home.html';
        }
    })();
