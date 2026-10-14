function fmtDate(d) {
    if (!d) return 'N/A';
    if (!(d instanceof Date)) { try { d = parseDate(d); } catch(e) { d = null; } }
    if (!d) return 'N/A';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

function getReminderMessage(name, healeId, visitDate, nextVisitDate, dayName) {
    return "Dear " + name + ",\n\nHeale ID: " + healeId + "\nDate of Visit: " + fmtDate(visitDate) + "\nYOURS NEXT VISIT on: " + fmtDate(nextVisitDate) + "\n(" + dayName + ") 5:00AM TO 7:00AM\n\n- CLAKSHMI ACUPUNCTURE";
}

function loadReminders() {
    var list = document.getElementById('reminderList');
    if (!list) return;

    list.innerHTML =
        '<div style="margin-bottom:20px; background:#f8fafc; padding:15px; border-radius:10px; border:2px solid #3b82f6;">' +
        '<label style="font-weight:bold; font-size:16px; display:block; margin-bottom:8px;">📅 Select Reminder Day:</label>' +
        '<select id="daySelector" onchange="filterReminders(this.value)" style="width:100%; padding:12px; font-size:16px; border-radius:8px; border:1px solid #cbd5e1; background:white; color:black; font-weight:bold;">' +
        '<option value="">-- Choose a Day --</option>' +
        '<option value="Monday">Monday</option>' +
        '<option value="Tuesday">Tuesday</option>' +
        '<option value="Wednesday">Wednesday</option>' +
        '<option value="Thursday">Thursday</option>' +
        '<option value="Friday">Friday</option>' +
        '<option value="Saturday">Saturday</option>' +
        '<option value="Sunday">Sunday</option>' +
        '</select></div>' +
        '<div id="reminderContainer"><div style="text-align:center; padding:20px; color:#666;">Loading patients...</div></div>';

    var patientData = {};
    var idToKey = {};

    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM patients ORDER BY id ASC', [], function(tx, res) {
            for (var i = 0; i < res.rows.length; i++) {
                var p = res.rows.item(i);
                if (!p) continue;
                var key = String(p.name || '').trim().toLowerCase() + '|' + String(p.aadhar || '').trim();
                idToKey[p.id] = key;
                if (!patientData[key]) {
                    patientData[key] = { lastDate: null, visitDate: null, lastName: p.name, lastId: p.id, phone: p.phone, aadhar: p.aadhar };
                }
                if (p.id < patientData[key].lastId) {
                    patientData[key].lastId = p.id;
                    patientData[key].lastName = p.name;
                    patientData[key].phone = p.phone;
                    patientData[key].aadhar = p.aadhar;
                }
                var vd = parseDate(p.date_time);
                if (vd && (!patientData[key].lastDate || vd > patientData[key].lastDate)) patientData[key].lastDate = vd;
            }
        }, function(tx, e) { console.error('patients error', e); });
    }, function(e) { console.error('patients tx error', e); }, function() {

        db.transaction(function(tx2) {
            tx2.executeSql('SELECT patient_id, date_time FROM visits', [], function(tx2, vres) {
                for (var j = 0; j < vres.rows.length; j++) {
                    var v = vres.rows.item(j);
                    var key = idToKey[v.patient_id];
                    if (!key || !patientData[key]) continue;
                    var vdate = parseDate(v.date_time);
                    if (!vdate) continue;
                    if (!patientData[key].visitDate || vdate > patientData[key].visitDate) patientData[key].visitDate = vdate;
                }
            }, function(tx2, e) { console.error('visits error', e); });
        }, function(e) { console.error('visits tx error', e); }, function() {
            buildReminderUI(patientData);
        });
    });
}

