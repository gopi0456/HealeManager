function loadReminders() {
    const list = document.getElementById('reminderList'); 
    
    // 1. Create the Dropdown UI
    list.innerHTML = `
        <div style="margin-bottom: 20px; background: var(--bg-secondary); padding: 15px; border-radius: 10px; box-shadow: var(--card-shadow);">
            <label for="daySelector" style="font-weight: bold; font-size: 16px; display: block; margin-bottom: 8px;"> Select Reminder Day:</label>
            <select id="daySelector" onchange="filterReminders(this.value)" style="width: 100%; padding: 12px; font-size: 16px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);">
                <option value="">-- Choose a Day --</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
            </select>
        </div>
        <div id="reminderContainer" class="reminder-container"></div>
    `;
    
    window.reminderData = {}; 
    
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM patients ORDER BY id DESC', [], function(tx, results) {
            const container = document.getElementById('reminderContainer');
            const today = new Date(); today.setHours(0,0,0,0); 
            const patientData = {};
            
            for (let i = 0; i < results.rows.length; i++) {
                const p = results.rows.item(i); 
                const vd = parseDate(p.date_time); 
                if (!vd) continue; 
                const key = p.phone;
                if (!patientData[key]) patientData[key] = { visits: [], lastDate: null, lastName: p.name, lastId: p.id, phone: p.phone };
                patientData[key].visits.push(p);
                if (!patientData[key].lastDate || vd > patientData[key].lastDate) { 
                    patientData[key].lastDate = vd; 
                    patientData[key].lastName = p.name; 
                    patientData[key].lastId = p.id; 
                }
            }
            
            const remindersByDay = { 'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': [] };
            let total = 0;
            
            Object.values(patientData).forEach(pd => {
                const nextVisitDate = getNextVisitDate(pd.lastDate);
                const daysUntilVisit = daysBetween(today, nextVisitDate);
                const dayName = DAY_NAMES[nextVisitDate.getDay()];
                total++;
                const missedWeeks = daysUntilVisit < 0 ? Math.abs(Math.floor(daysUntilVisit / 7)) : 0;
                const visits = pd.visits.sort((a,b) => parseDate(b.date_time) - parseDate(a.date_time));
                remindersByDay[dayName].push({ 
                    name: pd.lastName, phone: pd.phone, id: pd.lastId, 
                    nextVisitDate: formatDate(nextVisitDate), nextVisitDay: dayName, 
                    daysUntilVisit, missedWeeks, visits 
                });
            });
            
            window.reminderData = remindersByDay; 
            
            if (!total) { 
                container.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>No patients in database.</p></div>'; 
                return; 
            }
            
            const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            let html = '';
            
            // 2. Generate columns but hide them by default (display:none)
            dayOrder.forEach(day => {
                const pts = remindersByDay[day]; 
                if (!pts.length) return;
                
                let dayHtml = `<div class="reminder-day-column" id="col-${day}" style="display:none; min-width: 100%;">` +
                    `<div class="reminder-day-header"><span>📅 ${day}</span><span class="reminder-day-count">${pts.length}</span></div>` +
                    `<div class="bulk-actions">` +
                    `<button class="btn-sms" onclick="sendBulkSMS('${day}')">📱 Bulk SMS</button>` +
                    `<button class="btn-whatsapp" onclick="sendBulkWhatsApp('${day}')">💬 Bulk WhatsApp</button>` +
                    `</div><div class="reminder-day-content">`;
                
                pts.forEach((p, idx) => {
                    const pid = generatePatientId(p.id); 
                    const pj = JSON.stringify({id:pid,name:p.name,phone:p.phone,date_time:''}).replace(/'/g,"&#39;"); 
                    const historyId = 'hist_'+day+'_'+idx;
                    
                    let status = '';
                    if (p.missedWeeks > 0) { 
                        status = `<div class="reminder-missed">⚠️ Missed ${p.missedWeeks} week${p.missedWeeks>1?'s':''}</div>`; 
                        const nextScheduled = new Date(parseDate(p.nextVisitDate)); 
                        nextScheduled.setDate(nextScheduled.getDate() + (p.missedWeeks * 7)); 
                        status += `<div class="reminder-next-scheduled">📅 Next Scheduled: ${formatDate(nextScheduled)} (${DAY_NAMES[nextScheduled.getDay()]})</div>`; 
                    } else if (p.daysUntilVisit === 0) { status = '<div class="reminder-due">✓ Due today</div>'; } 
                    else if (p.daysUntilVisit > 0) { status = `<div class="reminder-upcoming">📅 In ${p.daysUntilVisit} day${p.daysUntilVisit>1?'s':''}</div>`; }
                    
                    let hist = `<div class="reminder-history"><div class="reminder-history-title" onclick="toggleHistory('${historyId}')">📋 Visit History (${p.visits.length}) ▼</div><div class="reminder-history-content" id="${historyId}">`;
                    p.visits.slice(0,3).forEach(v => { 
                        let tBadge = v.token_number ? ` <span style="background:var(--purple-color);color:white;padding:1px 6px;border-radius:10px;font-size:10px;">Token #${v.token_number}</span>` : ''; 
                        hist += `<div class="reminder-visit-item">📅 ${v.date_time} ${tBadge} — ${v.notes||'No notes'}</div>`; 
                    });
                    if (p.visits.length > 3) hist += `<div class="reminder-visit-item">...+${p.visits.length-3} more</div>`; 
                    hist += '</div></div>';
                    
                    dayHtml += `<div class="reminder-card"><h4>${p.name}</h4><p> ${p.phone} | 🆔 ${pid}</p><div class="reminder-next-date"> Next Visit: ${p.nextVisitDate}</div>${status}${hist}<div class="reminder-send-buttons"><button class="btn-whatsapp" onclick='sendWhatsAppFromPatient(${pj})'>💬 WhatsApp</button><button class="btn-sms" onclick='sendSMSFromPatient(${pj})'> SMS</button></div></div>`;
                });
                dayHtml += '</div></div>';
                html += dayHtml;
            });
            container.innerHTML = html;
        });
    });
}

// 3. New function to filter days based on dropdown
function filterReminders(selectedDay) {
    const columns = document.querySelectorAll('.reminder-day-column');
    columns.forEach(col => col.style.display = 'none');
    
    if (selectedDay) {
        const col = document.getElementById('col-' + selectedDay);
        if (col) col.style.display = 'block';
    }
}
