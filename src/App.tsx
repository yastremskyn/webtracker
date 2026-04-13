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
import { Activity, Users, MousePointerClick, Globe, LogOut, LogIn, Code, Sun, Moon, LayoutDashboard, BarChart2, ChevronDown, Map as MapIcon, GripHorizontal, X, Plus, Edit2, Check, Sparkles, Compass, Filter, Table, PieChart as PieChartIcon, LineChart as LineChartIcon, FileText, MoreHorizontal, FileDown, Bell, History } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import * as countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import ukLocale from 'i18n-iso-countries/langs/uk.json';

countries.registerLocale(enLocale);
countries.registerLocale(ukLocale);

function getFlagEmoji(countryCode: string) {
  if (!countryCode) return '';
  
  // For Windows compatibility, we can return the country code itself
  // if the emoji flag doesn't render properly, or use a fallback.
  // But standard emoji flags are generated like this:
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  // Check if we are on Windows (where flag emojis often don't render)
  const isWindows = typeof window !== 'undefined' && navigator.userAgent.indexOf('Win') > -1;
  
  if (isWindows) {
    // Windows doesn't support country flag emojis natively.
    // We can either return the ISO code (e.g. "UA") or an empty string
    // Let's return the ISO code so the user sees something meaningful
    return countryCode.toUpperCase();
  }
  
  return String.fromCodePoint(...codePoints);
}
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Markdown from 'react-markdown';

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

const getInitialSalesWidgets = () => [
  { id: 'total_revenue', visible: true, colSpan: 1 },
  { id: 'ecommerce_purchases', visible: true, colSpan: 1 },
  { id: 'purchase_revenue_by_item', visible: true, colSpan: 2 },
  { id: 'arpu', visible: true, colSpan: 1 },
  { id: 'purchasers', visible: true, colSpan: 1 },
];

