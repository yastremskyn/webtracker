import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      login: {
        title: "Web Analytics System",
        subtitle: "Sign in to view statistics and analytical reports of your web service.",
        email: "Email",
        password: "Password",
        submit: "Sign In with Google",
        test_hint: "Enter any email and password for testing"
      },
      nav: {
        overview: "Overview",
        reports: "Reports",
        reports_overview: "Reports Overview",
        realtime: "Realtime",
        users_list: "Users List",
        logout: "Logout"
      },
      theme: {
        light: "Switch to light theme",
        dark: "Switch to dark theme"
      },
      overview: {
        active_users: "Active Users",
        new_users: "New Users",
        avg_time: "Avg Time",
        bounce_rate: "Bounce Rate",
        min: "min",
        sec: "s",
        page_views: "Page Views",
        popular_pages: "Popular Pages (URL)",
        page: "Page",
        views: "Views",
        unique: "Unique Sessions",
        clicks: "Clicks (Interactions)",
        no_data: "No data available",
        activity_7_days: "Activity for the last 7 days",
        realtime_2_min: "Realtime (last 2 min)",
        update_10s: "Updates every 10s",
        events: "Events",
        how_to_connect: "How to connect to your site",
        script_desc: "Add this script before the closing </body> tag on your site to start collecting data.",
        test_event: "Send test event",
        test_alert: "Test event sent from my-shop.com!"
      },
      reports: {
        create_overview: "Create Reports Overview",
        select_template: "Select a template that displays the performance metrics you need",
        template_behavior: "User Behavior",
        template_behavior_desc: "Get an overview of your website's most popular pages and app screens, user count, and engagement metrics.",
        template_sales: "Sales & Revenue",
        template_sales_desc: "Identify top-performing products and what drives the most revenue.",
        template_marketing: "Marketing Performance",
        template_marketing_desc: "Track marketing channel performance and conversion attribution.",
        select_this: "Select this template",
        coming_soon: "Coming soon",
        back_to_templates: "← Back to templates",
        reports_overview_title: "Reports Overview",
        edit: "Edit",
        done: "Done",
        add_widget: "Add Widget",
        all_widgets_added: "All widgets added",
        users_by_city: "Active users by City",
        events: "Events",
        event: "Event",
        count: "Count",
        active_users: "Active Users",
        new_users: "New Users",
        avg_engagement: "Average Engagement Time",
        event_count: "Event Count",
        top_pages: "TOP PAGES AND SCREENS",
        views_col: "VIEWS",
        users_by_source: "Active users by Source",
        sessions_by_source: "Sessions by Source",
        new_vs_returning: "New vs Returning users",
        events_by_platform: "Main events by Platform"
      },
      realtime: {
        title: "Realtime Overview",
        users_last_30m: "Active users in last 30 minutes",
        users_last_5m: "Active users in last 5 minutes",
        users_per_min: "Active users per minute",
        active_pages: "Active Pages",
        users_count: "Users",
        recent_events: "Recent Events",
        time: "Time",
        now: "Now",
        minus_2m: "-2 min"
      },
      users: {
        title: "Users List",
        user_email: "User / Email",
        status: "Status",
        last_activity: "Last Activity",
        online: "Online",
        offline: "Offline",
        no_data: "No visitor data available",
        anonymous: "Anonymous"
      },
      footer: {
        rights: "All rights reserved."
      }
    }
  },
  uk: {
    translation: {
      login: {
        title: "Система веб-аналітики",
        subtitle: "Увійдіть, щоб переглянути статистику та аналітичні звіти вашого веб-сервісу.",
        email: "Email",
        password: "Пароль",
        submit: "Увійти через Google",
        test_hint: "Введіть будь-який email та пароль для тестування"
      },
      nav: {
        overview: "Огляд",
        reports: "Звіти",
        reports_overview: "Короткий огляд звітів",
        realtime: "У реальному часі",
        users_list: "Список користувачів",
        logout: "Вийти"
      },
      theme: {
        light: "Увімкнути світлу тему",
        dark: "Увімкнути темну тему"
      },
      overview: {
        active_users: "Активні користувачі",
        new_users: "Нові користувачі",
        avg_time: "Середній час",
        bounce_rate: "Показник відмов",
        min: "хв",
        sec: "с",
        page_views: "Перегляди сторінок",
        popular_pages: "Популярні сторінки (URL)",
        page: "Сторінка",
        views: "Перегляди",
        unique: "Унікальні сесії",
        clicks: "Кліки (Взаємодії)",
        no_data: "Дані недоступні",
        activity_7_days: "Активність за останні 7 днів",
        realtime_2_min: "У реальному часі (останні 2 хв)",
        update_10s: "Оновлення кожні 10с",
        events: "Події",
        how_to_connect: "Як підключити до вашого сайту",
        script_desc: "Додайте цей скрипт перед закриваючим тегом </body> на вашому сайті, щоб почати збір даних.",
        test_event: "Відправити тестову подію",
        test_alert: "Тестову подію відправлено з my-shop.com!"
      },
      reports: {
        create_overview: "Створити короткий огляд звітів",
        select_template: "Виберіть шаблон, який відображає потрібні вам показники ефективності",
        template_behavior: "Поведінка користувача",
        template_behavior_desc: "Отримайте огляд найпопулярніших сторінок вашого вебсайту й екранів додатка, кількості користувачів і показників взаємодії",
        template_sales: "Продажі й дохід",
        template_sales_desc: "Визначте найефективніші товари й те, що приносить найбільший дохід",
        template_marketing: "Ефективність маркетингової діяльності",
        template_marketing_desc: "Відстежуйте ефективність маркетингових каналів і атрибуцію конверсій",
        select_this: "Вибрати цей шаблон",
        coming_soon: "Незабаром",
        back_to_templates: "← Назад до шаблонів",
        reports_overview_title: "Короткий огляд звітів",
        edit: "Редагувати",
        done: "Готово",
        add_widget: "Додати віджет",
        all_widgets_added: "Всі віджети додано",
        users_by_city: "Активні користувачі за Місто",
        events: "Події",
        event: "Подія",
        count: "Кількість",
        active_users: "Активні користувачі",
        new_users: "Нові користувачі",
        avg_engagement: "Середній час взаємодії",
        event_count: "Кількість подій",
        top_pages: "НАЗВА СТОРІНКИ Й КЛАС ЕКРАНА",
        views_col: "ПЕРЕГЛЯДИ",
        users_by_source: "Активні користувачі за Джерело",
        sessions_by_source: "Сеанси за Джерело",
        new_vs_returning: "Нові користувачі й ті, що повернулися",
        events_by_platform: "Основні події за Платформа"
      },
      realtime: {
        title: "Огляд у реальному часі",
        users_last_30m: "Активні користувачі за останні 30 хвилин",
        users_last_5m: "Активні користувачі за останні 5 хвилин",
        users_per_min: "Активні користувачі за хвилину",
        active_pages: "Активні сторінки",
        users_count: "Користувачів",
        recent_events: "Останні події",
        time: "Час",
        now: "Зараз",
        minus_2m: "-2 хв"
      },
      users: {
        title: "Список користувачів",
        user_email: "Користувач / Email",
        status: "Статус",
        last_activity: "Остання активність",
        online: "Онлайн",
        offline: "Офлайн",
        no_data: "Немає даних про відвідувачів сайту",
        anonymous: "Анонімний"
      },
      footer: {
        rights: "Всі права захищено."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "uk", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
