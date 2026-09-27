let db;
let lastSavedPatient = null;

function initDatabase() {
    db = window.sqlitePlugin.openDatabase({
        name: 'patients.db',
        location: 'default'
    });

    db.transaction(function(tx) {
        tx.executeSql(`CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, age TEXT, phone TEXT, aadhar TEXT,
            address TEXT, notes TEXT, date_time TEXT, token_number TEXT
        )`);
    }, function(e) { 
        console.error('DB Error (patients):', e.message); 
    }, function() { 
        console.log('✅ Patients table ready'); 
    });

    db.transaction(function(tx) {
        tx.executeSql(`CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER, patient_name TEXT, patient_phone TEXT,
            token_date TEXT, created_at TEXT, token_number INTEGER
        )`);
    }, function(e) { 
        console.error('DB Error (tokens):', e.message); 
    }, function() { 
        console.log('✅ Tokens table ready'); 
    });
}

// Wait for device to be ready
document.addEventListener('deviceready', function() {
    console.log('✅ Device ready');
    
    // Initialize database
    initDatabase();
    
    // Setup back button handler
    if (typeof setupBackButton === 'function') {
        setupBackButton();
        console.log('✅ Back button setup complete');
    }
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (typeof updateThemeIcon === 'function') {
        updateThemeIcon(savedTheme);
    }
    
}, false);

// Fallback for browser testing
if (!window.cordova) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🌐 Browser mode - initializing...');
        
        // Create mock sqlitePlugin for browser
        if (!window.sqlitePlugin) {
            window.sqlitePlugin = {
                openDatabase: function(config) {
                    console.log('🔧 Using browser localStorage as database');
                    return {
                        transaction: function(callback, error, success) {
                            const tx = {
                                executeSql: function(sql, params, rowCallback, errorCallback) {
                                    try {
                                        // Simple mock implementation
                                        if (sql.includes('CREATE TABLE')) {
                                            if (success) success();
                                        } else if (sql.includes('INSERT')) {
                                            const result = { insertId: Date.now() };
                                            if (rowCallback) rowCallback(tx, result);
                                        } else if (sql.includes('SELECT')) {
                                            const result = { rows: { length: 0, item: function() { return null; } } };
                                            if (rowCallback) rowCallback(tx, result);
                                        }
                                    } catch (e) {
                                        if (errorCallback) errorCallback(e);
                                    }
                                }
                            };
                            try {
                                callback(tx);
                                if (success) success();
                            } catch (e) {
                                if (error) error(e);
                            }
                        }
                    };
                }
            };
        }
        
        initDatabase();
        
        if (typeof setupBackButton === 'function') {
            setupBackButton();
        }
        
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (typeof updateThemeIcon === 'function') {
            updateThemeIcon(savedTheme);
        }
    });
}
