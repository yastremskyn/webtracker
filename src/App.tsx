/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { Activity, Users, MousePointerClick, Globe, LogOut, LogIn, Code, Sun, Moon, LayoutDashboard, BarChart2, ChevronDown, Map as MapIcon } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';

// Using an older version of world-atlas (Natural Earth) where Crimea is correctly shown as Ukraine
const geoUrl = "https://unpkg.com/world-atlas@1.1.4/world/110m.json";

interface AnalyticsEvent {
  id: string;
  eventType: string;
  path: string;
  url: string;
  userAgent: string;
  sessionId: string;
  timestamp: string;
  lat?: number;
  lng?: number;
  country?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'realtime'>('overview');
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Оновлюємо поточний час кожні 10 секунд для зсуву "вікна" реального часу
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Застосовуємо темну тему до HTML документа
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'events'), orderBy('timestamp', 'desc'));
    const unsubscribeEvents = onSnapshot(q, (snapshot) => {
      const eventsData: AnalyticsEvent[] = [];
      snapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() } as AnalyticsEvent);
      });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      setLoading(false);
    });

    return () => unsubscribeEvents();
  }, [user]);

  // Process data for charts
  const processChartData = () => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), i);
      return format(d, 'MMM dd');
    }).reverse();

    const dataMap = last7Days.reduce((acc, date) => {
      acc[date] = { date, pageViews: 0, clicks: 0 };
      return acc;
    }, {} as Record<string, any>);

    events.forEach(event => {
      if (!event.timestamp) return;
      try {
        const dateStr = format(parseISO(event.timestamp), 'MMM dd');
        if (dataMap[dateStr]) {
          if (event.eventType === 'page_view') dataMap[dateStr].pageViews += 1;
          if (event.eventType === 'click') dataMap[dateStr].clicks += 1;
        }
      } catch (e) {
        // Handle invalid dates gracefully
      }
    });

    return Object.values(dataMap);
  };

  const chartData = processChartData();

  // Process data for real-time chart (last 2 minutes, 10-second buckets)
  const processRealTimeData = () => {
    const buckets = [];
    const bucketCount = 12; // 12 intervals of 10 seconds = 120 seconds (2 minutes)
    const bucketSize = 10000; // 10 seconds in milliseconds
    const currentTimestamp = now.getTime();

    for (let i = bucketCount - 1; i >= 0; i--) {
      const bucketEnd = currentTimestamp - (i * bucketSize);
      const bucketStart = bucketEnd - bucketSize;
      buckets.push({
        timeLabel: format(new Date(bucketEnd), 'HH:mm:ss'),
        start: bucketStart,
        end: bucketEnd,
        events: 0
      });
    }

    events.forEach(event => {
      if (!event.timestamp) return;
      const eventTime = parseISO(event.timestamp).getTime();
      const bucket = buckets.find(b => eventTime > b.start && eventTime <= b.end);
      if (bucket) {
        bucket.events += 1;
      }
    });

    return buckets;
  };

  const realTimeData = processRealTimeData();

  // Calculate top pages
  const topPages = Object.entries(
    events.filter(e => e.eventType === 'page_view').reduce((acc, e) => {
      acc[e.path] = (acc[e.path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const uniqueUsers = new Set(events.map(e => e.sessionId)).size;
  const totalPageViews = events.filter(e => e.eventType === 'page_view').length;
  const totalClicks = events.filter(e => e.eventType === 'click').length;

  // Data for Reports Tab
  const activeUsers30Mins = new Set(
    events
      .filter(e => e.timestamp && (now.getTime() - parseISO(e.timestamp).getTime() <= 30 * 60 * 1000))
      .map(e => e.sessionId)
  ).size;

  const activeUsers5Mins = new Set(
    events
      .filter(e => e.timestamp && (now.getTime() - parseISO(e.timestamp).getTime() <= 5 * 60 * 1000))
      .map(e => e.sessionId)
  ).size;

  const eventsBreakdown = Object.entries(
    events.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const platformData = Object.entries(
    events.reduce((acc, e) => {
      let platform = 'Other';
      const ua = e.userAgent.toLowerCase();
      if (ua.includes('windows')) platform = 'Windows';
      else if (ua.includes('mac')) platform = 'macOS';
      else if (ua.includes('linux')) platform = 'Linux';
      else if (ua.includes('android')) platform = 'Android';
      else if (ua.includes('iphone') || ua.includes('ipad')) platform = 'iOS';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 transition-colors duration-200">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center space-y-6 border border-transparent dark:border-gray-700">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
            <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Система веб-аналітики</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Увійдіть, щоб переглянути статистику та аналітичні звіти вашого веб-сервісу.
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            <LogIn size={20} />
            Увійти через Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Activity size={24} />
              <span className="font-bold text-xl hidden sm:block text-gray-900 dark:text-white">WebAnalytics Pro</span>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
              >
                <LayoutDashboard size={16} />
                Огляд
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${(activeTab === 'reports' || activeTab === 'realtime') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                >
                  <BarChart2 size={16} />
                  Звіти
                  <ChevronDown size={14} className={`transition-transform ${isReportsMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isReportsMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button
                      onClick={() => { setActiveTab('reports'); setIsReportsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${activeTab === 'reports' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      Короткий огляд звітів
                    </button>
                    <button
                      onClick={() => { setActiveTab('realtime'); setIsReportsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${activeTab === 'realtime' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      У реальному часі
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none"
              title={isDarkMode ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
            >
              <span className="sr-only">Toggle dark mode</span>
              <span
                className={`${
                  isDarkMode ? 'translate-x-7 bg-gray-800' : 'translate-x-1 bg-white'
                } flex h-6 w-6 transform items-center justify-center rounded-full transition-transform shadow-sm`}
              >
                {isDarkMode ? <Moon size={14} className="text-blue-400" /> : <Sun size={14} className="text-yellow-500" />}
              </span>
            </button>
            
            <div className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block border-l border-gray-200 dark:border-gray-700 pl-4">
              {user.email}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Вийти"
            >
              <LogOut size={20} />
              <span className="hidden sm:block">Вийти</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'overview' && (
          <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Унікальні сесії</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : uniqueUsers}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <Globe size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Перегляди сторінок</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : totalPageViews}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <MousePointerClick size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Кліки (Взаємодії)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : totalClicks}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Charts Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* 7 Days Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">Активність за останні 7 днів</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f0f0f0'} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#f3f4f6' : '#111827' }}
                    />
                    <Line type="monotone" name="Перегляди" dataKey="pageViews" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name="Кліки" dataKey="clicks" stroke="#9333ea" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Real-time Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-colors duration-200">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse"></div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  У реальному часі (останні 2 хв)
                </h2>
                <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                  Оновлення кожні 10с
                </span>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realTimeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f0f0f0'} />
                    <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 10 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#f3f4f6' : '#111827' }}
                      cursor={{ fill: isDarkMode ? '#374151' : '#f8fafc' }}
                    />
                    <Bar name="Події" dataKey="events" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">Популярні сторінки</h2>
            <div className="space-y-4">
              {topPages.length > 0 ? topPages.map(([path, views], index) => (
                <div key={path} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-400 w-4">{index + 1}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={path}>{path || '/'}</span>
                  </div>
                  <span className="text-sm font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">{views}</span>
                </div>
              )) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Немає даних</p>
              )}
            </div>
          </div>
        </div>

        {/* Integration Guide */}
        <div className="bg-gray-900 dark:bg-gray-950 text-white p-6 rounded-xl shadow-sm transition-colors duration-200 border border-transparent dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <Code className="text-blue-400" />
            <h2 className="text-lg font-bold">Як підключити до вашого сайту</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Додайте цей скрипт перед закриваючим тегом <code className="text-gray-300 bg-gray-800 px-1 rounded">&lt;/body&gt;</code> на вашому сайті, щоб почати збір даних.
          </p>
          <div className="bg-black p-4 rounded-lg overflow-x-auto border border-gray-800">
            <pre className="text-sm text-green-400">
              <code>{`<script src="${window.location.origin}/tracker.js"></script>`}</code>
            </pre>
          </div>
          <div className="mt-4 flex gap-4">
            <button 
              onClick={() => {
                // Simulate a page view for testing
                fetch('/api/track', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    eventType: 'page_view',
                    path: '/test-page',
                    url: window.location.origin + '/test-page',
                    userAgent: navigator.userAgent,
                    sessionId: 'test-session-123',
                    lat: 50.4501, // Kyiv latitude
                    lng: 30.5234  // Kyiv longitude
                  })
                }).then(() => alert('Тестову подію відправлено!'));
              }}
              className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
            >
              Відправити тестову подію
            </button>
          </div>
        </div>
          </>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Короткий огляд звітів</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Users over time */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Активні користувачі</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f0f0f0'} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#f3f4f6' : '#111827' }} />
                      <Line type="monotone" dataKey="pageViews" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 2: Realtime 30 mins */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col transition-colors duration-200">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Активні користувачі за останні 30 хвилин</h3>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-6">{activeUsers30Mins}</p>
                <div className="mt-auto">
                  <p className="text-xs text-gray-400 uppercase mb-3 font-semibold">Найактивніші сторінки</p>
                  <div className="space-y-3">
                    {topPages.slice(0, 4).map(([path, views]) => (
                      <div key={path} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300 truncate pr-4">{path || '/'}</span>
                        <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{views}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: Views by Page */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Перегляди за Назва сторінки</h3>
                <div className="space-y-4">
                  {topPages.map(([path, views]) => (
                    <div key={path} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate pr-2">{path || '/'}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{views}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Events */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Кількість подій за Назва події</h3>
                <div className="space-y-4">
                  {eventsBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5: Platform Pie Chart */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Основні події за Платформа</h3>
                <div className="h-[200px] w-full flex items-center justify-center relative">
                  {platformData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={platformData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#f3f4f6' : '#111827' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                     <p className="text-sm text-gray-500">Немає даних</p>
                  )}
                  {platformData.length > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Всього</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{events.length}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'realtime' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Огляд у реальному часі</h1>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>

            <div className="relative bg-[#e5e7eb] dark:bg-[#111827] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden h-[600px]">
              {/* Map */}
              <div className="absolute inset-0">
                <ComposableMap projectionConfig={{ scale: 140 }} width={800} height={400} style={{ width: "100%", height: "100%" }}>
                  <ZoomableGroup center={[0, 20]} zoom={1}>
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={isDarkMode ? "#1f2937" : "#f3f4f6"}
                            stroke={isDarkMode ? "#374151" : "#d1d5db"}
                            strokeWidth={0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { fill: isDarkMode ? "#374151" : "#e5e7eb", outline: "none" },
                              pressed: { outline: "none" },
                            }}
                          />
                        ))
                      }
                    </Geographies>
                    {events
                      .filter(e => e.lat && e.lng && e.timestamp && (now.getTime() - parseISO(e.timestamp).getTime() <= 30 * 60 * 1000))
                      .map((e) => (
                        <Marker key={e.id} coordinates={[e.lng!, e.lat!]}>
                          <circle r={4} fill="#3b82f6" className="animate-pulse" />
                          <circle r={12} fill="#3b82f6" opacity={0.3} className="animate-ping" />
                        </Marker>
                      ))}
                  </ZoomableGroup>
                </ComposableMap>
              </div>

              {/* Overlay Card */}
              <div className="absolute bottom-6 left-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-80">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Активні користувачі за останні 30 хвилин</p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">{activeUsers30Mins}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Активні користувачі за останні 5 хвилин</p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">{activeUsers5Mins}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">Активні користувачі за хвилину</p>
                  <div className="h-24 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={realTimeData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Bar dataKey="events" fill="#e5e7eb" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span>-2 хв</span>
                    <span>Зараз</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}