const getInitialMarketingWidgets = () => [
  { id: 'sessions_by_campaign', visible: true, colSpan: 2 },
  { id: 'conversions_by_source', visible: true, colSpan: 1 },
  { id: 'cost_per_conversion', visible: true, colSpan: 1 },
  { id: 'roas', visible: true, colSpan: 1 },
  { id: 'bounce_rate_by_channel', visible: true, colSpan: 1 },
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
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'realtime' | 'explorations' | 'ai_analytics' | 'notifications' | 'audit_log'>('overview');
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [widgets, setWidgets] = useState(() => getInitialBehaviorWidgets());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  interface ChatMessage {
    role: 'user' | 'model';
    content: string;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<{name: string, flag: string, users: number, x: number, y: number} | null>(null);

  // Explorations state
  const [explorationState, setExplorationState] = useState<{
    view: 'gallery' | 'editor';
    name: string;
    visualization: 'table' | 'donut' | 'line';
    selectedDimensions: string[];
    selectedMetrics: string[];
  }>({
    view: 'gallery',
    name: 'Untitled exploration',
    visualization: 'table',
    selectedDimensions: [],
    selectedMetrics: []
  });

  const availableDimensions = [
    { id: 'path', label: t('explorations.dim_path') },
    { id: 'eventType', label: t('explorations.dim_event') },
    { id: 'country', label: t('explorations.dim_country') },
    { id: 'date', label: t('explorations.dim_date') },
  ];
  const availableMetrics = [
    { id: 'eventCount', label: t('explorations.met_event_count') },
    { id: 'userCount', label: t('explorations.met_user_count') },
  ];

  const generateExplorationData = () => {
    const dim = explorationState.selectedDimensions[0];
    const met = explorationState.selectedMetrics[0];
    if (!dim || !met) return [];

    const grouped = new Map<string, Set<string> | number>();

    events.forEach(e => {
      let dimValue = 'Unknown';
      if (dim === 'path') dimValue = e.path || '/';
      if (dim === 'eventType') dimValue = e.eventType;
      if (dim === 'country') dimValue = e.country || 'Unknown';
      if (dim === 'date') dimValue = e.timestamp ? format(parseISO(e.timestamp), 'MMM dd') : 'Unknown';

      if (met === 'eventCount') {
        grouped.set(dimValue, ((grouped.get(dimValue) as number) || 0) + 1);
      } else if (met === 'userCount') {
        if (!grouped.has(dimValue)) grouped.set(dimValue, new Set());
        (grouped.get(dimValue) as Set<string>).add(e.sessionId);
      }
    });

    return Array.from(grouped.entries()).map(([name, value]) => ({
      name,
      value: met === 'userCount' ? (value as Set<string>).size : (value as number)
    })).sort((a, b) => b.value - a.value).slice(0, 15);
  };

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

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'behavior') {
      setWidgets(getInitialBehaviorWidgets());
    } else if (templateId === 'sales') {
      setWidgets(getInitialSalesWidgets());
    } else if (templateId === 'marketing') {
      setWidgets(getInitialMarketingWidgets());
    }
  };

  const handleTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: auth.currentUser?.email })
      });
      const data = await res.json();
      if (data.success) {
        alert('Тестовий лист успішно відправлено! Перевірте вашу пошту.');
      } else {
        alert('Помилка: ' + data.error);
      }
    } catch (e) {
      alert('Помилка відправки. Перевірте з\'єднання.');
    }
    setIsSendingTest(false);
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || chatInput;
    if (!textToSend.trim()) return;

    const newUserMsg: ChatMessage = { role: 'user', content: textToSend };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsAnalyzing(true);
    setAiError(null);

    try {
      // Summarize data for the AI
      const totalEvents = events.length;
      const totalPageViews = events.filter(e => e.eventType === 'page_view').length;
      const totalClicks = events.filter(e => e.eventType === 'click').length;
      const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
      
      const pageViewsByUrl = events
        .filter(e => e.eventType === 'page_view')
        .reduce((acc, e) => {
          const path = e.path || e.url;
          acc[path] = (acc[path] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
      const topPages = Object.entries(pageViewsByUrl)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([url, views]) => `${url}: ${views} views`)
        .join('\\n');

      const systemInstruction = `You are an expert web analytics AI assistant. Your goal is to chat with the user and analyze their website's performance based on the provided data. 
      Specifically, you MUST explicitly state which metrics are "great" (чудові) and which are "bad" or "need improvement" (погані). Be conversational, concise, and helpful.
      Respond in ${i18n.language === 'uk' ? 'Ukrainian' : 'English'}.
      
      Current Website Data:
      - Total Events: ${totalEvents}
      - Total Page Views: ${totalPageViews}
      - Total Clicks/Interactions: ${totalClicks}
      - Unique Sessions (Users): ${uniqueSessions}
      
      Top 5 Pages:
      ${topPages}`;

      const history = chatMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      const messagesToSend = [
        ...history,
        { role: 'user', parts: [{ text: textToSend }] }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          systemInstruction
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI response');
      }

      const data = await response.json();
      const aiResponseText = data.text || 'Error generating response.';
      setChatMessages(prev => [...prev, { role: 'model', content: aiResponseText }]);
    } catch (error) {
      console.error('Error in AI chat:', error);
      setAiError(t("ai_analytics.error"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startInitialAnalysis = () => {
    const initialPrompt = i18n.language === 'uk' 
      ? "Проаналізуй мої поточні дані. Скажи прямо, які показники чудові, а які погані." 
      : "Analyze my current data. Tell me directly which metrics are great and which are bad.";
    handleSendMessage(initialPrompt);
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
          <div className="w-16 h-16 flex items-center justify-center mx-auto">
            <img src="/logo.svg" alt="UWebAnalytics Logo" className="w-full h-full object-contain" />
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
            <div 
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setActiveTab('overview')}
            >
              <img src="/logo.svg" alt="UWebAnalytics Logo" className="h-8 w-auto" />
              <span className="font-bold text-xl hidden sm:block text-gray-900 dark:text-white">UWebAnalytics</span>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'}`}
              >
                <LayoutDashboard size={16} />
                {t("nav.overview")}
              </button>
              <div className="relative group">
                <button
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${(activeTab === 'reports' || activeTab === 'realtime' || activeTab === 'ai_analytics') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  <BarChart2 size={16} />
                  {t("nav.reports")}
                  <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 pt-1 w-56 z-50 hidden group-hover:block">
                  <div className="bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                    <button
                      onClick={() => setActiveTab('reports')}
                      className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'reports' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      <FileText size={14} className="text-gray-500" />
                      {t("nav.reports_overview")}
                    </button>
                    <button
                      onClick={() => setActiveTab('realtime')}
                      className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'realtime' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      <Globe size={14} className="text-gray-500" />
                      {t("nav.realtime")}
                    </button>
                    <button
                      onClick={() => setActiveTab('ai_analytics')}
                      className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${activeTab === 'ai_analytics' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-500" />
                        {t("nav.ai_analytics")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('explorations')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'explorations' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'}`}
              >
                <Compass size={16} />
                {t("nav.explorations")}
              </button>
              <div className="relative group">
                <button
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${(activeTab === 'notifications' || activeTab === 'audit_log') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  <MoreHorizontal size={16} />
                  {t("nav.other")}
                  <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 pt-1 w-56 z-50 hidden group-hover:block">
                  <div className="bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                    <button
                      onClick={() => window.print()}
                      className="w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FileDown size={14} className="text-gray-500" />
                      {t("nav.export_pdf")}
                    </button>
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      <Bell size={14} className="text-gray-500" />
                      {t("nav.notifications")}
                    </button>
                    <button
                      onClick={() => setActiveTab('audit_log')}
                      className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'audit_log' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      <History size={14} className="text-gray-500" />
                      {t("nav.audit_log")}
                    </button>
                  </div>
                </div>
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
                        onClick={() => handleSelectTemplate('behavior')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors text-sm cursor-pointer"
                      >
                        {t("reports.select_this")}
                      </button>
                    </div>
                  </div>

                  {/* Template 2 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-transform hover:scale-[1.02] duration-200">
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
                      <button 
                        onClick={() => handleSelectTemplate('sales')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors text-sm cursor-pointer"
                      >
                        {t("reports.select_this")}
                      </button>
                    </div>
                  </div>

                  {/* Template 3 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-transform hover:scale-[1.02] duration-200">
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
                      <button 
                        onClick={() => handleSelectTemplate('marketing')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors text-sm cursor-pointer"
                      >
                        {t("reports.select_this")}
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
                        <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 cursor-pointer">
                          <Plus size={16} />
                          {t("reports.add_widget")}
                        </button>
                        <div className="absolute right-0 top-full pt-2 w-64 z-20 hidden group-hover:block">
                          <div className="bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                            {widgets.filter(w => !w.visible).length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400 p-2 text-center">{t("reports.all_widgets_added")}</p>
                            ) : (
                              widgets.filter(w => !w.visible).map(w => (
                                <button
                                  key={w.id}
                                  onClick={() => handleAddWidget(w.id)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
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

                          {['total_revenue', 'ecommerce_purchases', 'purchase_revenue_by_item', 'arpu', 'purchasers', 'sessions_by_campaign', 'conversions_by_source', 'cost_per_conversion', 'roas', 'bounce_rate_by_channel'].includes(widget.id) && (
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
                  <ZoomableGroup center={[0, 20]} zoom={1} minZoom={1} maxZoom={8} translateExtent={[[-200, -100], [1000, 500]]}>
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onMouseEnter={(e) => {
                              const alpha2 = countries.numericToAlpha2(geo.id);
                              if (alpha2) {
                                const langCode = i18n.language ? i18n.language.split('-')[0] : 'uk';
                                const name = countries.getName(alpha2, langCode) || countries.getName(alpha2, 'en') || 'Unknown';
                                const flag = getFlagEmoji(alpha2);
                                
                                const activeUsers = new Set(
                                  events
                                    .filter(ev => ev.country && countries.getAlpha2Code(ev.country, 'en') === alpha2)
                                    .filter(ev => ev.timestamp && (now.getTime() - parseISO(ev.timestamp).getTime() <= 30 * 60 * 1000))
                                    .map(ev => ev.sessionId)
                                ).size;

                                setTooltipContent({ name, flag, users: activeUsers, x: e.clientX, y: e.clientY });
                              }
                            }}
                            onMouseMove={(e) => {
                              setTooltipContent(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                            }}
                            onMouseLeave={() => {
                              setTooltipContent(null);
                            }}
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
              
              {/* Tooltip */}
              {tooltipContent && (
                <div 
                  className="fixed z-50 pointer-events-none bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl border border-gray-700 flex flex-col gap-1 transition-opacity duration-150"
                  style={{ 
                    left: tooltipContent.x + 15, 
                    top: tooltipContent.y + 15,
                    transform: 'translate(0, 0)'
                  }}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {tooltipContent.flag.length === 2 ? (
                      <img 
                        src={`https://flagcdn.com/24x18/${tooltipContent.flag.toLowerCase()}.png`} 
                        alt={tooltipContent.flag} 
                        className="w-6 h-auto rounded-sm"
                      />
                    ) : (
                      <span className="text-lg leading-none">{tooltipContent.flag}</span>
                    )}
                    <span>{tooltipContent.name}</span>
                  </div>
                  <div className="text-gray-300 text-xs flex justify-between items-center gap-4">
                    <span>{t("realtime.active_users", "Активні користувачі")}:</span>
                    <span className="font-bold text-white">{tooltipContent.users}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'explorations' && (
          <div className="space-y-6 flex flex-col h-[calc(100vh-12rem)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Compass className="text-blue-500" />
                {t("explorations.title")}
              </h1>
            </div>

            {explorationState.view === 'gallery' ? (
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-8 border border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{t("explorations.gallery_title")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <button 
                    onClick={() => setExplorationState(prev => ({ ...prev, view: 'editor', visualization: 'table' }))}
                    className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-4 hover:border-blue-500 hover:shadow-md transition-all h-48"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 text-gray-400 group-hover:text-blue-500 transition-colors">
                      <Plus size={24} />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{t("explorations.blank")}</span>
                  </button>
                  <button 
                    onClick={() => setExplorationState(prev => ({ ...prev, view: 'editor', visualization: 'table' }))}
                    className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-4 hover:border-blue-500 hover:shadow-md transition-all h-48"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 text-gray-400 group-hover:text-blue-500 transition-colors">
                      <Table size={24} />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{t("explorations.free_form")}</span>
                  </button>
                  <button disabled className="opacity-50 cursor-not-allowed bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-4 h-48">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                      <Filter size={24} />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{t("explorations.funnel")}</span>
                  </button>
                  <button disabled className="opacity-50 cursor-not-allowed bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-4 h-48">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                      <GripHorizontal size={24} />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{t("explorations.path")}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Variables Column */}
                <div className="w-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden shrink-0">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-medium text-gray-900 dark:text-white">{t("explorations.variables")}</h3>
                    <button onClick={() => setExplorationState(prev => ({ ...prev, view: 'gallery' }))} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("explorations.dimensions")}</h4>
                      </div>
                      <div className="space-y-1">
                        {availableDimensions.map(dim => (
                          <div key={dim.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 group">
                            <span className="truncate">{dim.label}</span>
                            <button 
                              onClick={() => setExplorationState(prev => ({ ...prev, selectedDimensions: [dim.id] }))}
                              className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-600"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("explorations.metrics")}</h4>
                      </div>
                      <div className="space-y-1">
                        {availableMetrics.map(met => (
                          <div key={met.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 group">
                            <span className="truncate">{met.label}</span>
                            <button 
                              onClick={() => setExplorationState(prev => ({ ...prev, selectedMetrics: [met.id] }))}
                              className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-600"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Settings Column */}
                <div className="w-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden shrink-0">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-medium text-gray-900 dark:text-white">{t("explorations.tab_settings")}</h3>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t("explorations.visualization")}</h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setExplorationState(prev => ({ ...prev, visualization: 'table' }))}
                          className={`p-2 rounded-md ${explorationState.visualization === 'table' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          title={t("explorations.table")}
                        >
                          <Table size={18} />
                        </button>
                        <button 
                          onClick={() => setExplorationState(prev => ({ ...prev, visualization: 'donut' }))}
                          className={`p-2 rounded-md ${explorationState.visualization === 'donut' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          title={t("explorations.donut")}
                        >
                          <PieChartIcon size={18} />
                        </button>
                        <button 
                          onClick={() => setExplorationState(prev => ({ ...prev, visualization: 'line' }))}
                          className={`p-2 rounded-md ${explorationState.visualization === 'line' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          title={t("explorations.line")}
                        >
                          <LineChartIcon size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t("explorations.rows")}</h4>
                      <div className="min-h-[40px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md p-2 flex flex-col gap-2">
                        {explorationState.selectedDimensions.length > 0 ? (
                          explorationState.selectedDimensions.map(dimId => {
                            const dim = availableDimensions.find(d => d.id === dimId);
                            return (
                              <div key={dimId} className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded text-sm flex justify-between items-center border border-green-200 dark:border-green-800">
                                {dim?.label}
                                <button onClick={() => setExplorationState(prev => ({ ...prev, selectedDimensions: [] }))}><X size={14} /></button>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-sm text-gray-400 text-center py-1">{t("explorations.drop_dimension")}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t("explorations.values")}</h4>
                      <div className="min-h-[40px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md p-2 flex flex-col gap-2">
                        {explorationState.selectedMetrics.length > 0 ? (
                          explorationState.selectedMetrics.map(metId => {
                            const met = availableMetrics.find(m => m.id === metId);
                            return (
                              <div key={metId} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded text-sm flex justify-between items-center border border-blue-200 dark:border-blue-800">
                                {met?.label}
                                <button onClick={() => setExplorationState(prev => ({ ...prev, selectedMetrics: [] }))}><X size={14} /></button>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-sm text-gray-400 text-center py-1">{t("explorations.drop_metric")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={explorationState.name}
                      onChange={(e) => setExplorationState(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-transparent border-none focus:ring-0 text-lg font-medium text-gray-900 dark:text-white p-0 w-full"
                    />
                    <Edit2 size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1 p-6 overflow-auto">
                    {explorationState.selectedDimensions.length === 0 || explorationState.selectedMetrics.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Table size={48} className="mb-4 opacity-20" />
                        <p>{t("explorations.no_data")}</p>
                      </div>
                    ) : (
                      <div className="h-full">
                        {(() => {
                          const data = generateExplorationData();
                          const dimLabel = availableDimensions.find(d => d.id === explorationState.selectedDimensions[0])?.label;
                          const metLabel = availableMetrics.find(m => m.id === explorationState.selectedMetrics[0])?.label;

                          if (explorationState.visualization === 'table') {
                            return (
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{dimLabel}</th>
                                    <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white text-right">{metLabel}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.map((row, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{row.name}</td>
                                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium text-right">{row.value}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          } else if (explorationState.visualization === 'donut') {
                            return (
                              <div className="h-full min-h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={data}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={80}
                                      outerRadius={120}
                                      paddingAngle={2}
                                      dataKey="value"
                                      nameKey="name"
                                    >
                                      {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', color: isDarkMode ? '#f3f4f6' : '#111827' }}
                                      itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            );
                          } else if (explorationState.visualization === 'line') {
                            return (
                              <div className="h-full min-h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} vertical={false} />
                                    <XAxis dataKey="name" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', color: isDarkMode ? '#f3f4f6' : '#111827' }}
                                      itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
                                    />
                                    <Line type="monotone" dataKey="value" name={metLabel} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai_analytics' && (
          <div className="space-y-6 flex flex-col h-[calc(100vh-12rem)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 shrink-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="text-purple-500" />
                  {t("ai_analytics.title")}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {t("ai_analytics.description")}
                </p>
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col transition-colors duration-200">
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <Sparkles size={48} className="text-purple-300 dark:text-purple-900/50 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t("ai_analytics.title")}</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                      {t("ai_analytics.description")}
                    </p>
                    <button
                      onClick={() => startInitialAnalysis()}
                      disabled={isAnalyzing || events.length === 0}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isAnalyzing ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Sparkles size={20} />
                      )}
                      {t("ai_analytics.start_chat")}
                    </button>
                    {events.length === 0 && (
                      <p className="text-sm text-red-500 mt-4">{t("overview.no_data")}</p>
                    )}
                  </div>
                ) : (
                  <>
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm'}`}>
                          {msg.role === 'model' ? (
                            <div className="prose dark:prose-invert max-w-none prose-sm markdown-body">
                              <Markdown>{msg.content}</Markdown>
                            </div>
                          ) : (
                            <p>{msg.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {isAnalyzing && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Input Area */}
              {chatMessages.length > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  {aiError && (
                    <div className="mb-3 text-sm text-red-600 dark:text-red-400">
                      {aiError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={t("ai_analytics.placeholder")}
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      disabled={isAnalyzing}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={isAnalyzing || !chatInput.trim()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {t("ai_analytics.send")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="text-blue-500" />
                  {t("nav.notifications")}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Configure email alerts for important events and metric changes.
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleTestEmail}
                  disabled={isSendingTest}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSendingTest ? 'Відправка...' : 'Тестовий лист'}
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors flex items-center gap-2">
                  <Plus size={16} />
                  Create Alert
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Alerts</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <div className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Traffic Drop Alert</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Send email when active users drop by 20% in 1 hour</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded-full">Active</span>
                    <button className="text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                  </div>
                </div>
                <div className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Goal Completion</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Send email when daily purchases exceed 100</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">Paused</span>
                    <button className="text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit_log' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="text-blue-500" />
                  {t("nav.audit_log")}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Track user actions, report changes, and system events.
                </p>
              </div>
              <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md font-medium transition-colors flex items-center gap-2">
                <FileDown size={16} />
                Export Log
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date & Time</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{format(now, 'MMM dd, yyyy HH:mm:ss')}</td>
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">Admin User</td>
                      <td className="p-4 text-sm text-gray-900 dark:text-white"><span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">Report Edited</span></td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400">Added "Total Revenue" widget to Sales template</td>
                    </tr>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{format(subDays(now, 1), 'MMM dd, yyyy HH:mm:ss')}</td>
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">Admin User</td>
                      <td className="p-4 text-sm text-gray-900 dark:text-white"><span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs font-medium">Alert Created</span></td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400">Created "Traffic Drop Alert" notification</td>
                    </tr>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{format(subDays(now, 2), 'MMM dd, yyyy HH:mm:ss')}</td>
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">System</td>
                      <td className="p-4 text-sm text-gray-900 dark:text-white"><span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">Login</span></td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400">Successful login via Google Auth</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 py-6 mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <img src="/logo.svg" alt="UWebAnalytics Logo" className="h-5 w-auto grayscale opacity-70" />
            <span className="font-semibold">UWebAnalytics</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} {t("footer.rights")}
          </div>
        </div>
      </footer>
    </div>
  );
}
