    // admin-login.js
    import { supabase } from './supabase.js';

    document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('loginForm');
        const errorDiv = document.getElementById('loginError');
        const submitBtn = document.getElementById('loginBtn');
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('togglePasswordBtn');
        const toggleIcon = document.getElementById('togglePasswordIcon');
        const forgotLink = document.getElementById('forgotPasswordLink');
        const loader = document.getElementById('sessionLoader');
        const card = document.querySelector('.login-container .card');

        (async function checkSession() {
            try {
                // 1. Check if an active session exists
                const { data: { session } } = await supabase.auth.getSession();

                // 2. If session exists, redirect to admin dashboard
                if (session) {
                    window.location.href = 'admin.html';
                } else {
                    // 3. No session found → Hide loader and show the login form
                    if (loader) loader.style.display = 'none';
                    if (card) card.style.display = 'block';
                }
            } catch (error) {
                // 4. If Supabase throws an error, still show the login form (fallback)
                console.warn("Session check failed. Proceeding to login page.");
                if (loader) loader.style.display = 'none';
                if (card) card.style.display = 'block';
            }
        })();

    toggleBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleIcon.classList.toggle('fa-eye');
        toggleIcon.classList.toggle('fa-eye-slash');
    });

    forgotLink.addEventListener('click', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        errorDiv.className = 'alert alert-danger small d-none';
        errorDiv.textContent = '';
        if (!email) {
            errorDiv.textContent = "Please enter your email address first.";
            errorDiv.classList.remove('d-none');
            return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/login.html',
        });
        if (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('d-none');
        } else {
            errorDiv.className = 'alert alert-success small';
            errorDiv.textContent = 'Password reset email sent! Check your inbox.';
            errorDiv.classList.remove('d-none');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        const email = document.getElementById('email').value.trim();
        const password = passwordInput.value;
        errorDiv.className = 'alert alert-danger small d-none';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Signing in...';

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i> Sign In';

        if (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('d-none');
            form.classList.remove('was-validated');
            return;
        }
        window.location.href = 'admin.html';
    });
});