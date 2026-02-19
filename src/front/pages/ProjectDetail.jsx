import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from "../../utils/api";
import "../styles/projectDetail.css";
import { toast, Toaster } from 'sonner';
import Swal from 'sweetalert2';
import TechnicalProgressCard from '../components/TechnicalProgressCard';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(true);


    const exportToPDF = () => {
        const dataToProcess = indicators || [];

        if (!project) {
            toast.error("Datos del proyecto no listos");
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        const toastId = toast.loading("Generando reporte técnico...");

        try {
            // --- 1. ENCABEZADO Y TÍTULO ---
            doc.setFontSize(18);
            doc.setTextColor(27, 38, 59); // Color Oxford
            doc.text("SIGSSEP - REPORTE TÉCNICO", 14, 15);

            // Línea divisoria decorativa
            doc.setDrawColor(25, 135, 84); // Verde Esmeralda
            doc.line(14, 17, 196, 17);

            // --- 2. FICHA TÉCNICA (DATOS INICIALES) ---
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);

            // Bloque Izquierdo: Identificación
            doc.setFont("helvetica", "bold");
            doc.text("PROYECTO:", 14, 25);
            doc.setFont("helvetica", "normal");
            doc.text(`${project.project_name || 'N/A'}`, 40, 25);

            doc.setFont("helvetica", "bold");
            doc.text("CÓDIGO:", 14, 31);
            doc.setFont("helvetica", "normal");
            doc.text(`${project.code || 'N/A'}`, 40, 31);

            doc.setFont("helvetica", "bold");
            doc.text("DONANTE:", 14, 37);
            doc.setFont("helvetica", "normal");
            doc.text(`${project.donor_name || 'N/A'}`, 40, 37);

            // Bloque Derecho: Fechas y Beneficiarios
            doc.setFont("helvetica", "bold");
            doc.text("PERIODO:", 120, 25);
            doc.setFont("helvetica", "normal");
            doc.text(`${project.start_date} al ${project.end_date}`, 145, 25);

            doc.setFont("helvetica", "bold");
            doc.text("BENEF. ÚNICOS:", 120, 31);
            doc.setFont("helvetica", "normal");
            const b = project.unique_targets || {};
            doc.text(`${b.total || 0} (H: ${b.men || 0} / M: ${b.women || 0})`, 155, 31);

            // --- 3. RESUMEN Y RESULTADOS (Texto largo) ---
            // Usamos splitTextToSize para que el texto no se salga de la hoja
            doc.setFont("helvetica", "bold");
            doc.text("RESUMEN:", 14, 46);
            doc.setFont("helvetica", "normal");
            const summaryLines = doc.splitTextToSize(project.main_objective || "Sin resumen.", 182);
            doc.text(summaryLines, 14, 51);

            // Calculamos cuánto espacio ocupó el resumen para saber dónde poner los resultados
            const summaryHeight = summaryLines.length * 5;
            const resultsY = 51 + summaryHeight + 5;

            doc.setFont("helvetica", "bold");
            doc.text("RESULTADOS ESPERADOS:", 14, resultsY);
            doc.setFont("helvetica", "normal");
            const resultLines = doc.splitTextToSize(project.results_summary || "Sin resultados definidos.", 182);
            doc.text(resultLines, 14, resultsY + 5);

            // Punto de inicio de la tabla después de los textos
            const startTableY = resultsY + 5 + (resultLines.length * 5) + 5;

            // --- 4. PROCESAMIENTO DE INDICADORES (Tu lógica de agrupamiento se mantiene igual) ---
            const acc = {};
            dataToProcess.forEach(ind => {
                const cName = ind.comp_name || "Sin Competencia";
                const tName = ind.theory_name || "Sin Teoría";
                const rType = (ind.result_type || "Output").toUpperCase();
                const rName = ind.result_name || "Sin Resultado";

                if (!acc[cName]) acc[cName] = {};
                if (!acc[cName][tName]) acc[cName][tName] = {};
                if (!acc[cName][tName][rType]) acc[cName][tName][rType] = {};
                if (!acc[cName][tName][rType][rName]) acc[cName][tName][rType][rName] = [];
                acc[cName][tName][rType][rName].push(ind);
            });

            const tableRows = [];

            // 3. Recorrido igual al renderizado de tu tabla
            Object.keys(acc).forEach(cName => {
                // Fila de COMPETENCIA (Verde)
                tableRows.push([{
                    content: `COMPETENCIA: ${cName}`,
                    colSpan: 5,
                    styles: { fillColor: [25, 135, 84], textColor: 255, fontStyle: 'bold' }
                }]);

                Object.keys(acc[cName]).forEach(tName => {
                    // Fila de TEORÍA (Gris oscuro)
                    tableRows.push([{
                        content: `  TEORÍA: ${tName}`,
                        colSpan: 5,
                        styles: { fillColor: [44, 62, 80], textColor: [46, 204, 113], fontStyle: 'bold' }
                    }]);

                    Object.keys(acc[cName][tName]).forEach(rType => {
                        Object.keys(acc[cName][tName][rType]).forEach(rName => {
                            // Fila de RESULTADO (Gris claro)
                            tableRows.push([{
                                content: `    [${rType}] ${rName}`,
                                colSpan: 5,
                                styles: { fillColor: [245, 245, 245], fontStyle: 'bold' }
                            }]);

                            acc[cName][tName][rType][rName].forEach(ind => {
                                // --- PROFE: AQUÍ ESTÁ LA MAGIA ---

                                // 1. Unimos los tags y el texto de verificación
                                const tags = (ind.means_tags || []).map(t => t.name).join(', ');
                                const verificacion = `${tags}${tags && ind.verification_means ? ' / ' : ''}${ind.verification_means || ''}`;

                                // 2. Formateamos las metas usando goals_by_province (como en tu componente)
                                let metasTexto = "Sin metas";
                                if (ind.goals_by_province && ind.goals_by_province.length > 0) {
                                    metasTexto = ind.goals_by_province
                                        .filter(gp => (gp.target_total || gp.target) > 0)
                                        .map(gp => {
                                            const total = gp.target_total || gp.target;
                                            const suffix = ind.result_type?.toLowerCase() === 'outcome' ? '%' : '';
                                            const prov = gp.province_name || gp.province;
                                            // Agregamos H y M si no es outcome
                                            const h = gp.target_men || gp.men || 0;
                                            const m = gp.target_women || gp.women || 0;
                                            const desglose = ind.result_type?.toLowerCase() !== 'outcome' ? ` (${h}H / ${m}M)` : '';

                                            return `• ${prov}: ${total}${suffix}${desglose}`;
                                        }).join('\n');
                                }

                                tableRows.push([
                                    ind.indicator_code || '-',
                                    ind.indicator_name || 'Sin nombre',
                                    verificacion || '-',
                                    metasTexto,
                                    ind.observations || '-'
                                ]);
                            });
                        });
                    });
                });
            });

            autoTable(doc, {
                startY: startTableY, // <-- Empezamos justo después del texto superior
                head: [['CÓDIGO', 'INDICADOR', 'VERIFICACIÓN', 'METAS POR PROVINCIA', 'OBS.']],
                body: tableRows,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [27, 38, 59] },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 55 },
                    4: { cellWidth: 25 }
                }
            });

            doc.save(`Reporte_Tecnico_${project.code}.pdf`);
            toast.success("Reporte generado con éxito", { id: toastId });

        } catch (error) {
            console.error(error);
            toast.error("Error al generar el PDF", { id: toastId });
        }
    };
    
    // --- USE EFFECT CORREGIDO ---
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                const [resProj, resInd] = await Promise.all([
                    apiFetch(`/manager/projects/${id}`),
                    apiFetch(`/projects/${id}/indicators`)
                ]);

                if (resProj.ok) {
                    const dataProj = await resProj.json();
                    setProject(dataProj);
                } else {
                    throw new Error("Proyecto no encontrado");
                }

                if (resInd.ok) {
                    setIndicators(await resInd.json());
                }
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
                navigate('/manager/projects');
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [id, navigate]);

    if (loading) return <div className="spinner-grow text-emerald"></div>;
    if (!project) return null;

    return (
        <div className="project-detail-main-container fade-in py-4">
            <div className="container-fluid mt-4 mb-5 px-4 fade-in" style={{ maxWidth: '1200px' }}>
                <Toaster richColors />

                {/* HEADER PRINCIPAL */}
                <div className="sigssep-table-container mb-4 shadow-lg overflow-hidden border-0">
                    <div className="auth-header d-flex justify-content-between align-items-center flex-wrap px-4 py-4 bg-oxford text-white">
                        <div className="text-start">
                            <h2 className="mb-1 fw-bold fs-2">{project.project_name || "Proyecto sin nombre"}</h2>
                            <span className="badge bg-emerald-soft text-dark fw-bold">Código: {project.code}</span>
                        </div>

                        <div className="time-display-container text-center shadow-sm mt-2 mt-md-0">
                            <small className="time-label">TIEMPO RESTANTE</small>
                            <span className="time-counter">
                                años: {project.remaining_time_detailed?.years || 0} meses: {project.remaining_time_detailed?.months || 0}  días: {project.remaining_time_detailed?.days || 0}
                            </span>
                        </div>
                    </div>

                    <div className="p-4" style={{ backgroundColor: 'var(--card-bg)' }}>
                        <div className="row g-4">
                            {/* COLUMNA IZQUIERDA: FICHA TÉCNICA */}
                            <div className="col-lg-4 border-end-dynamic">
                                <h5 className="text-oxford-dynamic fw-bold mb-4">
                                    <i className="fas fa-clipboard-list me-2 text-emerald"></i> Ficha Técnica
                                </h5>
                                <div className="tech-info-grid">
                                    <div className="mb-4">
                                        <label className="small text-muted d-block fs-5">DONANTE</label>
                                        <span className="fw-bold fs-4">{project.donor_name || "No asignado"}</span>
                                    </div>
                                    <div className="row mb-5">
                                        <div className="col-6">
                                            <label className="small text-muted d-block">INICIO</label>
                                            <span className="fw-bold fs-5">{project.start_date}</span>
                                        </div>
                                        <div className="col-6">
                                            <label className="small text-muted d-block">CIERRE</label>
                                            <span className="fw-bold fs-5">{project.end_date}</span>
                                        </div>
                                    </div>
                                    <div className="mb-5">
                                        <label className="small text-muted d-block fw-bold mb-1">ESTADO DEL PROYECTO</label>
                                        <span className="status-badge bg-emerald shadow-sm">
                                            {project.status || "En Progreso"}
                                        </span>
                                    </div>

                                    <h6 className="fw-bold mt-4 mb-3 text-muted text-uppercase">Metas por Estado</h6>
                                    <div className="d-flex flex-wrap fs-4 gap-3">
                                        {project.province_unique_breakdown?.map((pb, i) => (
                                            <div key={i} className="province-badge-detailed p-1">
                                                <div className="province-header d-flex justify-content-between">
                                                    <span>{pb.province_name}</span>
                                                    <span className="text-emerald ms-2">{pb.total}</span>
                                                </div>
                                                <div className="gender-split fs-6">
                                                    <span className="m-color">H: {pb.men || 0}</span>
                                                    <span className="w-color">M: {pb.women || 0}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: BENEFICIARIOS Y OBJETIVO */}
                            <div className="col-lg-8 ps-lg-5">
                                <h5 className="text-oxford-dynamic fw-bold mb-4 text-center">
                                    <i className="fas fa-users me-2 text-emerald"></i>Beneficiarios Únicos
                                </h5>

                                <div className="beneficiaries-container mb-4">
                                    {/* FILA SUPERIOR: TOTAL CENTRADO */}
                                    <div className="d-flex justify-content-center mb-3">
                                        <div className="b-item total-main shadow-sm">
                                            <span className="num-large">{project.unique_targets?.total || 0}</span>
                                            <label className="label-text">Total Beneficiarios</label>
                                        </div>
                                    </div>
                                    {/* FILA INFERIOR: DESGLOSE */}
                                    <div className="beneficiaries-grid">
                                        <div className="b-item secondary men">
                                            <span className="num-medium">{project.unique_targets?.men || 0}</span>
                                            <label className="label-text">Hombres</label>
                                        </div>
                                        <div className="b-item secondary women">
                                            <span className="num-medium">{project.unique_targets?.women || 0}</span>
                                            <label className="label-text">Mujeres</label>
                                        </div>
                                        <div className="b-item secondary disability">
                                            <span className="num-medium">{project.unique_targets?.disability || 0}</span>
                                            <label className="label-text">Discapacidad</label>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="objective-box p-4 rounded-4 shadow-sm mb-3" style={{ borderLeft: '5px solid var(--oxford-grey)' }}>
                                        <h6 className="fw-bold text-oxford-dynamic mb-2">
                                            <i className="fas fa-align-left me-2 text-emerald"></i>Resultados
                                        </h6>
                                        <p className="mb-0 fs-6 lh-sm text-oxford-dynamic">
                                            {project.results_summary || "No hay una descripción detallada para este proyecto."}
                                        </p>
                                    </div>
                                    <div className="objective-box p-4 rounded-4 shadow-sm">
                                        <h6 className="fw-bold text-emerald mb-2">
                                            <i className="fas fa-bullseye me-2"></i>Resumen
                                        </h6>
                                        <p className="mb-0 fs-5 lh-sm italic-management text-oxford-dynamic">
                                            "{project.main_objective || "No definido."}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* TABLA DE UBICACIONES (ANCHO COMPLETO) */}
                <div className="mb-5">
                    <h5 className="text-oxford-dynamic fw-bold mb-3 px-2">
                        <i className="fas fa-map-marked-alt me-2 text-emerald"></i>Lugares de Intervención
                    </h5>
                    <div className="sigssep-table-container shadow-sm border-0">
                        <table className="table-sigssep">
                            <thead>
                                <tr>
                                    <th className="ps-4">Estado / Provincia</th>
                                    <th>Municipio</th>
                                    <th>Parroquia</th>
                                    <th>Comunidad / Institución</th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.locations?.map((loc, idx) => (
                                    <tr key={idx}>
                                        <td className="ps-4 fw-bold">{loc.province}</td>
                                        <td>{loc.municipality}</td>
                                        <td>{loc.parish || '---'}</td>
                                        <td>{loc.community_institution || '---'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SECCIÓN DE COMPETENCIAS Y RESPONSABLES */}
                <div className="mb-5 fade-in">
                    <h5 className="text-oxford-dynamic fw-bold mb-3 px-2">
                        <i className="fas fa-sitemap me-2 text-emerald"></i>Estructura de Gestión y Competencias
                    </h5>
                    <div className="row g-3">
                        {project.competences && project.competences.length > 0 ? (
                            project.competences.map((comp, idx) => (
                                <div key={idx} className="col-md-6 col-lg-4">
                                    <div className="competence-card p-3 shadow-sm rounded-3 border-0 h-100 bg-card-dynamic">
                                        <div className="d-flex align-items-start">
                                            <div className="competence-icon-avatar bg-oxford text-white me-3 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                                                <i className="fas fa-user-tie"></i>
                                            </div>
                                            <div>
                                                <h6 className="fw-bold mb-1 text-oxford-dynamic">{comp.name}</h6>
                                                <p className="small text-muted-dynamic mb-0">Gerente Responsable:</p>
                                                <span className="fw-bold text-emerald">{comp.manager_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-12 text-center py-4 bg-light rounded-4">
                                <p className="text-muted mb-0">No hay competencias asignadas a este proyecto.</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mb-5 fade-in">
                    <TechnicalProgressCard
                        allIndicators={indicators}
                        allCompetences={project.competences || []}
                    />
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="d-flex justify-content-between align-items-center bg-card-dynamic p-4 rounded-4 shadow-sm mt-4">
                    <button className="btn btn-outline-oxford px-4" onClick={() => navigate('/manager/projects')}>
                        <i className="fas fa-arrow-left me-2"></i>Volver
                    </button>
                    <div className="d-flex gap-3">
                        <button className="btn btn-oxford px-4 text-white" onClick={exportToPDF}>
                            <i className="fas fa-file-pdf me-2"></i> Exportar PDF
                        </button>
                        <Link to={`/manager/projects/edit/${id}`} className="btn btn-emerald px-4 text-white">
                            <i className="fas fa-edit me-2"></i> Editar
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;