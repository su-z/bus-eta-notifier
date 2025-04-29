"use client";

import { useState, useEffect, useRef } from 'react';
import { ToastContainer } from 'react-toastify';
import MonitoredStop from './components/MonitoredStop';
import 'react-toastify/dist/ReactToastify.css';
import {
  Importance,
  isPermissionGranted,
  requestPermission,
  sendNotification,
  Visibility,
} from '@tauri-apps/plugin-notification';
import { createChannel } from '@tauri-apps/plugin-notification';

interface MonitoredStop {
  id: string;
  stop: string;
  route: string;
  notificationTime: number;
}

export default function Home() {
  const [stop, setStop] = useState('');
  const [route, setRoute] = useState('');
  const [notificationTime, setNotificationTime] = useState('5');
  const [monitoredStops, setMonitoredStops] = useState<MonitoredStop[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);

  // Request notification permission on user gesture
  const requestNotificationPermission = async () => {
    let permissionGranted = await isPermissionGranted();

    // If not we need to request it
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
    if (permissionGranted) {
      console.log('Notification permission granted.');
    } else {
      console.warn('Notification permission denied.');
    }
  };

  // Play persistent sound
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const playNotificationSound = () => {
    const context = new AudioContext();
    const osc = context.createOscillator();
    const gainNode = context.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, context.currentTime); // Frequency in Hz
    gainNode.gain.setValueAtTime(1, context.currentTime);

    osc.connect(gainNode);
    gainNode.connect(context.destination);

    osc.start();
    setAudioContext(context);
    setOscillator(osc);
  };

  // Stop the notification sound
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stopNotificationSound = () => {
    if (oscillator && audioContext) {
      oscillator.stop(audioContext.currentTime);
      oscillator.disconnect();
      setOscillator(null);
      setAudioContext(null);
    }
  };

  // Trigger system-wide notification
  const triggerSystemNotification = async (title: string, body: string) => {
    const permissionGranted = await isPermissionGranted();
    if (permissionGranted) {
      sendNotification({ title, body, channelId: 'bus-soon' });
      // const notification = new Notification(title, { body });
      // playNotificationSound(); // Play sound when notification is triggered

      // // Stop sound when notification is dismissed
      // notification.onclose = () => {
      //   console.log('Close notif')
      //   stopNotificationSound();
      // };
    } else {
      console.warn('Notification permission not granted.');
    }
  };

  // Example usage of notification
  const notifyUser = (props: {route: string, stop: string, time: number}) => {
    triggerSystemNotification(`Bus in ${props.time} minutes`, `Route ${props.route}, stop ${props.stop}.`);
  };

  // Load monitored stops from localStorage on component mount
  useEffect(() => {
    const savedStops = localStorage.getItem('monitoredStops');
    if (savedStops) {
      setMonitoredStops(JSON.parse(savedStops));
    }
  }, []);

  useEffect(() => {
    createChannel({
      id: 'bus-soon',
      name: 'Bus Soon',
      description: 'Notifications for new messages',
      importance: Importance.High,
      visibility: Visibility.Private,
      lights: true,
      lightColor: '#ff0000',
      vibration: true,
    })
    .then(()=>{console.log('Channel Ready')})
    .catch(()=>{console.warn('This system does not support strong notifications')});
  })

  // Save monitored stops to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('monitoredStops', JSON.stringify(monitoredStops));
  }, [monitoredStops]);

  const stopJustAdded = useRef<string|undefined>(undefined);

  const addMonitoredStop = () => {
    if (!stop || !route || !notificationTime) {
      return;
    }

    const id = `${Date.now()}-${stop}-${route}`;

    const newStop: MonitoredStop = {
      id,
      stop,
      route,
      notificationTime: Math.max(1, parseInt(notificationTime, 10)),
    };

    stopJustAdded.current = id;

    setMonitoredStops(prev => [...prev, newStop]);
    setStop('');
    setRoute('');
  };

  const removeMonitoredStop = (id: string) => {
    setMonitoredStops(prev => prev.filter(stop => stop.id !== id));
  };

  const handleStopSelect = (selectedStop: MonitoredStop) => {
    setStop(selectedStop.stop);
    setRoute(selectedStop.route);
    setNotificationTime(selectedStop.notificationTime.toString());
  };

  return (
    <div className="container">
      <h1>Bus Arrival Notifier</h1>
      
      <button onClick={requestNotificationPermission} className="permission-btn">
        Enable Notifications
      </button>

      <div className="input-group">
        <input
          type="number"
          placeholder="Stop Number"
          value={stop}
          onChange={(e) => setStop(e.target.value)}
          min="1"
        />
        <input
          type="number"
          placeholder="Route Number"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          min="1"
        />
        <div className="notification-input">
          <input
            type="number"
            placeholder="Notify before (minutes)"
            value={notificationTime}
            onChange={(e) => setNotificationTime(e.target.value)}
            min="1"
          />
          <button onClick={addMonitoredStop} className="add-btn">
            Add Stop
          </button>
        </div>
      </div>

      <div className="monitored-stops">
        <h3>Saved Stops (Tap to Reuse)</h3>
        {monitoredStops.map(stop => (
          <MonitoredStop
            key={stop.id}
            {...stop}
            onRemove={removeMonitoredStop}
            onSelect={() => handleStopSelect(stop)}
            notifyUser={notifyUser}
            enable={
              (()=>{
                if (stopJustAdded.current && stopJustAdded.current === stop.id) {
                  console.log("added-activated", stopJustAdded.current);
                  return true;
                }
                else {
                  return false;
                }
              })()
            }
          />
        ))}
      </div>

      <button onClick={() => notifyUser({route: '1', stop: '1', time: 1})} className="test-notification-btn">
        Test Notification
      </button>

      {/* <button onClick={stopNotificationSound} className="test-notification-btn">
        Stop Sound
      </button> */}

      <ToastContainer position="bottom-right" autoClose={5000} />

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }

        h1 {
          text-align: center;
          color: #2d3748;
          margin-bottom: 1.5rem;
        }

        .permission-btn {
          display: block;
          margin: 1.5rem auto;
          background: #4299e1;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
          max-width: 300px;
        }

        .permission-btn:hover {
          background: #3182ce;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        input {
          padding: 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 0.375rem;
          font-size: 1rem;
          width: 100%;
        }

        .notification-input {
          display: flex;
          gap: 1rem;
          flex-direction: column;
        }

        .add-btn {
          background: #4299e1;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
        }

        .add-btn:hover {
          background: #3182ce;
        }

        .monitored-stops {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        h3 {
          color: #4a5568;
          margin-bottom: 1rem;
        }

        .test-notification-btn {
          display: block;
          margin: 1.5rem auto;
          background: #48bb78;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
          max-width: 300px;
        }

        .test-notification-btn:hover {
          background: #38a169;
        }

        @media (min-width: 640px) {
          .input-group {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .notification-input {
            flex-direction: row;
          }

          input {
            width: auto;
            flex: 1;
          }

          .add-btn {
            width: auto;
          }
        }
      `}</style>

      <style jsx global>{`
        body {
          background: #f7fafc;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
            Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }

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

        .etas {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .eta-tag {
          background: #e2e8f0;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.875rem;
        }

        .loading {
          color: #a0aec0;
          font-style: italic;
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
      `}</style>
    </div>
  );
}
