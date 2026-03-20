import React, { useState, useEffect } from 'react';
import { Accordion, Badge, Spinner, Pagination } from 'react-bootstrap';
import { toast } from 'sonner';

const AuditInbox = () => {
    const [inboxData, setInboxData] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchInbox = async (page = 1) => {
        setLoading(true);
        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/audit/inbox?page=${page}`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            const result = await response.json();
            if (response.ok) {
                setInboxData(result.data);
                setTotalPages(result.total_pages);
            }
        } catch (error) {
            toast.error("Error al cargar el Inbox");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInbox(currentPage); }, [currentPage]);

    if (loading) return <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>;

    return (
        <div className="container mt-4">
            <h2 className="mb-4" style={{ color: '#34495E' }}>📥 Inbox de Auditoría</h2>
            
            {Object.keys(inboxData).length === 0 ? (
                <div className="alert alert-info">No hay actividades pendientes de revisión.</div>
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
                                        <Accordion.Item eventKey={String(cIdx)} key={compId}>
                                            <Accordion.Header>
                                                <span className="text-muted">Competencia:</span>&nbsp;
                                                <span className="fw-bold" style={{ color: '#184d47' }}>{comp.competence_name}</span>
                                                <Badge bg="warning" text="dark" className="ms-auto me-3">
                                                    {comp.activities.length} Pendientes
                                                </Badge>
                                            </Accordion.Header>
                                            <Accordion.Body>
                                                <div className="list-group list-group-flush">
                                                    {comp.activities.map((act) => (
                                                        <div key={act.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <small className="text-primary fw-bold">{act.indicator.code}</small>
                                                                <p className="mb-0">{act.description}</p>
                                                                <small className="text-muted">Por: {act.audit.created_by_name}</small>
                                                            </div>
                                                            <button 
                                                                className="btn btn-sm btn-outline-dark"
                                                                onClick={() => {/* Aquí abriremos el Modal de Revisión */}}
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

            {/* Paginación simple */}
            <div className="d-flex justify-content-center mt-4">
                <Pagination>
                    {[...Array(totalPages).keys()].map(n => (
                        <Pagination.Item 
                            key={n+1} 
                            active={n+1 === currentPage}
                            onClick={() => setCurrentPage(n+1)}
                        >
                            {n+1}
                        </Pagination.Item>
                    ))}
                </Pagination>
            </div>
        </div>
    );
};

export default AuditInbox;