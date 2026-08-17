import { supabase } from './supabase.js';

// ==========================================
// Custom Toast Notification Helper
// ==========================================
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'error' ? 'error' : ''}`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
    toast.innerHTML = `
        <div class="toast-icon ${type}"><i class="fas ${icon}"></i></div>
        <div class="toast-message">${message}</div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// Custom Confirmation Modal Helper
// ==========================================
function showConfirmation(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const messageEl = document.getElementById('confirmModalMessage');
        const titleEl = document.getElementById('confirmModalTitle');
        const yesBtn = document.getElementById('confirmYesBtn');
        const noBtn = document.getElementById('confirmNoBtn');

        titleEl.textContent = title;
        messageEl.textContent = message;

        // Clone buttons to remove old event listeners
        const newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        const newNoBtn = noBtn.cloneNode(true);
        noBtn.parentNode.replaceChild(newNoBtn, noBtn);

        newYesBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => resolve(true), 300);
        });
        newNoBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => resolve(false), 300);
        });

        modal.classList.add('show');
    });
}

// ==========================================
// Email Helpers
// ==========================================
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function generateReplyEmail(firstName, replyText, adminName = 'Al-QURANITE Admin') {
  const escapedReply = escapeHtml(replyText);
  const escapedName = escapeHtml(firstName || 'there');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Lato',Arial,sans-serif;">
  <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#00BFFF 0%,#009c4a 100%);padding:25px 30px;text-align:center;">
      <div style="font-family:'Amiri',serif;font-size:1.6rem;font-weight:700;color:#fff;letter-spacing:1px;">
        <span style="margin-right:6px;">🕋</span> Al-QURANITE
      </div>
      <div style="font-family:'Playfair Display',serif;font-size:0.9rem;color:rgba(255,255,255,0.9);margin-top:4px;font-style:italic;">Light of Guidance</div>
    </div>
    <div style="padding:35px 40px;color:#2c3e50;line-height:1.7;font-size:1rem;">
      <h2 style="font-family:'Playfair Display',serif;color:#009c4a;margin-top:0;font-weight:700;font-size:1.8rem;">Assalamu Alaikum, ${escapedName}</h2>
      <p style="margin-bottom:25px;color:#475569;">You have received a new reply from the Al-QURANITE team regarding your message:</p>
      <div style="background:#f0fdf4;border-left:5px solid #009c4a;padding:20px 25px;margin:25px 0;border-radius:0 12px 12px 0;font-style:italic;color:#1e293b;font-family:'Playfair Display',serif;font-size:1.1rem;">"${escapedReply}"</div>
      <p style="margin-top:25px;color:#475569;">We hope this answers your question. If you need further assistance, feel free to reach out to us again anytime.</p>
      <div style="margin-top:35px;padding-top:20px;border-top:2px dashed #e2e8f0;">
        <p style="margin:0;font-weight:700;color:#009c4a;font-family:'Playfair Display',serif;font-size:1.1rem;">Warm regards,</p>
        <p style="margin:5px 0 0 0;color:#64748b;font-size:0.95rem;">— ${adminName}</p>
      </div>
    </div>
    <div style="background:#f8fafc;padding:20px 30px;text-align:center;border-top:4px solid #b300b3;">
      <p style="margin:0 0 8px 0;font-size:0.75rem;color:#64748b;letter-spacing:0.5px;">Dedicated to authentic, accessible, and inspiring Islamic knowledge.</p>
      <p style="margin:0;font-size:0.7rem;color:#94a3b8;">&copy; 2026 Al-Quranite. All Rights Reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

async function sendReplyEmail(userEmail, subject, messageHTML) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No active session. Please log in again.");
  const response = await fetch(
    'https://txdmbluqqgjnbzawqogu.supabase.co/functions/v1/send-email-gmail',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: userEmail, subject: subject, html: messageHTML })
    }
  );
  const result = await response.json();
  return result;
}

