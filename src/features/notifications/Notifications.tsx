import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { useApp } from '../../app/context';
import { service } from '../../services/preview';
import { Button, EmptyState, PageHeader } from '../../components/ui';
import { dateLabel, timeLabel, zoneLabel } from '../../lib/format';
export function Notifications() {
  const { state, user, notify } = useApp();
  const [tab, setTab] = useState('All');
  const navigate = useNavigate();
  const all = state.notifications
    .filter((n) => n.userId === user.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const unread = all.filter((n) => !n.read).length;
  const items = all.filter((n) => tab === 'All' || !n.read);
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about your requests, meetings and shared notes."
        actions={
          <Button
            variant="secondary"
            disabled={!unread}
            onClick={() => {
              service.markAllRead(user.id);
              notify('All notifications marked as read');
            }}
          >
            <CheckCheck size={16} />
            Mark all as read
          </Button>
        }
      />
      <div className="tabs" role="tablist" aria-label="Notification filter">
        {['All', 'Unread'].map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            className={`tab ${tab === t ? 'active' : ''}`}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'Unread' ? ` · ${unread}` : ''}
          </button>
        ))}
      </div>
      {items.length ? (
        <div className="panel">
          {items.map((n) => {
            const booking = state.bookings[n.bookingId];
            return (
              <div className={`notification-row ${!n.read ? 'unread' : ''}`} key={n.id}>
                <span className="notification-icon">
                  <Bell size={18} />
                </span>
                <div className="notification-copy">
                  <h3>{n.title}</h3>
                  <p>
                    {booking
                      ? `${dateLabel(booking.start, user.timeZone)} · ${timeLabel(booking.start, user.timeZone)} · ${booking.meetingType}`
                      : dateLabel(n.createdAt, user.timeZone)}
                  </p>
                </div>
                {!n.read && <span className="notification-unread-dot" aria-label="Unread" />}
                <Button
                  variant="ghost"
                  onClick={() => {
                    service.readNotification(n.id);
                    navigate(`/meetings/${n.bookingId}${n.target === 'notes' ? '?tab=notes' : ''}`);
                  }}
                >
                  View <ArrowRight size={15} />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="You’re all caught up"
          description="Updates will appear here when your meetings or requests change."
        />
      )}
      <p className="muted small" style={{ marginTop: 23 }}>
        All meeting times are shown in {zoneLabel(user.timeZone)}.
      </p>
    </>
  );
}
