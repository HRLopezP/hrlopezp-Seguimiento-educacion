const handleDeleteProject = async (projectId, projectName) => {
        const result = await Swal.fire({
            title: '¿Confirmar eliminación?',
            html: `Estás a punto de borrar permanentemente el proyecto:<br><strong>${projectName}</strong>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            // Colores de tu marca
            confirmButtonColor: '#ae2012', // El rojo profundo que definimos
            cancelButtonColor: '#1b263b',  // Tu Azul Oxford (Seriedad)
            background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1b263b' : '#ffffff',
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1b263b',
            customClass: {
                popup: 'shadow-lg border-0 rounded-4',
                title: 'fw-bold'
            }
        });
        // ... resto del código fetch
    };