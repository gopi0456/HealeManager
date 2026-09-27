function addToToken(dbId, name, phone, btn) {
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
            
            tx.executeSql('SELECT MAX(token_number) as max_t FROM tokens WHERE token_date=?', 
                [today], function(tx, res) {
                let nextTokenNum = 1; 
                if (res.rows.length > 0 && res.rows.item(0).max_t) { 
                    nextTokenNum = res.rows.item(0).max_t + 1; 
                }
                
                tx.executeSql('INSERT INTO tokens (patient_id, patient_name, patient_phone, token_date, created_at, token_number) VALUES (?,?,?,?,?,?)', 
                    [dbId, name, phone, today, currentTime, nextTokenNum], 
                    function() {
                        // ✅ 1. SAVE TO MEMORY
                        window.currentTicket = {
                            tokenNum: '#' + nextTokenNum,
                            name: name,
                            id: fullHeliId,
                            phone: phone,
                            date: currentTime,
                            notes: 'Pending visit...'
                        };

                        // ✅ 2. FORCE UPDATE THE MODAL SCREEN
                        document.getElementById('ticketTokenNum').textContent = '#' + nextTokenNum;
                        document.getElementById('ticketName').textContent = name;
                        document.getElementById('ticketId').textContent = fullHeliId;
                        document.getElementById('ticketPhone').textContent = phone;
                        document.getElementById('ticketDate').textContent = currentTime;
                        document.getElementById('ticketNotes').textContent = 'Pending visit...';
                        
                        // ✅ 3. SHOW THE MODAL
                        document.getElementById('tokenTicketModal').classList.add('active');
                        
                        if(btn) {
                            btn.textContent = '✓ Token #' + nextTokenNum;
                            btn.classList.add('added');
                        }
                    },
                    function(err) { alert("❌ DB Error: " + err.message); }
                );
            });
        });
    }, function(e) { alert('❌ Error: ' + e.message); });
}

function loadTodayTokens() {
    const today = getTodayDate();
    document.getElementById('tokenDate').textContent = '📅 ' + today;
    
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM tokens WHERE token_date=? ORDER BY token_number ASC', 
            [today], 
            function(tx, r) {
                const list = document.getElementById('tokenList'); 
                list.innerHTML = ''; 
                document.getElementById('tokenCount').textContent = r.rows.length;
                
                if (!r.rows.length) { 
                    list.innerHTML = '<div class="empty-state"><div class="icon">🎟️</div><p>No tokens for today.<br>Go to Heale Record, search a patient, and click "Add Token".</p></div>'; 
                    return; 
                }
                
                for (let i = 0; i < r.rows.length; i++) {
                    const t = r.rows.item(i);
                    const pid = 'HEALE' + String(t.patient_id).padStart(4, '0');
                    const safeName = t.patient_name.replace(/'/g, "\\'");
                    
                    list.innerHTML += `
                        <div class="token-card">
                            <div class="token-number-badge">Token #${t.token_number}</div>
                            <h3 onclick="openTokenVisit(${t.id}, ${t.patient_id}, '${safeName}', '${t.patient_phone}')">${t.patient_name} 👆</h3>
                            <p>🆔 ${pid} | 📞 ${t.patient_phone}</p>
                            <p class="token-time"> ${t.created_at}</p>
                            <button class="btn-view" style="margin-top:8px; width:100%; font-size:12px; padding:8px;" onclick="reprintToken(${t.token_number}, '${safeName}', '${pid}', '${t.patient_phone}', '${t.created_at}')">🖨️ Reprint Token</button>
                        </div>
                    `;
                }
            }, 
            function(err) { alert("❌ Error loading tokens: " + err.message); }
        );
    });
}

