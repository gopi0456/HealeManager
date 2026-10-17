function generatePatientId(id) { return 'HEALE' + String(id).padStart(4, '0'); }

function addPatient() {
    var name = document.getElementById('name').value.trim();
    var age = document.getElementById('age').value;
    var phone = document.getElementById('phone').value.trim();
    var aadhar = document.getElementById('aadhar').value.trim();
    var address = document.getElementById('address').value.trim();
    var notes = document.getElementById('notes').value.trim();

    if (!name || !phone || !aadhar) { alert('Name, Phone, Aadhar required!'); return; }
    if (phone.length !== 10 || !/^[0-9]+$/.test(phone)) { alert('Phone must be 10 digits!'); return; }
    if (aadhar.length !== 5 || !/^[0-9]+$/.test(aadhar)) { alert('Aadhar must be 5 digits!'); return; }

    var dt = getCurrentDateTime();

    db.transaction(function(tx) {
        tx.executeSql('SELECT id FROM patients WHERE name = ? AND aadhar = ?', [name, aadhar],
            function(tx, checkRes) {
                if (checkRes.rows.length > 0) {
                    alert('User already exists!\n\nHeale ID: ' + generatePatientId(checkRes.rows.item(0).id));
                    return;
                }
                tx.executeSql('INSERT INTO patients (name,age,phone,aadhar,address,notes,date_time) VALUES (?,?,?,?,?,?,?)',
                    [name, age, phone, aadhar, address, notes, dt],
                    function(tx, r) {
                        lastSavedPatient = {
                            id: generatePatientId(r.insertId),
                            name: name, age: age, phone: phone, aadhar: aadhar,
                            address: address, notes: notes, date_time: dt
                        };
                        ['name','age','phone','aadhar','address','notes'].forEach(function(f) {
                            document.getElementById(f).value = '';
                        });
                        showSuccessModal();
                        if (typeof loadDashboard === 'function') loadDashboard();
                    },
                    function(e) { alert('Insert Error: ' + e.message); }
                );
            },
            function(e) { alert('Check Error: ' + e.message); }
        );
    });
}

function showSuccessModal() {
    const nextVisit = getNextVisitDate(parseDate(lastSavedPatient.date_time));
    document.getElementById('modalMessage').innerHTML = 
        '<strong>ID:</strong> '+lastSavedPatient.id+'<br>' +
        '<strong>Name:</strong> '+lastSavedPatient.name+'<br>' +
        '<strong>Date:</strong> '+lastSavedPatient.date_time+'<br>' +
        '<strong>Next Visit:</strong> '+formatDate(nextVisit)+' ('+DAY_NAMES[nextVisit.getDay()]+')<br><br>' +
        'Send details?';
    document.getElementById('successModal').classList.add('active');
}

function closeModal() { 
    document.getElementById('successModal').classList.remove('active'); 
    lastSavedPatient = null; 
    showPage('menuPage'); 
}

function searchPatients() {
    const q = document.getElementById('searchInput').value.trim();
    if (!q) {
        document.getElementById('patientList').innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>Enter name or Heale ID to search</p></div>';
        return;
    }
    
    db.transaction(function(tx) {
        const searchPattern = '%' + q + '%';
        const healeNumMatch = q.match(/HEALE(\d+)/i);
        const healeNum = healeNumMatch ? parseInt(healeNumMatch[1]) : null;
        
        const buildResults = (patients) => {
            const pv = {};
            for (let i = 0; i < patients.length; i++) {
                const p = patients[i];
                const key = (p.name || '').trim().toLowerCase() + '|' + (p.aadhar || '').trim();
                if (!pv[key] || p.id < pv[key].permanentId) {
                    pv[key] = { latest: p, permanentId: p.id };
                }
            }
            renderSearchResults(pv);
        };
        
        if (healeNum) {
            tx.executeSql('SELECT * FROM patients WHERE id = ?', [healeNum],
                function(tx, r) {
                    const patients = [];
                    for (let i = 0; i < r.rows.length; i++) patients.push(r.rows.item(i));
                    buildResults(patients);
                });
        } else {
            tx.executeSql('SELECT * FROM patients WHERE name LIKE ? OR aadhar LIKE ? OR phone LIKE ?',
                [searchPattern, searchPattern, searchPattern],
                function(tx, r) {
                    const patients = [];
                    for (let i = 0; i < r.rows.length; i++) patients.push(r.rows.item(i));
                    buildResults(patients);
                });
        }
    });
}

