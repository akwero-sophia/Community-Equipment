# Community Equipment & Resource Borrowing System

A small MVC-style Node.js + Express + MongoDB web application for a community, school, church, student organization, or similar group to list shared equipment, submit borrowing requests, approve/reject requests, and track returns.

This implementation covers **Sprint 1 and Sprint 2** from the supplied CSE 499 project plan. The project plan defines the MVP workflow as **Register/Login → Browse Equipment → Submit Request → Approve/Reject → Borrow → Return** and specifies Node.js, Express.js, MongoDB, Mongoose, HTML5, CSS3, JavaScript, JWT, bcryptjs, Git/GitHub, and VS Code.

## Features

### Sprint 1

- User registration and login.
- JWT authentication.
- Member and administrator roles.
- Equipment listing with category, description, location, condition, and status.
- Search and filtering.
- Admin equipment CRUD.
- Responsive homepage, login page, and dashboard.
- Demo seed data.

### Sprint 2

- BorrowRequest model.
- Member borrowing requests with dates and purpose.
- Date validation.
- Conflict prevention for overlapping Pending/Approved requests.
- Member request history.
- Administrator request review.
- Approve/reject workflow.
- Approved equipment changes to `Borrowed`.
- Return workflow changes request to `Returned` and equipment to `Available`.
- Member/admin authorization.

## Project Structure

## Requirements

- Node.js 18+ (Node.js 20+ recommended).
- MongoDB local installation or a MongoDB Atlas connection.
- A terminal and VS Code or another editor.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Then update `MONGODB_URI` and `JWT_SECRET`.

For a local MongoDB server:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/community_equipment_borrowing
```

For MongoDB Atlas, paste Atlas connection string.

```text
Administrator
Email: admin@communityequip.local
Password: Admin123!

Member
Email: member@communityequip.local
Password: Member123!
```

These are development/demo credentials only. Change them before any real deployment.

### 4. Start the server

Development mode:

```bash
npm run dev
```

Normal mode:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

## API

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Equipment

```text
GET    /api/equipment
GET    /api/equipment/:id
POST   /api/equipment       # admin + JWT
PUT    /api/equipment/:id   # admin + JWT
DELETE /api/equipment/:id   # admin + JWT
```

Search/filter example:

```text
GET /api/equipment?search=projector&category=Audio%20Visual&status=Available
```

### Borrow Requests

```text
GET   /api/borrow-requests
POST  /api/borrow-requests
PATCH /api/borrow-requests/:id/review
PATCH /api/borrow-requests/:id/return
```

All borrowing endpoints require a valid JWT. Review requires an administrator. A member can return an approved request that belongs to them; an administrator can process returns as well.

## End-to-End Demo

1. Open the home page.
2. Log in as the demo member.
3. Search for an available item.
4. Click **Request Loan**.
5. Select start/end dates and enter a purpose.
6. Submit the request.
7. Log out.
8. Log in as the demo administrator.
9. Open the pending request and approve it.
10. Confirm the equipment status becomes **Borrowed**.
11. Log out and sign in as the member again.
12. Use **Mark Returned** on the approved request.
13. Confirm the request becomes **Returned** and the equipment becomes **Available**.

## Authorization Notes

- New registrations are always created as `member` accounts.
- The seed script creates the administrator account.
- The admin role is required for equipment CRUD and request approval/rejection.
- JWTs are stored in browser local storage for this classroom/demo MVP. For a production application, consider secure HTTP-only cookies, CSRF protection, rate limiting, email verification, password reset, and more robust audit logging.

## Sprint 3 Not Included Yet

The supplied plan reserves Sprint 3 for testing, polish, demonstration preparation, documentation refinement, and optional deployment. This package does not claim those tasks are complete. Optional features such as email notifications, overdue alerts, QR codes, analytics, and reports are also not included.
