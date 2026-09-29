export const uk = {
  common: {
    appName: 'Соняшик',
    nav: { more: 'Ще', menu: 'Меню', collapse: 'Згорнути меню', main: 'Основна навігація' },
    greeting: {
      morning: 'Доброго ранку, {{name}} 🌸',
      day: 'Доброго дня, {{name}} ☀️',
      evening: 'Добрий вечір, {{name}} 🌙',
      night: 'Не забувай відпочивати, {{name}} ✨',
    },
    defaultName: 'сонечко',
    loading: 'Завантаження…',
    error: {
      title: 'Ой, щось пішло не так',
      text: 'Спробуй оновити сторінку.',
      retry: 'Спробувати ще',
    },
    auth: {
      notConfigured: 'Потрібне налаштування Supabase',
      notConfiguredHint: 'Додай VITE_SUPABASE_URL та VITE_SUPABASE_ANON_KEY у .env.local.',
      title: 'Вхід до Соняшика 🌻',
      subtitle: 'Цей простір приватний. Увійди зі своєю поштою.',
      email: 'Електронна пошта',
      password: 'Пароль',
      submit: 'Увійти',
      invalid: 'Не вдалося увійти. Перевір пошту та пароль.',
      required: 'Заповни це поле',
    },
    empty: { title: 'Тут поки порожньо' },
  },
};
