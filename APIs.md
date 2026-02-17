# Unified Faith Service - Islamic API Documentation

## Base URL
```
http://localhost:8000
```

## Authentication

### Bearer Token
Most protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```

Obtain a token by:
1. Logging in via `/auth/login`
2. Registering via `/auth/register`
3. Using OTP via `/auth/login/verify-otp`

---

## Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [Names of Allah APIs](#names-of-allah-apis)
3. [Names of Muhammad (saw) APIs](#names-of-muhammad-saw-apis)
4. [Calendar APIs](#calendar-apis)
5. [Prayers APIs](#prayers-apis)
6. [Quran APIs](#quran-apis)
7. [Dhikr APIs](#dhikr-apis)
8. [Qibla APIs](#qibla-apis)
9. [Feelings APIs](#feelings-apis)

---

## Authentication APIs

### Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate user with email and password

**Request:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "arhamimam2000@gmail.com",
    "password": "Admin@1099"
  }'
```

**Response (200 OK):**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "arhamimam2000@gmail.com",
  "firstName": "Arham",
  "lastName": "Imam",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

---

### Register

**Endpoint:** `POST /auth/register`

**Description:** Register a new user account

**Request:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Test@1234",
    "fullName": "New User"
  }'
```

**Response (201 Created):**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174001",
  "email": "newuser@example.com",
  "firstName": "New",
  "lastName": "User",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

---

### Request OTP

**Endpoint:** `POST /auth/login/request-otp`

**Description:** Request One-Time Password for login

**Request:**
```bash
curl -X POST http://localhost:8000/auth/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "arhamimam2000@gmail.com"
  }'
```

**Response (200 OK):**
```json
{
  "message": "OTP sent to email",
  "expiresIn": 300
}
```

---

### Verify OTP

**Endpoint:** `POST /auth/login/verify-otp`

**Description:** Verify OTP and get tokens

**Request:**
```bash
curl -X POST http://localhost:8000/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "arhamimam2000@gmail.com",
    "otp": "123456"
  }'
```

**Response (200 OK):**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "arhamimam2000@gmail.com",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

---

### Refresh Token

**Endpoint:** `POST /auth/refresh`

**Description:** Refresh access token using refresh token

**Request:**
```bash
curl -X POST http://localhost:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

---

### Logout

**Endpoint:** `POST /auth/logout`

**Description:** Logout and revoke refresh token

**Request:**
```bash
curl -X POST http://localhost:8000/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### Get Profile

**Endpoint:** `GET /auth/profile`

**Description:** Get current user profile (requires authentication)

**Request:**
```bash
curl -X GET http://localhost:8000/auth/profile \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "arhamimam2000@gmail.com",
  "firstName": "Arham",
  "lastName": "Imam",
  "phone": "+92123456789",
  "isActive": true,
  "isVerified": true,
  "createdAt": "2026-01-15T10:00:00Z"
}
```

---

### Validate Token

**Endpoint:** `GET /auth/validate`

**Description:** Validate access token (requires authentication)

**Request:**
```bash
curl -X GET http://localhost:8000/auth/validate \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "valid": true,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "arhamimam2000@gmail.com"
}
```

---

## Names of Allah APIs

### Get All Names of Allah

**Endpoint:** `GET /api/v1/islam/names/allah`

**Description:** Get all 99 Names of Allah

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/names/allah
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "nameArabic": "الرحمن",
    "nameTranslit": "Ar-Rahman",
    "nameEnglish": "The Most Gracious",
    "meaning": "The Most Gracious",
    "description": "The Most Gracious",
    "audioUrl": null
  },
  {
    "id": 2,
    "nameArabic": "الرحيم",
    "nameTranslit": "Ar-Rahim",
    "nameEnglish": "The Most Merciful",
    "meaning": "The Most Merciful",
    "description": "The Most Merciful",
    "audioUrl": null
  },
  // ... 97 more names
]
```

---

### Get Allah Name by ID

