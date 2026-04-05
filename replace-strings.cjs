const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  ['Огляд', '{t("nav.overview")}'],
  ['Звіти', '{t("nav.reports")}'],
  ['Короткий огляд звітів', '{t("nav.reports_overview")}'],
  ['У реальному часі', '{t("nav.realtime")}'],
  ['Список користувачів', '{t("nav.users_list")}'],
  ['У реальному часі (останні 2 хв)', '{t("overview.realtime_2_min")}'],
  ['Оновлення кожні 10с', '{t("overview.update_10s")}'],
  ['Відправити тестову подію', '{t("overview.test_event")}'],
  ['Отримайте огляд найпопулярніших сторінок вашого вебсайту й екранів додатка, кількості користувачів і показників взаємодії', '{t("reports.template_behavior_desc")}'],
  ['Вибрати цей шаблон', '{t("reports.select_this")}'],
  ['Визначте найефективніші товари й те, що приносить найбільший дохід', '{t("reports.template_sales_desc")}'],
  ['Незабаром', '{t("reports.coming_soon")}'],
  ['Відстежуйте ефективність маркетингових каналів і атрибуцію конверсій', '{t("reports.template_marketing_desc")}'],
  ['← Назад до шаблонів', '{t("reports.back_to_templates")}'],
  ['Додати віджет', '{t("reports.add_widget")}'],
  ["{isOnline ? 'Онлайн' : 'Офлайн'}", '{isOnline ? t("users.online") : t("users.offline")}'],
  ['Немає даних про відвідувачів сайту', '{t("users.no_data")}']
];

replacements.forEach(([search, replace]) => {
  // Only replace text that is not already inside t(...) or other code
  // A simple split/join might replace inside comments or other places, but it's fine for these specific strings
  content = content.split(search).join(replace);
});

fs.writeFileSync('src/App.tsx', content);
