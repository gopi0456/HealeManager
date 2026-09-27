// Utility functions used across the app
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function generatePatientId(id) { 
    return 'HEALE' + String(id).padStart(4, '0'); 
}

function getCurrentDateTime() { 
    const n = new Date(); 
    let h = n.getHours(); 
    const ap = h >= 12 ? 'PM' : 'AM'; 
    h = h % 12; 
    h = h ? h : 12; 
    return String(n.getDate()).padStart(2,'0') + '/' + String(n.getMonth()+1).padStart(2,'0') + '/' + n.getFullYear() + ' ' + h + ':' + String(n.getMinutes()).padStart(2,'0') + ' ' + ap; 
}

function getTodayDate() { 
    const n = new Date(); 
    return String(n.getDate()).padStart(2,'0') + '/' + String(n.getMonth()+1).padStart(2,'0') + '/' + n.getFullYear(); 
}

function parseDate(s) { 
    if (!s) return null; 
    const p = s.split(' ')[0].split('/'); 
    if (p.length !== 3) return null; 
    return new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0])); 
}

function daysBetween(a, b) { 
    return Math.round((b - a) / 86400000); 
}

function formatDate(d) { 
    return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); 
}

function getNextVisitDate(fromDate) { 
    const d = new Date(fromDate); 
    d.setDate(d.getDate() + 7); 
    d.setHours(0,0,0,0); 
    return d; 
}

function toggleHistory(id) { 
    const content = document.getElementById(id); 
    if (content) content.classList.toggle('show'); 
}
