import React, { useState, useEffect } from 'react';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-brand-600 font-medium tracking-widest uppercase text-sm mb-2">Current Time</h2>
      <div className="text-6xl md:text-8xl font-bold tracking-tighter text-slate-900 tabular-nums">
        {time.toLocaleTimeString([], { hour12: false })}
      </div>
      <div className="text-slate-500 mt-2 text-lg">
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  );
};