function openExternalLink(url) {
    if (window.cordova && window.cordova.InAppBrowser) {
        cordova.InAppBrowser.open(url, '_system');
    } else {
        window.open(url, '_system');
    }
}

function generateMessageText(p) {
    const vd = p.date_time ? p.date_time.split(' ')[0] : 'N/A';
    const nextVisit = getNextVisitDate(parseDate(p.date_time));
    return 'Dear ' + p.name + ',\n\nPatient ID: ' + p.id + '\nDate of Visit: ' + vd + '\n\nPlease visit again on: ' + formatDate(nextVisit) + ' (' + DAY_NAMES[nextVisit.getDay()] + ')\n\n- LAKSHMI ACUPUNCTURE';
}

function sendSMS() {
    if (!lastSavedPatient) return;
    const m = generateMessageText(lastSavedPatient);
    
    // Try SMS plugin first
    if (window.sms) {
        window.sms.send(lastSavedPatient.phone, m, {intent: 'INTENT'},
            function() {
                alert('✅ SMS App opened!');
                closeModal();
            },
            function(e) {
                // Fallback to SMS URI
                openExternalLink('sms:' + lastSavedPatient.phone + '?body=' + encodeURIComponent(m));
                closeModal();
            }
        );
    } else {
        // Use SMS URI
        openExternalLink('sms:' + lastSavedPatient.phone + '?body=' + encodeURIComponent(m));
        closeModal();
    }
}

function sendWhatsApp() {
    if (!lastSavedPatient) return;
    const m = generateMessageText(lastSavedPatient);
    let ph = lastSavedPatient.phone;
    if (ph.length === 10) ph = '91' + ph;
    openExternalLink('https://wa.me/' + ph + '?text=' + encodeURIComponent(m));
    closeModal();
}

function sendSMSFromPatient(p) {
    const m = generateMessageText(p);
    
    if (window.sms) {
        window.sms.send(p.phone, m, {intent: 'INTENT'},
            function() {
                alert('✅ SMS App opened!');
            },
            function(e) {
                openExternalLink('sms:' + p.phone + '?body=' + encodeURIComponent(m));
            }
        );
    } else {
        openExternalLink('sms:' + p.phone + '?body=' + encodeURIComponent(m));
    }
}

function sendWhatsAppFromPatient(p) {
    const m = generateMessageText(p);
    let ph = p.phone;
    if (ph.length === 10) ph = '91' + ph;
    openExternalLink('https://wa.me/' + ph + '?text=' + encodeURIComponent(m));
}

function sendBulkSMS(dayName) {
    const patients = window.reminderData[dayName] || [];
    if (patients.length === 0) {
        alert('⚠️ No Heale for ' + dayName);
        return;
    }
    if (!confirm('Starting Bulk SMS for ' + patients.length + ' Heale?\n\nIMPORTANT: You will see a list of buttons. Tap each one to send, then come back and tap the next.')) return;

    const grouped = {};
    patients.forEach(function(p) {
        const cleanPhone = String(p.phone).replace(/\D/g, '');
        if (!grouped[cleanPhone]) grouped[cleanPhone] = [];
        grouped[cleanPhone].push(p);
    });

    const container = document.getElementById('reminderContainer') || document.body;
    let html = '<div style="padding:20px;">';
    html += '<h3 style="text-align:center; margin-bottom:10px; color:#3b82f6;">📤 Bulk SMS Queue (' + patients.length + ' Heale)</h3>';
    html += '<p style="text-align:center; color:#666; margin-bottom:20px; font-size:14px;">Tap each button to send. After sending, come back and tap the next one.</p>';
    
    Object.keys(grouped).forEach(function(phone) {
        const pts = grouped[phone];
        let combinedMsg = "";
        pts.forEach(function(p, i) {
            const msg = generateMessageText({ name: p.name, date_time: p.visits ? p.visits[0].date_time : p.date_time, id: generatePatientId(p.id) });
            combinedMsg += msg;
            if (i < pts.length - 1) combinedMsg += "\n\n---\n\n";
        });
        const encodedMsg = encodeURIComponent(combinedMsg);
        const patientNames = pts.map(function(p) { return p.name; }).join(' & ');
        html += '<a href="sms:' + phone + '?body=' + encodedMsg + '" target="_blank" style="display:block; background:#3b82f6; color:white; padding:15px; border-radius:8px; text-decoration:none; font-weight:bold; text-align:center; margin-bottom:12px; font-size:16px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">';
        html += '💬 Send to: ' + patientNames + '<br><span style="font-size:14px; font-weight:normal; opacity:0.9;">' + phone + '</span>';
        html += '</a>';
    });
    html += '<button onclick="loadReminders()" style="width:100%; padding:15px; background:#6b7280; color:white; border:none; border-radius:8px; font-weight:bold; font-size:16px; margin-top:20px; cursor:pointer;">← Back to Reminders List</button>';
    html += '</div>';
    container.innerHTML = html;
}

function sendBulkWhatsApp(dayName) {
    const patients = window.reminderData[dayName] || [];
    if (patients.length === 0) {
        alert('⚠️ No Heale for ' + dayName);
        return;
    }
    if (!confirm('Starting Bulk WhatsApp for ' + patients.length + ' Heale?\n\nIMPORTANT: You will see a list of buttons. Tap each one to send, then come back and tap the next.')) return;

    const grouped = {};
    patients.forEach(function(p) {
        const cleanPhone = String(p.phone).replace(/\D/g, '');
        if (!grouped[cleanPhone]) grouped[cleanPhone] = [];
        grouped[cleanPhone].push(p);
    });

    const container = document.getElementById('reminderContainer') || document.body;
    let html = '<div style="padding:20px;">';
    html += '<h3 style="text-align:center; margin-bottom:10px; color:#10b981;">📤 Bulk WhatsApp Queue (' + patients.length + ' Heale)</h3>';
    html += '<p style="text-align:center; color:#666; margin-bottom:20px; font-size:14px;">Tap each button to send. After sending, come back and tap the next one.</p>';
    
    Object.keys(grouped).forEach(function(phone) {
        const pts = grouped[phone];
        let combinedMsg = "";
        pts.forEach(function(p, i) {
            const msg = generateMessageText({ name: p.name, date_time: p.visits ? p.visits[0].date_time : p.date_time, id: generatePatientId(p.id) });
            combinedMsg += msg;
            if (i < pts.length - 1) combinedMsg += "\n\n---\n\n";
        });
        let cleanPhone = String(phone).replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
        const encodedMsg = encodeURIComponent(combinedMsg);
        const patientNames = pts.map(function(p) { return p.name; }).join(' & ');
        html += '<a href="https://wa.me/' + cleanPhone + '?text=' + encodedMsg + '" target="_blank" style="display:block; background:#10b981; color:white; padding:15px; border-radius:8px; text-decoration:none; font-weight:bold; text-align:center; margin-bottom:12px; font-size:16px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">';
        html += '💬 Send to: ' + patientNames + '<br><span style="font-size:14px; font-weight:normal; opacity:0.9;">' + cleanPhone + '</span>';
        html += '</a>';
    });
    html += '<button onclick="loadReminders()" style="width:100%; padding:15px; background:#6b7280; color:white; border:none; border-radius:8px; font-weight:bold; font-size:16px; margin-top:20px; cursor:pointer;">← Back to Reminders List</button>';
    html += '</div>';
    container.innerHTML = html;
}
