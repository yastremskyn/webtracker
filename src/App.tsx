/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { Activity, Users, MousePointerClick, Globe, LogOut, LogIn, Code, Sun, Moon, LayoutDashboard, BarChart2, ChevronDown, Map as MapIcon, GripHorizontal, X, Plus, Edit2, Check } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Using an older version of world-atlas (Natural Earth) where Crimea is correctly shown as Ukraine
const geoUrl = "https://unpkg.com/world-atlas@1.1.4/world/110m.json";

function SortableWidget({ id, children, isEditMode, onRemove, colSpan }: { id: string, children: React.ReactNode, isEditMode: boolean, onRemove: (id: string) => void, colSpan: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${colSpan} / span ${colSpan}`,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border ${isEditMode ? 'border-blue-400 dark:border-blue-500 border-dashed' : 'border-gray-100 dark:border-gray-700'} h-full flex flex-col transition-colors duration-200`}>
      {isEditMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10 bg-white dark:bg-gray-800 p-1 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
          <button {...attributes} {...listeners} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-grab active:cursor-grabbing">
            <GripHorizontal size={16} />
          </button>
          <button onClick={() => onRemove(id)} className="p-1.5 text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}
      <div className={`flex-grow ${isEditMode ? 'opacity-50 pointer-events-none' : ''}`}>
        {children}
      </div>
    </div>
  );
}

