'use client';

interface DateCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function DateCalendar({ selectedDate, onSelectDate }: DateCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  function prevMonth() {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    onSelectDate(d);
  }

  function nextMonth() {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    onSelectDate(d);
  }

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '280px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            background: 'var(--navy3)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '4px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ‹
        </button>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '18px',
            fontWeight: 700,
          }}
        >
          {monthLabel}
        </div>
        <button
          onClick={nextMonth}
          style={{
            background: 'var(--navy3)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '4px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ›
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '4px',
        }}
      >
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontSize: '10px',
              color: 'var(--muted)',
              fontWeight: 600,
              padding: '4px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} />;
          }
          const cellDate = new Date(year, month, day);
          const isSelected = isSameDay(cellDate, selectedDate);
          const isToday = isSameDay(cellDate, today);

          return (
            <button
              key={day}
              onClick={() => onSelectDate(cellDate)}
              style={{
                aspectRatio: '1',
                border: isToday ? '1px solid var(--accent2)' : '1px solid transparent',
                borderRadius: '6px',
                background: isSelected ? 'var(--accent2)' : 'var(--navy3)',
                color: isSelected ? '#000' : isToday ? 'var(--accent2)' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isSelected || isToday ? 700 : 400,
                fontFamily: "'Barlow', sans-serif",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onSelectDate(new Date())}
        style={{
          width: '100%',
          marginTop: '12px',
          padding: '8px',
          background: 'var(--accent)',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          fontWeight: 600,
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: "'Barlow', sans-serif",
        }}
      >
        Jump to Today
      </button>
    </div>
  );
}
