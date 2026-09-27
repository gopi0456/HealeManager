function printTicket() {
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

    // Show a loading message
    alert('⏳ Generating PDF... Please wait.');

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

        const fileName = 'Healer_Ticket_' + tokenNum.replace('#', '') + '.pdf';
        const pdfBase64 = doc.output('datauristring');
        const base64Data = pdfBase64.split(',')[1];

        // Use Cordova File Plugin to save, then File Opener to open
        if (window.cordova && window.resolveLocalFileSystemURL && window.cordova.plugins && window.cordova.plugins.fileOpener2) {
            
            // Save to external data directory (accessible by file opener)
            const folderPath = cordova.file.externalDataDirectory || cordova.file.dataDirectory;
            
            window.resolveLocalFileSystemURL(folderPath, function(dir) {
                dir.getFile(fileName, {create: true}, function(fileEntry) {
                    fileEntry.createWriter(function(fileWriter) {
                        fileWriter.onwriteend = function() {
                            // THIS IS THE MAGIC: Open the content:// URI in the native PDF viewer
                            cordova.plugins.fileOpener2.open(
                                fileEntry.toURL(), // This generates the content://... link you saw!
                                'application/pdf',
                                {
                                    error: function(e) {
                                        alert('❌ Error opening PDF: ' + JSON.stringify(e));
                                    },
                                    success: function() {
                                        console.log('✅ PDF opened successfully in native viewer!');
                                    }
                                }
                            );
                        };
                        
                        fileWriter.onerror = function(e) {
                            alert('❌ Write Error: ' + e.toString());
                        };
                        
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        fileWriter.write(new Blob([byteArray], {type: "application/pdf"}));
                    });
                });
            }, function(e) {
                alert('❌ Folder Error: ' + JSON.stringify(e));
            });
        } else {
            // Fallback for web browsers
            doc.save(fileName);
            alert('✅ PDF Downloaded!');
        }

    } catch (error) {
        console.error('PDF generation error:', error);
        alert('❌ Error generating PDF: ' + error.message);
    }
}
