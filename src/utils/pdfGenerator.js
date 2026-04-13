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
                // CASO 1: Outcome Independiente (Aprobados / Atendidos)
                displayDesglose = `Apr: ${ind.total_approved || 0} / Eval: ${ind.total_attended || 0}`;
            } else if (isOutcome && isDep) {
                // CASO 2: Outcome Dependiente (Muestra porcentajes de H/M)
                displayDesglose = `H: ${ind.total_men}% / M: ${ind.total_women}%`;
            } else {
                // CASO 3: Outputs (Logro actual / Meta específica por género)
                displayDesglose = `H: ${ind.total_men}/${ind.global_target_men || 0} - M: ${ind.total_women}/${ind.global_target_women || 0}`;
            }

            return [
                ind.code,
                ind.name,
                ind.type?.toUpperCase(),
                `${ind.global_achieved}${isOutcome ? "%" : ""}`,
                `${ind.global_target}${isOutcome ? "%" : ""}`,
                displayDesglose, // Usamos nuestra nueva variable calculada
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

    const fDate = (d) => (d ? new Date(d).toLocaleDateString("es-ES") : "N/A");

    const colors = {
        oxford: [20, 33, 61],
        emerald: [16, 185, 129], // Verde para competencia
        blueDays: [58, 134, 255], // Azul para tiempo restante
        lightGrey: [245, 245, 245]
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

    const rango = `${fDate(projectInfo?.start_date)} al ${fDate(projectInfo?.end_date)}`;
    doc.text(`PERIODO DE EJECUCIÓN: ${rango}`, 14, 37);

    doc.setTextColor(...colors.blueDays);
    doc.text(`TIEMPO: ${timeText}`, 14, 39);

    let currentY = 55;

    data.forEach((ind, index) => {
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
        doc.text(`${ind.code}: ${ind.name}`, 16, currentY + 5);

        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.text(`Tipo: ${ind.type?.toUpperCase()}`, 160, currentY + 5);

        currentY += 10;

        const globalPct = isOutcome ? ind.global_achieved :
            (ind.global_target > 0 ? (ind.global_achieved / ind.global_target) * 100 : 0);

        let globalDesglose = "";
        if (isIndependentOutcome) {
            globalDesglose = `Apr: ${ind.total_approved} / Eval: ${ind.total_attended}`;
        } else {
            const suffix = (isOutcome && isDep) ? "%" : "";
            globalDesglose = `H: ${ind.total_men}${suffix} - M: ${ind.total_women}${suffix}`;
        }

        const activeProvinces = ind.provinces.filter(p => p.target > 0);

        const tableRows = [
            // FILA RESALTADA (TOTAL GENERAL)
            [
                { content: "TOTAL GENERAL", styles: { fontStyle: 'bold', fillColor: [230, 244, 241] } },
                { content: `${ind.global_target}${isOutcome ? "%" : ""}`, styles: { fontStyle: 'bold', fillColor: [230, 244, 241] } },
                { content: `${ind.global_achieved}${isOutcome ? "%" : ""}`, styles: { fontStyle: 'bold', fillColor: [230, 244, 241] } },
                { content: globalDesglose, styles: { fontStyle: 'bold', fillColor: [230, 244, 241] } },
                { content: `${globalPct.toFixed(1)}%`, styles: { fontStyle: 'bold', fillColor: [20, 33, 61], textColor: [255, 255, 255] } }
            ],
            // FILAS DE PROVINCIAS
            ...activeProvinces.map(p => {
                const pPct = isOutcome ? p.achieved :
                    (p.target > 0 ? (p.achieved / p.target) * 100 : 0);

                let pDesglose = "";
                if (isIndependentOutcome) {
                    pDesglose = `Apr: ${p.approved} / Eval: ${p.attended}`;
                } else {
                    const suffix = (isOutcome && isDep) ? "%" : "";
                    pDesglose = `H: ${p.men}${suffix} - M: ${p.women}${suffix}`;
                }

                return [
                    p.province_name,
                    `${p.target}${isOutcome ? "%" : ""}`,
                    `${p.achieved}${isOutcome ? "%" : ""}`,
                    pDesglose,
                    `${pPct.toFixed(1)}%`
                ];
            })
        ];

        autoTable(doc, {
            startY: currentY,
            head: [["LOCALIZACIÓN", "META", "LOGRO", "DESGLOSE", "PROGRESO (%)"]],
            body: tableRows,
            theme: "grid",
            headStyles: { fillColor: colors.oxford, fontSize: 8 },
            styles: { fontSize: 8 },
            columnStyles: {
                4: { halign: 'center', cellWidth: 30 }
            },
            margin: { left: 14 }
        });

        currentY = doc.lastAutoTable.finalY + 10;
    });

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Generado el ${today.toLocaleDateString()}`, 14, 285);
    }

    doc.save(`Progreso_Detallado_${projectInfo?.name || "Proyecto"}.pdf`);
};