function buildReminderUI(patientData) {
    var container = document.getElementById('reminderContainer');
    if (!container) return;
    var today = new Date(); today.setHours(0,0,0,0);

    var remindersByDay = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] };
    var total = 0;

    Object.keys(patientData).forEach(function(key) {
        var pd = patientData[key];
        var baseDate = pd.visitDate || pd.lastDate;
        if (!baseDate) return;

        var nextVisitDate = new Date(baseDate.getTime());
        nextVisitDate.setDate(nextVisitDate.getDate() + 7);

        var daysUntilVisit = Math.floor((nextVisitDate - today) / 86400000);
        var dayName = (typeof DAY_NAMES !== 'undefined')
            ? DAY_NAMES[nextVisitDate.getDay()]
            : nextVisitDate.toLocaleDateString('en-US', { weekday: 'long' });
        var missedWeeks = daysUntilVisit < 0 ? Math.abs(Math.floor(daysUntilVisit / 7)) : 0;

        total++;
        remindersByDay[dayName].push({
            name: pd.lastName, phone: pd.phone, aadhar: pd.aadhar, id: pd.lastId,
            visitDate: baseDate, nextVisitDate: nextVisitDate,
            daysUntilVisit: daysUntilVisit, missedWeeks: missedWeeks
        });
    });

    window.reminderData = remindersByDay;

    if (!total) {
        container.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>No patients with valid dates in database.</p></div>';
        return;
    }

    var dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    var html = '';

    dayOrder.forEach(function(day) {
        var pts = remindersByDay[day];
        if (!pts.length) return;

        html += '<div class="reminder-day-column" id="col-' + day + '" style="display:none; min-width:100%;">';
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

            var msgText = getReminderMessage(pt.name, healeId, pt.visitDate, pt.nextVisitDate, day);
            var encodedMsg = encodeURIComponent(msgText);

            html += '<div class="patient-card" style="margin-bottom:12px;">';
            html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
            html += '<strong style="font-size:16px;">' + pt.name + '</strong>';
            html += '<span style="background:#667eea; color:#fff; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold;">' + healeId + '</span>';
            html += '</div>';
            html += '<div style="font-size:14px; color:#555; margin-bottom:8px;"><span>📞 ' + pt.phone + '</span> &nbsp;|&nbsp; <span>🆔 ' + pt.aadhar + '</span> &nbsp;|&nbsp; ' + status + '</div>';
            html += '<div style="margin:8px 0; padding:8px; background:#f0f9ff; border-radius:6px; font-size:13px; color:#1e40af; border-left:3px solid #3b82f6;">';
            html += '<strong>📅 Date of Visit:</strong> ' + fmtDate(pt.visitDate) + '<br>';
            html += '<strong>📅 Next Visit:</strong> ' + fmtDate(pt.nextVisitDate) + '<br>';
            html += '<strong>⏰ Time:</strong> 5:00AM TO 7:00AM</div>';
            html += '<div style="display:flex; gap:8px; margin-top:10px;">';
            html += '<a href="sms:' + pt.phone + '?body=' + encodedMsg + '" style="flex:1; text-align:center; padding:10px; background:#3b82f6; color:#fff; border-radius:6px; text-decoration:none; font-weight:bold; font-size:14px;">💬 SMS</a>';
            html += '<a href="https://wa.me/91' + pt.phone + '?text=' + encodedMsg + '" target="_blank" style="flex:1; text-align:center; padding:10px; background:#10b981; color:#fff; border-radius:6px; text-decoration:none; font-weight:bold; font-size:14px;">💬 WhatsApp</a>';
            html += '</div></div>';
        });
        html += '</div>';
    });

    container.innerHTML = html;
}

function filterReminders(selectedDay) {
    var columns = document.querySelectorAll('.reminder-day-column');
    columns.forEach(function(col) { col.style.display = 'none'; });
    if (selectedDay) {
        var col = document.getElementById('col-' + selectedDay);
        if (col) col.style.display = 'block';
    }
}

// ORIGINAL WORKING BULK FUNCTIONS






// Helper function to process the sequence
async 
// Global variable to track current bulk message
window.bulkQueue = [];
window.bulkIndex = 0;

