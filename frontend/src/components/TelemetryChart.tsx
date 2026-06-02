"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const mockData = [
  { time: '00:00', requests: 120, latency: 145 },
  { time: '02:00', requests: 150, latency: 130 },
  { time: '04:00', requests: 90, latency: 155 },
  { time: '06:00', requests: 110, latency: 140 },
  { time: '08:00', requests: 280, latency: 160 },
  { time: '10:00', requests: 450, latency: 172 },
  { time: '12:00', requests: 520, latency: 158 },
  { time: '14:00', requests: 480, latency: 142 },
  { time: '16:00', requests: 590, latency: 148 },
  { time: '18:00', requests: 680, latency: 138 },
  { time: '20:00', requests: 620, latency: 145 },
  { time: '22:00', requests: 410, latency: 150 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-white/10 backdrop-blur-md rounded-lg p-3 text-xs shadow-xl">
        <p className="text-neutral-400 mb-1.5 font-medium">{`Time: ${label}`}</p>
        <div className="space-y-1">
          <p className="text-indigo-400 font-semibold">
            Requests: <span className="text-white">{payload[0].value}</span>
          </p>
          <p className="text-emerald-400 font-semibold">
            Latency: <span className="text-white">{payload[1].value}ms</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function TelemetryChart() {
  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={mockData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="requestsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dx={-5}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            name="Requests"
            type="monotone" 
            dataKey="requests" 
            stroke="#6366f1" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#requestsGrad)" 
          />
          <Area 
            name="Latency"
            type="monotone" 
            dataKey="latency" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#latencyGrad)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
