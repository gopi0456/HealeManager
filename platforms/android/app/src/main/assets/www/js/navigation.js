const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";

function toggleTheme() { 
    const c = document.documentElement.getAttribute('data-theme'); 
    const n = c === 'dark' ? 'light' : 'dark'; 
    document.documentElement.setAttribute('data-theme', n); 
    localStorage.setItem('theme', n); 
    updateThemeIcon(n); 
}

function updateThemeIcon(t) { 
    document.getElementById('themeFab').textContent = t === 'dark' ? '☀️' : '🌙'; 
}

function login() { 
    if (document.getElementById('username').value.trim() === ADMIN_USERNAME && 
        document.getElementById('password').value.trim() === ADMIN_PASSWORD) { 
        document.getElementById('loginError').textContent = ''; 
        document.getElementById('loginPage').style.display = 'none'; 
        document.getElementById('dashboardPage').style.display = 'flex'; 
        document.getElementById('logoutBtn').style.display = 'flex';
        loadDashboard(); 
    } else { 
        document.getElementById('loginError').textContent = '❌ Invalid username or password!'; 
    } 
}

function logout() { 
    if (!confirm('Are you sure you want to logout?')) return;
    document.getElementById('dashboardPage').style.display = 'none'; 
    document.getElementById('menuPage').style.display = 'none'; 
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none'); 
    document.getElementById('loginPage').style.display = 'flex'; 
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('username').value = ''; 
    document.getElementById('password').value = ''; 
}

function showPage(pageId) {
    document.getElementById('loginPage').style.display = 'none'; 
    document.getElementById('dashboardPage').style.display = 'none'; 
    document.getElementById('menuPage').style.display = 'none';
    document.querySelectorAll('.page').forEach(p => { 
        p.style.display = 'none'; 
        p.classList.remove('active'); 
    });
    
    if (pageId === 'dashboardPage') { 
        document.getElementById('dashboardPage').style.display = 'flex'; 
        loadDashboard(); 
    } else if (pageId === 'menuPage') { 
        document.getElementById('menuPage').style.display = 'flex'; 
    } else if (pageId === 'todayTokenPage') { 
        document.getElementById('todayTokenPage').style.display = 'block'; 
        loadTodayTokens(); 
    } else if (pageId === 'tokenVisitPage') { 
        document.getElementById('tokenVisitPage').style.display = 'block'; 
    } else if (document.getElementById(pageId)) { 
        document.getElementById(pageId).style.display = 'block'; 
    }
    
    if (pageId === 'heliRecordPage') { 
        document.getElementById('searchInput').value = ''; 
        document.getElementById('patientList').innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>Enter name or Aadhar number to search</p></div>'; 
    }
    if (pageId === 'reminderPage') loadReminders();
}

function setupBackButton() {
    document.addEventListener('backbutton', function(e) {
        e.preventDefault();
        if (document.getElementById('tokenTicketModal').classList.contains('active')) { closeTokenTicket(); return; }
        if (document.getElementById('detailOverlay').classList.contains('active')) { closeDetail(); return; }
        if (document.getElementById('exportModal').classList.contains('active')) { closeExportModal(); return; }
        if (document.getElementById('importModal').classList.contains('active')) { closeImportModal(); return; }
        if (document.getElementById('successModal').classList.contains('active')) { closeModal(); return; }

        if (document.getElementById('tokenVisitPage').style.display === 'block') { showPage('todayTokenPage'); } 
        else if (document.getElementById('heliRecordPage').style.display === 'block' || 
                 document.getElementById('addPage').style.display === 'block' || 
                 document.getElementById('todayTokenPage').style.display === 'block' || 
                 document.getElementById('reminderPage').style.display === 'block') { 
            showPage('menuPage'); 
        } else if (document.getElementById('menuPage').style.display === 'flex') { 
            showPage('dashboardPage'); 
        }
    }, false);
}
