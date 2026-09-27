function addPatient() {
    const name = document.getElementById('name').value.trim();
    const age = document.getElementById('age').value;
    const phone = document.getElementById('phone').value.trim();
    const aadhar = document.getElementById('aadhar').value.trim();
    const address = document.getElementById('address').value.trim();
    const notes = document.getElementById('notes').value.trim();
    
    if (!name || !phone || !aadhar) { alert("⚠️ Name, Phone, Aadhar required!"); return; }
    if (phone.length !== 10 || !/^\d+$/.test(phone)) { alert("⚠️ Phone must be 10 digits!"); return; }
    if (aadhar.length !== 5 || !/^\d+$/.test(aadhar)) { alert("⚠️ Aadhar must be 5 digits!"); return; }
    
    const dt = getCurrentDateTime();
    db.transaction(function(tx) {
        tx.executeSql('INSERT INTO patients (name,age,phone,aadhar,address,notes,date_time) VALUES (?,?,?,?,?,?,?)', 
            [name,age,phone,aadhar,address,notes,dt],
            function(tx, r) {
                lastSavedPatient = { 
                    id: generatePatientId(r.insertId), 
                    name, age, phone, aadhar, address, notes, date_time: dt 
                };
                ['name','age','phone','aadhar','address','notes'].forEach(f => 
                    document.getElementById(f).value = '');
                showSuccessModal();
            }, 
            function(e) { alert('❌ Database Error: ' + e.message); });
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
        document.getElementById('patientList').innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>Enter name or Aadhar to search</p></div>'; 
        return; 
    } 
    db.transaction(function(tx) { 
        tx.executeSql('SELECT * FROM patients WHERE name LIKE ? OR aadhar LIKE ? ORDER BY id DESC', 
            ['%'+q+'%','%'+q+'%'], 
            function(tx, r) { 
                const pv = {}; 
                for (let i = 0; i < r.rows.length; i++) { 
                    const p = r.rows.item(i); 
                    if (!pv[p.phone]) pv[p.phone] = {visits:[], latest:p}; 
                    pv[p.phone].visits.push(p); 
                } 
                renderSearchResults(pv); 
            }); 
    }); 
}

function renderSearchResults(pv) {
    const list = document.getElementById('patientList'); 
    list.innerHTML = ''; 
    const keys = Object.keys(pv);
    if (!keys.length) { 
        list.innerHTML = '<div class="empty-state"><div class="icon">😕</div><p>No patients found.</p></div>'; 
        return; 
    }
    keys.forEach(phone => {
        const d = pv[phone], p = d.latest;
        const visits = d.visits.sort((a,b) => parseDate(b.date_time)-parseDate(a.date_time));
        const pid = generatePatientId(p.id); 
        const pd = {id:pid,dbId:p.id,name:p.name,age:p.age,phone:p.phone,aadhar:p.aadhar,address:p.address,notes:p.notes,date_time:p.date_time||'N/A'};
        const pj = JSON.stringify(pd).replace(/'/g,"&#39;").replace(/"/g,"&quot;");
        let vh = ''; 
        if (visits.length > 1) { 
            vh = '<div style="background:var(--bg-primary);padding:10px;border-radius:6px;margin:10px 0;font-size:13px;"><strong>📅 Visit History ('+visits.length+')</strong>'; 
            visits.slice(0,5).forEach(v => { 
                let tBadge = v.token_number ? ` <span style="background:var(--purple-color);color:white;padding:1px 6px;border-radius:10px;font-size:10px;">#${v.token_number}</span>` : ''; 
                vh += '<div style="padding:3px 0 3px 12px;border-left:2px solid var(--border-color);color:var(--text-secondary);">'+v.date_time + tBadge +'</div>'; 
            }); 
            if (visits.length > 5) vh += '<div style="font-style:italic;color:var(--text-secondary);">...+'+(visits.length-5)+' more</div>'; 
            vh += '</div>'; 
        }
        list.innerHTML += '<div class="patient-card"><h3>'+p.name+'</h3><p>📞 '+p.phone+' | 🆔 '+pid+'</p><p>📅 Last Visit: '+(p.date_time||'N/A')+'</p>' + vh + 
            '<div class="update-notes-section"><textarea id="un_'+p.id+'" placeholder="Add new visit notes for today..."></textarea><button class="btn-update-notes" onclick="updatePatientNotes(\''+p.phone+'\',document.getElementById(\'un_'+p.id+'\').value,this)">💾 Save Today Visit Notes</button></div>' +
            '<div class="action-buttons"><button class="btn-view" onclick=\'showPatientDetail('+pj+')\'>👁️ View Details</button><button class="btn-token" onclick="addToToken('+p.id+',\''+p.name.replace(/'/g,"\\'")+'\',\''+p.phone+'\',this)">🎟️ Add Token</button><button class="btn-token" style="background:var(--warning-color);" onclick="checkAndReprint(\''+p.phone+'\')">🖨️ Reprint Today Token</button></div></div>';
    });
}

function updatePatientNotes(patientPhone, notes, btn) { 
    if (!notes.trim()) { alert('⚠️ Please enter medical notes!'); return; } 
    const dt = getCurrentDateTime(); 
    db.transaction(function(tx) { 
        tx.executeSql('INSERT INTO patients (name,phone,notes,date_time) VALUES ((SELECT name FROM patients WHERE phone=? ORDER BY id DESC LIMIT 1),?,?,?)', 
            [patientPhone, patientPhone, notes, dt], 
            function() { 
                alert('✅ Visit notes saved!\nDate: ' + dt); 
                btn.textContent = '✓ Saved'; 
                btn.disabled = true; 
                btn.style.background = '#6b7280'; 
            }); 
    }, function(e) { alert('❌ Error: ' + e.message); }); 
}

function showPatientDetail(p) { 
    db.transaction(function(tx) { 
        tx.executeSql('SELECT * FROM patients WHERE phone=? ORDER BY id DESC', [p.phone], 
            function(tx, r) { 
                let hh = ''; 
                if (r.rows.length > 0) { 
                    hh = '<div style="background:var(--bg-primary);padding:12px;border-radius:8px;margin:16px 0;"><div style="font-weight:bold;color:var(--accent-color);margin-bottom:10px;">📋 Heale History ('+r.rows.length+' visits)</div>'; 
                    for (let i = 0; i < r.rows.length; i++) { 
                        const v = r.rows.item(i); 
                        let tBadge = v.token_number ? `<span class="token-badge-history">Token #${v.token_number}</span>` : ''; 
                        hh += '<div style="background:var(--bg-secondary);padding:10px;margin-bottom:8px;border-radius:6px;border-left:3px solid var(--accent-color);"><div style="font-weight:bold;color:var(--accent-color);font-size:13px;margin-bottom:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">📅 '+v.date_time+' '+tBadge+'</div><div style="color:var(--text-secondary);font-size:13px;">'+(v.notes||'No notes')+'</div></div>'; 
                    } 
                    hh += '</div>'; 
                } 
                document.getElementById('detailCard').innerHTML = 
                    '<h2>🏥 Patient Details</h2>' +
                    '<div class="patient-id">ID: '+p.id+'</div>' +
                    '<span class="patient-date">📅 '+(p.date_time||'N/A')+'</span>' +
                    '<hr style="border:none;border-top:1px solid var(--border-color);margin:16px 0;">' +
                    '<div class="detail-row"><span class="detail-label">Name:</span> '+p.name+'</div>' +
                    '<div class="detail-row"><span class="detail-label">Age:</span> '+(p.age||'N/A')+'</div>' +
                    '<div class="detail-row"><span class="detail-label">Phone:</span> '+p.phone+'</div>' +
                    '<div class="detail-row"><span class="detail-label">Aadhar:</span> '+p.aadhar+'</div>' +
                    '<div class="detail-row"><span class="detail-label">Address:</span> '+(p.address||'N/A')+'</div>' +
                    '<div class="detail-row"><span class="detail-label">Notes:</span><br>'+(p.notes||'None')+'</div>' + 
                    hh + 
                    '<div class="send-buttons"><button class="btn-whatsapp" onclick=\'sendWhatsAppFromPatient('+JSON.stringify(p).replace(/'/g,"&#39;")+')\'>💬 WhatsApp</button><button class="btn-sms" onclick=\'sendSMSFromPatient('+JSON.stringify(p).replace(/'/g,"&#39;")+')\'>📱 SMS</button></div>' +
                    '<button class="main-btn" style="margin-top:10px;background:var(--purple-color);" onclick=\'addToToken('+p.dbId+',"'+p.name.replace(/"/g,'\\"')+'","'+p.phone+'",null);closeDetail();\'>🎟️ Add to Today Token</button>' +
                    '<button class="close-btn" onclick="closeDetail()">Close</button>'; 
                document.getElementById('detailOverlay').classList.add('active'); 
            }); 
    }); 
}

function closeDetail() { 
    document.getElementById('detailOverlay').classList.remove('active'); 
}

function closeDetailIfOutside(e) { 
    if (e.target === document.getElementById('detailOverlay')) closeDetail(); 
}

function loadDashboard() { 
    const now = new Date(), today = getTodayDate();
    const ms = '01/'+String(now.getMonth()+1).padStart(2,'0')+'/'+now.getFullYear(); 
    db.transaction(function(tx) { 
        tx.executeSql('SELECT COUNT(DISTINCT phone) as c FROM patients', [], 
            function(tx,r){ document.getElementById('totalPatients').textContent = r.rows.item(0).c; }); 
        tx.executeSql('SELECT COUNT(DISTINCT phone) as c FROM patients WHERE date_time LIKE ?', [today+'%'], 
            function(tx,r){ document.getElementById('todayPatients').textContent = r.rows.item(0).c; }); 
        tx.executeSql('SELECT COUNT(*) as c FROM tokens WHERE token_date=?', [today], 
            function(tx,r){ document.getElementById('todayTokens').textContent = r.rows.item(0).c; }); 
        tx.executeSql('SELECT COUNT(DISTINCT phone) as c FROM patients WHERE date_time>=?', [ms], 
            function(tx,r){ document.getElementById('monthPatients').textContent = r.rows.item(0).c; }); 
        tx.executeSql('SELECT * FROM patients', [], function(tx,r) { 
            const td = new Date(); td.setHours(0,0,0,0); 
            const plv = {}; 
            for (let i=0;i<r.rows.length;i++) { 
                const p=r.rows.item(i), vd=parseDate(p.date_time); 
                if(!vd) continue; 
                if(!plv[p.phone]||vd>plv[p.phone]) plv[p.phone]=vd; 
            } 
            let rc=0; 
            Object.values(plv).forEach(d=>{ rc++; }); 
            document.getElementById('reminderCount').textContent=rc; 
        }); 
        tx.executeSql('SELECT COUNT(DISTINCT phone) as c FROM patients WHERE date_time LIKE ?', 
            ['%/'+String(now.getMonth()+1).padStart(2,'0')+'/%'], 
            function(tx,r) { 
                const dp=now.getDate(); 
                document.getElementById('avgPerDay').textContent = dp>0?Math.round(r.rows.item(0).c/dp*10)/10:0; 
            }); 
    }); 
}
