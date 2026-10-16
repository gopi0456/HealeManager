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
        if (!window.jspdf) { alert('❌ PDF library not loaded.'); return; }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });
        
        doc.setFontSize(24); doc.setFont(undefined, 'bold');
        doc.text(tokenNum, 40, 20, { align: 'center' });
        doc.setFontSize(14); doc.text('LAKSHMI ACUPUNCTURE', 40, 30, { align: 'center' });
        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        doc.text('LAKSHMI ACUPUNCTURE Token Ticket', 40, 36, { align: 'center' });
        doc.setLineWidth(0.5); doc.line(10, 40, 70, 40);
        
        doc.setFontSize(11); let y = 50;
        doc.setFont(undefined, 'bold'); doc.text('Name:', 10, y); doc.setFont(undefined, 'normal'); doc.text(name, 30, y); y += 8;
        doc.setFont(undefined, 'bold'); doc.text('Heale ID:', 10, y); doc.setFont(undefined, 'normal'); doc.text(id, 30, y); y += 8;
        doc.setFont(undefined, 'bold'); doc.text('Phone:', 10, y); doc.setFont(undefined, 'normal'); doc.text(phone, 30, y); y += 8;
        doc.setFont(undefined, 'bold'); doc.text('Date:', 10, y); doc.setFont(undefined, 'normal'); doc.text(date, 30, y); y += 8;
        
        if (notes && notes !== 'Pending visit...' && notes !== 'N/A') {
            doc.line(10, y, 70, y); y += 6;
            doc.setFont(undefined, 'bold'); doc.text('Notes:', 10, y); y += 5;
            doc.setFont(undefined, 'normal'); doc.text(notes, 10, y, { maxWidth: 60 });
        }
        
        const fileName = name.replace(/[^a-zA-Z0-9]/g, '_') + '_heale_token.pdf';
        const base64Data = doc.output('datauristring').split(',')[1];
        
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            try {
                const Filesystem = window.Capacitor.Plugins.Filesystem;
                await Filesystem.writeFile({ path: fileName, data: base64Data, directory: 'CACHE' });
                const uriResult = await Filesystem.getUri({ path: fileName, directory: 'CACHE' });
                
                if (window.Capacitor.Plugins.Share) {
                    await window.Capacitor.Plugins.Share.share({
                        title: 'Lakshmi Acupuncture Token',
                        text: 'Token ' + tokenNum + ' for ' + name,
                        url: uriResult.uri,
                        dialogTitle: 'Share or Print Token'
                    });
                } else {
                    alert('✅ PDF saved to App Cache!\n\nFile: ' + fileName);
                }
            } catch (error) {
                console.error('❌ Filesystem/Share Error:', error);
                alert('❌ Error: ' + error.message);
            }
        } else {
            doc.save(fileName);
            alert('✅ PDF downloaded!');
        }
    } catch (error) {
        console.error('❌ PDF generation error:', error);
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

    // EXACT TOKEN MESSAGE FORMAT REQUESTED
    const message = `Dear ${name},\n\nHeale ID: ${id}\nDate of Visit: ${date}\nToken: ${tokenNum}\n\n- CLAKSHMI ACUPUNCTURE\n- Call 9701564135`;

    if (phone && phone !== 'N/A' && phone.length >= 10) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (confirm('Share to ' + phone + '?\n\nClick OK for WhatsApp\nClick Cancel for SMS')) {
            window.open('https://wa.me/91' + cleanPhone + '?text=' + encodeURIComponent(message), '_blank');
        } else {
            window.open('sms:' + cleanPhone + '?body=' + encodeURIComponent(message), '_blank');
        }
    } else {
        if (navigator.share) {
            navigator.share({ title: 'CLAKSHMI ACUPUNCTURE Token', text: message }).catch(err => console.error(err));
        } else {
            navigator.clipboard.writeText(message).then(() => alert('✅ Copied to clipboard!\n\n' + message));
        }
    }
}