// ==========================================
// MAIN DASHBOARD LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {

    // 1. ADMIN AUTH CHECK
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('email', session.user.email)
        .single();
    if (error || !profile || !profile.is_admin) {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
        return;
    }

    // 2. DASHBOARD GREETING & CLOCK
    const greetingEl = document.getElementById('dashboardGreeting');
    const dateTimeEl = document.getElementById('currentDateTime');
    function updateGreetingAndTime() {
        const now = new Date();
        const hours = now.getHours();
        let greeting = "Good evening";
        if (hours < 12) greeting = "Good morning";
        else if (hours < 18) greeting = "Good afternoon";
        if (greetingEl) greetingEl.textContent = `${greeting}, Admin.`;
        if (dateTimeEl) dateTimeEl.textContent = now.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    updateGreetingAndTime();
    setInterval(updateGreetingAndTime, 1000);

    // 3. STATS & COUNTERS
    async function updateStats() {
        const { count: articleCount } = await supabase.from('articles').select('*', { count: 'exact', head: true });
        const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
        const { count: subCount } = await supabase.from('newsletters').select('*', { count: 'exact', head: true });
        document.getElementById('totalArticles').textContent = articleCount || 0;
        document.getElementById('totalMessages').textContent = msgCount || 0;
        document.getElementById('totalSubs').textContent = subCount || 0;
    }

    // 4. ARTICLES CRUD
    let editingFile = null;
    let selectedFiles = new Set();

    async function refreshArticleList() {
        const container = document.getElementById('articleListContainer');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner-border text-emerald"></div> Loading...</div>';
        const { data: articles, error } = await supabase.from('articles').select('*').order('id', { ascending: false });
        if (error) {
            container.innerHTML = `<div class="text-danger small">Error: ${error.message}</div>`;
            return;
        }
        let html = '';
        articles.forEach(article => {
            const status = article.status || 'draft';
            const badgeClass = status === 'published' ? 'bg-success' : status === 'pending' ? 'bg-warning text-dark' : 'bg-secondary';
            html += `
                <div class="article-row" data-id="${article.id}">
                    <div class="d-flex align-items-center gap-3">
                        <input type="checkbox" class="article-checkbox form-check-input" value="${article.filename}" data-id="${article.id}">
                        <div>
                            <strong>${article.title || article.filename}</strong>
                            <span class="badge ${badgeClass} ms-2">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                            <br><small class="text-muted">${article.filename} • Updated: ${new Date(article.updated_at).toLocaleDateString()}</small>
                        </div>
                    </div>
                    <div class="d-flex flex-wrap gap-1">
                        <button class="btn btn-sm btn-outline-primary btn-edit-article" data-filename="${article.filename}"><i class="fas fa-edit me-1"></i> Edit</button>
                        <div class="btn-group">
                            <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">Status</button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item status-action" data-filename="${article.filename}" data-status="draft" href="#">Draft</a></li>
                                <li><a class="dropdown-item status-action" data-filename="${article.filename}" data-status="pending" href="#">Pending</a></li>
                                <li><a class="dropdown-item status-action" data-filename="${article.filename}" data-status="published" href="#">Published</a></li>
                            </ul>
                        </div>
                        <button class="btn btn-sm btn-outline-danger btn-delete-article" data-filename="${article.filename}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        updateStats();

        // Attach event listeners
        container.querySelectorAll('.btn-edit-article').forEach(btn => {
            btn.addEventListener('click', function() { editArticle(this.getAttribute('data-filename')); });
        });
        container.querySelectorAll('.btn-delete-article').forEach(btn => {
            btn.addEventListener('click', function() { deleteArticle(this.getAttribute('data-filename')); });
        });
        container.querySelectorAll('.status-action').forEach(link => {
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                const filename = this.getAttribute('data-filename');
                const newStatus = this.getAttribute('data-status');
                await updateArticleStatus(filename, newStatus);
            });
        });

        // Bulk delete
        const checkboxes = container.querySelectorAll('.article-checkbox');
        const bulkBtn = document.getElementById('bulkDeleteBtn');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', function() {
                if (this.checked) selectedFiles.add(this.value);
                else selectedFiles.delete(this.value);
                bulkBtn.disabled = selectedFiles.size === 0;
            });
        });
        bulkBtn.addEventListener('click', async function() {
            const confirmed = await showConfirmation(`Delete ${selectedFiles.size} selected articles permanently?`);
            if (!confirmed) return;
            const { error } = await supabase.from('articles').delete().in('filename', Array.from(selectedFiles));
            if (error) {
                showToast('Error: ' + error.message, 'error');
            } else {
                selectedFiles.clear();
                bulkBtn.disabled = true;
                refreshArticleList();
                showToast(`Successfully deleted ${selectedFiles.size} articles!`);
            }
        });
    }

    async function updateArticleStatus(filename, newStatus) {
        if (!filename || !newStatus) return;
        const { error } = await supabase.from('articles').update({ status: newStatus }).eq('filename', filename);
        if (error) showToast('Error updating status: ' + error.message, 'error');
        else refreshArticleList();
    }

    // ---------- Create new article ----------
    window.createNewArticle = async function() {
        const title = document.getElementById('newArticleTitle').value.trim();
        const arabicTitle = document.getElementById('newArabicTitle').value.trim();
        const category = document.getElementById('newCategory').value;
        let filename = document.getElementById('newArticleFilename').value.trim();
        const content = document.getElementById('newArticleContent').value;

        if (!title || !arabicTitle || !category || !filename || !content) {
            return showToast('Please fill out all fields.', 'error');
        }
        if (!filename.endsWith('.html')) filename += '.html';

        const { error } = await supabase.from('articles').insert([{
            filename,
            title,
            arabic_title: arabicTitle,
            category,
            content,
            is_local_synced: false,
            status: 'draft'
        }]);

        if (error) {
            showToast('Error creating article: ' + error.message, 'error');
        } else {
            bootstrap.Modal.getInstance(document.getElementById('createArticleModal')).hide();
            document.getElementById('createArticleForm').reset();
            refreshArticleList();
            showToast('Article created successfully!');
        }
    };

    // ---------- Sync Local Files (with mapping) ----------
    const topicFiles = [
        'shirk.html', 'ilm.html', 'tazkiyah.html', 'ibadah.html', 'aqidah.html', 'rituals.html', 
        '99-names.html', 'asbab.html', 'preservation.html', 'authentication.html', 'maqasid.html', 
        'fiqh.html', 'madhhabs.html', 'usul.html', 'dawah.html', 'modernism.html', 'modernity.html', 
        'marriage.html', 'muamalat.html', 'quran-source.html', 'hadith-source.html', 'seerah.html', 
        'ijma.html', 'qiyas.html', 'adab.html', 'books.html', 'hadith-major.html'
    ];

    const arabicTitleMap = {
        'shirk.html': 'الشرك',
        'ilm.html': 'العلم',
        'tazkiyah.html': 'التزكية',
        'ibadah.html': 'العبادة',
        'aqidah.html': 'العقيدة',
        'rituals.html': 'الشعائر',
        '99-names.html': 'الأسماء الحسنى',
        'asbab.html': 'أسباب النزول',
        'preservation.html': 'حفظ النص',
        'authentication.html': 'التوثيق',
        'maqasid.html': 'مقاصد الشريعة',
        'fiqh.html': 'الفقه',
        'madhhabs.html': 'المذاهب',
        'usul.html': 'أصول الفقه',
        'dawah.html': 'الدعوة',
        'modernism.html': 'الحداثة',
        'modernity.html': 'العصرية',
        'marriage.html': 'الزواج',
        'muamalat.html': 'المعاملات',
        'quran-source.html': 'القرآن الكريم',
        'hadith-source.html': 'الحديث النبوي',
        'seerah.html': 'السيرة النبوية',
        'ijma.html': 'الإجماع',
        'qiyas.html': 'القياس',
        'adab.html': 'آداب طالب العلم',
        'books.html': 'الكتب',
        'hadith-major.html': 'المجاميع الحديثية'
    };
    const categoryMap = {
        'shirk.html': 'Foundations',
        'ilm.html': 'Foundations',
        'tazkiyah.html': 'Foundations',
        'ibadah.html': 'Foundations',
        'aqidah.html': 'Foundations',
        'rituals.html': 'Foundations',
        '99-names.html': 'Foundations',
        'asbab.html': 'Sacred Sciences',
        'preservation.html': 'Sacred Sciences',
        'authentication.html': 'Sacred Sciences',
        'maqasid.html': 'Legal Systems',
        'fiqh.html': 'Legal Systems',
        'madhhabs.html': 'Legal Systems',
        'usul.html': 'Legal Systems',
        'dawah.html': 'Modern Dynamics',
        'modernism.html': 'Modern Dynamics',
        'modernity.html': 'Modern Dynamics',
        'marriage.html': 'Modern Dynamics',
        'muamalat.html': 'Modern Dynamics',
        'quran-source.html': 'Sources',
        'hadith-source.html': 'Sources',
        'seerah.html': 'Sources',
        'ijma.html': 'Sources',
        'qiyas.html': 'Sources',
        'adab.html': 'Student Guide',
        'books.html': 'Student Guide',
        'hadith-major.html': 'Sources'
    };

    window.syncLocalArticles = async function() {
        if (!confirm('This will upload all local .html files to Supabase. Proceed?')) return;
        const btn = document.getElementById('syncLocalBtn');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        try {
            for (let file of topicFiles) {
                const response = await fetch(`articles/${file}`);
                if (!response.ok) continue;
                const content = await response.text();
                const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i) || content.match(/<title>(.*?)<\/title>/i);
                const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : file;
                await supabase.from('articles').upsert({
                    filename: file,
                    title: title,
                    arabic_title: arabicTitleMap[file] || '',
                    category: categoryMap[file] || 'General',
                    content: content,
                    is_local_synced: true,
                    status: 'published'
                }, { onConflict: 'filename' });
            }
            alert('Sync complete!'); refreshArticleList();
        } catch (e) { alert('Error syncing: ' + e.message); }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Local Files'; }
    };

    // ---------- Edit article ----------
    window.editArticle = async function(file) {
        editingFile = file;
        const { data } = await supabase.from('articles').select('content').eq('filename', file).maybeSingle();
        const content = data ? data.content : 'Article not found.';
        document.getElementById('editFileName').textContent = file;
        document.getElementById('editorContent').value = content;
        new bootstrap.Modal(document.getElementById('articleEditorModal')).show();
    };

    window.saveArticleEdit = async function() {
        const content = document.getElementById('editorContent').value;
        const { error } = await supabase.from('articles').upsert({ filename: editingFile, content, updated_at: new Date() }, { onConflict: 'filename' });
        if (error) showToast('Error saving: ' + error.message, 'error');
        else {
            bootstrap.Modal.getInstance(document.getElementById('articleEditorModal')).hide();
            refreshArticleList();
            showToast('Article saved successfully!');
        }
    };

    window.deleteArticle = async function(file) {
        const confirmed = await showConfirmation(`Are you sure you want to permanently delete ${file} from Supabase?`);
        if (!confirmed) return;
        const { error } = await supabase.from('articles').delete().eq('filename', file);
        if (error) showToast('Error deleting: ' + error.message, 'error');
        else {
            refreshArticleList();
            showToast('Article deleted.');
        }
    };

    // 5. MESSAGES
    let replyingToId = null;

    async function renderMessages(showArchived = false) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '<div class="text-muted small py-3">Loading messages...</div>';

        let query = supabase.from('messages').select('*').order('id', { ascending: false });
        if (!showArchived) query = query.eq('archived', false);

        const { data: messages, error } = await query;
        if (error) { container.innerHTML = `<div class="text-danger small">Error: ${error.message}</div>`; return; }
        if (!messages || messages.length === 0) { container.innerHTML = `<div class="text-muted small py-3">No messages found.</div>`; return; }

        let html = `<div class="list-group">`;
        messages.forEach(m => {
            const replies = m.replies || [];
            const isArchived = m.archived || false;
            html += `
                <div class="list-group-item p-3 mb-2 rounded shadow-sm message-item" data-id="${m.id}">
                    <div class="d-flex justify-content-between">
                        <h6 class="mb-1">${m.first_name} ${m.last_name} <span class="text-muted small">(${m.email})</span></h6>
                        <small class="text-muted">${new Date(m.created_at).toLocaleString()} ${isArchived ? '<span class="badge bg-secondary ms-2">Archived</span>' : ''}</small>
                    </div>
                    <p class="mb-2 small text-muted"><strong>Subject:</strong> ${m.subject}</p>
                    <div class="message-content border p-2 rounded bg-light mb-2"><p class="mb-0">${m.message}</p></div>
                    ${replies.map(r => `<div class="admin-reply small bg-soft-emerald p-2 rounded mt-1 mb-1"><strong>Admin:</strong> ${r}</div>`).join('')}
                    <div class="mt-2 d-flex flex-wrap gap-2">
                        <button class="btn btn-sm btn-outline-primary reply-btn" data-message-id="${m.id}"><i class="fas fa-reply me-1"></i> Reply</button>
                        <button class="btn btn-sm btn-outline-secondary copy-btn"><i class="far fa-copy me-1"></i> Copy</button>
                        <button class="btn btn-sm btn-outline-info share-btn"><i class="fas fa-share-alt me-1"></i> Share</button>
                        <button class="btn btn-sm btn-outline-warning archive-btn" data-id="${m.id}" data-archived="${isArchived}"><i class="fas fa-archive me-1"></i> ${isArchived ? 'Unarchive' : 'Archive'}</button>
                        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${m.id}"><i class="fas fa-trash-alt me-1"></i> Delete</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
        updateStats();

        const showArchivedCheckbox = document.getElementById('showArchivedCheckbox');

        container.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                replyingToId = parseInt(this.getAttribute('data-message-id'));
                document.getElementById('replyName').textContent = `Message #${replyingToId}`;
                document.getElementById('replyText').value = '';
                new bootstrap.Modal(document.getElementById('replyModal')).show();
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const confirmed = await showConfirmation('Delete this message permanently?');
                if (!confirmed) return;
                const id = parseInt(this.getAttribute('data-id'));
                const { error } = await supabase.from('messages').delete().eq('id', id);
                if (error) showToast('Error deleting: ' + error.message, 'error');
                else {
                    renderMessages(showArchivedCheckbox.checked);
                    showToast('Message deleted.');
                }
            });
        });

        container.querySelectorAll('.archive-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = parseInt(this.getAttribute('data-id'));
                const isArchived = this.getAttribute('data-archived') === 'true';
                const { error } = await supabase.from('messages').update({ archived: !isArchived }).eq('id', id);
                if (error) showToast('Error archiving: ' + error.message, 'error');
                else renderMessages(showArchivedCheckbox.checked);
            });
        });

        container.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.closest('.list-group-item').querySelector('.message-content p').innerText;
                navigator.clipboard.writeText(text)
                    .then(() => showToast('Copied to clipboard!'))
                    .catch(() => showToast('Failed to copy.', 'error'));
            });
        });

        container.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.closest('.list-group-item').querySelector('.message-content p').innerText;
                if (navigator.share) navigator.share({ text }).catch(() => {});
                else showToast('Share not supported on this browser.', 'error');
            });
        });
    }

    document.getElementById('showArchivedCheckbox')?.addEventListener('change', function() {
        renderMessages(this.checked);
    });

    window.sendReply = async function() {
        const reply = document.getElementById('replyText').value;
        if (!reply.trim()) return showToast('Please write a reply.', 'error');

        const { data: msg, error: fetchError } = await supabase
            .from('messages')
            .select('replies, email, first_name')
            .eq('id', replyingToId)
            .single();
        if (fetchError) return showToast('Error fetching message: ' + fetchError.message, 'error');

        const replies = msg.replies || [];
        replies.push(reply);

        const { error } = await supabase.from('messages').update({ replies }).eq('id', replyingToId);
        if (error) {
            showToast('Error saving reply: ' + error.message, 'error');
        } else {
            const userEmail = msg.email;
            const userFirstName = msg.first_name || '';
            const subject = 'Reply from Al-QURANITE';
            const messageHTML = generateReplyEmail(userFirstName, reply);

            try {
                const result = await sendReplyEmail(userEmail, subject, messageHTML);
                if (result.error) {
                    console.warn('Email sending failed:', result.error);
                    showToast('Reply saved, but email could not be sent.', 'warning');
                } else {
                    showToast('Reply saved and email sent successfully!');
                }
            } catch (emailError) {
                console.error('Email error:', emailError);
                showToast('Reply saved, but email failed to send.', 'error');
            }

            bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();
            renderMessages(document.getElementById('showArchivedCheckbox').checked);
        }
    };

    // 6. NEWSLETTERS
    async function renderNewsletters() {
        const { data: subs, error } = await supabase.from('newsletters').select('email, created_at').order('id', { ascending: false });
        const container = document.getElementById('newsletterContainer');
        if (error) { container.innerHTML = `<div class="text-danger small">Error: ${error.message}</div>`; return; }
        if (!subs || subs.length === 0) { container.innerHTML = '<div class="text-muted small py-3">No subscribers yet.</div>'; return; }
        let html = `<div class="table-responsive"><table class="table table-hover"><thead><tr><th>Email</th><th>Date Subscribed</th></tr></thead><tbody>`;
        subs.forEach(s => { html += `<tr><td>${s.email}</td><td>${new Date(s.created_at).toLocaleString()}</td></tr>`; });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
        updateStats();
    }

    // 7. ANALYTICS
    let chartInstance = null;
    async function initAnalytics() {
        const { data: analytics, error: fetchError } = await supabase.from('analytics').select('total_visits, total_duration_ms, avg_duration_ms').eq('id', 1).maybeSingle();
        if (fetchError) return console.error(fetchError);
        let visits = (analytics?.total_visits || 0) + 1;
        document.getElementById('totalVisits').textContent = visits;
        document.getElementById('averageSession').textContent = formatDuration(analytics?.avg_duration_ms || 0);
        await supabase.from('analytics').upsert({ id: 1, total_visits: visits, total_duration_ms: analytics?.total_duration_ms || 0, avg_duration_ms: analytics?.avg_duration_ms || 0, updated_at: new Date() });
        const ctx = document.getElementById('visitsChart').getContext('2d');
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ label: 'Weekly Visits (Mock Data)', data: [12, 19, 3, 5, 2, 3, 7], borderColor: '#00BFFF', backgroundColor: 'rgba(0, 191, 255, 0.1)', tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    function formatDuration(ms) {
        if (!ms) return '00:00';
        const seconds = Math.floor(ms / 1000);
        return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }

        // 8. LOGOUT HANDLERS (Desktop & Mobile)
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear(); // Forces a complete clean wipe of all site data
        window.location.href = 'login.html';
    });

    document.getElementById('logoutBtnMobile')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear(); // Forces a complete clean wipe of all site data
        window.location.href = 'login.html';
    });
    
    // 9. INIT
    document.getElementById('refreshArticlesBtn')?.addEventListener('click', refreshArticleList);
    document.getElementById('createArticleBtn')?.addEventListener('click', createNewArticle);
    document.getElementById('saveArticleEditBtn')?.addEventListener('click', saveArticleEdit);
    document.getElementById('sendReplyBtn')?.addEventListener('click', sendReply);

    refreshArticleList();
    renderMessages(false);
    renderNewsletters();
    initAnalytics();
});