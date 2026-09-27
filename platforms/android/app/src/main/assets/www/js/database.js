let db;
let lastSavedPatient = null;

function initDatabase() {
    db = window.sqlitePlugin.openDatabase({name: 'patients.db', location: 'default'});
    
    db.transaction(function(tx) {
        tx.executeSql(`CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name TEXT, age TEXT, phone TEXT, aadhar TEXT, 
            address TEXT, notes TEXT, date_time TEXT, token_number TEXT
        )`);
    }, function(e) { console.error('DB Error (patients):', e.message); }, 
    function() { console.log('✅ Patients table ready'); });

    db.transaction(function(tx) {
        tx.executeSql(`CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            patient_id INTEGER, patient_name TEXT, patient_phone TEXT, 
            token_date TEXT, created_at TEXT, token_number INTEGER
        )`);
    }, function(e) { console.error('DB Error (tokens):', e.message); }, 
    function() { console.log('✅ Tokens table ready'); });
}
