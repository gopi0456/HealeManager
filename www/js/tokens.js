// ==========================================
// 1. ADD TOKEN
// ==========================================
function addToToken(dbId, name, phone, btn) {
    try {
        dbId = parseInt(dbId);
        const fullHeliId = 'HEALE' + String(dbId).padStart(4, '0');
        const today = getTodayDate();
        const currentTime = getCurrentDateTime();

        db.transaction(function(tx) {
            tx.executeSql('SELECT COUNT(*) as c FROM tokens WHERE patient_id=? AND token_date=?',
                [dbId, today], function(tx, r) {
                    if (r.rows.item(0).c > 0) {
                        alert('⚠️ This patient already has a token for today!');
                        return;
                    }

                    tx.executeSql('SELECT MAX(token_number) as max_t FROM tokens WHERE token_date=? WHERE token_date=?',
                        [today], function(tx, res) {
                            let nextTokenNum = 1;
                            if (res.rows.length > 0 && res.rows.item(0).max_t) {
                                nextTokenNum = res.rows.item(0).max_t + 1;
                            }

                            tx.executeSql('INSERT INTO tokens (patient_id, patient_name, patient_phone, token_date, created_at, token_number) VALUES (?,?,?,?,?,?)',
                                [dbId, name, phone, today, currentTime, nextTokenNum],
                                function() {
                                    window.currentTicket = {
                                        tokenNum: '#' + nextTokenNum,
                                        name: name,
                                        id: fullHeliId,
                                        phone: phone,
                                        date: currentTime,
                                        notes: 'Pending visit...'
                                    };

                                    document.getElementById('ticketTokenNum').textContent = '#' + nextTokenNum;
                                    document.getElementById('ticketName').textContent = name;
                                    document.getElementById('ticketId').textContent = fullHeliId;
                                    document.getElementById('ticketPhone').textContent = phone;
                                    document.getElementById('ticketDate').textContent = currentTime;
                                    document.getElementById('ticketNotes').textContent = 'Pending visit...';

                                    const modal = document.getElementById('tokenTicketModal');
                                    if (modal) {
                                        modal.classList.add('active');
                                        modal.style.display = 'flex';
                                    }

                                    if (btn) {
                                        btn.textContent = '✓ Token #' + nextTokenNum;
                                        btn.classList.add('added');
                                    }
                                    if (typeof loadTodayTokens === 'function') loadTodayTokens();
                                },
                                function(err) { alert("❌ DB Error: " + err.message); }
                            );
                        });
                });
        });
    } catch (e) {
        console.error("❌ addToToken error:", e);
        alert("Error adding token: " + e.message);
    }
}

// ==========================================
// 2. LOAD TODAY'S TOKENS
// ==========================================

// ==========================================
// AUTO-CLEANUP: Move yesterday's unserved tokens to visits
// ==========================================
function cleanupExpiredTokens() {
    if (typeof db === 'undefined' || !db) return;
    const today = getTodayDate();
    
    db.transaction(function(tx) {
        tx.executeSql('SELECT id, patient_id, patient_name, token_number, token_date FROM tokens WHERE token_date != ?', [today], 
        function(tx, res) {
            let count = 0;
            for (let i = 0; i < res.rows.length; i++) {
                let row = res.rows.item(i);
                let note = 'Not visited today. Token: #' + row.token_number + ' on ' + row.token_date;
                
                // Move to visits table
                tx.executeSql('INSERT INTO visits (patient_id, notes, date_time, token_number, visit_date) VALUES (?, ?, ?, ?, ?)',
                    [row.patient_id, note, row.token_date, row.token_number, row.token_date]);
                
                // Delete from tokens
                tx.executeSql('DELETE FROM tokens WHERE id = ?', [row.id]);
                count++;
            }
            if (count > 0) {
                console.log('✅ Auto-cleaned ' + count + ' expired token(s)');
            }
        });
    });
}

