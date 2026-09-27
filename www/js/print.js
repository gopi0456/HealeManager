async function printTicket() {
    const data = window.currentTicket || {};
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.textContent.trim() : '';
    };
    const tokenNum = data.tokenNum || getVal('ticketTokenNum') || '#1';
    const name = data.name || getVal('ticketName') || 'N/A';
    const id = data.id || getVal('ticketId') || 'N/A';
    const phone = data.phone || getVal('ticketPhone') || 'N/A';
    const date = data.date || getVal('ticketDate') || 'N/A';
    const notes = data.notes || getVal('ticketNotes') || 'No notes';
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 150]
        });
        
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(tokenNum, 40, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text('Heale Clinic', 40, 30, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('Heale Token Ticket', 40, 36, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(10, 40, 70, 40);
        
        doc.setFontSize(11);
        let y = 50;
        doc.setFont(undefined, 'bold'); doc.text('Name:', 10, y);
        doc.setFont(undefined, 'normal'); doc.text(name, 30, y); y += 8;
        doc.setFont(undefined, 'bold'); doc.text('Heale ID:', 10, y);
        doc.setFont(undefined, 'normal'); doc.text(id, 30, y); y += 8;
        doc.setFont(undefined, 'bold'); doc.text('Phone:', 10, y);
        doc.setFont(undefined, 'normal'); doc.text(phone, 30, y); y += 8;
        doc.setFont(undefined, 'bold'); doc.text('Date:', 10, y);
        doc.setFont(undefined, 'normal'); doc.text(date, 30, y); y += 8;
        
        if (notes && notes !== 'Pending visit...' && notes !== 'N/A') {
            doc.line(10, y, 70, y); y += 6;
            doc.setFont(undefined, 'bold'); doc.text('Notes:', 10, y); y += 5;
            doc.setFont(undefined, 'normal'); doc.text(notes, 10, y, { maxWidth: 60 });
        }
        
        const fileName = 'Heale_Ticket_' + tokenNum.replace('#', '') + '.pdf';
        const pdfBlob = doc.output('blob');
        
        // Use Capacitor Filesystem
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            const reader = new FileReader();
            reader.onloadend = async function() {
                const base64Data = reader.result.split(',')[1];
                
                try {
                    // Save file
                    const result = await window.Capacitor.Plugins.Filesystem.writeFile({
                        path: fileName,
                        data: base64Data,
                        directory: 'DOCUMENTS',
                        recursive: true
                    });
                    
                    // Get the actual file URI
                    const uri = result.uri;
                    
                    // Try to share/open the file
                    if (window.Capacitor.Plugins.Share) {
                        await window.Capacitor.Plugins.Share.share({
                            title: 'Heale Token',
                            text: 'Token ' + tokenNum + ' for ' + name,
                            url: uri,
                            dialogTitle: 'Share or Print Token'
                        });
                    } else {
                        // Open in system viewer
                        window.open(uri, '_system');
                        alert('✅ PDF saved to Documents folder!\n\nFile: ' + fileName);
                    }
                    
                } catch (error) {
                    console.error('Error saving PDF:', error);
                    alert('❌ Error saving PDF: ' + error.message);
                }
            };
            reader.readAsDataURL(pdfBlob);
            
        } else {
            // Fallback for browser
            doc.save(fileName);
            alert('✅ PDF downloaded!');
        }
        
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('❌ Error generating PDF: ' + error.message);
    }
}

function shareTicket() {
    const data = window.currentTicket || {};
    const tokenNum = data.tokenNum || '#1';
    const name = data.name || 'N/A';
    const id = data.id || 'N/A';
    const phone = data.phone || 'N/A';
    const date = data.date || 'N/A';
    
    const message = `Heale Clinic Token\n\nToken: ${tokenNum}\nName: ${name}\nID: ${id}\nPhone: ${phone}\nDate: ${date}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Heale Clinic Token',
            text: message
        }).catch(err => console.error('Share failed:', err));
    } else {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(message).then(() => {
                alert('✅ Token details copied to clipboard!');
            });
        } else {
            alert(message);
        }
    }
}
