# Library Management System Backend

Backend API for the CSX4107/ITX4107 Web Application Development final exam.

Implemented with:
- Next.js (App Router)
- MongoDB
- JWT authentication via HTTP-only cookie

## Features

- User login/logout with JWT cookie authentication
- Role-based authorization (`ADMIN`, `USER`)
- Book management API with full CRUD
- Soft delete for books (`status: "DELETED"`)
- Book search by `title` and `author`
- Borrow request creation and status update workflow
- Borrow status transitions:
  - `INIT`
  - `CLOSE-NO-AVAILABLE-BOOK`
  - `ACCEPTED`
  - `CANCEL-ADMIN`
  - `CANCEL-USER`
- Book quantity synchronization:
  - Quantity decreases when request becomes `ACCEPTED`
  - Quantity increases when accepted request is cancelled/closed

## Required Test Users

These users are auto-seeded on login if not found in the database:

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@test.com` | `admin123` |
| USER | `user@test.com` | `user123` |

## Environment Variables

Create `.env.local` in this backend folder:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/
MONGODB_DB_NAME=library_management
MONGODB_USER_COLLECTION=user
MONGODB_BOOK_COLLECTION=book
MONGODB_BORROW_COLLECTION=borrow
JWT_SECRET=your_jwt_secret
ADMIN_SETUP_PASS=your_admin_setup_password
```

Notes:
- `MONGODB_URI` should point to your MongoDB Atlas cluster.
- The DB/collection variables can be changed without touching source code.

## Getting Started

```bash
npm install
npm run dev
```

Default URL:
- `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/user/login`
- `POST /api/user/logout`

### User

- `POST /api/user` (register)
- `GET /api/user/profile` (authenticated)

### Book

- `GET /api/book`  
  Query params: `title`, `author`, `includeDeleted=true` (admin only meaningful)
- `POST /api/book` (ADMIN only)
- `GET /api/book/:id`
- `PATCH /api/book/:id` (ADMIN only)
- `DELETE /api/book/:id` (ADMIN only, soft delete)

### Borrow

- `GET /api/borrow`  
  - ADMIN: all requests
  - USER: own requests
- `POST /api/borrow`
  - Create request (USER)
  - Update request status (ADMIN / USER cancel)

## Authorization Rules

- Unauthenticated requests return `401`.
- Authenticated but unauthorized actions return `403`.
- Book create/update/delete are ADMIN-only.
- USER can create borrow requests and cancel own requests.
- ADMIN can update borrow statuses (`ACCEPTED`, `CLOSE-NO-AVAILABLE-BOOK`, `CANCEL-ADMIN`).

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```text
src/
  app/
    api/
      user/
      book/
      borrow/
  lib/
    mongodb.js
    auth.js
    cors.js
    ensureIndexes.js
```

## Troubleshooting

- If login works in API tools but not browser:
  - Confirm frontend origin and CORS configuration.
  - Ensure frontend sends requests with `credentials: "include"`.
- If MongoDB connection fails:
  - Verify `MONGODB_URI`.
  - Ensure Atlas Network Access allows your IP.
