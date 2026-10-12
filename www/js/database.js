let db;
let lastSavedPatient = null;
let isBrowser = !window.cordova;

class BrowserDBMock {
    constructor() {
        this.patients = JSON.parse(localStorage.getItem('mock_patients') || '[]');
        this.tokens = JSON.parse(localStorage.getItem('mock_tokens') || '[]');
        this.visits = JSON.parse(localStorage.getItem('mock_visits') || '[]');
        this.nextPatientId = parseInt(localStorage.getItem('mock_next_patient_id') || '1');
        this.nextTokenId = parseInt(localStorage.getItem('mock_next_token_id') || '1');
        this.nextVisitId = parseInt(localStorage.getItem('mock_next_visit_id') || '1');
    }

    _save() {
        localStorage.setItem('mock_patients', JSON.stringify(this.patients));
        localStorage.setItem('mock_next_patient_id', String(this.nextPatientId));
        localStorage.setItem('mock_tokens', JSON.stringify(this.tokens));
        localStorage.setItem('mock_next_token_id', String(this.nextTokenId));
        localStorage.setItem('mock_visits', JSON.stringify(this.visits));
        localStorage.setItem('mock_next_visit_id', String(this.nextVisitId));
    }

    transaction(callback, error, success) {
        const tx = {
            executeSql: (sql, params, rowCallback, errorCallback) => {
                try {
                    if (sql.includes('CREATE TABLE')) {
                        if (rowCallback) rowCallback(tx, { rows: { length: 0 } });
                    }
                    // ---------- PATIENTS ----------
                    else if (sql.includes('SELECT id FROM patients WHERE name = ? AND aadhar = ?')) {
                        const results = this.patients.filter(p => p.name === params[0] && p.aadhar === params[1]);
                        if (rowCallback) rowCallback(tx, { rows: { length: results.length, item: (i) => results[i] } });
                    }
                    else if (sql.includes('INSERT INTO patients')) {
                        const n = params.length;
                        const newPatient = {
                            id: this.nextPatientId++,
                            name: params[0],
                            age: params[1],
                            phone: params[2],
                            aadhar: params[3],
                            address: params[4],
                            notes: n > 5 ? params[5] : '',
                            date_time: n > 6 ? params[6] : (n > 5 ? params[5] : ''),
                            token_number: n > 7 ? params[7] : ''
                        };
                        this.patients.push(newPatient);
                        this._save();
                        if (rowCallback) rowCallback(tx, { insertId: newPatient.id });
                    }
                    
                    else if (sql.includes('SELECT notes FROM patients WHERE id = ?')) {
                        const results = this.patients.filter(p => p.id === parseInt(params[0]));
                        if (rowCallback) rowCallback(tx, { rows: { length: results.length, item: (i) => results[i] } });
                    }
else if (sql.includes('SELECT * FROM patients WHERE id = ?')) {
                        const results = this.patients.filter(p => p.id === parseInt(params[0]));
                        if (rowCallback) rowCallback(tx, { rows: { length: results.length, item: (i) => results[i] } });
                    }
                    else if (sql.includes('SELECT * FROM patients')) {
                        const pattern = params && params[0] ? String(params[0]).replace(/%/g, '').toLowerCase() : '';
                        let results = this.patients;
                        if (pattern) {
                            results = this.patients.filter(p =>
                                String(p.name).toLowerCase().includes(pattern) ||
                                String(p.aadhar).includes(pattern) ||
                                String(p.phone).includes(pattern)
                            );
                        }
                        if (rowCallback) rowCallback(tx, { rows: { length: results.length, item: (i) => results[i] } });
                    }
                    else if (sql.includes('SELECT COUNT(*) as c FROM patients')) {
                        if (rowCallback) rowCallback(tx, { rows: { length: 1, item: () => ({ c: this.patients.length }) } });
                    }
                    // ---------- VISITS (token-based only) ----------
                    else if (sql.includes('INSERT INTO visits')) {
                        const newVisit = {
                            id: this.nextVisitId++,
                            patient_id: parseInt(params[0]),
                            notes: params[1],
                            date_time: params[2],
                            token_number: params.length > 3 ? params[3] : ''
                        };
                        this.visits.push(newVisit);
                        this._save();
                        if (rowCallback) rowCallback(tx, { insertId: newVisit.id });
                    }
                    else if (sql.includes('SELECT * FROM visits WHERE patient_id = ?')) {
                        const pid = parseInt(params[0]);
                        const results = this.visits
                            .filter(v => v.patient_id === pid)
                            .sort((a, b) => String(b.date_time).localeCompare(String(a.date_time)));
                        if (rowCallback) rowCallback(tx, { rows: { length: results.length, item: (i) => results[i] } });
                    }
                    else if (sql.includes('SELECT MAX(date_time) FROM visits')) {
                        if (rowCallback) rowCallback(tx, { rows: { length: 1, item: () => ({ last_visit: '' }) } });
                    }
                    else if (sql.includes('SELECT * FROM visits')) {
                        if (rowCallback) rowCallback(tx, { rows: { length: this.visits.length, item: (i) => this.visits[i] } });
                    }
                    // ---------- TOKENS ----------
                    else if (sql.includes('INSERT INTO tokens')) {
                        const newToken = {
                            id: this.nextTokenId++,
                            patient_id: parseInt(params[0]),
                            patient_name: params[1],
                            patient_phone: params[2],
                            token_date: params[3],
                            created_at: params[4],
                            token_number: parseInt(params[5])
                        };
                        this.tokens.push(newToken);
                        this._save();
                        if (rowCallback) rowCallback(tx, { insertId: newToken.id });
                    }
                    else if (sql.includes('SELECT COUNT(*) as c FROM tokens WHERE patient_id=? AND token_date=?')) {
                        const c = this.tokens.filter(t => t.patient_id === parseInt(params[0]) && t.token_date === params[1]).length;
                        if (rowCallback) rowCallback(tx, { rows: { length: 1, item: () => ({ c: c }) } });
                    }
                    else if (sql.includes('SELECT MAX(token_number) as max_t FROM tokens')) {
                        const day = this.tokens.filter(t => t.token_date === params[0]);
                        const mx = day.length ? Math.max.apply(null, day.map(t => t.token_number)) : 0;
                        if (rowCallback) rowCallback(tx, { rows: { length: 1, item: () => ({ max_t: mx }) } });
                    }
                    else if (sql.includes('SELECT token_number FROM tokens WHERE id = ?')) {
                        const t = this.tokens.find(x => x.id === parseInt(params[0]));
                        if (rowCallback) rowCallback(tx, { rows: { length: t ? 1 : 0, item: () => t } });
                    }
                    else if (sql.includes('DELETE FROM tokens WHERE id = ?')) {
                        this.tokens = this.tokens.filter(t => t.id !== parseInt(params[0]));
                        this._save();
                        if (rowCallback) rowCallback(tx, { rowsAffected: 1 });
                    }
                    else if (sql.includes('SELECT * FROM tokens')) {
                        if (rowCallback) rowCallback(tx, { rows: { length: this.tokens.length, item: (i) => this.tokens[i] } });
                    }
                    if (success) success();
                } catch (e) {
                    console.error('Mock DB Error:', e);
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
}

function initDatabase() {
    if (!isBrowser) {
        db = window.sqlitePlugin.openDatabase({ name: 'patients.db', location: 'default' });
        console.log('SQLite database on device');
    } else {
        db = new BrowserDBMock();
        console.log('Browser Mock Database');
    }

    db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS patients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age TEXT, phone TEXT, aadhar TEXT, address TEXT, notes TEXT, date_time TEXT, token_number TEXT)');
        tx.executeSql('CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, notes TEXT, date_time TEXT, token_number TEXT)');
        tx.executeSql('CREATE TABLE IF NOT EXISTS tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, patient_name TEXT, patient_phone TEXT, token_date TEXT, created_at TEXT, token_number INTEGER)');
    }, function(e) {
        console.error('DB Init Error:', e.message);
    }, function() {
        console.log('Database ready');
        if (typeof loadDashboard === 'function') loadDashboard();
    });
}

if (isBrowser) {
    document.addEventListener('DOMContentLoaded', function() {
        initDatabase();
        if (typeof setupBackButton === 'function') setupBackButton();
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (typeof updateThemeIcon === 'function') updateThemeIcon(savedTheme);
    });
} else {
    document.addEventListener('deviceready', function() {
        initDatabase();
        if (typeof setupBackButton === 'function') setupBackButton();
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (typeof updateThemeIcon === 'function') updateThemeIcon(savedTheme);
    }, false);
}