function loadTodayTokens() {
    try {
        const today = getTodayDate();
        const dateEl = document.getElementById('tokenDate');
        if (dateEl) dateEl.textContent = '📅 ' + today;

        db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM tokens WHERE token_date=? ORDER BY token_number ASC',
                [today],
                function(tx, r) {
                    const list = document.getElementById('tokenList');
                    if (!list) return;
                    list.innerHTML = '';
                    
                    const countEl = document.getElementById('tokenCount');
                    if (countEl) countEl.textContent = r.rows.length;

                    if (!r.rows.length) {
                        list.innerHTML = '<div class="empty-state"><div class="icon">🎟️</div><p>No tokens for today.<br>Go to Heale Record, search a patient, and click "Add Token".</p></div>';
                        return;
                    }

                    for (let i = 0; i < r.rows.length; i++) {
                        const t = r.rows.item(i);
                        const pid = 'HEALE' + String(t.patient_id).padStart(4, '0');
                        
                        const div = document.createElement('div');
                        div.className = 'token-card';
                        div.innerHTML = `
                            <div class="token-number-badge">Token #${t.token_number}</div>
                            <h3 class="token-name-link" style="cursor: pointer; text-decoration: underline; color: #3b82f6;">${t.patient_name} 👆</h3>
                            <p>🆔 ${pid} | 📞 ${t.patient_phone}</p>
                            <p class="token-time">${t.created_at}</p>
                            <button class="btn-view btn-reprint-link" style="margin-top:8px; width:100%; font-size:12px; padding:8px;">🖨️ Reprint Token</button>
                        `;
                        
                        div.querySelector('.token-name-link').addEventListener('click', function() {
                            console.log("✅ Opening visit for:", t.patient_name);
                            openTokenVisit(t.id, t.patient_id, t.patient_name, t.patient_phone);
                        });
                        
                        div.querySelector('.btn-reprint-link').addEventListener('click', function() {
                            console.log("✅ Reprinting for:", t.patient_name);
                            reprintToken(t.token_number, t.patient_name, pid, t.patient_phone, t.created_at);
                        });
                        
                        list.appendChild(div);
                    }
                },
                function(err) { 
                    console.error("❌ Error loading tokens:", err);
                    const list = document.getElementById('tokenList');
                    if (list) list.innerHTML = '<p style="color:red; text-align:center;">Error loading tokens. Please refresh.</p>';
                }
            );
        });
    } catch (e) {
        console.error("❌ loadTodayTokens error:", e);
    }
}

// ==========================================
// 3. OPEN TOKEN VISIT (History)
// ==========================================
function openTokenVisit(tokenId, patientDbId, patientName, patientPhone) {
    try {
        const visitPage = document.getElementById('tokenVisitPage');
        if (visitPage) {
            document.querySelectorAll('.page').forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });
            visitPage.classList.add('active');
            visitPage.style.display = 'block';
        }
        
        const contentDiv = document.getElementById('tokenVisitContent');
        if (!contentDiv) return;
        
        contentDiv.innerHTML = '<button onclick="showPage(\'todayTokenPage\')" style="margin-bottom:15px; padding:10px 16px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; width:100%;">← Close / Back to Tokens</button><div style="text-align:center; padding:40px;">Loading...</div>';

        db.transaction(function(tx) {
            tx.executeSql('SELECT notes FROM patients WHERE id = ?', [patientDbId], function(tx, pRes) {
                const regNotes = (pRes.rows.length > 0 && pRes.rows.item(0).notes) ? pRes.rows.item(0).notes : '';
                
                tx.executeSql('SELECT * FROM visits WHERE patient_id = ? ORDER BY date_time DESC', [patientDbId], function(tx, vRes) {
                    let html = '<div class="patient-info-card"><h2>' + patientName + '</h2><p>📞 ' + patientPhone + '</p><p>🆔 HEALE' + String(patientDbId).padStart(4, '0') + '</p></div>';
                    html += '<div class="visit-history-full"><h3>📋 History</h3>';
                    
                    if (regNotes && regNotes.trim() !== '') {
                        html += '<div class="visit-item-full" style="border-left: 4px solid #10b981; background:#f0fdf4; padding:10px; margin-bottom:10px; border-radius:4px;"><div style="font-weight:bold; color:#166534; margin-bottom:5px;">📝 Registration Notes</div><div>' + regNotes + '</div></div>';
                    }
                    
                    if (vRes.rows.length === 0 && (!regNotes || regNotes.trim() === '')) {
                        html += '<p style="color:var(--text-secondary);">No previous visits</p>';
                    } else {
                        for (let i = 0; i < vRes.rows.length; i++) {
                            const v = vRes.rows.item(i);
                            const tokenBadge = v.token_number ? '<span class="token-badge-history" style="background:#3b82f6; color:white; padding:2px 8px; border-radius:10px; font-size:12px;">Token #' + v.token_number + '</span>' : '';
                            html += '<div class="visit-item-full" style="background:#f8fafc; padding:10px; margin-bottom:10px; border-radius:4px; border-left: 4px solid #cbd5e1;"><div style="font-weight:bold; color:#475569; margin-bottom:5px;">🕒 ' + v.date_time + ' ' + tokenBadge + '</div><div>' + (v.notes || 'No notes') + '</div></div>';
                        }
                    }
                    html += '</div>';
                    
                    const safeName = patientName.replace(/'/g, "\\'");
                    html += '<div class="new-visit-section" style="margin-top:20px;"><h3>✏️ Add Today\'s Medical Notes</h3><textarea id="newVisitNotes" placeholder="Enter medical notes..." style="width:100%; height:100px; padding:10px; border:1px solid #ccc; border-radius:6px; margin-bottom:10px;"></textarea><button class="btn-save-visit" style="width:100%; padding:12px; background:#10b981; color:white; border:none; border-radius:6px; font-weight:bold; font-size:16px; cursor:pointer;" onclick="saveTokenVisit(' + tokenId + ',' + patientDbId + ',\'' + safeName + '\',\'' + patientPhone + '\',document.getElementById(\'newVisitNotes\').value)"> Save Visit & Return</button></div>';
                    
                    contentDiv.innerHTML = html;
                });
            });
        });
    } catch (e) {
        console.error("❌ openTokenVisit error:", e);
        const contentDiv = document.getElementById('tokenVisitContent');
        if (contentDiv) contentDiv.innerHTML = '<p style="color:red;">Error loading details: ' + e.message + '</p><button onclick="showPage(\'todayTokenPage\')">Back</button>';
    }
}

