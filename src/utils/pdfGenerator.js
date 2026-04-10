import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateHealthReport = (projectInfo, groups, selectionName, daysRemaining) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const colors = {
        oxford: [27, 38, 59],     
        emerald: [16, 185, 129],   
        blueDays: [58, 134, 255], 
        critico: [239, 68, 68],
        bajo: [243, 156, 18],
        progreso: [58, 134, 255]
    };

    // --- 1. ENCABEZADO ---
    doc.setFillColor(...colors.oxford);
    doc.rect(0, 0, 210, 55, 'F'); 

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("SIGSSEP", 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("SISTEMA DE GESTIÓN, SUPERVISIÓN Y SEGUIMIENTO", 14, 21);

    // DATOS DEL PROYECTO
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`PROYECTO: ${projectInfo?.name || 'N/A'}`, 14, 32);

    // PERIODO
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const startDate = projectInfo?.start_date ? new Date(projectInfo.start_date).toLocaleDateString() : 'N/A';
    const endDate = projectInfo?.end_date ? new Date(projectInfo.end_date).toLocaleDateString() : 'N/A';
    doc.text(`Periodo: ${startDate} al ${endDate}`, 14, 38);

    // DÍAS FALTANTES 
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.blueDays);
    doc.text(`TIEMPO RESTANTE: ${daysRemaining || 0} DÍAS`, 14, 43);

    // COMPETENCIA
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.emerald); 
    doc.text(`COMPETENCIA: ${selectionName || 'General'}`, 14, 49);

    // ---TABLAS POR CATEGORÍA ---
    let currentY = 65; 

    Object.keys(groups).forEach((key) => {
        const indicators = groups[key];
        if (indicators.length === 0) return;

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.oxford);
        doc.text(`ESTADO: ${key.toUpperCase()}`, 14, currentY);
        
        const statusColor = key === 'criticos' ? colors.critico : 
                           key === 'bajos' ? colors.bajo : 
                           key === 'progreso' ? colors.progreso : colors.emerald;
        
        doc.setDrawColor(...statusColor);
        doc.line(14, currentY + 1, 50, currentY + 1);

        const tableBody = indicators.map(ind => {
            const isOutcome = ind.type?.toLowerCase() === 'outcome';
            const pct = isOutcome ? (ind.global_achieved || 0) : 
                        (ind.global_target > 0 ? (ind.global_achieved / ind.global_target) * 100 : 0);
            
            // Desglose de género
            const genderSplit = ind.is_dependent 
                ? `H: ${ind.total_men}% / M: ${ind.total_women}%`
                : `H: ${ind.total_men} / M: ${ind.total_women}`;

            return [
                ind.code,
                ind.name,
                ind.type?.toUpperCase(),
                `${ind.global_achieved}${isOutcome ? '%' : ''}`,
                `${ind.global_target}${isOutcome ? '%' : ''}`,
                genderSplit,
                `${pct.toFixed(1)}%`
            ];
        });

        autoTable(doc, {
            startY: currentY + 4,
            head: [['CÓDIGO', 'INDICADOR', 'TIPO', 'LOGRO', 'META', 'DESGLOSE H/M', '%']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: colors.oxford, fontSize: 7 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 65 },
                5: { cellWidth: 35, fontStyle: 'italic' },
                6: { fontStyle: 'bold', textColor: statusColor, halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 12;
        if (currentY > 260) { doc.addPage(); currentY = 20; }
    });

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 285);
        doc.text(`Página ${i} de ${pageCount}`, 180, 285);
    }

    doc.save(`Salud_${selectionName}_${projectInfo?.name}.pdf`);
};