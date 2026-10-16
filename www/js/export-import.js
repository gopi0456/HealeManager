function exportData() { 
    db.transaction(function(tx) { 
        tx.executeSql('SELECT * FROM patients ORDER BY id ASC', [], function(tx, pRes) { 
            const patients = []; 
            for(let i=0; i<pRes.rows.length; i++) patients.push(pRes.rows.item(i)); 
            
            tx.executeSql('SELECT * FROM visits ORDER BY id ASC', [], function(tx, vRes) { 
                const visits = []; 
                for(let i=0; i<vRes.rows.length; i++) visits.push(vRes.rows.item(i)); 
                
                const exportObj = { patients: patients, visits: visits };
                document.getElementById('exportDataText').value = JSON.stringify(exportObj, null, 2); 
                document.getElementById('exportModal').classList.add('active'); 
            }); 
        }); 
    }, function(e) { alert('❌ Export error: ' + e.message); }); 
}

function copyExportData() { 
    const textarea = document.getElementById('exportDataText'); 
    textarea.select(); 
    document.execCommand('copy'); 
    alert('✅ Data copied to clipboard!'); 
}

function closeExportModal() { document.getElementById('exportModal').classList.remove('active'); }
function showImportModal() { 
    document.getElementById('importDataText').value = ''; 
    document.getElementById('importModal').classList.add('active'); 
}
function closeImportModal() { document.getElementById('importModal').classList.remove('active'); }

function importFromPaste() { 
    const text = document.getElementById('importDataText').value.trim(); 
    if (!text) { alert('⚠️ Please paste data first!'); return; } 
    try { 
        const data = JSON.parse(text); 
        const patientsArray = Array.isArray(data) ? data : (data.patients || []);
        const visitsArray = data.visits || [];

        if (!Array.isArray(patientsArray)) { alert('⚠️ Invalid data format!'); return; } 

        db.transaction(function(tx) { 
            tx.executeSql('SELECT phone, id FROM patients', [], function(tx, res) { 
                const phoneToId = new Map(); 
                for(let i=0; i<res.rows.length; i++) phoneToId.set(res.rows.item(i).phone, res.rows.item(i).id);

                const oldIdToPhone = new Map();
                patientsArray.forEach(p => { if(p.id && p.phone) oldIdToPhone.set(p.id, p.phone); });

                let pendingPatients = patientsArray.filter(p => !phoneToId.has(p.phone));
                let skippedPatients = patientsArray.length - pendingPatients.length;
                let pIndex = 0, addedPatients = 0;

                function processNextPatient() {
                    if (pIndex >= pendingPatients.length) {
                        tx.executeSql('SELECT phone, id FROM patients', [], function(tx, newRes) {
                            const finalPhoneToId = new Map();
                            for(let i=0; i<newRes.rows.length; i++) finalPhoneToId.set(newRes.rows.item(i).phone, newRes.rows.item(i).id);

                            let vIndex = 0, addedVisits = 0;
                            function processNextVisit() {
                                if (vIndex >= visitsArray.length) {
                                    let msg = '✅ Imported ' + addedPatients + ' new patients!';
                                    if (skippedPatients > 0) msg += '\n⚠️ Skipped ' + skippedPatients + ' existing patients.';
                                    if (addedVisits > 0) msg += '\n✅ Added ' + addedVisits + ' visits!';
                                    alert(msg); 
                                    closeImportModal(); 
                                    return; 
                                }

                                const v = visitsArray[vIndex];
                                const oldPid = v.patient_id;
                                const phone = oldIdToPhone.get(oldPid);
                                const newPid = phone ? finalPhoneToId.get(phone) : null;

                                if (newPid) {
                                    const vKeys = Object.keys(v).filter(k => k !== 'id');
                                    const finalKeys = [], finalValues = [];
                                    for (const key of vKeys) {
                                        if (key === 'patient_id') { finalKeys.push('patient_id'); finalValues.push(newPid); } 
                                        else { finalKeys.push(key); finalValues.push(v[key]); }
                                    }
                                    const placeholders = finalKeys.map(() => '?').join(',');
                                    tx.executeSql('INSERT INTO visits (' + finalKeys.join(',') + ') VALUES (' + placeholders + ')', finalValues,
                                        function() { addedVisits++; vIndex++; processNextVisit(); },
                                        function() { vIndex++; processNextVisit(); }
                                    );
                                } else { vIndex++; processNextVisit(); }
                            }
                            processNextVisit();
                        });
                        return;
                    }

                    const p = pendingPatients[pIndex];
                    const { id, ...pData } = p; 
                    tx.executeSql('INSERT INTO patients (name, age, phone, aadhar, address, notes, date_time) VALUES (?,?,?,?,?,?,?)', 
                        [pData.name, pData.age, pData.phone, pData.aadhar, pData.address, pData.notes, pData.date_time || ''], 
                        function() { addedPatients++; pIndex++; processNextPatient(); },
                        function() { pIndex++; processNextPatient(); }
                    );
                }

                if (pendingPatients.length === 0 && visitsArray.length === 0) { 
                    alert('⚠️ No new data to import!'); closeImportModal(); return; 
                } 
                processNextPatient();
            }); 
        }, function(e) { alert('❌ Import error: ' + e.message); closeImportModal(); }); 
    } catch(e) { alert('❌ Invalid JSON: ' + e.message); } 
}