function showBulkModal() {
    if (window.bulkIndex >= window.bulkQueue.length) {
        // All done
        var modal = document.getElementById('bulkModal');
        if (modal) modal.style.display = 'none';
        alert('✅ All messages sent!');
        return;
    }

    var current = window.bulkQueue[window.bulkIndex];
    var progress = (window.bulkIndex + 1) + ' / ' + window.bulkQueue.length;
    
    var modal = document.getElementById('bulkModal');
    if (!modal) {
        // Create modal if it doesn't exist
        modal = document.createElement('div');
        modal.id = 'bulkModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = '<div style="background:white; border-radius:12px; padding:20px; max-width:400px; width:100%; max-height:80vh; overflow-y:auto;">' +
        '<h3 style="margin-top:0; color:#3b82f6;">Bulk Message ' + progress + '</h3>' +
        '<div style="background:#f0f9ff; padding:12px; border-radius:8px; margin-bottom:15px;">' +
        '<strong>Patient:</strong> ' + current.name + '<br>' +
        '<strong>Heale ID:</strong> ' + current.healeId + '<br>' +
        '<strong>Phone:</strong> ' + current.phone + '<br>' +
        '<strong>Next Visit:</strong> ' + fmtDate(current.nextVisitDate) + ' (' + current.day + ')' +
        '</div>' +
        '<div style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:15px; font-size:13px; white-space:pre-wrap;">' + current.message + '</div>' +
        '<div style="display:flex; gap:10px;">' +
        '<button onclick="sendCurrentBulk(&apos;whatsapp&apos;)" style="flex:1; padding:12px; background:#10b981; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">💬 WhatsApp</button>' +
        '<button onclick="sendCurrentBulk(&apos;sms&apos;)" style="flex:1; padding:12px; background:#3b82f6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">💬 SMS</button>' +
        '</div>' +
        '<button onclick="skipCurrentBulk()" style="width:100%; margin-top:10px; padding:10px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer;">Skip</button>' +
        '<button onclick="closeBulkModal()" style="width:100%; margin-top:8px; padding:10px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer;">Cancel All</button>' +
        '</div>';

    modal.style.display = 'flex';
}

function sendCurrentBulk(type) {
    var current = window.bulkQueue[window.bulkIndex];
    var cleanPhone = String(current.phone).replace(/\D/g, '');
    var encodedMsg = encodeURIComponent(current.message);
    
    var url = type === 'whatsapp' 
        ? 'https://wa.me/91' + cleanPhone + '?text=' + encodedMsg
        : 'sms:' + cleanPhone + '?body=' + encodedMsg;
    
    // Direct user click trigger - guaranteed to work
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Move to next after a delay
    setTimeout(function() {
        window.bulkIndex++;
        showBulkModal();
    }, 2000);
}

function skipCurrentBulk() {
    window.bulkIndex++;
    showBulkModal();
}

function closeBulkModal() {
    var modal = document.getElementById('bulkModal');
    if (modal) modal.style.display = 'none';
    window.bulkQueue = [];
    window.bulkIndex = 0;
}

function sendBulkSMS(day) {
    var pts = window.reminderData[day] || [];
    if (!pts || pts.length === 0) {
        alert('No patients found for ' + day);
        return;
    }

    // Group by phone number
    var grouped = {};
    pts.forEach(function(pt) {
        var cleanPhone = String(pt.phone).replace(/\D/g, '');
        if (!grouped[cleanPhone]) grouped[cleanPhone] = [];
        grouped[cleanPhone].push(pt);
    });

    window.bulkQueue = [];
    Object.keys(grouped).forEach(function(phone) {
        var patients = grouped[phone];
        var combinedMsg = "";
        patients.forEach(function(pt, i) {
            var healeId = 'HEALE' + String(pt.id).padStart(4, '0');
            combinedMsg += getReminderMessage(pt.name, healeId, pt.visitDate, pt.nextVisitDate, day);
            if (i < patients.length - 1) combinedMsg += "\n\n---\n\n";
        });
        
        window.bulkQueue.push({
            name: patients[0].name,
            healeId: 'HEALE' + String(patients[0].id).padStart(4, '0'),
            phone: phone,
            message: combinedMsg,
            day: day,
            nextVisitDate: patients[0].nextVisitDate
        });
    });

    window.bulkIndex = 0;
    showBulkModal();
}

function sendBulkWhatsApp(day) {
    sendBulkSMS(day); // Same logic, user chooses WhatsApp or SMS in modal
}
