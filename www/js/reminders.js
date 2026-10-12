function loadReminders() {
    var list = document.getElementById('reminderList');
    if (!list) return;

    // Render menu immediately
    list.innerHTML = `
        <div style="margin-bottom: 20px; background: var(--bg-secondary, #f8fafc); padding: 15px; border-radius: 10px; border: 2px solid #3b82f6;">
            <label style="font-weight: bold; font-size: 16px; display: block; margin-bottom: 8px;">📅 Select Reminder Day:</label>
            <select id="daySelector" onchange="filterReminders(this.value)" style="width: 100%; padding: 12px; font-size: 16px; border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1); background: white; color: black; font-weight: bold;">
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
        <div id="reminderContainer"><div style="text-align:center; padding:20px; color:#666;">Loading patients...</div></div>
    `;

    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM patients ORDER BY id ASC', [], function(tx, results) {
            var container = document.getElementById('reminderContainer');
            var today = new Date(); today.setHours(0,0,0,0);
            var patientData = {};

            for (var i = 0; i < results.rows.length; i++) {
                var p = results.rows.item(i);
                if (!p) continue;
                // Group by Name + Aadhar to ensure unique Heale ID
                var key = String(p.name || '').trim().toLowerCase() + '|' + String(p.aadhar || '').trim();
                if (!patientData[key] || p.id < patientData[key].lastId) {
                    patientData[key] = { 
                        visits: [], 
                        lastDate: null, 
                        lastName: p.name, 
                        lastId: p.id, 
                        phone: p.phone, 
                        aadhar: p.aadhar 
                    };
                }
                var vd = parseDate(p.date_time);
                if (vd) {
                    patientData[key].visits.push({ date: vd, notes: p.notes, token: p.token_number });
                    if (!patientData[key].lastDate || vd > patientData[key].lastDate) {
                        patientData[key].lastDate = vd;
                    }
                }
            }

            var remindersByDay = { 'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': [] };
            var total = 0;

            Object.keys(patientData).forEach(function(key) {
                var pd = patientData[key];
                if (!pd.lastDate) return; // Skip if no valid date (prevents 1970)

                var nextVisitDate = new Date(pd.lastDate);
                nextVisitDate.setDate(nextVisitDate.getDate() + 7);
                var daysUntilVisit = Math.floor((nextVisitDate - today) / (1000 * 60 * 60 * 24));
                var dayName = DAY_NAMES[nextVisitDate.getDay()];
                var missedWeeks = daysUntilVisit < 0 ? Math.abs(Math.floor(daysUntilVisit / 7)) : 0;

                total++;
                remindersByDay[dayName].push({
                    name: pd.lastName,
                    phone: pd.phone,
                    aadhar: pd.aadhar,
                    id: pd.lastId,
                    nextVisitDate: formatDate(nextVisitDate),
                    daysUntilVisit: daysUntilVisit,
                    missedWeeks: missedWeeks
                });
            });

            window.reminderData = remindersByDay;

            if (!total) {
                container.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>No patients with valid dates in database.</p></div>';
                return;
            }

            var dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            var html = '';

            dayOrder.forEach(function(day) {
                var pts = remindersByDay[day];
                if (!pts.length) return;

                html += '<div class="reminder-day-column" id="col-' + day + '" style="display:none; min-width: 100%;">';
                html += '<div class="reminder-day-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">';
                html += '<span>📅 ' + day + ' (' + pts.length + ')</span>';
                html += '<div style="display:flex; gap:8px;">';
                html += '<button onclick="sendBulkSMS(\'' + day + '\')" style="padding:6px 12px; background:#3b82f6; color:white; border:none; border-radius:6px; font-size:12px; cursor:pointer;">💬 Bulk SMS</button>';
                html += '<button onclick="sendBulkWhatsApp(\'' + day + '\')" style="padding:6px 12px; background:#10b981; color:white; border:none; border-radius:6px; font-size:12px; cursor:pointer;">💬 Bulk WA</button>';
                html += '</div></div>';
                
                pts.forEach(function(pt) {
                    var healeId = 'HEALE' + String(pt.id).padStart(4, '0');
                    var status = pt.daysUntilVisit < 0 
                        ? '<span style="color:#ef4444; font-weight:bold;">⚠️ ' + pt.missedWeeks + ' weeks overdue</span>' 
                        : (pt.daysUntilVisit === 0 
                            ? '<span style="color:#10b981; font-weight:bold;">✅ Today</span>' 
                            : '<span style="color:#f59e0b; font-weight:bold;">📅 In ' + pt.daysUntilVisit + ' days</span>');

                    var smsText = encodeURIComponent(getReminderMessage(pt.name, 'HEALE' + String(pt.id).padStart(4, '0'), pt.lastVisitDate || 'N/A', pt.nextVisitDate, day));
                    var waText = encodeURIComponent(getReminderMessage(pt.name, 'HEALE' + String(pt.id).padStart(4, '0'), pt.lastVisitDate || 'N/A', pt.nextVisitDate, day));

                    html += '<div class="patient-card" style="margin-bottom: 12px;">';
                    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
                    html += '<strong style="font-size:16px;">' + pt.name + '</strong>';
                    html += '<span style="background:#667eea; color:#fff; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold;">' + healeId + '</span>';
                    html += '</div>';
                    html += '<div style="font-size:14px; color:#555; margin-bottom:8px;">';
                    html += '<span>📞 ' + pt.phone + '</span> &nbsp;|&nbsp; <span>🆔 ' + pt.aadhar + '</span> &nbsp;|&nbsp; ' + status;
                    html += '</div>';
                    html += '<div style="margin: 8px 0; padding: 8px; background: #f0f9ff; border-radius: 6px; font-size: 13px; color: #1e40af; border-left: 3px solid #3b82f6;">';
                    html += '<strong>📅 Next Visit:</strong> ' + pt.nextVisitDate + '<br>';
                    html += '<strong>⏰ Time:</strong> 5:00 AM TO 7:00 AM';
                    html += '</div>';
                    html += '<div style="display: flex; gap: 8px; margin-top: 10px;">';
                    html += '<a href="sms:' + pt.phone + '?body=' + smsText + '" style="flex:1; text-align:center; padding:10px; background:#3b82f6; color:#fff; border-radius:6px; text-decoration:none; font-weight:bold; font-size:14px;">💬 SMS</a>';
                    html += '<a href="https://wa.me/91' + pt.phone + '?text=' + waText + '" target="_blank" style="flex:1; text-align:center; padding:10px; background:#10b981; color:#fff; border-radius:6px; text-decoration:none; font-weight:bold; font-size:14px;">💬 WhatsApp</a>';
                    html += '</div>';
                    html += '</div>';
                });
                html += '</div>';
            });

            container.innerHTML = html;
        }, function(e) {
            console.error('Reminder error:', e);
            document.getElementById('reminderContainer').innerHTML = '<div style="text-align:center; padding:20px; color:red;">❌ Error: ' + e.message + '</div>';
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


function getReminderMessage(name, healeId, visitDate, nextVisitDate, dayName) {
    var fmtVisit = 'N/A';
    if (visitDate && String(visitDate).length >= 10) {
        var p1 = String(visitDate).substring(0, 10).split('-');
        fmtVisit = p1[2] + '/' + p1[1] + '/' + p1[0];
    }
    
    var fmtNext = 'N/A';
    if (nextVisitDate && String(nextVisitDate).length >= 10) {
        var p2 = String(nextVisitDate).substring(0, 10).split('-');
        fmtNext = p2[2] + '/' + p2[1] + '/' + p2[0];
    }

    return `Dear ${name},

Patient ID: ${healeId}
Date of Visit: ${fmtVisit}

YOURS NEXT VISIT on: ${fmtNext}
(${dayName}) 5:00PM TO 7:00PM

- CLAKSHMI ACUPUNCTURE`;
}

function sendBulkSMS(day) {
    var pts = window.reminderData[day] || [];
    if (!pts.length) { alert('No patients for ' + day); return; }
    
    // Build the message for the first patient (standard SMS limitation)
    // or you can copy the numbers. We'll open the SMS app with the first patient's number.
    var firstPt = pts[0];
    var healeId = 'HEALE' + String(firstPt.id).padStart(4, '0');
    var msg = getReminderMessage(firstPt.name, healeId, firstPt.lastVisitDate || 'N/A', firstPt.nextVisitDate, day);
    
    // For multiple numbers, some devices support comma separation
    var phones = pts.map(function(p) { return p.phone; }).join(',');
    window.open('sms:' + phones + '?body=' + encodeURIComponent(msg), '_blank');
}




