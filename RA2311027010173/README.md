# Backend Practice Workspace

This repository contains three TypeScript packages:

- `logging_middleware`: shared logging package with validation, retry handling, and local colored output.
- `vehicle_maintence_scheduler`: Express API on port `3001` that fetches depot and vehicle task inputs, then optimizes maintenance work with dynamic programming.
- `notification_app_be`: Express API on port `3000` backed by PostgreSQL and raw SQL queries.

## Setup

Create `.env` files from each `.env.example`, then install and build in this order:

```bash
cd logging_middleware
npm install
npm run build

cd ../vehicle_maintence_scheduler
npm install
npm run build

cd ../notification_app_be
npm install
npm run build
```

## Run

```bash
cd vehicle_maintence_scheduler
npm run dev
```

```bash
cd notification_app_be
npm run dev
```

The notification service expects PostgreSQL to be reachable using the database variables in its `.env` file. It creates the notifications table and indexes on startup.

## Useful Endpoints

Scheduler:

- `GET /api/scheduler/depots`
- `GET /api/scheduler/vehicles`
- `POST /api/scheduler/optimize`

Notifications:

- `POST /api/notifications`
- `GET /api/notifications/:studentId`
- `GET /api/notifications/:studentId/unread`
- `PATCH /api/notifications/:id/read`
- `DELETE /api/notifications/:id`
- `GET /api/notifications/unread/count/:studentId`
- `GET /api/notifications/priority/:studentId`