function renderSearchResults(pv) {
    var list = document.getElementById('patientList');
    if (!list) return;
    list.innerHTML = '';
    var keys = Object.keys(pv);
    if (!keys.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">😕</div><p>No patients found.</p></div>';
        return;
    }
    
    keys.forEach(function(key) {
        var d = pv[key];
        var p = d.latest;
        var pid = d.permanentId;
        var healeIdStr = 'HEALE' + String(pid).padStart(4, '0');
        
        var regDate = 'N/A';
        var today = new Date();
        var lastVisit = today;
        
        if (p.date_time && String(p.date_time).length >= 10) {
            regDate = String(p.date_time).substring(0, 10);
            var dateStr = String(p.date_time).replace(' ', 'T');
            var parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
                lastVisit = parsedDate;
            }
        }
        
        var diffTime = Math.abs(today - lastVisit);
        var weeksSince = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
        var missedWeeks = weeksSince === 0 ? 'Today' : weeksSince + ' week' + (weeksSince > 1 ? 's' : '') + ' ago';
        
        var safeName = p.name.replace(/'/g, "'");
        
        var html = '<div class="patient-card">';
        html += '<div class="patient-header">';
        html += '<div class="patient-name">' + p.name + '</div>';
        html += '<div class="heale-id-badge">' + healeIdStr + '</div>';
        html += '</div>';
        html += '<div class="patient-details">';
        html += '<span>📞 ' + p.phone + '</span>';
        html += '<span>🆔 ' + p.aadhar + '</span>';
        html += '</div>';
        html += '<div class="patient-details" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0;">';
        html += '<span style="color: #3b82f6;">📅 Reg: <strong>' + regDate + '</strong></span>';
        html += '<span style="color: #f59e0b;">⏰ Last: <strong>' + missedWeeks + '</strong></span>';
        html += '</div>';
        html += '<div class="patient-actions" style="margin-top: 12px;">';
        html += '<button class="btn-token" onclick="addToToken(' + pid + ', \'' + safeName + '\', \'' + p.phone + '\', this)">🎟️ Add Token</button>';
        html += '<button class="btn-view" onclick="showPatientDetail(' + pid + ')">👁️ View</button>';
        html += '</div>';
        html += '</div>';
        list.innerHTML += html;
    });
}

function updatePatientNotes(patientId, notes, btn) {
    if (!notes.trim()) { alert('⚠️ Please enter medical notes!'); return; }
    const dt = getCurrentDateTime();
    db.transaction(function(tx) {
        tx.executeSql('INSERT INTO visits (patient_id, notes, date_time) VALUES (?,?,?)',
            [patientId, notes, dt],
            function() {
                alert('✅ Visit saved! Heale ID: ' + generatePatientId(patientId) + '\nDate: ' + dt);
                if (btn) {
                    btn.textContent = '✓ Saved';
                    btn.disabled = true;
                    btn.style.background = '#6b7280';
                }
                if (typeof searchPatients === 'function') searchPatients();
                if (typeof loadDashboard === 'function') loadDashboard();
            },
            function(e) { alert('❌ Error: ' + e.message); }
        );
    });
}

