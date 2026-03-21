import React, { useEffect, useState, useCallback } from "react";
import { toast, Toaster } from "sonner";
import useGlobalReducer from '../hooks/useGlobalReducer'; // Uso del hook estándar de tu proyecto
import Swal from 'sweetalert2';
import { apiFetch } from "../../utils/api";
import "../styles/roleManagement.css";

const AuditInbox = () => {
  // 1. Acceso al store global usando tu hook personalizado
  const { store } = useGlobalReducer();
  const user = store.user;
  
  // Extraemos el rol del usuario logueado
  const userRole = user?.rol?.name_rol || user?.rol || "Oficial";

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [competencias, setCompetencias] = useState([]);
  const [proyectos, setProyectos] = useState([]);

  const [currentTab, setCurrentTab] = useState("En Revisión");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    competenciaId: '',
    proyectoId: '',
    search_code: ""
  });

  // 2. CARGA DE CATÁLOGOS SEGÚN EL ROL
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        // Si es Gerente, usamos rutas que filtran por sus competencias asignadas
        // Si es Monitoreo/Admin, cargamos los catálogos completos (rutas /manager o generales)
        const projectRoute = (userRole === "Gerente") ? "/official/projects" : "/manager/projects";
        const competenceRoute = (userRole === "Gerente") ? "/official/competences" : "/competences";

        const [resP, resC] = await Promise.all([
          apiFetch(projectRoute),
          apiFetch(competenceRoute)
        ]);

        if (resP.ok) setProyectos(await resP.json());
        if (resC.ok) setCompetencias(await resC.json());
      } catch (error) {
        console.error("Error cargando filtros:", error);
      }
    };

    if (userRole) loadCatalogs();
  }, [userRole]);

  // 3. MANEJADOR DE FILTROS CON LÓGICA DE CASCADA PARA GERENTE
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const numericValue = (name === 'competenciaId' || name === 'proyectoId') && value ? parseInt(value, 10) : value;

    setFilters(prev => {
      const newFilters = { ...prev, [name]: numericValue };

      // Si el Gerente cambia la competencia, reseteamos el proyecto para obligar a elegir uno nuevo del área
      if (userRole === "Gerente" && name === "competenciaId") {
        newFilters.proyectoId = "";
      }
      return newFilters;
    });
  };

  // 4. CARGA DE ACTIVIDADES PARA AUDITORÍA
  const fetchAuditData = useCallback(async () => {
    if (currentTab === "Aprobada" && !filters.proyectoId && !filters.competenciaId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        status: currentTab,
        page: page,
        per_page: 10,
        ...(filters.proyectoId && { project_id: filters.proyectoId }),
        ...(filters.competenciaId && { competence_id: filters.competenciaId }),
        ...(filters.search_code && { search_code: filters.search_code })
      });

      const res = await apiFetch(`/audit/inbox?${queryParams}`);
      if (res?.ok) {
        const result = await res.json();
        setActivities(result.data);
        setTotalPages(result.total_pages);
      }
    } catch (error) {
      toast.error("Error al cargar la bandeja de auditoría");
    } finally {
      setLoading(false);
    }
  }, [currentTab, page, filters]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // 5. MODAL DE REVISIÓN (Mantenemos tu lógica de Swal)
  const handleReview = async (activity) => {
    const { value: formValues } = await Swal.fire({
      title: `Revisar Logro: ${activity.indicator_code}`,
      background: 'var(--card-bg)',
      color: 'var(--text-primary)',
      html: `
                <div class="review-details mb-3 text-start" style="font-size: 0.9rem;">
                    <p><strong>Responsable:</strong> ${activity.responsible}</p>
                    <p><strong>Descripción:</strong> ${activity.description}</p>
                    ${activity.image_url ? `<img src="${activity.image_url}" class="img-fluid rounded mt-2 border" style="max-height: 200px; width: 100%; object-fit: cover;">` : ''}
                </div>
                <select id="swal-status" class="swal2-input">
                    <option value="Aprobada">Aprobar</option>
                    <option value="Rechazada">Rechazar</option>
                </select>
                <textarea id="swal-comment" class="swal2-textarea" placeholder="Comentario o motivo de rechazo..."></textarea>
            `,
      showCancelButton: true,
      confirmButtonText: 'Procesar',
      confirmButtonColor: '#10b981'
    });

    if (formValues) {
      const status = document.getElementById('swal-status').value;
      const comment = document.getElementById('swal-comment').value;

      if (status === "Rechazada" && !comment) {
        toast.error("El motivo es obligatorio para rechazar");
        return;
      }

      try {
        const res = await apiFetch(`/activities/${activity.id}/review`, {
          method: 'PATCH',
          body: JSON.stringify({ status, monitoring_comment: comment })
        });
        if (res.ok) {
          toast.success("Revisión procesada");
          fetchAuditData();
        }
      } catch (err) {
        toast.error("Error en la comunicación");
      }
    }
  };

  return (
    <div className="management-page-container">
      <Toaster richColors position="top-right" />
      <div className="container mt-4">
        <div className="audit-tabs-container d-flex mb-3">
          {["En Revisión", "Aprobada", "Rechazada"].map(tab => (
            <button key={tab} className={`audit-tab-btn ${currentTab === tab ? 'active' : ''}`} onClick={() => { setCurrentTab(tab); setPage(1); }}>
              {tab}
            </button>
          ))}
        </div>

        <div className="card management-card-unified shadow-lg">
          <div className="management-card-header bg-light p-3">
            <div className="row g-2">
              <div className="col-md-2">
                <input type="text" name="search_code" className="form-control" placeholder="Código..." value={filters.search_code} onChange={handleFilterChange} />
              </div>

              {/* Selector de Competencia */}
              <div className={`col-md-${userRole === "Gerente" ? '5' : '4'}`}>
                <label className="small fw-bold text-muted">ESPECIALIDAD / COMPETENCIA</label>
                <select name="competenciaId" className="form-select" value={filters.competenciaId} onChange={handleFilterChange}>
                  <option value="">-- Todas las Áreas --</option>
                  {competencias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Selector de Proyecto con Bloqueo para Gerente */}
              <div className={`col-md-${userRole === "Gerente" ? '5' : '4'}`}>
                <label className="small fw-bold text-muted">PROYECTO</label>
                <select
                  name="proyectoId"
                  className="form-select"
                  value={filters.proyectoId}
                  onChange={handleFilterChange}
                  disabled={userRole === "Gerente" && !filters.competenciaId}
                >
                  <option value="">
                    {userRole === "Gerente" && !filters.competenciaId
                      ? "Elija primero competencia"
                      : "-- Todos los Proyectos --"}
                  </option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_name || p.name}</option>)}
                </select>
              </div>

              <div className="col-md-2 d-grid">
                <button className="btn btn-outline-secondary" onClick={() => setFilters({ competenciaId: '', proyectoId: '', search_code: "" })}>Limpiar</button>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table align-middle table-sigssep mb-0">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Responsable</th>
                    <th>Fecha</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTab === "Aprobada" && !filters.proyectoId && !filters.competenciaId ? (
                    <tr><td colSpan="4" className="text-center p-5 text-muted">Use los filtros para buscar en el historial de aprobados.</td></tr>
                  ) : loading ? (
                    <tr><td colSpan="4" className="text-center p-5"><div className="spinner-border text-emerald"></div></td></tr>
                  ) : activities.length > 0 ? (
                    activities.map(act => (
                      <tr key={act.id}>
                        <td><span className="fw-bold text-oxford">{act.indicator_code}</span></td>
                        <td>{act.responsible}</td>
                        <td className="small">{act.implementation_date}</td>
                        <td className="text-center">
                          <button className="btn-action btn-activate" onClick={() => handleReview(act)}>
                            <i className="fas fa-eye me-1"></i> Revisar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="text-center p-5 text-muted">No se encontraron registros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-footer d-flex justify-content-between align-items-center">
            <span className="small text-muted">Página {page} de {totalPages}</span>
            <div className="btn-group">
              <button className="btn btn-outline-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
              <button className="btn btn-outline-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditInbox;