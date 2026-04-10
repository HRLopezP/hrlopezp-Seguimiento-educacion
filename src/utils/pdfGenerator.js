import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Genera un reporte PDF híbrido para el Dashboard de Salud
 * @param {Object} projectInfo - Datos del proyecto (nombre, fechas, etc.)
 * @param {Object} groups - Indicadores agrupados por estado (criticos, bajos, etc.)
 */
export const generateHealthReport = (projectInfo, groups) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Colores corporativos SIGSSEP
    const colors = {
        oxford: [27, 38, 59],
        emerald: [16, 185, 129],
        critico: [239, 68, 68],
        bajo: [243, 156, 18],
        progreso: [58, 134, 255]
    };

    // --- 1. ENCABEZADO ELEGANTE ---
    doc.setFillColor(...colors.oxford);
    doc.rect(0, 0, 210, 40, 'F'); // Franja superior

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("SIGSSEP", 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("SISTEMA DE GESTIÓN, SUPERVISIÓN Y SEGUIMIENTO", 14, 20);

    doc.setFontSize(14);
    doc.text("REPORTE DE ESTADO DE SALUD", 14, 32);

    // --- 2. FICHA TÉCNICA DEL PROYECTO ---
    let currentY = 50;
    doc.setTextColor(...colors.oxford);
    doc.setFontSize(12);
    doc.text(`Proyecto: ${projectInfo?.name || 'N/A'}`, 14, currentY);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    const dateRange = `Periodo: ${new Date(projectInfo?.start_date).toLocaleDateString()} al ${new Date(projectInfo?.end_date).toLocaleDateString()}`;
    doc.text(dateRange, 14, currentY + 5);

    currentY += 15;

    // --- 3. GENERACIÓN DE TABLAS POR CATEGORÍA ---
    // Recorremos los grupos (críticos, bajos, progreso, avanzados)
    Object.keys(groups).forEach((key) => {
        const indicators = groups[key];
        if (indicators.length === 0) return; // Si no hay datos en esta categoría, saltamos

        // Título de la sección
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.oxford);
        doc.text(`INDICADORES EN ESTADO: ${key.toUpperCase()}`, 14, currentY);
        
        // Línea de acento según la categoría
        const statusColor = key === 'criticos' ? colors.critico : 
                           key === 'bajos' ? colors.bajo : 
                           key === 'progreso' ? colors.progreso : colors.emerald;
        
        doc.setDrawColor(...statusColor);
        doc.line(14, currentY + 1, 60, currentY + 1);

        const tableBody = indicators.map(ind => {
            const isOutcome = ind.type?.toLowerCase() === 'outcome';
            const pct = isOutcome ? ind.global_achieved : 
                        (ind.global_target > 0 ? (ind.global_achieved / ind.global_target) * 100 : 0);
            
            return [
                ind.code,
                ind.name,
                ind.type?.toUpperCase(),
                `${ind.global_achieved}${isOutcome ? '%' : ''}`,
                `${ind.global_target}${isOutcome ? '%' : ''}`,
                `${pct.toFixed(1)}%`
            ];
        });

        autoTable(doc, {
            startY: currentY + 4,
            head: [['CÓDIGO', 'INDICADOR', 'TIPO', 'LOGRO', 'META', '%']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: colors.oxford, fontSize: 8 },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 80 },
                5: { fontStyle: 'bold', textColor: statusColor }
            },
            margin: { left: 14 }
        });

        // Actualizamos el Y actual para la siguiente tabla
        currentY = doc.lastAutoTable.finalY + 15;

        // Si nos quedamos sin espacio, agregamos página
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }
    });

    // --- 4. PIE DE PÁGINA ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 285);
        doc.text(`Página ${i} de ${pageCount}`, 180, 285);
    }

    doc.save(`Estado_Salud_${projectInfo?.name || 'Reporte'}.pdf`);
};