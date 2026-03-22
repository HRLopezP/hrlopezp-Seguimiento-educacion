import React, { useEffect, useState, useCallback } from "react";
import { toast, Toaster } from "sonner";
import useGlobalReducer from '../hooks/useGlobalReducer';
import { apiFetch } from "../../utils/api";
import "../styles/roleManagement.css";

const AuditInbox = () => {
  const { store } = useGlobalReducer();
  const user = store.user;
  
  // Extraemos el rol del serialize del modelo User
  const userRole = user?.rol_name || "Oficial";

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

  // 1. CARGA DE COMPETENCIAS SEGÚN ROL
  useEffect(() => {
    if (userRole === "Gerente") {
      // Usamos las competencias que ya vienen en el serialize() del User
      const userComps = user?.competences || [];
      setCompetencias(userComps);
      
      // Si solo tiene 1 competencia, la seleccionamos por defecto y bloqueamos el selector
      if (userComps.length === 1) {
        setFilters(prev => ({ ...prev, competenciaId: userComps[0].id }));
      }
    } else if (userRole === "Administrador" || userRole === "Monitoreo") {
      // Ellos sí ven todas, las traemos del catálogo maestro
      const loadAllCompetences = async () => {
        const res = await apiFetch("/competences");
        if (res.ok) setCompetencias(await res.json());
      };
      loadAllCompetences();
    }
  }, [user, userRole]);

  // 2. CARGA DE PROYECTOS (Depende de la competencia elegida)
  // Esto ayuda a que el selector de proyectos sea más corto y eficiente
  useEffect(() => {
    const loadProjects = async () => {
      let url = "/manager/projects";
      if (filters.competenciaId) {
        url += `?competence_id=${filters.competenciaId}`;
      }
      
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setProyectos(data);
      }
    };
    loadProjects();
  }, [filters.competenciaId]);

  // 3. OBTENCIÓN DE DATOS (API /audit/inbox)
  const fetchAuditData = useCallback(async () => {
    // REGLA: En Aprobados es obligatorio seleccionar proyecto
    if (currentTab === "Aprobada" && !filters.proyectoId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({
        status: currentTab,
        page: page,
        per_page: 10,
        ...(filters.proyectoId && { project_id: filters.proyectoId }),
        ...(filters.competenciaId && { competence_id: filters.competenciaId }),
        ...(filters.search_code && { search_code: filters.search_code })
      });

      const res = await apiFetch(`/audit/inbox?${query}`);
      if (res.ok) {
        const result = await res.json();
        setActivities(result.data);
        setTotalPages(result.total_pages);
      }
    } catch (error) {
      toast.error("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, [currentTab, page, filters]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      competenciaId: (userRole === "Gerente" && competencias.length === 1) ? competencias[0].id : '',
      proyectoId: '',
      search_code: ''
    });
  };

  return (
    <div className="management-page-container">
      <Toaster richColors position="top-right" />
      <div className="container mt-4">
        
        {/* NAVEGACIÓN POR TABS */}
        <div className="audit-tabs-container d-flex mb-0">
          {["En Revisión", "Aprobada", "Rechazada"].map(tab => (
            <button
              key={tab}
              className={`audit-tab-btn ${currentTab === tab ? "active" : ""}`}
              onClick={() => { setCurrentTab(tab); setPage(1); }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="card shadow-lg border-0">
          
          {/* SECCIÓN DE FILTROS DINÁMICOS */}
          <div className="card-header bg-white p-3 border-bottom">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">BÚSQUEDA POR CÓDIGO</label>
                <input
                  type="text"
                  name="search_code"
                  className="form-control"
                  placeholder="Ej: IND-101"
                  value={filters.search_code}
                  onChange={handleFilterChange}
                />
              </div>

              {/* Filtros de Proyecto/Competencia SOLO para la pestaña Aprobada */}
              {currentTab === "Aprobada" && (
                <>
                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-muted">COMPETENCIA</label>
                    <select
                      name="competenciaId"
                      className="form-select"
                      value={filters.competenciaId}
                      onChange={handleFilterChange}
                      disabled={userRole === "Gerente" && competencias.length <= 1}
                    >
                      <option value="">Todas</option>
                      {competencias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-oxford">PROYECTO (OBLIGATORIO)</label>
                    <select
                      name="proyectoId"
                      className="form-select border-emerald"
                      value={filters.proyectoId}
                      onChange={handleFilterChange}
                    >
                      <option value="">-- Seleccionar --</option>
                      {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="col-md-2">
                <button className="btn btn-light border w-100" onClick={resetFilters}>
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          {/* TABLA DE RESULTADOS */}
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-sigssep align-middle mb-0">
                <thead>
                  <tr className="bg-light">
                    <th className="ps-3">Indicador</th>
                    <th>Responsable</th>
                    <th>Proyecto</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTab === "Aprobada" && !filters.proyectoId ? (
                    <tr>
                      <td colSpan="4" className="text-center p-5 text-muted">
                        <i className="fas fa-hand-point-up me-2"></i>
                        Selecciona un <strong>Proyecto</strong> para cargar los logros aprobados.
                      </td>
                    </tr>
                  ) : loading ? (
                    <tr><td colSpan="4" className="text-center p-5"><span className="spinner-border text-emerald"></span></td></tr>
                  ) : activities.length > 0 ? (
                    activities.map(act => (
                      <tr key={act.id}>
                        <td className="ps-3"><span className="badge bg-azul-marino p-2">{act.indicator_code}</span></td>
                        <td>{act.responsible}</td>
                        <td className="small">{act.project_name}</td>
                        <td className="text-center">
                          <button 
                             className={`btn-action ${currentTab === 'En Revisión' ? 'btn-activate' : 'btn-view'}`}
                             onClick={() => console.log("Auditar", act)}
                          >
                            <i className={`fas ${currentTab === 'En Revisión' ? 'fa-clipboard-check' : 'fa-eye'} me-1`}></i>
                            {currentTab === 'En Revisión' ? 'Auditar' : 'Ver'}
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

          {/* PAGINACIÓN */}
          <div className="card-footer bg-white d-flex justify-content-between align-items-center">
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