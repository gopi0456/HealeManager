// Helper function to reliably open external apps in Cordova
function openExternalLink(url) {
    if (window.cordova && cordova.InAppBrowser) {
        cordova.InAppBrowser.open(url, '_system');
    } else {
        window.open(url, '_system');
    }
}

function generateMessageText(p) { 
    const vd = p.date_time ? p.date_time.split(' ')[0] : 'N/A'; 
    const nextVisit = getNextVisitDate(parseDate(p.date_time)); 
    return 'Dear '+p.name+',\n\nPatient ID: '+p.id+'\nDate of Visit: '+vd+'\n\nPlease visit again on: '+formatDate(nextVisit)+' ('+DAY_NAMES[nextVisit.getDay()]+')\n\n- Healer Clinic'; 
}

function sendSMS() { 
    if (!lastSavedPatient) return; 
    const m = generateMessageText(lastSavedPatient); 
    if (window.sms) { 
        window.sms.send(lastSavedPatient.phone, m, {intent:'INTENT'}, 
            function(){alert('✅ SMS App opened!');closeModal();}, 
            function(e){alert("⚠️ SMS Permission Denied.\n\nPlease go to:\nPhone Settings > Apps > HealiManager > Permissions > SMS > Allow");}); 
    } else { 
        openExternalLink('sms:'+lastSavedPatient.phone+'?body='+encodeURIComponent(m)); 
        closeModal(); 
    } 
}

function sendWhatsApp() { 
    if (!lastSavedPatient) return; 
    const m = generateMessageText(lastSavedPatient); 
    let ph = lastSavedPatient.phone; 
    if (ph.length===10) ph='91'+ph; 
    
    // FIXED: Using InAppBrowser API
    openExternalLink('https://wa.me/'+ph+'?text='+encodeURIComponent(m)); 
    closeModal(); 
}

function sendSMSFromPatient(p) { 
    const m = generateMessageText(p); 
    if (window.sms) { 
        window.sms.send(p.phone, m, {intent:'INTENT'}, 
            function(){alert('✅ SMS App opened!');}, 
            function(e){alert("️ SMS Permission Denied.\n\nPlease go to:\nPhone Settings > Apps > HealiManager > Permissions > SMS > Allow");}); 
    } else { 
        openExternalLink('sms:'+p.phone+'?body='+encodeURIComponent(m)); 
    } 
}

function sendWhatsAppFromPatient(p) { 
    const m = generateMessageText(p); 
    let ph = p.phone; 
    if (ph.length===10) ph='91'+ph; 
    
    // FIXED: Using InAppBrowser API
    openExternalLink('https://wa.me/'+ph+'?text='+encodeURIComponent(m)); 
}

function sendBulkSMS(dayName) {
    const patients = window.reminderData[dayName] || [];
    if (patients.length === 0) { alert('️ No patients for ' + dayName); return; }
    if (!confirm('Open SMS app sequentially for ' + patients.length + ' patients?')) return;
    
    let count = 0;
    function sendNext() {
        if (count >= patients.length) {
            alert('✅ Finished processing ' + patients.length + ' patients for ' + dayName);
            return;
        }
        const p = patients[count];
        const msg = generateMessageText({name: p.name, date_time: p.visits[0].date_time, id: generatePatientId(p.id)});
        
        if (window.sms) {
            window.sms.send(p.phone, msg, {intent:'INTENT'}, function(){}, function(){});
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
    if (patients.length === 0) { alert('⚠️ No patients for ' + dayName); return; }
    if (!confirm('Start Bulk WhatsApp for ' + patients.length + ' patients?\n\nIMPORTANT: WhatsApp will open for each patient. You must tap SEND in WhatsApp, then switch back to this app.')) return;
    
    let count = 0;
    
    function sendNext() {
        if (count >= patients.length) {
            alert('✅ Finished processing ' + patients.length + ' patients for ' + dayName);
            return;
        }
        
        const p = patients[count];
        const msg = generateMessageText({name: p.name, date_time: p.visits[0].date_time, id: generatePatientId(p.id)});
        let ph = p.phone; 
        if (ph.length === 10) ph = '91' + ph;
        
        const waUrl = 'https://wa.me/' + ph + '?text=' + encodeURIComponent(msg);
        
        // FIXED: Using InAppBrowser API to force open WhatsApp app
        openExternalLink(waUrl);
        
        count++;
        // Wait 4 seconds for the user to send and come back
        setTimeout(sendNext, 4000);
    }
    
    sendNext();
}