function showPatientDetail(patientId) {
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM patients WHERE id = ?', [patientId],
            function(tx, pRes) {
                if (pRes.rows.length === 0) { alert('❌ Patient not found'); return; }
                const p = pRes.rows.item(0);
                const healeId = 'HEALE' + String(p.id).padStart(4, '0');
                
                tx.executeSql('SELECT * FROM visits WHERE patient_id = ? ORDER BY date_time DESC', [patientId],
                    function(tx, vRes) {
                        const totalVisits = vRes.rows.length;
                        
                        let html = `
                            <div class="patient-detail-header">
                                <div class="detail-name">${p.name}</div>
                                <div class="detail-heale-id">${healeId}</div>
                                <div class="detail-reg-date">📅 Registered: ${p.date_time ? String(p.date_time).substring(0,10) : 'N/A'} | Total Visits: ${totalVisits}</div>
                            </div>
                            <div class="patient-detail-info">
                                <div class="info-row"><span class="info-icon">📞</span> <span>${p.phone}</span></div>
                                <div class="info-row"><span class="info-icon">🆔</span> <span>Aadhar: ${p.aadhar}</span></div>
                                <div class="info-row"><span class="info-icon">🎂</span> <span>Age: ${p.age || 'N/A'}</span></div>
                                <div class="info-row"><span class="info-icon">📍</span> <span>${p.address || 'N/A'}</span></div>
                            </div>
                            <div class="visit-history-section">
                                <h3>📋 History</h3>
                                <div class="visit-list">`;
                        
                        if (p.notes && String(p.notes).trim() !== '') {
                            html += `<div class="visit-item" style="border-left-color: #10b981;"><div class="visit-item-header"><span class="visit-date">📝 Registration Notes</span></div><div class="visit-notes">${p.notes}</div></div>`;
                        }

                        if (totalVisits === 0 && (!p.notes || String(p.notes).trim() === '')) {
                            html += '<div class="empty-visit">No visits recorded yet.</div>';
                        } else {
                            for (let i = 0; i < totalVisits; i++) {
                                const v = vRes.rows.item(i);
                                const tokenBadge = v.token_number ? `<span class="token-badge">Token #${v.token_number}</span>` : '';
                                html += `<div class="visit-item"><div class="visit-item-header"><span class="visit-date">🕒 ${v.date_time}</span>${tokenBadge}</div><div class="visit-notes">${v.notes || 'No notes recorded'}</div></div>`;
                            }
                        }
                        html += `</div></div>`;
                        
                        html += `<button class="btn-edit" onclick="openEditPatient(${patientId})" style="width:100%; padding:12px; background:#f59e0b; color:white; border:none; border-radius:6px; font-weight:bold; font-size:16px; cursor:pointer; margin-top:15px;">✏️ Edit Patient Details</button>`;
                        
                        let modal = document.getElementById('patientDetailModal');
                        if (!modal) {
                            modal = document.createElement('div');
                            modal.id = 'patientDetailModal';
                            modal.className = 'modal';
                            modal.innerHTML = `
                                <div class="modal-box detail-modal-box">
                                    <div id="patientDetailContent"></div>
                                    <button class="btn-close-modal" onclick="document.getElementById('patientDetailModal').classList.remove('active')" style="width:100%; padding:12px; background:#ef4444; color:white; border:none; border-radius:6px; font-weight:bold; font-size:16px; cursor:pointer; margin-top:15px;">Close</button>
                                </div>`;
                            document.body.appendChild(modal);
                        }
                        document.getElementById('patientDetailContent').innerHTML = html;
                        modal.classList.add('active');
                    },
                    function(e) { alert('❌ Visit query error: ' + e.message); });
            },
            function(e) { alert('❌ Patient query error: ' + e.message); });
    });
}