const getInitialBehaviorWidgets = () => [
  { id: 'top_pages', visible: true, colSpan: 2 },
  { id: 'users_by_source', visible: true, colSpan: 1 },
  { id: 'sessions_by_source', visible: true, colSpan: 1 },
  { id: 'new_vs_returning', visible: true, colSpan: 1 },
  { id: 'events_by_platform', visible: true, colSpan: 1 },
  { id: 'users_by_city', visible: true, colSpan: 1 },
];

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
  userEmail?: string;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'realtime' | 'users'>('overview');
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [widgets, setWidgets] = useState(() => getInitialBehaviorWidgets());
  const [isEditMode, setIsEditMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, visible: false } : w));
  };

  const handleAddWidget = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, visible: true } : w));
  };

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

  // Calculate top pages by URL to clearly show it's tracking external sites
  const topPages = Object.entries(
    events.filter(e => e.eventType === 'page_view').reduce((acc, e) => {
      // Use URL if available, otherwise fallback to path
      const displayUrl = e.url || e.path || '/';
      acc[displayUrl] = (acc[displayUrl] || 0) + 1;
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("login.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t("login.subtitle")}
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            <LogIn size={20} />
            {t("login.submit")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
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
                {t("nav.overview")}
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${(activeTab === 'reports' || activeTab === 'realtime' || activeTab === 'users') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                >
                  <BarChart2 size={16} />
                  {t("nav.reports")}
                  <ChevronDown size={14} className={`transition-transform ${isReportsMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isReportsMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button
                      onClick={() => { setActiveTab('reports'); setIsReportsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${activeTab === 'reports' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      {t("nav.reports_overview")}
                    </button>
                    <button
                      onClick={() => { setActiveTab('realtime'); setIsReportsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${activeTab === 'realtime' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      {t("nav.realtime")}
                    </button>
                    <button
                      onClick={() => { setActiveTab('users'); setIsReportsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${activeTab === 'users' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      {t("nav.users_list")}
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Change language"
              >
                <Globe size={16} />
                <span className="uppercase">{i18n.language}</span>
                <ChevronDown size={14} className={`transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLangMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => {
                      i18n.changeLanguage('en');
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${i18n.language === 'en' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => {
                      i18n.changeLanguage('uk');
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${i18n.language === 'uk' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    Українська
                  </button>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none"
              title={isDarkMode ? t("theme.light") : t("theme.dark")}
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
              title={t("nav.logout")}
            >
              <LogOut size={20} />
              <span className="hidden sm:block">{t("nav.logout")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'overview' && (
          <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("overview.unique")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : uniqueUsers}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <Globe size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("overview.page_views")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : totalPageViews}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <MousePointerClick size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("overview.clicks")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : totalClicks}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Charts Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* 7 Days Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">{t("overview.activity_7_days")}</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f0f0f0'} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#f3f4f6' : '#111827' }}
                    />
                    <Line type="monotone" name={t("overview.views")} dataKey="pageViews" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name={t("overview.clicks")} dataKey="clicks" stroke="#9333ea" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
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
                  {t("overview.realtime_2_min")}
                </h2>
                <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                  {t("overview.update_10s")}
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
                    <Bar name={t("overview.events")} dataKey="events" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">{t("overview.popular_pages")}</h2>
            <div className="space-y-4">
              {topPages.length > 0 ? topPages.map(([url, views], index) => (
                <div key={url} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-400 w-4">{index + 1}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={url}>{url || '/'}</span>
                  </div>
                  <span className="text-sm font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">{views}</span>
                </div>
              )) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t("overview.no_data")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Integration Guide */}
        <div className="bg-gray-900 dark:bg-gray-950 text-white p-6 rounded-xl shadow-sm transition-colors duration-200 border border-transparent dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <Code className="text-blue-400" />
            <h2 className="text-lg font-bold">{t("overview.how_to_connect")}</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            {t("overview.script_desc").split("</body>")[0]} <code className="text-gray-300 bg-gray-800 px-1 rounded">&lt;/body&gt;</code> {t("overview.script_desc").split("</body>")[1]}
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
                    path: '/catalog/shoes',
                    url: 'https://my-shop.com/catalog/shoes',
                    userAgent: navigator.userAgent,
                    sessionId: 'session-' + Math.floor(Math.random() * 10000),
                    userEmail: 'customer@gmail.com',
                    lat: 50.4501, // Kyiv latitude
                    lng: 30.5234  // Kyiv longitude
                  })
                }).then(() => alert(t("overview.test_alert")));
              }}
              className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
            >
              {t("overview.test_event")}
            </button>
          </div>
        </div>
          </>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {!selectedTemplate ? (
              <div className="max-w-5xl mx-auto py-10">
                <div className="text-center mb-10">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("reports.create_overview")}</h1>
                  <p className="text-gray-500 dark:text-gray-400">{t("reports.select_template")}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Template 1 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-transform hover:scale-[1.02] duration-200">
                    <div className="p-6 flex-grow">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t("reports.template_behavior")}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        {t("reports.template_behavior_desc")}
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-900/50 h-32 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-4">
                        <Activity size={48} className="text-blue-400 dark:text-blue-500" />
                      </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                      <button 
                        onClick={() => setSelectedTemplate('behavior')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors text-sm"
                      >
                        {t("reports.select_this")}
                      </button>
                    </div>
                  </div>

                  {/* Template 2 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col opacity-75">
                    <div className="p-6 flex-grow">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t("reports.template_sales")}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        {t("reports.template_sales_desc")}
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-900/50 h-32 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-4">
                        <BarChart2 size={48} className="text-green-400 dark:text-green-500" />
                      </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                      <button disabled className="w-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 py-2 rounded-md font-medium text-sm cursor-not-allowed">
                        {t("reports.coming_soon")}
                      </button>
                    </div>
                  </div>

                  {/* Template 3 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col opacity-75">
                    <div className="p-6 flex-grow">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t("reports.template_marketing")}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        {t("reports.template_marketing_desc")}
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-900/50 h-32 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-4">
                        <Globe size={48} className="text-purple-400 dark:text-purple-500" />
                      </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                      <button disabled className="w-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 py-2 rounded-md font-medium text-sm cursor-not-allowed">
                        {t("reports.coming_soon")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedTemplate(null)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {t("reports.back_to_templates")}
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("nav.reports_overview")}</h1>
                  </div>
                  <div className="flex items-center gap-3">
                    {isEditMode && (
                      <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                          <Plus size={16} />
                          {t("reports.add_widget")}
                        </button>
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-20">
                          <div className="p-2 space-y-1">
                            {widgets.filter(w => !w.visible).length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400 p-2 text-center">{t("reports.all_widgets_added")}</p>
                            ) : (
                              widgets.filter(w => !w.visible).map(w => (
                                <button
                                  key={w.id}
                                  onClick={() => handleAddWidget(w.id)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                >
                                  {t(`reports.${w.id}`)}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        isEditMode 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                      }`}
                    >
                      {isEditMode ? <><Check size={16} /> {t("reports.done")}</> : <><Edit2 size={16} /> {t("reports.edit")}</>}
                    </button>
                  </div>
                </div>

                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t("overview.active_users")}</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeUsers30Mins}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t("overview.new_users")}</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{Math.floor(activeUsers30Mins * 0.7)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t("reports.avg_engagement")}</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">1 {t("overview.min")} 24 {t("overview.sec")}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t("reports.event_count")}</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{events.length}</p>
                  </div>
                </div>

                {/* Draggable Widgets Grid */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {widgets.filter(w => w.visible).map((widget) => (
                        <SortableWidget 
                          key={widget.id} 
                          id={widget.id} 
                          isEditMode={isEditMode} 
                          onRemove={handleRemoveWidget}
                          colSpan={widget.colSpan}
                        >
                          {widget.id === 'top_pages' && (
                            <>
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t(`reports.${widget.id}`)}</h3>
                              <div className="space-y-3">
                                <div className="flex text-xs font-semibold text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2">
                                  <div className="flex-1">{t("reports.top_pages")}</div>
                                  <div className="w-24 text-right">{t("reports.views_col")}</div>
                                </div>
                                {topPages.length > 0 ? topPages.map(([url, views]) => (
                                  <div key={url} className="flex items-center justify-between py-1">
                                    <span className="text-sm text-blue-600 dark:text-blue-400 truncate pr-2 flex-1 hover:underline cursor-pointer" title={url}>{url || '/'}</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white w-24 text-right">{views}</span>
                                  </div>
                                )) : (
                                  <div className="py-8 text-center text-sm text-gray-500">{t("overview.no_data")}</div>
                                )}
                              </div>
                            </>
                          )}
                          
                          {widget.id === 'users_by_source' && (
                            <>
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t(`reports.${widget.id}`)}</h3>
                              <div className="flex items-center justify-center h-32 text-sm text-gray-400">{t("overview.no_data")}</div>
                            </>
                          )}

                          {widget.id === 'sessions_by_source' && (
                            <>
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t(`reports.${widget.id}`)}</h3>
                              <div className="flex items-center justify-center h-32 text-sm text-gray-400">{t("overview.no_data")}</div>
                            </>
                          )}

                          {widget.id === 'new_vs_returning' && (
                            <>
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t(`reports.${widget.id}`)}</h3>
                              <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f0f0f0'} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#888', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#f3f4f6' : '#111827' }} />
                                    <Line type="monotone" dataKey="pageViews" stroke="#2563eb" strokeWidth={2} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </>
                          )}

                          {widget.id === 'events_by_platform' && (
                            <>
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t(`reports.${widget.id}`)}</h3>
                              <div className="h-[200px] w-full flex items-center justify-center relative">
                                {platformData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie data={platformData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                        {platformData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                      </Pie>
                                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#f3f4f6' : '#111827' }} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-gray-400">
                                    <div className="w-32 h-32 rounded-full border-8 border-gray-100 dark:border-gray-700 flex items-center justify-center mb-2">
                                      <span className="text-sm font-medium">{t("overview.no_data")}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {widget.id === 'users_by_city' && (
                            <>
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t(`reports.${widget.id}`)}</h3>
                              <div className="flex items-center justify-center h-32 text-sm text-gray-400">{t("overview.no_data")}</div>
                            </>
                          )}
                        </SortableWidget>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        )}

        {activeTab === 'realtime' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("realtime.title")}</h1>
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
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">{t("realtime.users_last_30m")}</p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">{activeUsers30Mins}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">{t("realtime.users_last_5m")}</p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">{activeUsers5Mins}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">{t("realtime.users_per_min")}</p>
                  <div className="h-24 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={realTimeData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Bar dataKey="events" fill="#e5e7eb" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span>{t("realtime.minus_2m")}</span>
                    <span>{t("realtime.now")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t("nav.users_list")}</h1>
            
            {(() => {
              const trackedUsersMap = new Map<string, any>();
              events.forEach(e => {
                if (!e.timestamp) return;
                const eventTime = parseISO(e.timestamp).getTime();
                if (!trackedUsersMap.has(e.sessionId)) {
                  trackedUsersMap.set(e.sessionId, {
                    sessionId: e.sessionId,
                    email: e.userEmail || '{" + t("users.anonymous") + "} (ID: ' + e.sessionId.substring(0, 8) + '...)',
                    lastActive: eventTime,
                    userAgent: e.userAgent
                  });
                } else {
                  const user = trackedUsersMap.get(e.sessionId);
                  if (eventTime > user.lastActive) {
                    user.lastActive = eventTime;
                    if (e.userEmail) user.email = e.userEmail;
                    user.userAgent = e.userAgent;
                  }
                }
              });
              const trackedUsers = Array.from(trackedUsersMap.values()).sort((a, b) => b.lastActive - a.lastActive);

              return (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-200">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                          <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("users.user_email")}</th>
                          <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("users.status")}</th>
                          <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("users.last_activity")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {trackedUsers.map((u) => {
                          // Online if active within the last 2 minutes (120000 ms)
                          const isOnline = now.getTime() - u.lastActive < 120000;

                          return (
                            <tr key={u.sessionId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300 font-medium">
                                {u.email}
                                <div className="text-xs text-gray-500 font-normal mt-1 truncate max-w-xs" title={u.userAgent}>{u.userAgent}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                                  {isOnline ? t("users.online") : t("users.offline")}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {format(new Date(u.lastActive), 'dd.MM.yyyy HH:mm:ss')}
                              </td>
                            </tr>
                          );
                        })}
                        {trackedUsers.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                              {t("users.no_data")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 py-6 mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Activity size={18} />
            <span className="font-semibold">WebAnalytics Pro</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} {t("footer.rights")}
          </div>
        </div>
      </footer>
    </div>
  );
}
