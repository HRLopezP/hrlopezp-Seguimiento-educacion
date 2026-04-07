import React, { useEffect, useState, useCallback } from "react";
import { toast, Toaster } from "sonner";
import useGlobalReducer from '../hooks/useGlobalReducer';
import { apiFetch } from "../../utils/api";
import ReviewModal from "../components/ReviewModal";
import "../styles/roleManagement.css";
import { useLocation, useNavigate } from "react-router-dom";

const AuditInbox = () => {
  const { store } = useGlobalReducer();
  const user = store.user;
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const userRole = user?.rol_name || "Oficial";
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [competencias, setCompetencias] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const location = useLocation();
  const [currentTab, setCurrentTab] = useState(
    new URLSearchParams(location.search).get('tab') || "En Revisión"
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    competenciaId: '',
    proyectoId: '',
    search_code: ""
  });

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    setPage(1);
    setFilters(prev => ({ ...prev, proyectoId: '' }));
    navigate(`?tab=${tabId}`, { replace: true });
  };


  const handleOpenAudit = (activity) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedActivity(null);
    }, 300);
  };


  useEffect(() => {
    if (userRole === "Gerente") {
      const userComps = user?.competences || [];
      setCompetencias(userComps);

      if (userComps.length === 1) {
        setFilters(prev => ({ ...prev, competenciaId: userComps[0].id }));
      }
    } else if (userRole === "Administrador" || userRole === "Monitoreo") {
      const loadAllCompetences = async () => {
        const res = await apiFetch("/competences");
        if (res.ok) setCompetencias(await res.json());
      };
      loadAllCompetences();
    }
  }, [user, userRole]);


  useEffect(() => {
    const loadProjects = async () => {
      let url = "/manager/projects";
      if (filters.competenciaId) {
        url += `?competence_id=${filters.competenciaId}`;
      }

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setProyectos(data.items || data);
      }
    };
    loadProjects();
  }, [filters.competenciaId]);



  const fetchAuditData = useCallback(async () => {
    if (currentTab === "Aprobada" && !filters.proyectoId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: currentTab,
        page: page,
        per_page: 10,
      });

      if (filters.search_code) {
        params.append("search_code", filters.search_code);
      }

      if (currentTab === "Aprobada") {
        if (filters.proyectoId) params.append("project_id", filters.proyectoId);
        if (filters.competenciaId) params.append("competence_id", filters.competenciaId);
      }
      const res = await apiFetch(`/audit/inbox?${params.toString()}`);

      if (res.ok) {
        const result = await res.json();
        setActivities(result.data || []);
        setTotalPages(result.total_pages || 1);
      } else {
        toast.error("Error en la respuesta del servidor");
      }
    } catch (error) {
      console.error("Error en fetchAuditData:", error);
      toast.error("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, [currentTab, page, filters, apiFetch]);


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


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get('tab');

    if (tabFromUrl && tabFromUrl !== currentTab) {
      setCurrentTab(tabFromUrl);
      setPage(1);
      setFilters({ competenciaId: '', proyectoId: '', search_code: "" });
    }
  }, [location.search]);


  return (
    <div className="management-page-container">
      <Toaster richColors position="top-right" />
      <div className="container mt-4">

        {/* NAVEGACIÓN POR TABS */}
        <div className="audit-tabs-container">
          {[
            { id: "En Revisión", label: "En Revisión", class: "tab-revision" },
            { id: "Aprobada", label: "Aprobadas", class: "tab-aprobada" },
            { id: "Rechazada", label: "Rechazadas", class: "tab-rechazada" }
          ].map(tab => (
            <button
              key={tab.id}
              className={`audit-tab-btn ${currentTab === tab.id ? `active ${tab.class}` : ""}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <i className={`fas ${tab.id === 'En Revisión' ? 'fa-clock' :
                tab.id === 'Aprobada' ? 'fa-check-circle' : 'fa-times-circle'
                } me-2`}></i>
              {tab.label}
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
                    <th>Competencia</th>
                    <th>Provincia</th>
                    <th>Fecha</th>
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
                        <td className="ps-4">
                          <span className="badge bg-success">
                            {act.indicator_code || act.indicator?.code}
                          </span>
                        </td>
                        <td className="fw-medium text-dark">{act.responsible}</td>
                        <td className="small text-muted" style={{ maxWidth: '200px' }}>
                          {act.project_name}
                        </td>
                        <td className="small">{act.competence_name}</td>
                        <td className="small">
                          <i className="fas fa-map-marker-alt text-danger me-1"></i>
                          {act.province_name || "No definida"}
                        </td>
                        <td className="small">
                          {act.audit?.created_at ? act.audit.created_at.split(' ')[0] : 'N/A'}
                        </td>
                        <td className="text-center">
                          <button
                            className={`btn-action ${currentTab === 'En Revisión' ? 'btn-activate' : 'btn-view'}`}
                            onClick={() => handleOpenAudit(act)}
                            style={currentTab !== 'En Revisión' ? { backgroundColor: '#10b981', color: 'white' } : {}}
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
      {selectedActivity && (
        <ReviewModal
          show={showModal}
          onHide={handleCloseModal}
          activity={selectedActivity}
          onReviewSuccess={fetchAuditData}
          currentTab={currentTab}
        />
      )}
    </div>
  );
};

export default AuditInbox;