function openTokenVisit(tokenId, patientDbId, patientName, patientPhone) {
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM patients WHERE phone=? ORDER BY id DESC', [patientPhone], 
            function(tx, results) {
                let content = '<div class="patient-info-card"><h2> ' + patientName + '</h2><p>📞 ' + patientPhone + '</p><p>🆔 HELI' + String(patientDbId).padStart(4, '0') + '</p></div>';
                content += '<div class="visit-history-full"><h3>📋 Previous Visit History (' + results.rows.length + ')</h3>';
                if (results.rows.length === 0) {
                    content += '<p style="color:var(--text-secondary);">No previous visits</p>';
                } else { 
                    for (let i = 0; i < results.rows.length; i++) { 
                        const v = results.rows.item(i); 
                        let tokenBadge = v.token_number ? `<span class="token-badge-history">Token #${v.token_number}</span>` : ''; 
                        content += '<div class="visit-item-full"><div class="visit-item-date"> ' + v.date_time + ' ' + tokenBadge + '</div><div class="visit-item-notes">' + (v.notes || 'No notes') + '</div></div>'; 
                    } 
                }
                content += '</div>';
                content += '<div class="new-visit-section"><h3>✏️ Add Today\'s Medical Notes</h3><textarea id="newVisitNotes" placeholder="Enter medical notes..."></textarea><button class="btn-save-visit" onclick="saveTokenVisit(' + tokenId + ',' + patientDbId + ',\'' + patientName.replace(/'/g,"\\'") + '\',\'' + patientPhone + '\',document.getElementById(\'newVisitNotes\').value)"> Save Visit & Return</button></div>';
                document.getElementById('tokenVisitContent').innerHTML = content;
                showPage('tokenVisitPage');
            });
    });
}

function saveTokenVisit(tokenId, patientDbId, patientName, patientPhone, notes) {
    if (!notes.trim()) { alert('️ Please enter medical notes!'); return; }
    const dt = getCurrentDateTime();
    db.transaction(function(tx) {
        tx.executeSql('SELECT token_number FROM tokens WHERE id = ?', [tokenId], 
            function(tx, res) {
                let tNum = res.rows.item(0).token_number;
                tx.executeSql('INSERT INTO patients (name, phone, notes, date_time, token_number) VALUES (?,?,?,?,?)', 
                    [patientName, patientPhone, notes, dt, tNum], 
                    function() {
                        tx.executeSql('DELETE FROM tokens WHERE id = ?', [tokenId], 
                            function() {
                                alert('✅ Visit saved for ' + patientName + ' as Token #' + tNum + '!');
                                showPage('todayTokenPage');
                            });
                    });
            });
    }, function(e) { alert('❌ Error: ' + e.message); });
}

function reprintToken(tokenNum, name, id, phone, date) {
    db.transaction(function(tx) {
        tx.executeSql('SELECT notes FROM patients WHERE phone=? ORDER BY id DESC LIMIT 1', [phone], 
            function(tx, res) {
                let notes = 'No previous notes';
                if (res.rows.length > 0 && res.rows.item(0).notes) notes = res.rows.item(0).notes;
                
                // ✅ FORCE SAVE TO MEMORY FOR REPRINT
                window.currentTicket = {
                    tokenNum: '#' + tokenNum,
                    name: name,
                    id: id,
                    phone: phone,
                    date: date,
                    notes: notes
                };

                document.getElementById('ticketTokenNum').textContent = '#' + tokenNum;
                document.getElementById('ticketName').textContent = name;
                document.getElementById('ticketId').textContent = id;
                document.getElementById('ticketPhone').textContent = phone;
                document.getElementById('ticketDate').textContent = date;
                document.getElementById('ticketNotes').textContent = notes;
                document.getElementById('tokenTicketModal').classList.add('active');
            });
    });
}

function checkAndReprint(phone) {
    const today = getTodayDate();
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM tokens WHERE patient_phone=? AND token_date=?', [phone, today], 
            function(tx, res) {
                if (res.rows.length > 0) {
                    const t = res.rows.item(0);
                    const pid = 'HEALE' + String(t.patient_id).padStart(4, '0');
                    reprintToken(t.token_number, t.patient_name, pid, t.patient_phone, t.created_at);
                } else {
                    alert('⚠️ No active token found for today.');
                }
            });
    });
}

function closeTokenTicket() { 
    document.getElementById('tokenTicketModal').classList.remove('active'); 
}
