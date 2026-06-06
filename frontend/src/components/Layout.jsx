import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api/client';
import './Layout.css';

export default function Layout() {
  const [waState, setWaState] = useState('init');

  useEffect(() => {
    let iv;
    const poll = async () => {
      try { const s = await api.waStatus(); setWaState(s.state); }
      catch(e) { setWaState('offline'); }
    };
    poll();
    iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar waState={waState} />
      <main className="app-main">
        <div className="page-content">
          <Outlet context={{ waState }} />
        </div>
      </main>
    </div>
  );
}
