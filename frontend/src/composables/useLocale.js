import { ref, computed } from 'vue'

// UI Text translations
const UI_TRANSLATIONS = {
  en: {
    // Filters
    filters: 'Filters',
    historicalEvents: 'Historical Events',
    eventsFromToPrefix: 'Events from',
    eventsFromToMiddle: 'to',
    historicalPeriod: 'Historical Period',
    specificPeriod: 'Specific Period:',
    selectPeriodGroup: 'Select Period',
    from: 'From:',
    to: 'To:',
    step: 'Step:',
    defaultPeriod: 'Default (1 AD - Today)',
    customDateRange: 'Custom Date Range',
    selectSpecificPeriod: 'Select specific period...',
    noTemplatesAvailable: 'No templates available',
    loading: 'Loading',
    years: 'years',
    apply: 'Apply',
    emptyStateTitle: 'No events found',
    emptyStateHint: 'Try selecting a different historical period or adjusting your date range and filters',
    emptyStateSuggestion: 'Try a period',
    
    // Pin Mode
    pinModeActive: 'Click on map to set location',
    pinModeHint: '(Right-click or Esc to cancel)',
    pickLocationFromMap: 'Pick location from map',
    clickMapToSetLocation: 'Click on map to set location (Right-click or Esc to cancel)',
    
    // Header Navigation
    map: 'Map',
    admin: 'Admin area',
    events: 'Events',
    tags: 'Tags',
    datasets: 'Datasets',
    users: 'Users',
    
    // Authentication
    login: 'Login',
    logout: 'Logout',
    welcome: 'Welcome',
    loggingIn: 'Logging in...',
    about: 'About',
    
    // About Page
    aboutTitle: 'About project',
    aboutProjectDescription: 'timediverr is an interactive platform based on a simple principle: every event has a time and place. I have interest in understanding the context of events, which typically requires research. Here I try to simplify the process.',
    aboutFeaturesTitle: 'Features',
    aboutFeature1: 'Interactive world map with historical event markers',
    aboutFeature2: 'Timeline filtering by historical periods and date ranges. Regions, displayed for chosen periods',
    aboutFeature3: 'Categorize, search, and filter events by tags. Track events with tags from earliest to latest',
    aboutFeature4: 'A full-featured admin panel for managing events, tags, periods and regions',
    aboutFeature5: 'Structuring event sets into datasets, tools for exporting and importing datasets in JSON',
    aboutUseCasesTitle: 'Use Cases',
    aboutUseCase1: 'Teachers can create visual lessons showing how empires rose and fell across geography and time',
    aboutUseCase2: 'Researchers can visualize historical timelines for their work',
    aboutUseCase3: 'You can answer questions like: "What else happened in the year I started school?", "What is the history of the place where I am?", "How did Greek philosophy develop?", "What did Hannibals campaign look like?" and others',
    aboutUseCase4: 'You can use the platform as a basis for your own developments - launch your application, create your own datasets, your own map with notable sights and deploy your events on a map',
    aboutUseCase5: 'Museums and cultural institutions can create interactive exhibits for visitors',
    aboutOpenSource: 'This project is open source and free to use by anyone. The database is based on open, public sources. Contributions, feedback, and ideas are always welcome!',
    aboutDisclaimer: 'I am not a historian, so please maintain healthy scepticism when exploring the map. For my part, I try to verify all information before adding it.',
    aboutContact: 'Contact',
    aboutSupportTitle: 'Support timediverr',
    aboutSupportDescription: 'There is and will be no advertising in the project. If you find this project useful and would like to support its development and growth, you can contribute through the following options:',
    aboutSupportLinkText: 'Visit',
    backToMap: 'Back to Map',
    
    // Geolocation
    geolocationButton: 'Find my location',
    geolocationLoading: 'Getting location...',
    geolocationNotSupported: 'Geolocation is not supported by your browser',
    geolocationPermissionDenied: 'Location access was denied. Please enable location in your browser settings.',
    geolocationUnavailable: 'Location information is unavailable',
    geolocationTimeout: 'Location request timed out',
    geolocationError: 'An error occurred while getting your location',
    
    // URL sharing
    shareUrl: 'Copy shareable link',
    shareCopied: 'Link copied!',
    
    // Toolbar short labels
    toolbarShare: 'Share',
    toolbarTimeline: 'Timeline',
    toolbarTags: 'Tags',
    toolbarHere: 'Here',
    toolbarLocate: 'Find me',
    paginationHint: 'Scroll or use arrow keys to navigate',
    
    // Login Modal
    loginToHistoria: 'Login to timediverr',
    username: 'Username:',
    password: 'Password:',
    enterUsername: 'Enter username',
    enterPassword: 'Enter password',
    
    // Access Levels
    superBadge: 'SUPER',
    adminBadge: 'ADMIN',
    editorBadge: 'EDITOR',
    
    // Admin Events Page
    adminEventsTitle: 'Historic Events',
    adminEventsSubtitle: 'Manage and create historic events',
    createNewEvent: 'Create New Event',
    searchEventName: 'Search by name...',
    
    // Admin Tags Page
    adminTagsTitle: 'Tags Management',
    adminTagsSubtitle: 'Manage event tags and categories',
    createNewTag: 'Create New Tag',
    
    // Admin Templates Page
    adminTemplatesTitle: 'Historic Periods',
    adminTemplatesSubtitle: 'Manage date templates and period groups',
    templates: 'Periods',
    createNewTemplate: 'New Period',
    createNewGroup: 'New Group',
    editTemplate: 'Edit Period',
    editGroup: 'Edit Group',
    updateTemplate: 'Update Period',
    updateGroup: 'Update Group',
    createTemplate: 'Create Period',
    createGroup: 'Create Group',
    templateGroup: 'Group',
    selectGroup: 'Select group...',
    templateGroupsTitle: 'Period Groups',
    searchTemplates: 'Search periods...',
    columnGroup: 'Group',
    columnDateFrom: 'From',
    columnDateTo: 'To',
    nameEn: 'Name (English)',
    nameRu: 'Name (Russian)',
    descriptionEn: 'Description (English)',
    descriptionRu: 'Description (Russian)',
    startDate: 'Start Date',
    endDate: 'End Date',
    cancel: 'Cancel',
    saving: 'Saving...',
    
    // Admin Users Page
    adminUsersTitle: 'Users Management',
    adminUsersSubtitle: 'Manage user accounts and access levels',
    createNewUser: 'Create New User',
    
    // Table Column Names
    columnName: 'Name',
    columnDescription: 'Description',
    columnDate: 'Date',
    columnLocation: 'Location',
    columnType: 'Type',
    columnTags: 'Tags',
    columnActions: 'Actions',
    columnColor: 'Color',
    columnCreated: 'Created',
    columnUsageCount: 'Usage Count',
    columnWeight: 'Weight',
    weightHint: 'Higher weight = displayed first in tag lists',
    tagEmoji: 'Custom Emoji',
    tagEmojiPlaceholder: '🏛️',
    tagEmojiHint: 'Optional emoji to override event type icon on map markers',
    columnUsername: 'Username',
    columnEmail: 'Email',
    columnAccessLevel: 'Access Level',
    columnStatus: 'Status',
    columnLastActive: 'Last Active',
    
    // Month Names (abbreviated)
    monthJan: 'Jan',
    monthFeb: 'Feb',
    monthMar: 'Mar',
    monthApr: 'Apr',
    monthMay: 'May',
    monthJun: 'Jun',
    monthJul: 'Jul',
    monthAug: 'Aug',
    monthSep: 'Sep',
    monthOct: 'Oct',
    monthNov: 'Nov',
    monthDec: 'Dec',
    // Month Names (full)
    monthFullJan: 'January',
    monthFullFeb: 'February',
    monthFullMar: 'March',
    monthFullApr: 'April',
    monthFullMay: 'May',
    monthFullJun: 'June',
    monthFullJul: 'July',
    monthFullAug: 'August',
    monthFullSep: 'September',
    monthFullOct: 'October',
    monthFullNov: 'November',
    monthFullDec: 'December',
    
    // Era Labels
    eraBC: 'BC',
    eraAD: 'AD',
    yearLabel: 'year',
    
    // Admin Datasets Page
    adminDatasetsTitle: 'Event Datasets',
    adminDatasetsSubtitle: 'Manage uploaded event datasets. Deleting a dataset will remove all events imported from it.',
    loadingDatasets: 'Loading datasets...',
    tryAgain: 'Try Again',
    importNewDataset: 'Import New Dataset',
    importDatasetDescription: 'Upload a JSON file containing historical events to create a new dataset.',
    chooseDatasetFile: 'Choose Dataset File',
    selectedFile: 'Selected:',
    importing: 'Importing...',
    importDataset: 'Import Dataset',
    clear: 'Clear',
    or: 'or',
    createEmptyDataset: 'Create Empty Dataset',
    
    // Tag Filter
    filteredByTags: 'Filtered by tags',
    clearAllTags: 'Clear all',
    clearAll: 'Clear all',
    remove: 'Remove',
    allTags: 'All Tags',
    searchTags: 'Search tags...',
    noTagsFound: 'No tags found',
    followEvents: 'Follow',
    enableNarrativeFlow: 'Enable narrative flow - connect events chronologically',
    disableNarrativeFlow: 'Disable narrative flow',
    focusOnMap: 'Focus on map',
    openGoogleMaps: 'Google Maps',
    focusOnFilteredTitle: 'Focus map on filtered events',
    source: 'Source',
    editEvent: 'Edit',
    back: 'Back',
    showDetails: 'Show descriptions and tags',
    hideDetails: 'Hide descriptions and tags',
    eventsAtLocation: 'events here',
    highlightOnMap: 'Highlight on map',
    clickToReadMore: 'Click to read more',
    
    // Timeline
    timelineView: 'Timeline view',
    close: 'Close',
    showMore: 'Show more',
    showLess: 'Show less',
    noEventsInTimeline: 'No events to display in timeline',
    scrollForMore: 'Scroll for more',
    expandDateRange: 'Change the viewed period based on chosen tags',
    
    // Related Events
    aroundSameTime: 'Around the same time',
    samePlace: 'Same place',
    nearByKind: 'Found by tags',
    refreshRelated: 'Refresh',
    expandRelated: 'Show more',
    collapseRelated: 'Show less',
    
    // Datasets Table
    columnFilename: 'Filename',
    columnEventCount: 'Event Count',
    columnUploadedBy: 'Uploaded By',
    columnUploadDate: 'Upload Date',
    noDatasetsFound: 'No datasets found',
    importToCreateFirst: 'Import events to create your first dataset.',
    noDescription: 'No description',
    userPrefix: 'User',
    searchDatasets: 'Search datasets...',
    noMatchingDatasets: 'No datasets match your search criteria.',
    confirmImport: 'Confirm Import',
    
    // Delete Dataset Modal
    deleteDatasetTitle: 'Delete Dataset',
    deleteConfirmQuestion: 'Are you sure you want to delete the dataset',
    deleteWillRemove: 'This will permanently delete:',
    eventsImported: 'events imported from this dataset',
    datasetRecordItself: 'The dataset record itself',
    tagsPreservedNote: 'Note: Tags created during import will be preserved.',
    cancel: 'Cancel',
    deleting: 'Deleting...',
    deleteDataset: 'Delete Dataset',
    
    // Create Dataset Modal
    createEmptyDatasetTitle: 'Create Empty Dataset',
    datasetName: 'Dataset Name*',
    datasetNamePlaceholder: 'e.g., My Historical Events',
    descriptionOptional: 'Description (optional)',
    descriptionPlaceholder: 'Brief description of this dataset...',
    creating: 'Creating...',
    createDataset: 'Create Dataset',
    datasetNameRequired: 'Dataset name is required',
    
    // Dataset Error Messages
    failedToLoadDatasets: 'Failed to load datasets',
    selectValidJson: 'Please select a valid JSON file',
    invalidFileFormat: 'Invalid file format: missing events array',
    invalidJsonFormat: 'Invalid JSON file format',
    failedToImport: 'Failed to import dataset',
    mustBeLoggedIn: 'You must be logged in to create datasets',
    failedToCreate: 'Failed to create dataset',
    failedToExport: 'Failed to export dataset',
    failedToDelete: 'Failed to delete dataset',
    
    // Dataset Action Tooltips
    exportDatasetTitle: 'Export dataset:',
    deleteDatasetTitle: 'Delete dataset:',
    resetModifiedTitle: 'Mark as exported (clear modified flag)',
    datasetModified: 'Dataset has been modified since last export',
    failedToResetModified: 'Failed to reset modified flag',
    unknown: 'Unknown',
    
    // Regions
    regions: 'Regions',
    region: 'Region',
    createRegion: 'Create Region',
    editRegion: 'Edit Region',
    deleteRegion: 'Delete Region',
    regionName: 'Region Name',
    regionColor: 'Region Color',
    fillOpacity: 'Fill Opacity',
    borderColor: 'Border Color',
    borderWidth: 'Border Width',
    linkedTemplates: 'Linked Periods',
    drawRegion: 'Draw Region',
    importGeoJSON: 'Import GeoJSON',
    noRegions: 'No regions found',
    confirmDeleteRegion: 'Are you sure you want to delete this region?',
    adminRegionsTitle: 'Regions Management',
    adminRegionsSubtitle: 'Manage map regions and territorial boundaries',
    searchRegions: 'Search regions...',
    regionDescription: 'Description',
    pasteGeoJSON: 'Paste GeoJSON',
    geoJSONPlaceholder: 'Paste GeoJSON data here...',
    invalidGeoJSON: 'Invalid GeoJSON format',
    failedToLoadRegions: 'Failed to load regions',
    failedToCreateRegion: 'Failed to create region',
    failedToUpdateRegion: 'Failed to update region',
    failedToDeleteRegion: 'Failed to delete region',
    selectTemplates: 'Select periods to link',
    noTemplatesLinked: 'No periods linked',
    regionSaved: 'Region saved successfully',
    regionDeleted: 'Region deleted successfully'
  },
  ru: {
    // Filters
    filters: 'Фильтры',
    historicalEvents: 'Исторические события',
    eventsFromToPrefix: 'События с',
    eventsFromToMiddle: 'по',
    historicalPeriod: 'Исторический период',
    specificPeriod: 'Сегмент:',
    selectPeriodGroup: 'Выбрать период',
    from: 'С:',
    to: 'По:',
    step: 'Шаг:',
    defaultPeriod: 'По умолчанию (1 н.э. - Сегодня)',
    customDateRange: 'Произвольный диапазон дат',
    selectSpecificPeriod: 'Выберите конкретный период...',
    noTemplatesAvailable: 'Шаблоны недоступны',
    loading: 'Загрузка',
    years: 'лет',
    apply: 'Применить',
    emptyStateTitle: 'Событий не найдено',
    emptyStateHint: 'Попробуйте выбрать другой исторический период или изменить диапазон дат и фильтры',
    emptyStateSuggestion: 'Выбрать период',
    
    // Pin Mode
    pinModeActive: 'Нажмите на карту для выбора местоположения',
    pinModeHint: '(Правый клик или Esc для отмены)',
    pickLocationFromMap: 'Выбрать местоположение на карте',
    clickMapToSetLocation: 'Нажмите на карту для выбора (Правый клик или Esc для отмены)',
    
    // Header Navigation
    map: 'Карта',
    admin: 'Управление',
    events: 'События',
    tags: 'Теги',
    datasets: 'Датасеты',
    users: 'Пользователи',
    
    // Authentication
    login: 'Войти',
    logout: 'Выйти',
    welcome: 'Добро пожаловать',
    loggingIn: 'Вход...',
    about: 'О проекте',
    
    // About Page
    aboutTitle: 'О проекте',
    aboutProjectDescription: 'timediverr — интерактивная платформа, в основе которой простой принцип: у каждого события есть время и место. Мне часто интересно понять контекст события, для чего часто нужно провести отдельное исследование. С помощью этого проекта я пытаюсь упростить этот процесс.',
    aboutFeaturesTitle: 'Возможности',
    aboutFeature1: 'Интерактивная карта мира с маркерами исторических событий',
    aboutFeature2: 'Фильтрация событий по изучаемому региону, временной шкале и историческим периодам. Визуализация исторических регионов для выбранного периода',
    aboutFeature3: 'Категоризация, поиск и фильтрация событий по тегам. Трекинг событий с тегами от самого раннего к самому позднему',
    aboutFeature4: 'Полноценная админ-панель для управления событиями, тегами, периодами и регионами',
    aboutFeature5: 'Структурирование наборов событий в датасеты, инструментарий для экспорта и импорта датасетов в JSON',
    aboutUseCasesTitle: 'Варианты использования',
    aboutUseCase1: 'Преподаватели могут использовать приложение для демонстраций, чтобы показать контекст расцвета и падения империй',
    aboutUseCase2: 'Исследователи могут визуализировать исторические хронологии для своих книг или научных работ',
    aboutUseCase3: 'Вы можете ответить на вопросы: "А что еще произошло в том году, когда я пошел в школу?", "А что за история у места, где я нахожусь?", "Как развивалась греческая философия?", "Как выглядел поход Ганнибала?" и другие',
    aboutUseCase4: 'Вы можете использовать платформу как основу для своих наработок - запустить своё приложение, сформировать свои датасеты, развернуть свои последовательности событий на карте, создать свою карту достопримечательностей - и так далее',
    aboutUseCase5: 'Музеи и культурные учреждения могут создавать интерактивные экспонаты для посетителей',
    aboutOpenSource: 'Проект имеет открытый исходный код и доступен любому желающему. База данных формируется из открытых, публичных источников. Предлагайте свои изменения, датасеты или просто используйте приложение так, как вам удобно',
    aboutDisclaimer: 'Я не историк, поэтому при знакомстве с картой проявляйте здоровый скептицизм. Со своей стороны, я стараюсь проверять всю информацию, прежде чем добавить её на карту.',
    aboutContact: 'Связаться',
    aboutSupportTitle: 'Поддержать timediverr',
    aboutSupportDescription: 'В проекте нет и не будет рекламы. Если вам понравился проект и вы хотели бы поддержать его развитие, можно использовать для этого:',
    aboutSupportLinkText: 'Перейти',
    backToMap: 'Вернуться к карте',
    
    // Geolocation
    geolocationButton: 'Найти моё местоположение',
    geolocationLoading: 'Определение местоположения...',
    geolocationNotSupported: 'Геолокация не поддерживается вашим браузером',
    geolocationPermissionDenied: 'Доступ к местоположению запрещён. Разрешите доступ в настройках браузера.',
    geolocationUnavailable: 'Информация о местоположении недоступна',
    geolocationTimeout: 'Время запроса местоположения истекло',
    geolocationError: 'Произошла ошибка при определении местоположения',
    
    // URL sharing
    shareUrl: 'Скопировать ссылку',
    shareCopied: 'Ссылка скопирована!',
    
    // Toolbar short labels
    toolbarShare: 'Ссылка',
    toolbarTimeline: 'Лента',
    toolbarTags: 'Теги',
    toolbarHere: 'Здесь',
    toolbarLocate: 'Где я?',
    paginationHint: 'Прокрутка или стрелки для навигации',
    
    // Login Modal
    loginToHistoria: 'Вход в timediverr',
    username: 'Имя пользователя:',
    password: 'Пароль:',
    enterUsername: 'Введите имя пользователя',
    enterPassword: 'Введите пароль',
    
    // Access Levels
    superBadge: 'СУПЕР',
    adminBadge: 'АДМИН',
    editorBadge: 'РЕДАКТОР',
    
    // Admin Events Page
    adminEventsTitle: 'Исторические события',
    adminEventsSubtitle: 'Управление и создание исторических событий',
    createNewEvent: 'Создать новое событие',
    searchEventName: 'Поиск по названию...',
    
    // Admin Tags Page
    adminTagsTitle: 'Управление тегами',
    adminTagsSubtitle: 'Управление тегами и категориями событий',
    createNewTag: 'Создать новый тег',
    
    // Admin Templates Page
    adminTemplatesTitle: 'Исторические периоды',
    adminTemplatesSubtitle: 'Управление шаблонами дат и группами периодов',
    templates: 'Периоды',
    createNewTemplate: 'Новый период',
    createNewGroup: 'Новая группа',
    editTemplate: 'Редактировать период',
    editGroup: 'Редактировать группу',
    updateTemplate: 'Обновить период',
    updateGroup: 'Обновить группу',
    createTemplate: 'Создать период',
    createGroup: 'Создать группу',
    templateGroup: 'Группа',
    selectGroup: 'Выберите группу...',
    templateGroupsTitle: 'Группы периодов',
    searchTemplates: 'Поиск периодов...',
    columnGroup: 'Группа',
    columnDateFrom: 'От',
    columnDateTo: 'До',
    nameEn: 'Название (английский)',
    nameRu: 'Название (русский)',
    descriptionEn: 'Описание (английский)',
    descriptionRu: 'Описание (русский)',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    cancel: 'Отмена',
    saving: 'Сохранение...',
    
    // Admin Users Page
    adminUsersTitle: 'Управление пользователями',
    adminUsersSubtitle: 'Управление учетными записями и уровнями доступа',
    createNewUser: 'Создать нового пользователя',
    
    // Table Column Names
    columnName: 'Название',
    columnDescription: 'Описание',
    columnDate: 'Дата',
    columnLocation: 'Местоположение',
    columnType: 'Тип',
    columnTags: 'Теги',
    columnActions: 'Действия',
    columnColor: 'Цвет',
    columnCreated: 'Создан',
    columnUsageCount: 'Использование',
    columnWeight: 'Вес',
    weightHint: 'Больше вес = отображается первым в списках тегов',
    tagEmoji: 'Эмодзи',
    tagEmojiPlaceholder: '🏛️',
    tagEmojiHint: 'Необязательный эмодзи для замены иконки типа события на карте',
    columnUsername: 'Имя пользователя',
    columnEmail: 'Электронная почта',
    columnAccessLevel: 'Уровень доступа',
    columnStatus: 'Статус',
    columnLastActive: 'Последняя активность',
    
    // Month Names (abbreviated)
    monthJan: 'янв',
    monthFeb: 'фев',
    monthMar: 'мар',
    monthApr: 'апр',
    monthMay: 'мая',
    monthJun: 'июн',
    monthJul: 'июл',
    monthAug: 'авг',
    monthSep: 'сен',
    monthOct: 'окт',
    monthNov: 'ноя',
    monthDec: 'дек',
    // Month Names (full)
    monthFullJan: 'января',
    monthFullFeb: 'февраля',
    monthFullMar: 'марта',
    monthFullApr: 'апреля',
    monthFullMay: 'мая',
    monthFullJun: 'июня',
    monthFullJul: 'июля',
    monthFullAug: 'августа',
    monthFullSep: 'сентября',
    monthFullOct: 'октября',
    monthFullNov: 'ноября',
    monthFullDec: 'декабря',
    
    // Era Labels
    eraBC: 'до н.э.',
    eraAD: 'н.э.',
    yearLabel: 'год',
    
    // Admin Datasets Page
    adminDatasetsTitle: 'Датасеты событий',
    adminDatasetsSubtitle: 'Управление загруженными датасетами событий. Удаление датасета удалит все импортированные из него события.',
    loadingDatasets: 'Загрузка датасетов...',
    tryAgain: 'Попробовать снова',
    importNewDataset: 'Импортировать новый датасет',
    importDatasetDescription: 'Загрузите JSON-файл с историческими событиями для создания нового датасета.',
    chooseDatasetFile: 'Выбрать файл датасета',
    selectedFile: 'Выбран:',
    importing: 'Импорт...',
    importDataset: 'Импортировать датасет',
    clear: 'Очистить',
    or: 'или',
    createEmptyDataset: 'Создать пустой датасет',
    
    // Tag Filter
    filteredByTags: 'Теги',
    clearAllTags: 'Очистить',
    clearAll: 'Очистить',
    remove: 'Удалить',
    allTags: 'Все теги',
    searchTags: 'Поиск тегов...',
    noTagsFound: 'Теги не найдены',
    followEvents: 'Связать',
    enableNarrativeFlow: 'Включить нарративный поток - соединить события хронологически',
    disableNarrativeFlow: 'Отключить нарративный поток',
    focusOnMap: 'Фокус на карте',
    openGoogleMaps: 'Google Maps',
    focusOnFilteredTitle: 'Показать отфильтрованные события на карте',
    source: 'Источник',
    editEvent: 'Редактировать',
    back: 'Назад',
    showDetails: 'Показать описания и теги',
    hideDetails: 'Скрыть описания и теги',
    eventsAtLocation: 'событий здесь',
    highlightOnMap: 'Выделить на карте',
    clickToReadMore: 'Нажмите, чтобы читать далее',
    
    // Timeline
    timelineView: 'Вид временной шкалы',
    close: 'Закрыть',
    showMore: 'Показать больше',
    showLess: 'Показать меньше',
    noEventsInTimeline: 'Нет событий для отображения на временной шкале',
    scrollForMore: 'Прокрутите для загрузки',
    expandDateRange: 'Изменить период просмотра по выбранным тегам',
    
    // Related Events
    aroundSameTime: 'Примерно в то же время',
    samePlace: 'То же место',
    nearByKind: 'Найдено по тегам',
    refreshRelated: 'Обновить',
    expandRelated: 'Показать больше',
    collapseRelated: 'Скрыть',
    
    // Datasets Table
    columnFilename: 'Имя файла',
    columnEventCount: 'Количество событий',
    columnUploadedBy: 'Загрузил',
    columnUploadDate: 'Дата загрузки',
    noDatasetsFound: 'Датасеты не найдены',
    importToCreateFirst: 'Импортируйте события для создания первого датасета.',
    noDescription: 'Без описания',
    userPrefix: 'Пользователь',
    searchDatasets: 'Поиск датасетов...',
    noMatchingDatasets: 'Нет датасетов, соответствующих критериям поиска.',
    confirmImport: 'Подтвердить импорт',
    
    // Delete Dataset Modal
    deleteDatasetTitle: 'Удалить датасет',
    deleteConfirmQuestion: 'Вы уверены, что хотите удалить датасет',
    deleteWillRemove: 'Это безвозвратно удалит:',
    eventsImported: 'событий, импортированных из этого датасета',
    datasetRecordItself: 'Сам датасет',
    tagsPreservedNote: 'Примечание: Теги, созданные при импорте, будут сохранены.',
    cancel: 'Отмена',
    deleting: 'Удаление...',
    deleteDataset: 'Удалить датасет',
    
    // Create Dataset Modal
    createEmptyDatasetTitle: 'Создать пустой датасет',
    datasetName: 'Название датасета*',
    datasetNamePlaceholder: 'например, Мои исторические события',
    descriptionOptional: 'Описание (необязательно)',
    descriptionPlaceholder: 'Краткое описание датасета...',
    creating: 'Создание...',
    createDataset: 'Создать датасет',
    datasetNameRequired: 'Название датасета обязательно',
    
    // Dataset Error Messages
    failedToLoadDatasets: 'Не удалось загрузить датасеты',
    selectValidJson: 'Пожалуйста, выберите корректный JSON-файл',
    invalidFileFormat: 'Неверный формат файла: отсутствует массив events',
    invalidJsonFormat: 'Неверный формат JSON-файла',
    failedToImport: 'Не удалось импортировать датасет',
    mustBeLoggedIn: 'Вы должны войти в систему для создания датасетов',
    failedToCreate: 'Не удалось создать датасет',
    failedToExport: 'Не удалось экспортировать датасет',
    failedToDelete: 'Не удалось удалить датасет',
    
    // Dataset Action Tooltips
    exportDatasetTitle: 'Экспортировать датасет:',
    deleteDatasetTitle: 'Удалить датасет:',
    resetModifiedTitle: 'Отметить как экспортированный (сбросить флаг изменений)',
    datasetModified: 'Датасет был изменён с момента последнего экспорта',
    failedToResetModified: 'Не удалось сбросить флаг изменений',
    unknown: 'Неизвестно',
    
    // Regions
    regions: 'Регионы',
    region: 'Регион',
    createRegion: 'Создать регион',
    editRegion: 'Редактировать регион',
    deleteRegion: 'Удалить регион',
    regionName: 'Название региона',
    regionColor: 'Цвет региона',
    fillOpacity: 'Прозрачность заливки',
    borderColor: 'Цвет границы',
    borderWidth: 'Толщина границы',
    linkedTemplates: 'Связанные периоды',
    drawRegion: 'Нарисовать регион',
    importGeoJSON: 'Импорт GeoJSON',
    noRegions: 'Регионы не найдены',
    confirmDeleteRegion: 'Вы уверены, что хотите удалить этот регион?',
    adminRegionsTitle: 'Управление регионами',
    adminRegionsSubtitle: 'Управление регионами карты и территориальными границами',
    searchRegions: 'Поиск регионов...',
    regionDescription: 'Описание',
    pasteGeoJSON: 'Вставить GeoJSON',
    geoJSONPlaceholder: 'Вставьте данные GeoJSON сюда...',
    invalidGeoJSON: 'Неверный формат GeoJSON',
    failedToLoadRegions: 'Не удалось загрузить регионы',
    failedToCreateRegion: 'Не удалось создать регион',
    failedToUpdateRegion: 'Не удалось обновить регион',
    failedToDeleteRegion: 'Не удалось удалить регион',
    selectTemplates: 'Выберите периоды для привязки',
    noTemplatesLinked: 'Нет привязанных периодов',
    regionSaved: 'Регион успешно сохранён',
    regionDeleted: 'Регион успешно удалён'
  }
}