**Endpoint:** `GET /api/v1/islam/names/allah/:id`

**Description:** Get a specific Name of Allah by ID (1-99)

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/names/allah/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "nameArabic": "الرحمن",
  "nameTranslit": "Ar-Rahman",
  "nameEnglish": "The Most Gracious",
  "meaning": "The Most Gracious",
  "description": "The Most Gracious",
  "audioUrl": null
}
```

---

### Get Daily Name of Allah

**Endpoint:** `GET /api/v1/islam/names/daily`

**Description:** Get today's Name of Allah (rotates daily through 99 names)

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/names/daily
```

**Response (200 OK):**
```json
{
  "id": 48,
  "nameArabic": "العليم",
  "nameTranslit": "Al-Alim",
  "nameEnglish": "The All-Knowing",
  "meaning": "The All-Knowing",
  "description": "The All-Knowing",
  "audioUrl": null
}
```

---

### Add Favorite Name of Allah

**Endpoint:** `POST /api/v1/islam/names/favorites`

**Description:** Add a Name of Allah to user's favorites (requires authentication)

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/islam/names/favorites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "nameId": 1
  }'
```

**Response (201 Created):**
```json
{
  "id": "f8f3b5e5-8f5e-4f8f-8f8f-8f8f8f8f8f8f",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "nameId": 1,
  "createdAt": "2026-02-17T10:00:00Z"
}
```

---

## Names of Muhammad (saw) APIs

### Get All Names of Muhammad

**Endpoint:** `GET /api/v1/islam/names/muhammad`

**Description:** Get all 99 Names of Muhammad (saw)

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/names/muhammad
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "nameArabic": "مُحَمَّد",
    "nameTranslit": "Muhammad",
    "nameEnglish": "Muhammad",
    "meaning": "The Praised One",
    "description": "The most commonly used name of the Prophet. It means 'the one who is praised and commended.'",
    "audioUrl": null
  },
  {
    "id": 2,
    "nameArabic": "أَحْمَد",
    "nameTranslit": "Ahmad",
    "nameEnglish": "Ahmad",
    "meaning": "The Most Praised",
    "description": "Another name of the Prophet meaning 'the most praised one,' derived from the same root as Muhammad.",
    "audioUrl": null
  },
  // ... 97 more names
]
```

---

### Get Muhammad Name by ID

**Endpoint:** `GET /api/v1/islam/names/muhammad/:id`

**Description:** Get a specific Name of Muhammad (saw) by ID (1-99)

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/names/muhammad/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "nameArabic": "مُحَمَّد",
  "nameTranslit": "Muhammad",
  "nameEnglish": "Muhammad",
  "meaning": "The Praised One",
  "description": "The most commonly used name of the Prophet. It means 'the one who is praised and commended.'",
  "audioUrl": null
}
```

---

### Get Daily Name of Muhammad

**Endpoint:** `GET /api/v1/islam/names/muhammad/daily`

**Description:** Get today's Name of Muhammad (saw) (rotates daily through 99 names)

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/names/muhammad/daily
```

**Response (200 OK):**
```json
{
  "id": 48,
  "nameArabic": "الهادِي",
  "nameTranslit": "Al-Hadi",
  "nameEnglish": "The Guide",
  "meaning": "The Guide to the Right Path",
  "description": "The one who guides people to the straight path of Allah.",
  "audioUrl": null
}
```

---

### Add Favorite Name of Muhammad

**Endpoint:** `POST /api/v1/islam/names/muhammad/favorites`

**Description:** Add a Name of Muhammad (saw) to user's favorites (requires authentication)

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/islam/names/muhammad/favorites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "nameId": 1
  }'
