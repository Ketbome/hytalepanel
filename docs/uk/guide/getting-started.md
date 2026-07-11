---
head:
  - - meta
    - name: description
      content: Повний посібник зі встановлення HytalePanel. Навчіться налаштовувати виділені сервери Hytale з Docker та веб-панеллю за хвилини.
  - - meta
    - name: keywords
      content: встановлення hytale, налаштування docker, туторіал сервера, встановити панель hytale, конфігурація сервера
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Як встановити HytalePanel",
        "description": "Покроковий посібник зі встановлення та налаштування Docker контейнера HytalePanel з веб-інтерфейсом адміністрування",
        "inLanguage": "uk-UA",
        "totalTime": "PT10M",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Створити папку проєкту",
            "text": "Створіть директорію для вашого сервера Hytale",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "mkdir hytale && cd hytale"
            }
          },
          {
            "@type": "HowToStep",
            "name": "Завантажити конфігураційні файли",
            "text": "Завантажте docker-compose.yml та .env.example з репозиторію",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml && curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example"
            }
          },
          {
            "@type": "HowToStep",
            "name": "Налаштувати середовище",
            "text": "Скопіюйте .env.example в .env та встановіть ваші облікові дані",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "cp .env.example .env && відредагуйте .env для зміни PANEL_USER та PANEL_PASS"
            }
          },
          {
            "@type": "HowToStep",
            "name": "Запустити панель",
            "text": "Запустіть Docker контейнери",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "docker compose up -d"
            }
          },
          {
            "@type": "HowToStep",
            "name": "Доступ до панелі",
            "text": "Відкрийте http://localhost:3000 у браузері та увійдіть",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "Перейдіть до http://localhost:3000 та використайте налаштовані облікові дані"
            }
          }
        ],
        "tool": [
          {
            "@type": "HowToTool",
            "name": "Docker"
          },
          {
            "@type": "HowToTool",
            "name": "Docker Compose"
          }
        ],
        "supply": [
          {
            "@type": "HowToSupply",
            "name": "4ГБ+ RAM"
          },
          {
            "@type": "HowToSupply",
            "name": "Відкритий порт 3000/TCP"
          }
        ]
      }
---

# Початок роботи

## Вимоги

- Docker та Docker Compose встановлені
- 4ГБ+ RAM доступно на сервер
- Порт 3000/TCP відкритий (панель)
- Порт 5520+/UDP відкритий (ігрові сервери)

## Встановлення

### 1. Створіть папку проекту

```bash
mkdir hytale && cd hytale
```

### 2. Завантажте файли конфігурації

```bash
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example
```

### 3. Налаштуйте середовище

```bash
cp .env.example .env
```

Відредагуйте `.env`:

```env
# Авторизація панелі (ЗМІНІТЬ ЦЕ!)
PANEL_USER=admin
PANEL_PASS=ваш_безпечний_пароль
JWT_SECRET=випадковий-рядок

# Часовий пояс
TZ=Europe/Kiev
```

::: warning
Завжди змінюйте `PANEL_USER` та `PANEL_PASS` перед розгортанням!
:::

### 4. Запустіть панель

```bash
docker compose up -d
```

### 5. Відкрийте панель

Відкрийте [http://localhost:3000](http://localhost:3000) у браузері.

Стандартні облікові дані:

- **Користувач**: `admin`
- **Пароль**: `admin`

## Створення першого сервера

1. Увійдіть у панель
2. Натисніть **"Створити сервер"**
3. Введіть назву (наприклад, "Мій Hytale Сервер")
4. Налаштуйте RAM (рекомендовано: 4G мін, 8G макс)
5. Натисніть **"Створити"**
6. Натисніть **"Увійти"** для доступу до сервера
7. Перейдіть на вкладку **Setup** та натисніть **"Завантажити файли"**
8. Зачекайте завантаження (~2ГБ)
9. Перейдіть на вкладку **Control** та натисніть **"СТАРТ"**

Ваш сервер працює!

::: info Потрібен акаунт Hytale
Файли сервера завантажуються офіційним `hytale-downloader`, який вимагає входу з **акаунтом Hytale** (Early Access). Під час першого завантаження вкладка Setup показує посилання та код пристрою — відкрийте посилання в будь-якому браузері, введіть код, і завантаження продовжиться автоматично. Облікові дані зберігаються у томі сервера, тож вхід потрібен лише один раз.
:::

## Налаштування кількох серверів

Ви можете створити кілька серверів, кожен з:

- Різними портами (5520, 5521, 5522, ...)
- Різним розподілом RAM
- Окремими налаштуваннями модів
- Незалежними даними світу

### Призначення портів

Кожен сервер потребує унікальний UDP порт. Панель автоматично призначає порти починаючи з 5520.

| Сервер   | Порт     |
| -------- | -------- |
| Сервер 1 | 5520/UDP |
| Сервер 2 | 5521/UDP |
| Сервер 3 | 5522/UDP |

Переконайтеся, що ці порти відкриті у вашому фаєрволі.

## Типові команди

```bash
# Переглянути логи панелі
docker compose logs -f

# Зупинити панель
docker compose down

# Оновити до останньої версії
docker compose pull && docker compose up -d

# Резервне копіювання всіх серверів
tar -czvf backup-$(date +%Y%m%d).tar.gz data/
```

## Налаштування фаєрволу

### Linux (UFW)

```bash
# Панель
ufw allow 3000/tcp

# Ігрові сервери (налаштуйте діапазон за потреби)
ufw allow 5520:5530/udp
```

### Windows

```powershell
# Панель
New-NetFirewallRule -DisplayName "Hytale Panel" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Ігрові сервери
New-NetFirewallRule -DisplayName "Hytale Game" -Direction Inbound -Protocol UDP -LocalPort 5520-5530 -Action Allow
```

## Підсумок портів

| Сервіс     | Порт | Протокол |
| ---------- | ---- | -------- |
| Веб панель | 3000 | TCP      |
| Сервер 1   | 5520 | UDP      |
| Сервер 2   | 5521 | UDP      |
| ...        | ...  | UDP      |

## Наступні кроки

- [Налаштування серверів](/uk/guide/configuration)
- [Веб панель](/uk/guide/panel)
- [Встановлення модів](/uk/guide/mods)
- [Вирішення проблем](/uk/guide/troubleshooting)