// ==========================================
// 4. SAVE TOKEN VISIT
// ==========================================
function saveTokenVisit(tokenId, patientDbId, patientName, patientPhone, notes) {
    try {
        if (!notes.trim()) { alert('⚠️ Please enter medical notes!'); return; }
        const dt = getCurrentDateTime();
        db.transaction(function(tx) {
            tx.executeSql('SELECT token_number FROM tokens WHERE id = ?', [tokenId], function(tx, res) {
                if (res.rows.length === 0) { alert('❌ Token not found'); return; }
                const tNum = res.rows.item(0).token_number;
                
                tx.executeSql('INSERT INTO visits (patient_id, notes, date_time, token_number) VALUES (?,?,?,?)',
                    [patientDbId, notes, dt, tNum],
                    function() {
                        tx.executeSql('DELETE FROM tokens WHERE id = ?', [tokenId],
                            function() {
                                alert('✅ Visit saved for ' + patientName + '\nHeale ID: HEALE' + String(patientDbId).padStart(4, '0') + '\nToken: #' + tNum);
                                showPage('todayTokenPage');
                                loadTodayTokens();
                            }
                        );
                    }
                );
            });
        });
    } catch (e) {
        console.error("❌ saveTokenVisit error:", e);
        alert("Error saving visit: " + e.message);
    }
}

// ==========================================
// 5. REPRINT TOKEN (Instant, No DB Query to prevent hanging)
// ==========================================
function reprintToken(tokenNum, name, id, phone, date) {
    console.log("🖨️ Reprint:", { tokenNum, name, id, phone, date });
    
    // CRITICAL: Set window.currentTicket so share/print functions have the correct data
    window.currentTicket = {
        tokenNum: '#' + tokenNum,
        name: name,
        id: id,
        phone: phone,
        date: date,
        notes: 'Pending visit...' // Reprint shows pending unless updated
    };
    
    document.getElementById('ticketTokenNum').textContent = '#' + tokenNum;
    document.getElementById('ticketName').textContent = name;
    document.getElementById('ticketId').textContent = id;
    document.getElementById('ticketPhone').textContent = phone;
    document.getElementById('ticketDate').textContent = date;
    document.getElementById('ticketNotes').textContent = 'Pending visit...';
    
    const modal = document.getElementById('tokenTicketModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

// ==========================================
// 6. CLOSE MODAL
// ==========================================
function closeTokenTicket() {
    const modal = document.getElementById('tokenTicketModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}