function openEditPatient(patientId) {
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM patients WHERE id = ?', [patientId],
            function(tx, res) {
                if (res.rows.length === 0) { alert('❌ Patient not found'); return; }
                const p = res.rows.item(0);
                window.editingPatientId = patientId;
                
                document.getElementById('name').value = p.name || '';
                document.getElementById('age').value = p.age || '';
                document.getElementById('phone').value = p.phone || '';
                document.getElementById('aadhar').value = p.aadhar || '';
                document.getElementById('address').value = p.address || '';
                document.getElementById('notes').value = p.notes || '';
                
                document.getElementById('patientDetailModal').classList.remove('active');
                showPage('addPage');
                
                const saveBtn = document.querySelector('#addPage .main-btn');
                if (saveBtn) {
                    saveBtn.textContent = '💾 Update Patient Details';
                    saveBtn.style.background = '#f59e0b';
                    saveBtn.onclick = function() { updatePatientDetails(); };
                    
                    if (!document.getElementById('cancelEditBtn')) {
                        const cancelBtn = document.createElement('button');
                        cancelBtn.id = 'cancelEditBtn';
                        cancelBtn.textContent = '❌ Cancel Edit';
                        cancelBtn.style.cssText = 'width:100%; padding:12px; background:#ef4444; color:white; border:none; border-radius:6px; font-weight:bold; font-size:16px; cursor:pointer; margin-top:10px;';
                        cancelBtn.onclick = function() {
                            ['name','age','phone','aadhar','address','notes'].forEach(function(f) { document.getElementById(f).value = ''; });
                            saveBtn.textContent = 'Save Registration';
                            saveBtn.style.background = '';
                            saveBtn.onclick = function() { addPatient(); };
                            window.editingPatientId = null;
                            document.getElementById('cancelEditBtn').remove();
                            showPage('menuPage');
                        };
                        saveBtn.parentNode.insertBefore(cancelBtn, saveBtn.nextSibling);
                    }
                }
            },
            function(e) { alert('❌ Error: ' + e.message); }
        );
    });
}

function updatePatientDetails() {
    const patientId = window.editingPatientId;
    if (!patientId) { alert('❌ Error: No patient ID found for update.'); return; }
    
    var name = document.getElementById('name').value.trim();
    var age = document.getElementById('age').value;
    var phone = document.getElementById('phone').value.trim();
    var aadhar = document.getElementById('aadhar').value.trim();
    var address = document.getElementById('address').value.trim();
    var notes = document.getElementById('notes').value.trim();

    if (!name || !phone || !aadhar) { alert('Name, Phone, Aadhar required!'); return; }
    if (phone.length !== 10 || !/^[0-9]+$/.test(phone)) { alert('Phone must be 10 digits!'); return; }
    if (aadhar.length !== 5 || !/^[0-9]+$/.test(aadhar)) { alert('Aadhar must be 5 digits!'); return; }

    db.transaction(function(tx) {
        tx.executeSql('UPDATE patients SET name=?, age=?, phone=?, aadhar=?, address=?, notes=? WHERE id=?',
            [name, age, phone, aadhar, address, notes, patientId],
            function() {
                alert('✅ Patient details updated successfully!');
                ['name','age','phone','aadhar','address','notes'].forEach(function(f) { document.getElementById(f).value = ''; });
                
                const saveBtn = document.querySelector('#addPage .main-btn');
                if (saveBtn) {
                    saveBtn.textContent = 'Save Registration';
                    saveBtn.style.background = ''; 
                    saveBtn.onclick = function() { addPatient(); };
                }
                window.editingPatientId = null;
                if (document.getElementById('cancelEditBtn')) document.getElementById('cancelEditBtn').remove();
                
                showPage('heliRecordPage');
                if (typeof searchPatients === 'function') searchPatients();
            },
            function(e) { alert('❌ Update Error: ' + e.message); }
        );
    });
}

function closeDetail() { document.getElementById('detailOverlay').classList.remove('active'); }
function closeDetailIfOutside(e) { if (e.target === document.getElementById('detailOverlay')) closeDetail(); }

