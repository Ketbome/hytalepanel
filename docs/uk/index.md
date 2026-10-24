---
layout: home

head:
  - - meta
    - name: description
      content: Docker образ для виділеного сервера Hytale з веб-панеллю адміністрування, JWT автентифікацією, консоллю в реальному часі, файловим менеджером та повною підтримкою модів.
  - - meta
    - name: keywords
      content: hytale сервер, docker, виділений сервер, веб-панель, моди, jwt автентифікація, файловий менеджер, консоль реальний час

hero:
  name: HytalePanel
  text: Веб-панель для вашого сервера Hytale
  tagline: Один Docker-образ із живою консоллю, файлами, модами та резервними копіями.
  image:
    src: /images/panel.png
    alt: Сторінка сервера в HytalePanel із живою консоллю поруч із вкладкою модів
  actions:
    - theme: brand
      text: Почати
      link: /uk/guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/ketbome/hytalepanel
---

## Швидкий старт

Потрібні Docker із Compose та приблизно 4 ГБ вільної RAM на кожен сервер.

```bash
# 1. Створити папку
mkdir hytale && cd hytale

# 2. Завантажити файли
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example

# 3. Налаштувати
cp .env.example .env
nano .env  # Змініть PANEL_USER та PANEL_PASS!

# 4. Запустити
docker compose up -d

# 5. Відкрити панель http://localhost:3000
```

## Що входить

<div class="hp-features">
<dl>
  <div>
    <dt>Жива консоль</dt>
    <dd>Стежте за логом сервера в реальному часі, фільтруйте його за рівнем і надсилайте команди.</dd>
  </div>
  <div>
    <dt>Файловий менеджер</dt>
    <dd>Переглядайте, завантажуйте, редагуйте та скачуйте файли сервера, навіть коли сервер зупинено.</dd>
  </div>
  <div>
    <dt>Моди (Modtale, CurseForge)</dt>
    <dd>Шукайте в обох каталогах, встановлюйте в один клік і перевіряйте оновлення встановлених модів.</dd>
  </div>
  <div>
    <dt>Резервні копії</dt>
    <dd>Створюйте та відновлюйте резервні копії вручну або за розкладом, з обмеженням їх кількості.</dd>
  </div>
  <div>
    <dt>Кілька серверів</dt>
    <dd>Керуйте кількома серверами Hytale з однієї панелі, кожен у власному контейнері й на власному порту.</dd>
  </div>
  <div>
    <dt>Чотири мови</dt>
    <dd>Панель доступна англійською, іспанською, українською та бразильською португальською.</dd>
  </div>
</dl>
</div>

## Документація

[Посібник](/uk/guide/getting-started) охоплює встановлення, налаштування, панель і моди. [Довідник](/uk/reference/environment) містить усі змінні середовища, REST-ендпоінти та події сокета.
