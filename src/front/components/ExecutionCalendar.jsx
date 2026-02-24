import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import 'bootstrap-icons/font/bootstrap-icons.css'; 

const ExecutionCalendar = ({ onDateSelect, activities }) => {
    
    // Mapeamos tus actividades al formato de FullCalendar
    const events = activities.map(act => ({
        id: act.id,
        title: act.description,
        start: act.period.start,
        end: act.period.end,
        backgroundColor: act.status === 'Planificada' ? '#334155' : '#10b981', 
        borderColor: 'transparent',
        extendedProps: { ...act }
    }));

    return (
        <div className="card shadow-sm border-0 p-3 bg-white rounded-4">
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
                // Aquí disparamos el modal que mencionaste
                dateClick={(info) => onDateSelect(info.dateStr)}
                eventClick={(info) => onActivitySelect(info.event.extendedProps)}
            />
        </div>
    );
};

export default ExecutionCalendar;