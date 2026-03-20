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

        const startDate = act.period?.start;
        const rawEndDate = act.period?.end;

        let calendarEndDate = rawEndDate;
        if (rawEndDate) {
            const d = new Date(rawEndDate + "T00:00:00");
            d.setDate(d.getDate() + 1);
            calendarEndDate = d.toISOString().split('T')[0];
        }

        const statusStyle = getStatusData(act.status);

        // Lógica de visualización para el Gerente (con iniciales del responsable)
        const displayTitle = (isManagerView && act.responsible?.initials)
            ? `[${act.responsible.initials}] ${act.description}`
            : act.description;

        return {
            id: act.id,
            title: displayTitle,
            start: startDate,
            end: calendarEndDate,
            backgroundColor: statusStyle.calendarColor || '#1B263B',
            textColor: statusStyle.textColor || '#FFFFFF',
            borderColor: statusStyle.textColor?.startsWith('#') ? `${statusStyle.textColor}40` : 'transparent',
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