```

**Response (201 Created):**
```json
{
  "id": "a7e3f8f5-8e5e-4f8f-8f8f-8f8f8f8f8f8f",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "nameId": 1,
  "createdAt": "2026-02-17T10:00:00Z"
}
```

---

### Get User's Favorite Names of Muhammad

**Endpoint:** `GET /api/v1/islam/names/muhammad/favorites/list`

**Description:** Get all user's favorite Names of Muhammad (saw) (requires authentication)

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/names/muhammad/favorites/list \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "nameArabic": "مُحَمَّد",
    "nameTranslit": "Muhammad",
    "nameEnglish": "Muhammad",
    "meaning": "The Praised One",
    "description": "The most commonly used name of the Prophet...",
    "audioUrl": null
  },
  {
    "id": 95,
    "nameArabic": "خَاتَم النَّبِيِّين",
    "nameTranslit": "Khatam An-Nabiyeen",
    "nameEnglish": "The Seal of the Prophets",
    "meaning": "The Seal of the Prophets",
    "description": "The last and final prophet, sealing the line of prophethood.",
    "audioUrl": null
  }
]
```

---

## Calendar APIs

### Get Today's Date

**Endpoint:** `GET /api/v1/islam/calendar/today`

**Description:** Get today's Gregorian and Hijri date

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/calendar/today
```

**Response (200 OK):**
```json
{
  "gregorian": {
    "year": 2026,
    "month": 2,
    "day": 17,
    "date": "2026-02-17"
  },
  "hijri": {
    "year": 1447,
    "month": 8,
    "day": 27,
    "monthName": "Sha'ban",
    "monthNameArabic": "شعبان"
  }
}
```

---

### Convert Gregorian to Hijri

**Endpoint:** `GET /api/v1/islam/calendar/convert/to-hijri?date=2026-02-15`

**Description:** Convert Gregorian date to Hijri

**Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/islam/calendar/convert/to-hijri?date=2026-02-15"
```

**Response (200 OK):**
```json
{
  "gregorian": {
    "year": 2026,
    "month": 2,
    "day": 15
  },
  "hijri": {
    "year": 1447,
    "month": 8,
    "day": 25,
    "monthName": "Sha'ban",
    "monthNameArabic": "شعبان"
  }
}
```

---

### Convert Hijri to Gregorian

**Endpoint:** `GET /api/v1/islam/calendar/convert/to-gregorian?year=1447&month=8&day=27`

**Description:** Convert Hijri date to Gregorian

**Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/islam/calendar/convert/to-gregorian?year=1447&month=8&day=27"
```

**Response (200 OK):**
```json
{
  "hijri": {
    "year": 1447,
    "month": 8,
    "day": 27,
    "monthName": "Sha'ban",
    "monthNameArabic": "شعبان"
  },
  "gregorian": {
    "year": 2026,
    "month": 2,
    "day": 17
  }
}
```

---

### Get All Islamic Events

**Endpoint:** `GET /api/v1/islam/calendar/events`

**Description:** Get all Islamic events for the year

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/calendar/events
```

**Response (200 OK):**
```json
[
  {
    "id": "abc123",
    "name": "Ramadan Begins",
    "nameArabic": "رمضان",
    "description": "The holy month of fasting",
    "hijriMonth": 9,
    "hijriDay": 1,
    "importance": "major"
  },
  {
    "id": "abc124",
    "name": "Eid al-Fitr",
    "nameArabic": "عيد الفطر",
    "description": "Festival of Breaking the Fast",
    "hijriMonth": 10,
    "hijriDay": 1,
    "importance": "major"
  }
]
```

---

## Prayers APIs

### Get Prayer Times

**Endpoint:** `GET /api/v1/islam/prayers/times?lat=12.9716&lng=77.5946&date=2026-02-15`

**Description:** Get prayer times for a location and date

**Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/islam/prayers/times?lat=12.9716&lng=77.5946&date=2026-02-15"
```

**Response (200 OK):**
```json
{
  "date": "2026-02-15",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "prayers": {
    "fajr": "05:30:00",
    "sunrise": "06:45:00",
    "dhuhr": "12:30:00",
    "asr": "15:45:00",
    "maghrib": "18:15:00",
    "isha": "19:30:00"
  }
}
```

---

### Get Current Prayer

**Endpoint:** `GET /api/v1/islam/prayers/current?lat=12.9716&lng=77.5946`

**Description:** Get current prayer time

**Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/islam/prayers/current?lat=12.9716&lng=77.5946"
```

