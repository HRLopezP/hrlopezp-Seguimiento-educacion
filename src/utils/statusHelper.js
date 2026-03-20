// src/utils/statusHelper.js

export const STATUS_CONFIG = {
    'Planificada': {
        label: 'Planificada',
        badgeClass: 'bg-warning text-dark',
        calendarColor: '#FEF3C7', // Amarillo pastel (Alerta suave)
        textColor: '#92400E'
    },
    'En Progreso': {
        label: 'En Progreso',
        badgeClass: 'bg-info text-white',
        calendarColor: '#E0F2FE', // Azul claro (Activo)
        textColor: '#075985'
    },
    'En Revisión': {
        label: 'En Revisión',
        badgeClass: 'text-white', // Usaremos estilo personalizado para Oxford Grey
        style: { backgroundColor: '#334155' }, 
        calendarColor: '#CBD5E1', // Gris Oxford suave (En espera)
        textColor: '#1E293B'
    },
    'Aprobada': {
        label: 'Aprobada',
        badgeClass: 'bg-success text-white', // Emerald Green
        calendarColor: '#D1FAE5', // Verde Esmeralda pastel (¡Logrado!)
        textColor: '#065F46'
    },
    'Rechazada': {
        label: 'Rechazada',
        badgeClass: 'bg-danger text-white',
        calendarColor: '#FEE2E2', // Rojo pastel (¡Corregir!)
        textColor: '#991B1B'
    },
    'Vencida': {
        label: 'Vencida',
        style: { backgroundColor: '#F97316', color: 'white' }, // Naranja (Se pasó el tiempo)
        calendarColor: '#FFEDD5', 
        textColor: '#9A3412'
    },
    'Cancelada': {
        label: 'Cancelada',
        badgeClass: 'bg-secondary text-white',
        calendarColor: '#F3F4F6', // Gris neutro
        textColor: '#374151'
    }
};

export const getStatusData = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG['Planificada'];
};