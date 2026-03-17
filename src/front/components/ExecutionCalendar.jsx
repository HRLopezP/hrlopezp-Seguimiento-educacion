import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { getStatusData } from "../../utils/statusHelper";

const ExecutionCalendar = ({ 
    onDateSelect, 
    activities = [], 
    onActivityClick, 
    isManagerView = false 
}) => {

    const events = (activities || []).map(act => {
        // Ajuste de lógica de fechas: 
        // Si no tienes un objeto "period", usamos implementation_date
        const startDate = act.period?.start || act.implementation_date;
        const rawEndDate = act.period?.end || act.implementation_date;
        
        // FullCalendar es exclusivo en la fecha de fin (el día de fin no se marca si no sumas 1)
        const endDate = new Date(rawEndDate);
        endDate.setDate(endDate.getDate() + 1);

        const statusStyle = getStatusData(act.status);

        // Lógica de visualización para el Gerente (con iniciales del responsable)
        const displayTitle = (isManagerView && act.responsible?.initials)
            ? `[${act.responsible.initials}] ${act.description}`
            : act.description;

        return {
            id: act.id,
            title: displayTitle,
            start: startDate,
            end: endDate.toISOString().split('T')[0],
            backgroundColor: statusStyle.calendarColor || '#1B263B', // Azul Marino por defecto
            textColor: statusStyle.textColor || '#FFFFFF',
            borderColor: statusStyle.textColor?.startsWith('#') ? `${statusStyle.textColor}40` : 'transparent',
            // Pasamos todo el objeto para que el modal tenga la info completa
            extendedProps: { ...act }
        };
    });

    return (
        <div className="card shadow-sm border-0 p-3 bg-white rounded-4 execution-calendar-container">
            <style>
                {`
                    .fc-event { border-radius: 6px !important; padding: 2px 4px; font-size: 0.85rem; border: none !important; }
                    .fc-toolbar-title { font-weight: bold; color: #1B263B; text-transform: capitalize; }
                    .fc-button-primary { background-color: #1B263B !important; border-color: #1B263B !important; }
                    .fc-daygrid-day:hover { background-color: #f8f9fa; cursor: pointer; }
                `}
            </style>
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin, bootstrap5Plugin]}
                initialView="dayGridMonth"
                themeSystem="bootstrap5"
                locale="es"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek'
                }}
                events={events}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                height="70vh"
                // Cuando haces clic en un día vacío
                dateClick={(info) => onDateSelect(info.dateStr)}
                // Cuando haces clic en una actividad específica
                eventClick={(info) => {
                    if (onActivityClick) {
                        onActivityClick(info.event.extendedProps);
                    }
                }}
                eventDisplay="block"
                eventMouseEnter={(info) => {
                    info.el.style.filter = "brightness(0.9)";
                    info.el.style.transform = "scale(1.02)";
                    info.el.style.transition = "all 0.2s";
                }}
                eventMouseLeave={(info) => {
                    info.el.style.filter = "brightness(1)";
                    info.el.style.transform = "scale(1)";
                }}
            />
        </div>
    );
};

export default ExecutionCalendar;