**Response (200 OK):**
```json
{
  "currentPrayer": "dhuhr",
  "nextPrayer": "asr",
  "timeRemaining": "3h 15m"
}
```

---

### Log Prayer

**Endpoint:** `POST /api/v1/islam/prayers/log`

**Description:** Log a prayer (requires authentication)

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/islam/prayers/log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "prayerName": "fajr",
    "date": "2026-02-15",
    "status": "on_time"
  }'
```

**Response (201 Created):**
```json
{
  "id": "log123",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "prayerName": "fajr",
  "date": "2026-02-15",
  "status": "on_time",
  "loggedAt": "2026-02-15T05:35:00Z"
}
```

---

## Quran APIs

### Get All Surahs

**Endpoint:** `GET /api/v1/islam/quran/surahs`

**Description:** Get all 114 Surahs

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/quran/surahs
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "nameArabic": "الفاتحة",
    "nameEnglish": "Al-Fatihah",
    "nameTransliteration": "Al-Fatihah",
    "revelationPlace": "Meccan",
    "verseCount": 7
  },
  {
    "id": 2,
    "nameArabic": "البقرة",
    "nameEnglish": "Al-Baqarah",
    "nameTransliteration": "Al-Baqarah",
    "revelationPlace": "Medinan",
    "verseCount": 286
  }
]
```

---

### Get Surah with Verses

**Endpoint:** `GET /api/v1/islam/quran/surah/1`

**Description:** Get a specific Surah with all its verses

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/quran/surah/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "nameArabic": "الفاتحة",
  "nameEnglish": "Al-Fatihah",
  "verses": [
    {
      "id": "verse1",
      "surahId": 1,
      "verseNumber": 1,
      "textArabic": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "textSimple": "بسم الله الرحمن الرحيم",
      "translations": [
        {
          "language": "en",
          "authorName": "Saheeh International",
          "text": "In the name of Allah, the Entirely Merciful, the Especially Merciful."
        }
      ]
    }
  ]
}
```

---

### Search Verses

**Endpoint:** `GET /api/v1/islam/quran/search?q=mercy`

**Description:** Search for verses containing keyword

**Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/islam/quran/search?q=mercy"
```

**Response (200 OK):**
```json
[
  {
    "surahId": 1,
    "verseNumber": 3,
    "textArabic": "الرَّحْمَٰنِ الرَّحِيمِ",
    "translation": "the Entirely Merciful, the Especially Merciful"
  }
]
```

---

## Dhikr APIs

### Get Counters

**Endpoint:** `GET /api/v1/islam/dhikr/counters`

**Description:** Get all dhikr counters for user (requires authentication)

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/dhikr/counters \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
[
  {
    "id": "counter1",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Morning Dhikr",
    "phraseArabic": "سبحان الله",
    "phraseEnglish": "Subhanallah",
    "count": 45,
    "targetCount": 100,
    "isActive": true,
    "createdAt": "2026-02-10T10:00:00Z"
  }
]
```

---

### Create Counter

**Endpoint:** `POST /api/v1/islam/dhikr/counters`

**Description:** Create new dhikr counter (requires authentication)

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/islam/dhikr/counters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Morning Dhikr",
    "phrase": "Subhanallah",
    "targetCount": 100
  }'
```

**Response (201 Created):**
```json
{
  "id": "counter1",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Morning Dhikr",
  "phraseArabic": "سبحان الله",
  "phraseEnglish": "Subhanallah",
  "count": 0,
  "targetCount": 100,
  "isActive": true,
  "createdAt": "2026-02-17T10:00:00Z"
}
```

---

### Increment Counter

**Endpoint:** `PATCH /api/v1/islam/dhikr/counters/:id`

