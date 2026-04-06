# HabitForge - Backend

HabitForge Backend provides the core logic and API services for the HabitForge gamified habit tracking application.

## Project Overview
The backend is a robust RESTful API built with Node.js and Express. It handles user authentication, habit management, AI-driven habit suggestions via Google Gemini AI, achievement unlocking logic, and focus session tracking. It integrates with Supabase for data persistence and real-time capabilities.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **AI Integration**: Google Generative AI (Gemini)
- **Database/Auth**: Supabase (PostgreSQL)
- **Validation**: Zod
- **Security**: Helmet, CORS, Express Rate Limit
- **Logs**: Morgan

## API Documentation
Base URL: `http://localhost:3001/api/v1`

| Endpoint | Description |
|----------|-------------|
| `/habits` | CRUD operations for user habits. |
| `/habit-ai` | Generate habit suggestions using Gemini AI. |
| `/logs` | Track habit completions and completions history. |
| `/focus` | Manage Pomodoro focus sessions. |
| `/achievements` | Fetch and verify user badges/badges. |
| `/profile` | User profile data, XP, and level management. |
| `/challenges` | Manage user challenges. |
| `/analytics` | User activity and progress statistics. |

## Database Schema Explanation
The backend uses **Supabase (PostgreSQL)** with the following core entities:
- **Profiles**: Stores user XP, levels, and rank.
- **Habits**: Stores user-defined habits with frequency and category.
- **Habit Logs**: Tracks daily habit completions.
- **Badges/Achievements**: Stores unlocked user honors.
- **Focus Sessions**: Logs time spent on focus tasks.

## Installation Steps
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your `.env` file:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   GEMINI_API_KEY=your_gemini_api_key
   FRONTEND_URL=http://localhost:5173
   PORT=3001
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment Link
[[Backend Deployment]
](https://backend-cxl4.onrender.com)
