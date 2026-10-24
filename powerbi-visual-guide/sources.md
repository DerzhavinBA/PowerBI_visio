# Источники и область применения

Проверено 24.10.2026. Все ссылки ниже открыты и вернули содержательное описание. На Microsoft Learn инструмент также показывал общий баннер авторизации, но текст статей был доступен. Это не фиксация «самой новой» версии SDK: перед разработкой сверять типы и версии проекта. Правила, отмеченные рабочими, — синтез для наших задач, а не цитаты Microsoft.

| ID | Первоисточник | Что подтверждает |
|---|---|---|
| S01 | [Visual API](https://learn.microsoft.com/en-us/power-bi/developer/visuals/visual-api) | IVisual, lifecycle и сервисы хоста |
| S02 | [Format pane](https://learn.microsoft.com/en-us/power-bi/developer/visuals/format-pane-general) | getFormattingModel и переход с legacy, API 5.1+ |
| S03 | [Selection API](https://learn.microsoft.com/en-us/power-bi/developer/visuals/selection-api) | Идентичности и SelectionManager |
| S04 | [Filter API](https://learn.microsoft.com/en-us/power-bi/developer/visuals/filter-api) | Фильтры и отличие от выделения |
| S05 | [Capabilities](https://learn.microsoft.com/en-us/power-bi/developer/visuals/capabilities) | Роли, mapping, свойства и privileges |
| S06 | [Keyboard focus](https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportskeyboardfocus-feature) | supportsKeyboardFocus и клавиши хоста |
| S07 | [High contrast](https://learn.microsoft.com/en-us/power-bi/developer/visuals/high-contrast-support) | Палитра хоста и режим контраста |
| S08 | [Report accessibility](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports) | Ответственность автора отчёта, alt text и навигация |
| S09 | [Performance tips](https://learn.microsoft.com/en-us/power-bi/developer/visuals/performance-tips) | Замеры рендера, Performance Analyzer, разные сценарии |
| S10 | [Package a visual](https://learn.microsoft.com/en-us/power-bi/developer/visuals/package-visual) | Метаданные и упаковка |
| S11 | [Localization](https://learn.microsoft.com/en-us/power-bi/developer/visuals/localization) | Язык хоста, localization manager и ограничения debug |
| S12 | [Tooltips](https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-tooltips) | Подсказки через host API |
| S13 | [Dashboard design tips](https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips) | Иерархия важности и уменьшение шума; статья о dashboards, не спецификация SDK |
| S14 | [WCAG: contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Контраст текста и определение крупного текста |
| S15 | [WCAG: non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | Контраст значимых графических элементов |
| S16 | [Fetch more data](https://learn.microsoft.com/en-us/power-bi/developer/visuals/fetch-more-data) | Сегменты, ограничения и обработка дополнительной загрузки |
| S17 | [Unit tests](https://learn.microsoft.com/en-us/power-bi/developer/visuals/unit-tests-introduction) | Пример тестов с mocks и testutils |

Неполученные страницы: пути `accessibility`, `accessibility-overview`, `support-highlight`, `certification-requirements` в developer/visuals вернули ошибку доступа инструмента. На них не опираемся как на прочитанные источники. Это не доказательство удаления страниц. Сертификация не входит в комплект процедур выпуска; при отдельной задаче исследовать её заново.

Локальные первоисточники: два файла пользователя, [инвентарь с SHA-256](analysis/evidence/inventory.json), [структура отчёта](analysis/evidence/report-structure.json), [capabilities Гантта](analysis/evidence/gantt-capabilities.json), [уведомление о происхождении](analysis/evidence/THIRD-PARTY-NOTICES.original.txt). Корпоративная палитра взята из [темы PBIX](themes/tmhi-original.json). Содержимое исполняемой сборки не публиковалось и не загружалось на внешние сервисы.
