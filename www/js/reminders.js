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

    // STEP 1: patients
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

        // STEP 2: latest visit date from VISITS table
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

            // STEP 3: render
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

function sendBulkSMS(day) {
    processBulkMessages(day, 'sms');
}

function sendBulkWhatsApp(day) {
    processBulkMessages(day, 'whatsapp');
}

function processBulkMessages(day, type) {
    var pts = window.reminderData[day] || [];
    if (!pts.length) { alert('No patients for ' + day); return; }
    
    var typeName = type === 'whatsapp' ? 'WhatsApp' : 'SMS';
    if (!confirm('Bulk ' + typeName + ' will open a separate message for each patient (' + pts.length + ' total).\n\nThis ensures every family member gets their correct Heale ID and details, even if they share a phone number.\n\nYou will need to press "Send" on each one manually.\n\nContinue?')) {
        return;
    }

    var index = 0;
    function sendNext() {
        if (index >= pts.length) {
            alert('✅ Bulk ' + typeName + ' process completed!');
            return;
        }
        var pt = pts[index];
        var healeId = 'HEALE' + String(pt.id).padStart(4, '0');
        var cleanPhone = String(pt.phone).replace(/\D/g, ''); // Remove spaces/dashes
        var msg = getReminderMessage(pt.name, healeId, pt.visitDate, pt.nextVisitDate, day);
        
        if (type === 'whatsapp') {
            window.open('https://wa.me/91' + cleanPhone + '?text=' + encodeURIComponent(msg), '_blank');
        } else {
            window.open('sms:' + cleanPhone + '?body=' + encodeURIComponent(msg), '_blank');
        }
        
        index++;
        setTimeout(sendNext, 2500); // 2.5 second delay to let you press Send
    }
    
    sendNext();
}
