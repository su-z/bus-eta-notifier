import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { invoke } from '@tauri-apps/api/core';
import { setInterval, clearInterval } from 'worker-timers';

interface MonitoredStopProps {
  id: string;
  stop: string;
  route: string;
  notificationTime: number;
  enable: boolean;
  onRemove: (id: string) => void;
  onSelect: () => void;
  notifyUser: (props: {route: string, stop: string, time: number}) => void;
}

const MonitoredStop = ({
  id,
  stop,
  route,
  notificationTime,
  enable,
  onRemove,
  onSelect,
  notifyUser
}: MonitoredStopProps) => {
  const [isEnabled, setIsEnabled] = useState(enable);
  console.log("rerendering", id, enable, isEnabled);

  const handleBusArrival = () => {
    console.log(`Bus arrived at stop ${stop}, route ${route}`);
    setIsEnabled(false);
  };

  const [eta, setEta] = useState<number | null>(null);  // Changed from array to single value
  const prevEtaRef = useRef<number | null>(null);  // Reference to track previous ETA

  // Keep ref updated
  useEffect(() => {
    prevEtaRef.current = eta;
  }, [eta]);

  const enabledRef = useRef(isEnabled);

  // Keep ref updated
  useEffect(() => {
    enabledRef.current = isEnabled;
  }, [isEnabled]);

  useEffect(() => {
    const fetchETA = async () => {
      try {
        console.log('Fetching ETA for stop:', stop, 'route:', route);
        const newEta: number = await invoke("fetch_eta", { stop, route });  // Now returns a single number
        const oldEta = prevEtaRef.current;

        if (enabledRef.current && oldEta !== null && newEta > oldEta) {
          setIsEnabled(false);
        }

        if (enabledRef.current && oldEta !== null && newEta < oldEta && newEta < notificationTime) {
          console.log('Notification Posted.')
          notifyUser({route, stop, time: newEta});
          toast.info(`Bus ${route} at stop ${stop} arriving in ${newEta} minute${newEta !== 1 ? 's' : ''}!`);
        }
        setEta(newEta);
      } catch (error) {
        console.error('Error fetching ETA:', error);
        if (enabledRef.current) {
          console.log('Error Notification sent');
          
          // Include the error message from the backend in the toast notification
          const errorMessage = error instanceof Error ? error.message : String(error);
          toast.error(`Failed to fetch ETA for stop ${stop}, route ${route}: ${errorMessage}`);
          
          if (eta !== null) {
            notifyUser({route, stop, time: -1});
          }
        }
      }
    };

    fetchETA();
    const interval = setInterval(fetchETA, 20000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop, route, notificationTime, notifyUser]);


  return (
    <div className="monitored-item" onClick={onSelect}>
      <div className="info">
        <h3>Stop: {stop}</h3>
        <p>Route: {route}</p>
        <p>Notify before: {notificationTime} minutes</p>
        <div className="etas">
          {eta !== null ? (
            <span className="eta-tag">
              {eta === 0 ? 'DUE' : `${eta} min`}
            </span>
          ) : (
            <span className="loading">Loading ETA...</span>
          )}
        </div>
      </div>
      <div className="actions">
        {!isEnabled && <button
          className={`toggle-btn ${isEnabled ? 'enabled' : 'disabled'}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsEnabled(!isEnabled);
          }}
        >
          {isEnabled ? 'Disable' : 'Enable'}
        </button>}
        {isEnabled && (
          <button
            className="arrival-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleBusArrival();
            }}
          >
            Disable
          </button>
        )}
        <button
          className="remove-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
        >
          ×
        </button>
        
      </div>

      <style jsx>{`
        .monitored-item {
          background: white;
          padding: 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .monitored-item:hover {
          background: #f8fafc;
        }

        .info h3 {
          margin: 0 0 0.5rem;
          color: #2d3748;
        }

        .info p {
          margin: 0 0 0.5rem;
          color: #718096;
        }

        .actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .toggle-btn {
          background: #4299e1;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle-btn.disabled {
          background: #e2e8f0;
          color: #718096;
        }

        .toggle-btn:hover {
          background: #3182ce;
        }

        .remove-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #718096;
          cursor: pointer;
          padding: 0.5rem;
          line-height: 1;
        }

        .remove-btn:hover {
          color: #e53e3e;
        }

        .arrival-btn {
          background: #48bb78;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .arrival-btn:hover {
          background: #38a169;
        }
      `}</style>
    </div>
  );
};

export default MonitoredStop;
