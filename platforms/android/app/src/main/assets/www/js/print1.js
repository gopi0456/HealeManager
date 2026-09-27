function printTicket() {
    // 1. Get data safely
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
            format: [80, 150] // Perfect size for thermal printers
        });

        // Add ticket content
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(tokenNum, 40, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.text('Healer Clinic', 40, 30, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('Heli Token Ticket', 40, 36, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(10, 40, 70, 40);

        doc.setFontSize(11);
        let y = 50;
        
        doc.setFont(undefined, 'bold'); doc.text('Name:', 10, y);
        doc.setFont(undefined, 'normal'); doc.text(name, 30, y); y += 8;

        doc.setFont(undefined, 'bold'); doc.text('Heli ID:', 10, y);
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

        // 2. THE MAGIC FIX: Generate as a Blob and use Android Native Share
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], 'Healer_Ticket.pdf', { type: 'application/pdf' });

        // Check if the phone supports native file sharing (Android 11+)
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            navigator.share({
                files: [pdfFile],
                title: 'Healer Clinic Ticket',
                text: 'Token: ' + tokenNum + ' for ' + name
            }).catch((error) => {
                console.log('Share canceled', error);
            });
        } else {
            // Fallback for older devices: Open in System Browser (Chrome)
            const url = URL.createObjectURL(pdfBlob);
            if (window.cordova && cordova.InAppBrowser) {
                cordova.InAppBrowser.open(url, '_system');
            } else {
                window.open(url, '_blank');
            }
        }

    } catch (error) {
        console.error('PDF generation error:', error);
        alert('❌ Error generating PDF: ' + error.message);
    }
}