**Description:** Increment dhikr counter (requires authentication)

**Request:**
```bash
curl -X PATCH http://localhost:8000/api/v1/islam/dhikr/counters/counter1 \
  -H "Content-Type: application/json" \
  -d '{
    "count": 1
  }'
```

**Response (200 OK):**
```json
{
  "id": "counter1",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Morning Dhikr",
  "phraseArabic": "سبحان الله",
  "phraseEnglish": "Subhanallah",
  "count": 46,
  "targetCount": 100,
  "isActive": true,
  "updatedAt": "2026-02-17T10:05:00Z"
}
```

---

### Create Goal

**Endpoint:** `POST /api/v1/islam/dhikr/goals`

**Description:** Create dhikr goal (requires authentication)

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/islam/dhikr/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "phrase": "Alhamdulillah",
    "targetCount": 1000,
    "period": "weekly"
  }'
```

**Response (201 Created):**
```json
{
  "id": "goal1",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "phraseArabic": "الحمد لله",
  "phraseEnglish": "Alhamdulillah",
  "targetCount": 1000,
  "period": "weekly",
  "startDate": "2026-02-17",
  "endDate": "2026-02-24",
  "createdAt": "2026-02-17T10:00:00Z"
}
```

---

## Qibla APIs

### Get Qibla Direction

**Endpoint:** `GET /api/v1/islam/qibla?lat=12.9716&lng=77.5946`

**Description:** Get Qibla direction from a location

**Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/islam/qibla?lat=12.9716&lng=77.5946"
```

**Response (200 OK):**
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "direction": 294.87,
  "directionName": "NW (Northwest)",
  "distance": 1975.58
}
```

---

## Feelings APIs

### Get All Emotions

**Endpoint:** `GET /api/v1/islam/feelings`

**Description:** Get all available emotions

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/feelings
```

**Response (200 OK):**
```json
[
  {
    "id": "emotion1",
    "name": "Angry",
    "slug": "angry",
    "icon": "😠"
  },
  {
    "id": "emotion2",
    "name": "Anxious",
    "slug": "anxious",
    "icon": "😰"
  }
]
```

---

### Get Emotion Details

**Endpoint:** `GET /api/v1/islam/feelings/:slug`

**Description:** Get emotion with remedies

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/islam/feelings/anxious
```

**Response (200 OK):**
```json
{
  "id": "emotion2",
  "name": "Anxious",
  "slug": "anxious",
  "icon": "😰",
  "remedies": [
    {
      "id": "remedy1",
      "arabicText": "اَللّٰهُمَّ إِنِّيْ أَعُوْذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ",
      "transliteration": "Allāhumma innī aʿūdhu bika minal-hammi wal-ḥazan",
      "translation": "O Allah, I seek Your protection from anxiety and grief",
      "source": "Sahih al-Bukhari 6363"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "nameId": ["nameId must be a number"]
  }
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Muhammad's name with ID 999 not found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "timestamp": "2026-02-17T10:00:00Z"
}
```

---

## Quick Reference

| Category | Count | Endpoints |
|----------|-------|-----------|
| Auth | 7 | Login, Register, OTP, Refresh, Logout, Profile, Validate |
| Names of Allah | 4 | Get All, Get By ID, Get Daily, Add Favorite |
| Names of Muhammad | 5 | Get All, Get By ID, Get Daily, Add Favorite, Get Favorites |
| Calendar | 7 | Today, Convert To/From Hijri, Gregorian Month, Hijri Month, Events |
| Prayers | 4 | Get Times, Get Current, Log Prayer, Get Logs, Get Stats |
| Quran | 5 | Get Surahs, Get Surah, Search, Bookmark, Get Bookmarks |
| Dhikr | 6 | Get Counters, Create Counter, Increment, Create Goal, Get Goals, Get Stats |
| Qibla | 1 | Get Direction |
| Feelings | 2 | Get All, Get Details |

**Total: 41 API Endpoints**

