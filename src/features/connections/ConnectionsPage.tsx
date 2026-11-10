import { CalendarDays, Video, ExternalLink } from 'lucide-react';
import { useApp } from '../../app/context';
import { Button, PageHeader, Notice } from '../../components/ui';

export function ConnectionsPage() {
  const { explain } = useApp();
  const connections = [
    {
      name: 'Zoom',
      icon: Video,
      description: 'Create a meeting link for each confirmed appointment using your host account.',
      details:
        'This is a frontend preview. No Zoom account will be connected and no authorization request will be sent. In the finished application, you will authorize access to your host account. The backend will securely create a unique Zoom meeting for each confirmed appointment and show its link when ready.',
      className: 'zoom-service',
    },
    {
      name: 'Google Calendar',
      icon: CalendarDays,
      description: 'Check busy times and add confirmed appointments to a calendar you choose.',
      details:
        'This is a frontend preview. No Google account will be connected and your calendars will not be read. In the finished application, you will choose an account, review permissions, and select a calendar. The backend will use busy intervals to help prevent conflicts and add confirmed appointments.',
      className: 'calendar-service',
    },
  ];
  return (
    <>
      <PageHeader
        title="Connected services"
        description="Manage the tools used for meetings and availability."
      />
      <div className="connections-grid">
        {connections.map(({ name, icon: Icon, description, details, className }) => (
          <section className="panel connection-card" key={name}>
            <div className="row-between">
              <span className={`service-icon ${className}`}>
                <Icon size={27} />
              </span>
              <span className="connection-status">Not connected</span>
            </div>
            <h2>{name}</h2>
            <p className="muted">{description}</p>
            <Button variant="secondary" onClick={() => explain(`Connect ${name}`, details)}>
              Connect {name}
              <ExternalLink size={16} />
            </Button>
          </section>
        ))}
      </div>
      <div className="connection-explanation">
        <Notice>
          <strong>UI preview</strong>
          <br />
          These controls demonstrate the connection flow. No accounts are connected yet.
        </Notice>
      </div>
    </>
  );
}
