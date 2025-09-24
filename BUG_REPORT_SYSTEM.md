# Bug Report System

## Overview

A simplified bug reporting system has been implemented with the following features:

## ✅ Features

- **Simple Form**: Only requires Bug Title and Description
- **Auto Browser Detection**: Browser information is automatically captured
- **Secure Admin Access**: Only `chinmaypisal1718@gmail.com` can access admin features
- **PostgreSQL Storage**: All reports stored in PostgreSQL database

## 🎯 Usage

### For Users

1. Sign in to your account
2. Click the "Report Bug" button (🐛 icon) next to your profile
3. Fill in:
   - **Bug Title**: Brief description of the issue
   - **Description**: Detailed explanation of the bug
4. Submit the report

### For Admin (chinmaypisal1718@gmail.com only)

1. Visit `/admin` to view all bug reports
2. Click on any report to see details
3. Update report status (Open → Investigating → Resolved → Closed)

## 🔒 Security Features

- Only authenticated users can submit reports
- Admin panel restricted to `chinmaypisal1718@gmail.com` only
- API endpoints secured with proper authentication
- Browser information auto-captured (not user-editable)

## 🗄️ Database Schema

```sql
bug_reports (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  steps_to_reproduce TEXT DEFAULT 'User did not provide steps',
  expected_behavior TEXT DEFAULT 'Normal functionality',
  actual_behavior TEXT DEFAULT 'Bug occurred',
  browser_info TEXT,
  additional_info TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

## 🎨 UI Improvements

- Fixed dialog transparency issues
- Clean, simple form design
- Professional styling matching app theme
- Responsive design for all screen sizes

## 🚀 API Endpoints

- `POST /api/reports` - Submit new bug report
- `GET /api/reports` - Get reports (admin only for all, users can get their own)
- `PATCH /api/reports/[reportId]` - Update report status (admin only)
- `GET /api/reports/[reportId]` - Get specific report

## 📝 Notes

- Browser information is automatically detected and included
- Default severity is set to "medium"
- Reports are automatically timestamped
- All fields are properly validated
