// src/utils/statusHelper.js

export const STATUS_CONFIG = {
    'Planificada': {
        label: 'Planificada',
        badgeClass: 'bg-warning text-dark',
        calendarColor: '#FEF3C7', // Amarillo pastel
        textColor: '#92400E'
    },
    'En Progreso': {
        label: 'En Progreso',
        badgeClass: 'bg-info text-dark',
        calendarColor: '#E0F2FE', // Azul pastel
        textColor: '#075985'
    },
    'Completada': {
        label: 'Completada',
        badgeClass: 'bg-emerald text-white',
        calendarColor: '#D1FAE5', // Verde pastel
        textColor: '#065F46'
    },
    'Vencida': {
        label: 'Vencida',
        badgeClass: 'bg-danger text-white',
        calendarColor: '#FEE2E2', // Rojo pastel
        textColor: '#991B1B'
    },
    'Cancelada': {
        label: 'Cancelada',
        badgeClass: 'bg-secondary text-white',
        calendarColor: '#F3F4F6', // Gris pastel
        textColor: '#374151'
    }
};

export const getStatusData = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG['Planificada'];
};