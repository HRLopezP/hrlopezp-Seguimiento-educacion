import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateHealthReport = (
    projectInfo,
    groups,
    selectionName,
    daysRemaining,
) => {
    const doc = new jsPDF("p", "mm", "a4");

    const colors = {
        oxford: [27, 38, 59],
        emerald: [16, 185, 129],
        blueDays: [58, 134, 255],
        critico: [239, 68, 68],
        bajo: [243, 156, 18],
        progreso: [58, 134, 255],
    };

    // --- 1. ENCABEZADO ---
    doc.setFillColor(...colors.oxford);
    doc.rect(0, 0, 210, 55, "F");

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
    doc.text(`PROYECTO: ${projectInfo?.name || "N/A"}`, 14, 32);

    // PERIODO
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const startDate = projectInfo?.start_date
        ? new Date(projectInfo.start_date).toLocaleDateString()
        : "N/A";
    const endDate = projectInfo?.end_date
        ? new Date(projectInfo.end_date).toLocaleDateString()
        : "N/A";
    doc.text(`Periodo: ${startDate} al ${endDate}`, 14, 38);

    // DÍAS FALTANTES
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.blueDays);
    doc.text(`TIEMPO RESTANTE: ${daysRemaining || 0} DÍAS`, 14, 43);

    // COMPETENCIA
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.emerald);
    doc.text(`COMPETENCIA: ${selectionName || "General"}`, 14, 49);

    // ---TABLAS POR CATEGORÍA ---
    let currentY = 65;

    Object.keys(groups).forEach((key) => {
        const indicators = groups[key];
        if (indicators.length === 0) return;

        const labels = {
            criticos: "CRÍTICOS",
            bajos: "BAJOS",
            progreso: "EN PROGRESO",
            avanzados: "AVANZADOS",
        };

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.oxford);
        const labelMostrar = labels[key] || key.toUpperCase();
        doc.text(`ESTADO: ${labelMostrar}`, 14, currentY);

        const statusColor =
            key === "criticos"
                ? colors.critico
                : key === "bajos"
                    ? colors.bajo
                    : key === "progreso"
                        ? colors.progreso
                        : colors.emerald;

        doc.setDrawColor(...statusColor);
        doc.line(14, currentY + 1, 50, currentY + 1);

        const tableBody = indicators.map((ind) => {
            const isOutcome = ind.type?.toLowerCase() === "outcome";
            const isDep = ind.is_dependent;
            const pct = isOutcome
                ? ind.global_achieved || 0
                : ind.global_target > 0
                    ? (ind.global_achieved / ind.global_target) * 100
                    : 0;

            let displayDesglose = "";

            if (isOutcome && !isDep) {
                displayDesglose = `Apr: ${ind.total_approved || 0} / Eval: ${ind.total_attended || 0}`;
            } else if (isOutcome && isDep) {
                displayDesglose = `H: ${ind.total_men}% / M: ${ind.total_women}%`;
            } else {
                displayDesglose = `H: ${ind.total_men}/${ind.global_target_men || 0} - M: ${ind.total_women}/${ind.global_target_women || 0}`;
            }

            return [
                ind.code,
                ind.name,
                ind.type?.toUpperCase(),
                `${ind.global_achieved}${isOutcome ? "%" : ""}`,
                `${ind.global_target}${isOutcome ? "%" : ""}`,
                displayDesglose, 
                `${pct.toFixed(1)}%`,
            ];
        });

        autoTable(doc, {
            startY: currentY + 4,
            head: [
                ["CÓDIGO", "INDICADOR", "TIPO", "LOGRO", "META", "DESGLOSE H/M", "%"],
            ],
            body: tableBody,
            theme: "grid",
            headStyles: { fillColor: colors.oxford, fontSize: 7 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 65 },
                5: { cellWidth: 35, fontStyle: "italic" },
                6: { fontStyle: "bold", textColor: statusColor, halign: "center" },
            },
        });

        currentY = doc.lastAutoTable.finalY + 12;
        if (currentY > 260) {
            doc.addPage();
            currentY = 20;
        }
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



