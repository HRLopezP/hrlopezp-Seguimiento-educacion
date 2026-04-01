import React from "react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    // No mostrar nada si solo hay una página
    if (totalPages <= 1) return null;

    // Lógica para generar los números de página a mostrar
    const getPageNumbers = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <nav aria-label="Navegación de páginas" className="mt-4">
            <ul className="pagination justify-content-center flex-wrap gap-1">
                {/* Botón Anterior */}
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button
                        className="page-link shadow-sm border-0 rounded-3 px-3"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <i className="fa-solid fa-chevron-left small"></i>
                    </button>
                </li>

                {/* Números de Página */}
                {getPageNumbers().map((page) => (
                    <li key={page} className={`page-item ${currentPage === page ? "active" : ""}`}>
                        <button
                            className={`page-link shadow-sm border-0 rounded-3 px-3 fw-semibold ${currentPage === page ? "bg-emerald text-white" : "bg-card text-primary"
                                }`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    </li>
                ))}

                {/* Botón Siguiente */}
                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                    <button
                        className="page-link shadow-sm border-0 rounded-3 px-3"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <i className="fa-solid fa-chevron-right small"></i>
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Pagination;