function exportData() { 
    db.transaction(function(tx) { 
        tx.executeSql('SELECT * FROM patients ORDER BY id ASC', [], 
            function(tx,r) { 
                const d=[]; 
                for(let i=0;i<r.rows.length;i++) d.push(r.rows.item(i)); 
                const jsonData = JSON.stringify(d,null,2); 
                document.getElementById('exportDataText').value = jsonData; 
                document.getElementById('exportModal').classList.add('active'); 
            }); 
    }, function(e) { alert('❌ Export error: ' + e.message); }); 
}

function copyExportData() { 
    const textarea = document.getElementById('exportDataText'); 
    textarea.select(); 
    document.execCommand('copy'); 
    alert('✅ Data copied to clipboard!'); 
}

function closeExportModal() { 
    document.getElementById('exportModal').classList.remove('active'); 
}

function showImportModal() { 
    document.getElementById('importDataText').value = ''; 
    document.getElementById('importModal').classList.add('active'); 
}

function closeImportModal() { 
    document.getElementById('importModal').classList.remove('active'); 
}

function importFromPaste() { 
    const text = document.getElementById('importDataText').value.trim(); 
    if (!text) { alert('⚠️ Please paste data first!'); return; } 
    try { 
        const d = JSON.parse(text); 
        if (!Array.isArray(d)) { alert('⚠️ Invalid data format!'); return; } 
        db.transaction(function(tx) { 
            tx.executeSql('SELECT phone FROM patients', [], function(tx, results) { 
                const existingPhones = new Set(); 
                for(let i=0; i<results.rows.length; i++) existingPhones.add(results.rows.item(i).phone); 
                let toAdd = []; 
                let skipped = 0; 
                d.forEach(function(p) { 
                    if (p.phone && existingPhones.has(p.phone)) { skipped++; } 
                    else { toAdd.push(p); if(p.phone) existingPhones.add(p.phone); } 
                }); 
                if (toAdd.length === 0 && skipped > 0) { 
                    alert('⚠️ All ' + skipped + ' records already exist! Nothing imported.'); 
                    closeImportModal(); 
                    return; 
                } 
                if (confirm('Add ' + toAdd.length + ' new patients?\n(' + skipped + ' duplicates will be skipped)')) { 
                    db.transaction(function(tx) { 
                        toAdd.forEach(function(p) { 
                            tx.executeSql('INSERT INTO patients (name,age,phone,aadhar,address,notes,date_time) VALUES (?,?,?,?,?,?,?)', 
                                [p.name, p.age, p.phone, p.aadhar, p.address, p.notes, p.date_time || '']); 
                        }); 
                    }, function(e) { alert('❌ Error: ' + e.message); }, 
                    function() { 
                        let msg = '✅ Imported ' + toAdd.length + ' new patients!'; 
                        if (skipped > 0) msg += '\n⚠️ Skipped ' + skipped + ' existing records.'; 
                        alert(msg); 
                        closeImportModal(); 
                    }); 
                } 
            }); 
        }); 
    } catch(e) { alert('❌ Invalid JSON: ' + e.message); } 
}
