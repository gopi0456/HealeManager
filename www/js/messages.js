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
    if (!confirm('Starting Bulk SMS for ' + patients.length + ' Heale?\n\nIMPORTANT: SMS will open for each patient. You must tap SEND, then switch back to this app.')) return;
    
    let count = 0;
    function sendNext() {
        if (count >= patients.length) {
            alert('✅ Finished processing ' + patients.length + ' Heale for ' + dayName);
            return;
        }
        const p = patients[count];
        // Safe fallback to ensure visit date and next visit date show up correctly
        const msg = generateMessageText({
            name: p.name,
            date_time: p.visits ? p.visits[0].date_time : p.date_time,
            id: generatePatientId(p.id)
        });
        
        if (window.sms) {
            window.sms.send(p.phone, msg, {intent: 'INTENT'}, function() {}, function() {});
        } else {
            openExternalLink('sms:' + p.phone + '?body=' + encodeURIComponent(msg));
        }
        
        count++;
        setTimeout(sendNext, 2500);
    }
    sendNext();
}

function sendBulkWhatsApp(dayName) {
    const patients = window.reminderData[dayName] || [];
    if (patients.length === 0) {
        alert('⚠️ No Heale for ' + dayName);
        return;
    }
    if (!confirm('Starting Bulk WhatsApp for ' + patients.length + ' Heale?\n\nIMPORTANT: WhatsApp will open for each patient. You must tap SEND in WhatsApp, then switch back to this app.')) return;
    
    let count = 0;
    function sendNext() {
        if (count >= patients.length) {
            alert('✅ Finished processing ' + patients.length + ' Heale for ' + dayName);
            return;
        }
        const p = patients[count];
        // Safe fallback to ensure visit date and next visit date show up correctly
        const msg = generateMessageText({
            name: p.name,
            date_time: p.visits ? p.visits[0].date_time : p.date_time,
            id: generatePatientId(p.id)
        });
        let ph = p.phone;
        if (ph.length === 10) ph = '91' + ph;
        openExternalLink('https://wa.me/' + ph + '?text=' + encodeURIComponent(msg));
        
        count++;
        setTimeout(sendNext, 4000);
    }
    sendNext();
}