export const generateDetailedProgressReport = (
    data,
    projectInfo,
) => {
    const doc = new jsPDF("p", "mm", "a4");

    const colors = {
        oxford: [20, 33, 61],
        emerald: [16, 185, 129], 
        blueDays: [58, 134, 255], 
        lightGrey: [245, 245, 245],
        white: [255, 255, 255]
    };

    const today = new Date();
    const end = projectInfo?.end_date ? new Date(projectInfo.end_date) : null;
    const diffTime = end ? end - today : 0;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const timeText = daysRemaining > 0 ? `${daysRemaining} días restantes` : "Plazo cumplido";

    // --- ENCABEZADO INSTITUCIONAL ---
    doc.setFillColor(...colors.oxford);
    doc.rect(0, 0, 210, 45, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("SIGSSEP - REPORTE DETALLADO DE PROGRESO", 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`PROYECTO: ${projectInfo?.name || "No definido"}`, 14, 25);

    doc.setTextColor(...colors.emerald);
    doc.setFont("helvetica", "bold");
    doc.text(`COMPETENCIA: ${projectInfo?.competence_name?.toUpperCase() || "GENERAL"}`, 14, 32);

    const fDate = (d) => d ? new Date(d).toLocaleDateString('es-ES') : "N/A";
    const periodoText = `PERIODO: ${fDate(projectInfo?.start_date)} al ${fDate(projectInfo?.end_date)}`;

    doc.setTextColor(255, 255, 255); 
    doc.setFont("helvetica", "normal");
    doc.text(periodoText, 14, 39);

    doc.setTextColor(...colors.blueDays); 
    doc.setFont("helvetica", "bold");
    doc.text(timeText, 196, 39, { align: "right" });

    let currentY = 55;

    data.forEach((ind) => {
        const type = ind.type?.toLowerCase();
        const isOutcome = ind.type?.toLowerCase() === "outcome";
        const isDep = ind.is_dependent;
        const isIndependentOutcome = isOutcome && !isDep;

        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }

        // Título del Indicador
        doc.setFillColor(...colors.lightGrey);
        doc.rect(14, currentY, 182, 8, "F");
        doc.setTextColor(...colors.oxford);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`${ind.code}: ${ind.name}`, 16, currentY + 5.5);

        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.text(`Tipo:`, 160, currentY + 5);

        // 2. BADGE para el Tipo de Indicador
        const badgeColor = isOutcome ? colors.blueDays : colors.emerald;
        const typeLabel = type.toUpperCase();
        const labelWidth = doc.getTextWidth(typeLabel) + 4;

        doc.setFillColor(...badgeColor);
        doc.roundedRect(196 - labelWidth, currentY + 1.5, labelWidth, 5, 1, 1, "F");
        doc.setTextColor(...colors.white);
        doc.setFontSize(7);
        doc.text(typeLabel, 196 - (labelWidth / 2), currentY + 5, { align: "center" });

        currentY += 10;

        const formatDesglose = (h, m, tH, tM, approved, attended) => {
            if (isIndependentOutcome) {
                return `Apr: ${approved}/${attended} (Evaluados)`;
            }
            const suffix = (isOutcome && isDep) ? "%" : "";
            const targetH = !isOutcome ? `/${tH || 0}` : "";
            const targetM = !isOutcome ? `/${tM || 0}` : "";
            return `H: ${h}${suffix}${targetH} - M: ${m}${suffix}${targetM}`;
        };

        const activeProvinces = ind.provinces.filter(p => p.target > 0);
        const globalPct = isOutcome ? ind.global_achieved : (ind.global_target > 0 ? (ind.global_achieved / ind.global_target) * 100 : 0);

        const tableRows = [
            [
                { content: "TOTAL GENERAL", styles: { fontStyle: 'bold', fillColor: [230, 244, 241] } },
                { content: `${ind.global_target}${isOutcome ? "%" : ""}`, styles: { fontStyle: 'bold', fillColor: [230, 244, 241] } },
                { content: `${ind.global_achieved}${isOutcome ? "%" : ""}`, styles: { fontStyle: 'bold', fillColor: [230, 244, 241] } },
                { content: formatDesglose(ind.total_men, ind.total_women, ind.global_target_men, ind.global_target_women, ind.total_approved, ind.total_attended), styles: { fontStyle: 'bold', fillColor: [230, 244, 241] } },
                { content: `${globalPct.toFixed(1)}%`, styles: { fontStyle: 'bold', fillColor: colors.oxford, textColor: colors.white } }
            ],
            ...activeProvinces.map(p => {
                const pPct = isOutcome ? p.achieved : (p.target > 0 ? (p.achieved / p.target) * 100 : 0);
                return [
                    p.province_name,
                    `${p.target}${isOutcome ? "%" : ""}`,
                    `${p.achieved}${isOutcome ? "%" : ""}`,
                    formatDesglose(p.men, p.women, p.target_men, p.target_women, p.approved, p.attended),
                    `${pPct.toFixed(1)}%`
                ];
            })
        ];

        autoTable(doc, {
            startY: currentY,
            head: [["LOCALIZACIÓN", "META", "LOGRO", "DESGLOSE", "PROGRESO"]],
            body: tableRows,
            theme: "grid",
            headStyles: { fillColor: colors.oxford, fontSize: 8 },
            styles: { fontSize: 7.5 },
            columnStyles: { 3: { cellWidth: 45 }, 4: { halign: 'center', cellWidth: 25 } },
            margin: { left: 14 }
        });

        currentY = doc.lastAutoTable.finalY + 10;
    });

    doc.save(`Reporte_SIGSSEP_${projectInfo?.name || "Detalle"}.pdf`);
};