// Supported locales
const SUPPORTED_LOCALES = {
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸'
  },
  ru: {
    code: 'ru', 
    name: 'Русский',
    flag: '🇷🇺'
  }
}

// Global locale state with validation
const locale = ref(localStorage.getItem('historia-locale') || 'en')

// Validate and fix invalid locale in localStorage
if (!SUPPORTED_LOCALES[locale.value]) {
  locale.value = 'en'
  localStorage.setItem('historia-locale', 'en')
}

export function useLocale() {
  const currentLocale = computed(() => SUPPORTED_LOCALES[locale.value] || SUPPORTED_LOCALES.en)
  const supportedLocales = computed(() => Object.values(SUPPORTED_LOCALES))
  
  // Get translated text for current locale
  const t = (key) => {
    const translations = UI_TRANSLATIONS[locale.value] || UI_TRANSLATIONS.en
    return translations[key] || key
  }
  
  const setLocale = (newLocale) => {
    if (SUPPORTED_LOCALES[newLocale]) {
      locale.value = newLocale
      localStorage.setItem('historia-locale', newLocale)
    }
  }
  
  const getLocaleParam = () => {
    return `locale=${locale.value}`
  }
  
  const addLocaleToUrl = (url) => {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${getLocaleParam()}`
  }
  
  // Format date with localized month names and era labels
  // Input: ISO date string like "1453-05-29T00:00:00Z" or "-3500-01-01T00:00:00Z"
  // Output: "29 May 1453 AD" or "29 мая 1453 н.э." or "1 Jan 3500 BC" or "1 янв 3500 до н.э."
  const formatLocalizedDate = (isoDateString, era) => {
    const monthKeys = [
      'monthJan', 'monthFeb', 'monthMar', 'monthApr', 'monthMay', 'monthJun',
      'monthJul', 'monthAug', 'monthSep', 'monthOct', 'monthNov', 'monthDec'
    ]
    
    let year, month, day
    
    if (isoDateString.startsWith('-')) {
      // Negative year format: "-3500-01-01T00:00:00Z"
      const parts = isoDateString.substring(1).split('T')[0].split('-')
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10) - 1
      day = parseInt(parts[2], 10)
    } else {
      // Positive year format: "1453-05-29T00:00:00Z"
      // Use manual parsing to avoid timezone issues
      const parts = isoDateString.split('T')[0].split('-')
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10) - 1
      day = parseInt(parts[2], 10)
    }
    
    const monthName = t(monthKeys[month])

    if (era === 'BC') {
      return `${day} ${monthName} ${year} ${t('eraBC')}`
    }
    return `${day} ${monthName} ${year}`
  }

  // Format day and month only (no year), using full localized month names
  // Input: ISO date string like "0522-09-29T00:00:00Z"
  // Output: "September 29" (en) or "29 сентября" (ru)
  const formatDayMonth = (isoDateString) => {
    if (!isoDateString) return ''
    
    const monthFullKeys = [
      'monthFullJan', 'monthFullFeb', 'monthFullMar', 'monthFullApr', 'monthFullMay', 'monthFullJun',
      'monthFullJul', 'monthFullAug', 'monthFullSep', 'monthFullOct', 'monthFullNov', 'monthFullDec'
    ]
    
    let month, day
    if (isoDateString.startsWith('-')) {
      const parts = isoDateString.substring(1).split('T')[0].split('-')
      month = parseInt(parts[1], 10)
      day = parseInt(parts[2], 10)
    } else {
      const parts = isoDateString.split('T')[0].split('-')
      month = parseInt(parts[1], 10)
      day = parseInt(parts[2], 10)
    }
    
    const monthName = t(monthFullKeys[month - 1])
    
    if (locale.value === 'ru') {
      return `${day} ${monthName}`
    }
    return `${monthName} ${day}`
  }

  // Format event display date with smart year-only detection
  // If date is January 1st (default placeholder), show only "YYYY Era"
  // Otherwise show full "DD.MM.YYYY Era"
  // Input: ISO date string and era ('BC' or 'AD')
  // Output: "1453 AD" or "29.05.1453 AD" or "3500 до н.э." etc.
  const formatEventDisplayDate = (isoDateString, era) => {
    if (!isoDateString) return ''
    
    let year, month, day
    
    if (isoDateString.startsWith('-')) {
      const parts = isoDateString.substring(1).split('T')[0].split('-')
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10)
      day = parseInt(parts[2], 10)
    } else {
      const parts = isoDateString.split('T')[0].split('-')
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10)
      day = parseInt(parts[2], 10)
    }
    
    const isBC = era === 'BC'
    const eraSuffix = isBC ? ` ${t('eraBC')}` : ''

    if (month === 1 && day === 1) {
      return `${year}${eraSuffix}`
    }

    const paddedDay = String(day).padStart(2, '0')
    const paddedMonth = String(month).padStart(2, '0')

    return `${paddedDay}.${paddedMonth}.${year}${eraSuffix}`
  }

  // Same as formatEventDisplayDate but adds the localized "year" word for
  // year-only AD dates (e.g. "year 200" / "200 год"). For dates with a
  // specific day/month or for BC dates the result is identical to the
  // standard formatter.
  const formatEventDisplayDateLong = (isoDateString, era) => {
    if (!isoDateString) return ''

    let year, month, day
    if (isoDateString.startsWith('-')) {
      const parts = isoDateString.substring(1).split('T')[0].split('-')
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10)
      day = parseInt(parts[2], 10)
    } else {
      const parts = isoDateString.split('T')[0].split('-')
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10)
      day = parseInt(parts[2], 10)
    }

    const isYearOnly = month === 1 && day === 1
    if (isYearOnly && era !== 'BC') {
      const word = t('yearLabel')
      return locale.value === 'ru' ? `${year} ${word}` : `${word} ${year}`
    }
    if (isYearOnly) {
      return formatEventDisplayDate(isoDateString, era)
    }
    return formatLocalizedDate(isoDateString, era)
  }

  // Smart formatter for inline event dates in map / timeline views.
  // Year-only dates (Jan 1 placeholder) keep the compact "200" / "200 BC" form,
  // while day/month dates render as a readable "1 March 293" / "1 марта 293".
  const formatEventDisplaySmart = (isoDateString, era) => {
    if (!isoDateString) return ''

    const datePart = isoDateString.startsWith('-')
      ? isoDateString.substring(1).split('T')[0]
      : isoDateString.split('T')[0]
    const parts = datePart.split('-')
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)

    if (month === 1 && day === 1) {
      return formatEventDisplayDate(isoDateString, era)
    }
    return formatLocalizedDate(isoDateString, era)
  }
  
  return {
    locale: computed(() => locale.value),
    currentLocale,
    supportedLocales,
    t,
    setLocale,
    getLocaleParam,
    addLocaleToUrl,
    formatLocalizedDate,
    formatDayMonth,
    formatEventDisplayDate,
    formatEventDisplayDateLong,
    formatEventDisplaySmart
  }
}
