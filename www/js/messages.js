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
    
    function fmtDateSafe(d) {
        if (!d) return 'N/A';
        if (!(d instanceof Date)) { try { d = new Date(d); } catch(e) { return 'N/A'; } }
        if (isNaN(d.getTime())) return 'N/A';
        return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
    }

    let count = 0;
    function sendNext() {
        if (count >= patients.length) {
            alert('✅ Finished processing ' + patients.length + ' Heale for ' + dayName);
            return;
        }
        const p = patients[count];
        const healeId = generatePatientId(p.id);
        
        // EXACT MESSAGE FORMAT AS INDIVIDUAL WHATSAPP
        const msg = "Dear " + p.name + ",\n\nHeale ID: " + healeId + "\nDate of Visit: " + fmtDateSafe(p.visitDate) + "\nYOURS NEXT VISIT on: " + fmtDateSafe(p.nextVisitDate) + "\n(" + dayName + ") 5:00AM TO 7:00AM\n\n- CLAKSHMI ACUPUNCTURE";
        
        // Use window.location.href to prevent app from exiting/crashing
        try {
            window.location.href = 'sms:' + p.phone + '?body=' + encodeURIComponent(msg);
        } catch (e) {
            console.error('SMS error:', e);
        }
        
        count++;
        setTimeout(sendNext, 3000); // 3 second delay
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
    
    function fmtDateSafe(d) {
        if (!d) return 'N/A';
        if (!(d instanceof Date)) { try { d = new Date(d); } catch(e) { return 'N/A'; } }
        if (isNaN(d.getTime())) return 'N/A';
        return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
    }

    let count = 0;
    function sendNext() {
        if (count >= patients.length) {
            alert('✅ Finished processing ' + patients.length + ' Heale for ' + dayName);
            return;
        }
        const p = patients[count];
        const healeId = generatePatientId(p.id);
        
        // EXACT MESSAGE FORMAT AS INDIVIDUAL WHATSAPP
        const msg = "Dear " + p.name + ",\n\nHeale ID: " + healeId + "\nDate of Visit: " + fmtDateSafe(p.visitDate) + "\nYOURS NEXT VISIT on: " + fmtDateSafe(p.nextVisitDate) + "\n(" + dayName + ") 5:00AM TO 7:00AM\n\n- CLAKSHMI ACUPUNCTURE";
        
        let ph = p.phone;
        if (ph.length === 10) ph = '91' + ph;
        
        openExternalLink('https://wa.me/' + ph + '?text=' + encodeURIComponent(msg));
        
        count++;
        setTimeout(sendNext, 4000); // 4 second delay for WhatsApp
    }
    sendNext();
}