// ==========================================
// AGGRESSIVE DEBUGGING FOR MONTH VISITS
// ==========================================
function loadDashboard() { 
    console.log('🚀 loadDashboard() CALLED');
    const now = new Date();
    const today = getTodayDate();
    const currentMonth = now.getMonth(); // 0-11 (October = 9)
    const currentYear = now.getFullYear(); // 2026
    
    console.log('📅 Current Month (0-11):', currentMonth, '| Current Year:', currentYear);
    
    db.transaction(function(tx) { 
        // 1. Total Patients
        tx.executeSql('SELECT COUNT(*) as c FROM patients', [], 
            function(tx,r){ document.getElementById('totalPatients').textContent = r.rows.item(0).c; }); 
        
        // 2. Today's Unique Patients
        tx.executeSql('SELECT COUNT(*) as c FROM patients WHERE date_time LIKE ?', [today+'%'], 
            function(tx,r){ document.getElementById('todayPatients').textContent = r.rows.item(0).c; }); 
        
        // 3. Today's Tokens + Visits
        tx.executeSql('SELECT COUNT(*) as c FROM tokens WHERE token_date = ?', [today], 
            function(tx, tRes) { 
                const tokenCount = tRes.rows.item(0).c;
                tx.executeSql('SELECT COUNT(*) as c FROM visits WHERE date_time LIKE ?', [today + '%'], 
                    function(tx, vRes) {
                        const visitCount = vRes.rows.item(0).c;
                        document.getElementById('todayTokens').textContent = tokenCount + visitCount;
                    });
            }); 
        
        // 4. THIS MONTH VISITS - AGGRESSIVE DEBUG
        console.log('🔍 Fetching ALL visits from database...');
        tx.executeSql('SELECT date_time FROM visits', [], function(tx, allVisits) {
            console.log('📊 Total rows in visits table:', allVisits.rows.length);
            
            let monthVisitCount = 0;
            
            for (let i = 0; i < allVisits.rows.length; i++) {
                const row = allVisits.rows.item(i);
                const dateStr = row.date_time;
                console.log(`  Row ${i}: date_time = "${dateStr}" (type: ${typeof dateStr})`);
                
                if (dateStr && String(dateStr).includes('/')) {
                    const parts = String(dateStr).split(' ')[0].split('/');
                    console.log(`    -> Split parts:`, parts);
                    if (parts.length === 3) {
                        const month = parseInt(parts[1]) - 1;
                        const year = parseInt(parts[2]);
                        console.log(`    -> Parsed: Month=${month}, Year=${year}`);
                        
                        if (month === currentMonth && year === currentYear) {
                            monthVisitCount++;
                            console.log(`    -> ✅ MATCH! Count is now: ${monthVisitCount}`);
                        }
                    }
                } else {
                    console.log(`    -> ❌ Does not contain '/'`);
                }
            }
            
            console.log('🎯 FINAL MONTH VISIT COUNT:', monthVisitCount);
            
            // Force update the DOM
            const el = document.getElementById('monthPatients');
            if (el) {
                el.textContent = monthVisitCount;
                console.log('✅ Updated DOM element "monthPatients" to:', monthVisitCount);
            } else {
                console.error('❌ Could not find element with id "monthPatients"');
            }
        }, function(err) {
            console.error('❌ SQL Error fetching visits:', err);
        });
        
        // 5. FOLLOW-UP DUE
        tx.executeSql('SELECT * FROM patients', [], function(tx, r) { 
            const todayDate = new Date(); 
            todayDate.setHours(0, 0, 0, 0);
            const latestActivity = {}; 
            
            for (let i = 0; i < r.rows.length; i++) { 
                const p = r.rows.item(i);
                const regDate = parseDate(p.date_time); 
                if (!regDate) continue; 
                const _k = (p.name || '').trim().toLowerCase() + '|' + (p.aadhar || '').trim().toLowerCase(); 
                if (!_k.split('|')[0] && !_k.split('|')[1]) _k = (p.phone || ''); 
                if (!latestActivity[_k] || regDate > latestActivity[_k]) {
                    latestActivity[_k] = regDate;
                }
            } 
            
            tx.executeSql('SELECT patient_id, date_time FROM visits', [], function(tx2, vRes) {
                const idToKey = {};
                for (let i = 0; i < r.rows.length; i++) {
                    const p = r.rows.item(i);
                    const _k = (p.name || '').trim().toLowerCase() + '|' + (p.aadhar || '').trim().toLowerCase();
                    if (!_k.split('|')[0] && !_k.split('|')[1]) _k = (p.phone || '');
                    idToKey[p.id] = _k;
                }
                
                for (let j = 0; j < vRes.rows.length; j++) {
                    const v = vRes.rows.item(j);
                    const key = idToKey[v.patient_id];
                    if (!key) continue;
                    const vd = parseDate(v.date_time);
                    if (vd && (!latestActivity[key] || vd > latestActivity[key])) {
                        latestActivity[key] = vd;
                    }
                }
                
                tx.executeSql('SELECT patient_id, token_date FROM tokens', [], function(tx3, tRes) {
                    for (let k = 0; k < tRes.rows.length; k++) {
                        const t = tRes.rows.item(k);
                        const key = idToKey[t.patient_id];
                        if (!key) continue;
                        const td = parseDate(t.token_date);
                        if (td && (!latestActivity[key] || td > latestActivity[key])) {
                            latestActivity[key] = td;
                        }
                    }
                    
                    let rc = 0; 
                    Object.values(latestActivity).forEach(lastDate => { 
                        const nextVisit = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 7);
                        nextVisit.setHours(0, 0, 0, 0);
                        if (nextVisit <= todayDate) {
                            rc++; 
                        }
                    }); 
                    document.getElementById('reminderCount').textContent = rc; 
                });
            });
        }); 
        
        // 6. Average Per Day
        tx.executeSql('SELECT date_time FROM visits', [], function(tx, allVisits) {
            let monthVisitCount = 0;
            for (let i = 0; i < allVisits.rows.length; i++) {
                const dateStr = allVisits.rows.item(i).date_time;
                if (dateStr && String(dateStr).includes('/')) {
                    const parts = String(dateStr).split(' ')[0].split('/');
                    if (parts.length === 3) {
                        const month = parseInt(parts[1]) - 1;
                        const year = parseInt(parts[2]);
                        if (month === currentMonth && year === currentYear) {
                            monthVisitCount++;
                        }
                    }
                }
            }
            const dp = now.getDate();
            const avg = dp > 0 ? Math.round(monthVisitCount / dp * 10) / 10 : 0;
            document.getElementById('avgPerDay').textContent = avg;
        }); 
    }); 
}
// ==========================================

function reprintFromHealeRecord(patientId, patientName, patientPhone) {
    db.transaction(function(tx) {
        tx.executeSql('SELECT notes FROM visits WHERE patient_id = ? ORDER BY date_time DESC LIMIT 1', [patientId],
            function(tx, res) {
                var notes = 'No previous notes';
                if (res.rows.length > 0 && res.rows.item(0) && res.rows.item(0).notes) notes = res.rows.item(0).notes;
                var healeId = 'HEALE' + String(patientId).padStart(4, '0');
                var currentTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
                var modal = document.getElementById('tokenTicketModal');
                if (!modal) { alert('❌ Token modal not found'); return; }
                document.getElementById('ticketTokenNum').textContent = 'REPRINT';
                document.getElementById('ticketName').textContent = patientName;
                document.getElementById('ticketId').textContent = healeId;
                document.getElementById('ticketPhone').textContent = patientPhone;
                document.getElementById('ticketDate').textContent = currentTime;
                document.getElementById('ticketNotes').textContent = notes;
                modal.classList.add('active');
                modal.style.display = 'flex';
            },
            function(err) { alert('❌ Error loading notes: ' + err.message); }
        );
    });
}
