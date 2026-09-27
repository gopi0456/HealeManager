const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";
var isLoggedIn = false;

function toggleTheme() {
    var c = document.documentElement.getAttribute('data-theme');
    var n = c === 'dark' ? 'light' : 'dark';
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
        isLoggedIn = true;
        localStorage.setItem('heale_logged_in', 'true');
        loadDashboard();
    } else {
        document.getElementById('loginError').textContent = '❌ Invalid username or password!';
    }
}

function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    isLoggedIn = false;
    localStorage.removeItem('heale_logged_in');
    document.getElementById('dashboardPage').style.display = 'none';
    document.getElementById('menuPage').style.display = 'none';
    document.querySelectorAll('.page').forEach(function(p) {
        p.style.display = 'none';
    });
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showPage(pageId) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'none';
    document.getElementById('menuPage').style.display = 'none';
    
    document.querySelectorAll('.page').forEach(function(p) {
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
    // Try Capacitor back button handler first
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.addListener('backButton', function(data) {
            handleBackButton();
        });
        console.log('✅ Capacitor back button handler registered');
    }
    
    // Also register Cordova back button as fallback
    document.addEventListener('backbutton', function(e) {
        e.preventDefault();
        handleBackButton();
    }, false);
    
    console.log('✅ Back button handlers registered');
}

function handleBackButton() {
    // Close modals first
    if (document.getElementById('tokenTicketModal') && document.getElementById('tokenTicketModal').classList.contains('active')) {
        closeTokenTicket();
        return;
    }
    if (document.getElementById('detailOverlay') && document.getElementById('detailOverlay').classList.contains('active')) {
        closeDetail();
        return;
    }
    if (document.getElementById('exportModal') && document.getElementById('exportModal').classList.contains('active')) {
        closeExportModal();
        return;
    }
    if (document.getElementById('importModal') && document.getElementById('importModal').classList.contains('active')) {
        closeImportModal();
        return;
    }
    if (document.getElementById('successModal') && document.getElementById('successModal').classList.contains('active')) {
        closeModal();
        return;
    }
    if (document.getElementById('pdfModal')) {
        document.getElementById('pdfModal').remove();
        return;
    }
    if (document.getElementById('exitModal') && document.getElementById('exitModal').classList.contains('active')) {
        closeExitModal();
        return;
    }
    
    // Navigate through pages
    if (document.getElementById('tokenVisitPage').style.display === 'block') {
        showPage('todayTokenPage');
    }
    else if (document.getElementById('heliRecordPage').style.display === 'block' ||
             document.getElementById('addPage').style.display === 'block' ||
             document.getElementById('todayTokenPage').style.display === 'block' ||
             document.getElementById('reminderPage').style.display === 'block') {
        showPage('menuPage');
    }
    else if (document.getElementById('menuPage').style.display === 'flex') {
        showPage('dashboardPage');
    }
    // On dashboard - show exit confirmation
    else if (document.getElementById('dashboardPage').style.display === 'flex') {
        showExitModal();
    }
}

function showExitModal() {
    if (!document.getElementById('exitModal')) {
        var modal = document.createElement('div');
        modal.id = 'exitModal';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-box">' +
            '<h2>🚪 Exit HealeManager?</h2>' +
            '<p>Are you sure you want to exit the app?</p>' +
            '<div class="modal-buttons">' +
            '<button class="btn-skip" onclick="closeExitModal()">Cancel</button>' +
            '<button class="btn-print" style="background:#ef4444;" onclick="confirmExit()">Exit App</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(modal);
    }
    document.getElementById('exitModal').classList.add('active');
}

function closeExitModal() {
    if (document.getElementById('exitModal')) {
        document.getElementById('exitModal').classList.remove('active');
    }
}

function confirmExit() {
    closeExitModal();
    
    // Try Capacitor exit first
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.exitApp();
        return;
    }
    
    // Try Cordova exit
    if (navigator.app) {
        navigator.app.exitApp();
        return;
    }
    
    // Browser fallback
    window.close();
}

// Auto-login check when app starts or resumes
function checkAutoLogin() {
    var savedLogin = localStorage.getItem('heale_logged_in');
    if (savedLogin === 'true') {
        isLoggedIn = true;
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'flex';
        document.getElementById('logoutBtn').style.display = 'flex';
        loadDashboard();
    }
}

// Setup app resume handler to stay logged in
function setupAppLifecycle() {
    // Capacitor resume
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.addListener('appStateChange', function(state) {
            if (state.isActive && isLoggedIn) {
                // App came back to foreground, make sure we're still logged in
                if (document.getElementById('loginPage').style.display === 'flex') {
                    document.getElementById('loginPage').style.display = 'none';
                    document.getElementById('dashboardPage').style.display = 'flex';
                    document.getElementById('logoutBtn').style.display = 'flex';
                    loadDashboard();
                }
            }
        });
    }
    
    // Cordova resume
    document.addEventListener('resume', function() {
        if (isLoggedIn) {
            if (document.getElementById('loginPage').style.display === 'flex') {
                document.getElementById('loginPage').style.display = 'none';
                document.getElementById('dashboardPage').style.display = 'flex';
                document.getElementById('logoutBtn').style.display = 'flex';
                loadDashboard();
            }
        }
    }, false);
}
