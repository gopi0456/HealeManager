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

                    tx.executeSql('SELECT MAX(token_number) as max_t FROM tokens WHERE token_date=?',
                        [today], function(tx, res1) {
                            let maxFromTokens = 0;
                            if (res1.rows.length > 0 && res1.rows.item(0).max_t !== null) {
                                maxFromTokens = parseInt(res1.rows.item(0).max_t, 10);
                            }
                            
                            tx.executeSql('SELECT MAX(token_number) as max_t FROM visits WHERE date_time LIKE ?',
                                [today + '%'], function(tx, res2) {
                                    let maxFromVisits = 0;
                                    if (res2.rows.length > 0 && res2.rows.item(0).max_t !== null) {
                                        maxFromVisits = parseInt(res2.rows.item(0).max_t, 10);
                                    }
                                    
                                    let nextTokenNum = Math.max(maxFromTokens, maxFromVisits) + 1;

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
        });
    } catch (e) {
        console.error("❌ addToToken error:", e);
        alert("Error adding token: " + e.message);
    }
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
                        const safeName = t.patient_name.replace(/'/g, "\\'");
                        
                        const div = document.createElement('div');
                        div.className = 'token-card';
                        div.innerHTML = `
                            <div class="token-number-badge">Token #${t.token_number}</div>
                            <h3 class="token-name-link" style="cursor: pointer; text-decoration: underline; color: #3b82f6;">${t.patient_name} 👆</h3>
                            <p>🆔 ${pid} | 📞 ${t.patient_phone}</p>
                            <p class="token-time">${t.created_at}</p>
                            <div style="display:flex; gap:8px; margin-top:8px;">
                                <button class="btn-reprint-link" style="flex:1; font-size:12px; padding:8px; background:#3b82f6; color:white; border:none; border-radius:6px; cursor:pointer;" onclick="reprintToken(${t.token_number}, '${safeName}', '${pid}', '${t.patient_phone}', '${t.created_at}')">🖨️ Reprint</button>
                                <button style="flex:1; font-size:12px; padding:8px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer;" onclick="markTokenAsNotVisited(${t.id}, ${t.patient_id}, '${safeName}', '${t.patient_phone}', ${t.token_number}, '${t.token_date}')">❌ Not Visited</button>
                            </div>
                        `;
                        
                        div.querySelector('.token-name-link').addEventListener('click', function() {
                            openTokenVisit(t.id, t.patient_id, t.patient_name, t.patient_phone);
                        });
                        
                        list.appendChild(div);
                    }
                },
                function(err) { 
                    console.error("❌ Error loading tokens:", err);
                }
            );
        });
    } catch (e) {
        console.error("❌ loadTodayTokens error:", e);
    }
}

// ==========================================
// NEW: MARK TOKEN AS NOT VISITED
// ==========================================
function markTokenAsNotVisited(tokenId, patientDbId, patientName, patientPhone, tokenNum, tokenDate) {
    if (!confirm(`Mark Token #${tokenNum} for ${patientName} as NOT VISITED?\n\nThis will save it to the visit history and remove it from today's pending tokens.`)) return;
    
    const dt = tokenDate + ' 23:59:00'; // End of token date
    const notes = 'Not Visited';
    
    db.transaction(function(tx) {
        // 1. Insert into visits table
        tx.executeSql('INSERT INTO visits (patient_id, notes, date_time, token_number) VALUES (?,?,?,?)',
            [patientDbId, notes, dt, tokenNum],
            function() {
                // 2. Delete from pending tokens
                tx.executeSql('DELETE FROM tokens WHERE id = ?', [tokenId],
                    function() {
                        alert('✅ Marked as Not Visited for ' + patientName + '\nToken: #' + tokenNum + '\nSaved to visit history.');
                        loadTodayTokens(); // Refresh the list
                    },
                    function(err) { alert('❌ Error deleting token: ' + err.message); }
                );
            },
            function(err) { alert('❌ Error saving visit: ' + err.message); }
        );
    });
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
                    
                    const safeName = patientName.replace(/'/g, "'");
                    html += '<div class="new-visit-section" style="margin-top:20px;"><h3>✏️ Add Today\'s Medical Notes</h3><textarea id="newVisitNotes" placeholder="Enter medical notes..." style="width:100%; height:100px; padding:10px; border:1px solid #ccc; border-radius:6px; margin-bottom:10px;"></textarea><button class="btn-save-visit" style="width:100%; padding:12px; background:#10b981; color:white; border:none; border-radius:6px; font-weight:bold; font-size:16px; cursor:pointer;" onclick="saveTokenVisit(' + tokenId + ',' + patientDbId + ',\'' + safeName + '\',\'' + patientPhone + '\',document.getElementById(\'newVisitNotes\').value)"> Save Visit & Return</button></div>';
                    
                    contentDiv.innerHTML = html;
                });
            });
        });
    } catch (e) {
        console.error("❌ openTokenVisit error:", e);
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
// 5. REPRINT TOKEN
// ==========================================
function reprintToken(tokenNum, name, id, phone, date) {
    window.currentTicket = {
        tokenNum: '#' + tokenNum,
        name: name,
        id: id,
        phone: phone,
        date: date,
        notes: 'Pending visit...'
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
