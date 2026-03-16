import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { getStatusData } from "../../utils/statusHelper";

const ExecutionCalendar = ({ onDateSelect, activities = [], onActivityClick, isManagerView = false }) => {

    const events = (activities || []).map(act => {
        const endDate = new Date(act.period.end);
        endDate.setDate(endDate.getDate() + 1);

        const statusStyle = getStatusData(act.status);

        const displayTitle = (isManagerView && act.responsible?.initials)
            ? `[${act.responsible.initials}] ${act.description}`
            : act.description;

        return {
            id: act.id,
            title: displayTitle,
            start: act.period.start,
            end: endDate.toISOString().split('T')[0],
            backgroundColor: statusStyle.calendarColor,
            textColor: statusStyle.textColor,
            borderColor: statusStyle.textColor.startsWith('#') ? `${statusStyle.textColor}40` : 'transparent',
            extendedProps: { ...act }
        };
    });

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
                // dateClick={(info) => onDateSelect && onDateSelect(info.dateStr)}
                dateClick={(info) => onDateSelect(info.dateStr)}
                eventClick={(info) => {
                    if (onActivityClick) {
                        onActivityClick(info.event.extendedProps);
                    }
                }}
                eventDisplay="block"
                eventMouseEnter={(info) => {
                    info.el.style.filter = "brightness(0.9)";
                    info.el.style.cursor = "pointer";
                }}
                eventMouseLeave={(info) => {
                    info.el.style.filter = "brightness(1)";
                }}
            />
        </div>
    );
};

export default ExecutionCalendar;