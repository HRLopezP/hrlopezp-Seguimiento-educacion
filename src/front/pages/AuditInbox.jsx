import React, { useState, useEffect } from 'react';
import { Accordion, Badge, Spinner, Pagination } from 'react-bootstrap';
import { toast } from 'sonner';
import ReviewModal from '../components/ReviewModal';
import { apiFetch } from "../../utils/api";

const AuditInbox = () => {
  const [inboxData, setInboxData] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- ESTADOS PARA EL MODAL ---
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const fetchInbox = async (page = 1) => {
    setLoading(true);
    try {
      // ✅ SIMPLIFICADO: apiFetch ya pone el token por ti
      const response = await apiFetch(`/audit/inbox?page=${page}`);

      if (response && response.ok) {
        const result = await response.json();
        setInboxData(result.data || {}); // Aseguramos que siempre sea un objeto
        setTotalPages(result.total_pages || 1);
      } else {
        toast.error("No se pudo obtener la información del servidor");
      }
    } catch (error) {
      console.error("Error cargando inbox:", error);
      toast.error("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInbox(currentPage); }, [currentPage]);

  // Función para abrir el modal con la actividad correcta
  const handleOpenReview = (activity) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  if (loading) return <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>;

  return (
    <div className="container mt-4">
      <h2 className="mb-4" style={{ color: '#34495E' }}>📥 Inbox de Auditoría</h2>

      {Object.keys(inboxData).length === 0 ? (
        <div className="alert alert-info border-0 shadow-sm">
          No hay actividades pendientes de revisión en este momento.
        </div>
      ) : (
        <Accordion defaultActiveKey="0">
          {Object.entries(inboxData).map(([projectId, project], pIdx) => (
            <Accordion.Item eventKey={String(pIdx)} key={projectId} className="mb-3 border-0 shadow-sm">
              <Accordion.Header>
                <strong style={{ color: '#2C3E50' }}>📁 Proyecto: {project.project_name}</strong>
              </Accordion.Header>
              <Accordion.Body style={{ backgroundColor: '#f8f9fa' }}>

                <Accordion>
                  {Object.entries(project.competencies).map(([compId, comp], cIdx) => (
                    <Accordion.Item eventKey={String(cIdx)} key={compId} className="border-0 mb-2 shadow-sm">
                      <Accordion.Header>
                        <span className="text-muted small">Comp:</span>&nbsp;
                        <span className="fw-bold" style={{ color: '#184d47' }}>{comp.competence_name}</span>
                        <Badge bg="warning" text="dark" className="ms-auto me-3 rounded-pill">
                          {comp.activities.length} por revisar
                        </Badge>
                      </Accordion.Header>
                      <Accordion.Body className="bg-white">
                        <div className="list-group list-group-flush">
                          {comp.activities.map((act) => (
                            <div key={act.id} className="list-group-item d-flex justify-content-between align-items-center py-3">
                              <div className="me-3">
                                <Badge bg="secondary" className="mb-1">{act.indicator.code}</Badge>
                                <p className="mb-0 fw-semibold text-dark">{act.description}</p>
                                <small className="text-muted">
                                  Registrado por: <span className="text-dark">{act.audit.created_by_name}</span>
                                </small>
                              </div>
                              <button
                                className="btn btn-sm btn-dark px-3 shadow-sm"
                                onClick={() => handleOpenReview(act)} // Conectamos el clic
                                style={{ backgroundColor: '#374151' }} // Oxford Grey
                              >
                                Revisar Logro
                              </button>
                            </div>
                          ))}
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>

              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      {/* Componente del Modal de Revisión */}
      <ReviewModal
        show={showModal}
        onHide={() => setShowModal(false)}
        activity={selectedActivity}
        onReviewSuccess={() => fetchInbox(currentPage)} // Recarga los datos al terminar
      />

      {/* Paginación */}
      <div className="d-flex justify-content-center mt-4">
        <Pagination size="sm">
          {[...Array(totalPages).keys()].map(n => (
            <Pagination.Item
              key={n + 1}
              active={n + 1 === currentPage}
              onClick={() => setCurrentPage(n + 1)}
            >
              {n + 1}
            </Pagination.Item>
          ))}
        </Pagination>
      </div>
    </div>
  );
};

export default AuditInbox;