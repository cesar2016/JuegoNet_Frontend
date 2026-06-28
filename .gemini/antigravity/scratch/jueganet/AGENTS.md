# JuegaNet — AGENTS.md

Monorepo: `backend/` (Laravel 13 API) + `frontend/` (React 19 + Vite 8 + Tailwind 4 SPA). Run commands in each subdirectory.

## Backend

- **Auth**: Sanctum bearer token in `localStorage('token')`. SPA sends `Authorization: Bearer`. CORS allows `FRONTEND_URL` + `http://127.0.0.1:3333`.
- **Middleware** (aliased in `bootstrap/app.php`): `admin` checks `isAdmin()` (`role` in `['admin','super_admin']`). `check.status` blocks non-`approved` users.
- **Admin scoping**: models expose `scopeForAdmin($adminId)` (User, Raffle, Order). Controllers wrap them: `AdminController::applyUserScope()`/`applyOrderScope()`, `RaffleController::scopeForUser()`. `super_admin` sees everything.
- **Ticket state machine** (no cron, expiry on-read): `available` → `in_cart` (per-raffle `cart_expiry_minutes`, default 10) → `pending_admin` (15 min hardcoded) → `sold`. Expiry checked in `OrderController::checkCartExpiration()`, `RaffleController::releaseExpiredTickets()`, `AdminController::releaseExpiredPendingOrders()`.
- **Raffle max 5 active** global (`RaffleController@toggleActive`). **Max 5 raffles per user** (`OrderController@addTicket`).
- **Raffle creation**: accepts `duration_hours` or explicit `start_time`/`end_time`. When `start_time` is null, defaults to `now + duration_hours`. Auto-generates tickets 1–99.
- **Raffle edit/delete blocked** if `start_time` passed or any bets exist. Checked via `isEditable()` + `hasBets()`.
- **User flow**: registers `status=pending_approval`, `role=user`. Login blocks non-`approved`. Admin approves via `POST /admin/users/{user}/approve` (max 100 users per `admin`).
- **Invitation system**: `admin` generates 7-day token invites (`POST /admin/invite`), returns URL using `FRONTEND_URL` env var. Users register with `invite_token`.
- **Cart**: one cart per raffle per user (single `Order` with `status=in_cart`). Expired on-read.
- **Profile**: two endpoints (`PUT /profile` and `POST /profile/update`) both call `AuthController::updateProfile`.
- **Avatar upload**: `POST /upload-avatar` (user) and `POST /admin/upload-avatar` (admin), same `AdminController@uploadAvatar`. Accepts image (max 2MB), stores under `public/avatars/`.
- **Drivers**: dev uses `SESSION_DRIVER=database`, `CACHE_STORE=database`, `QUEUE_CONNECTION=database` (needs queue worker). Prod `.env.example` uses `QUEUE_CONNECTION=sync`, `CACHE_STORE=file`. Test uses `array`/`sync`/`sqlite:memory:`.
- **Prod entry**: `Procfile` → `start.sh` → `php artisan optimize && migrate --force && reverb:start (if REVERB_HOST set) & serve --host=0.0.0.0 --port=${PORT:-8080}`.
- **Real-time (Laravel Reverb)**: installed, replaces all 5s polling. Events: `TicketStatusChanged` (channel `raffle.{id}`), `OrderStatusChanged` (channel `user.{id}`), `AdminNotification` (channel `admin.{id}`, types: `new_pending_order`, `pending_users_updated`, `raffle_list_updated`). Dev runs Reverb on `0.0.0.0:8080`. Frontend Echo config in `src/lib/echo.ts` with graceful degradation.
- **Timezone**: `America/Argentina/Buenos_Aires`.
- **.env** committed with dev creds. `.env.example` is prod template — keep in sync.
- **UI language**: Spanish (error messages in controllers).

### Commands (from `backend/`)
| Command | Notes |
|---|---|
| `composer run dev` | `artisan serve` (port `APP_PORT`, default 8383) + `queue:listen --tries=1` + `pail` + Vite, via `npx concurrently` |
| `composer test` | Runs `artisan config:clear` then `artisan test` (PHPUnit with SQLite `:memory:`) |
| `composer run setup` | `composer install`, copy `.env` if missing, `key:generate`, `migrate --force`, `npm install --ignore-scripts`, `npm run build` |
| `php artisan migrate` | Run DB migrations |
| `./vendor/bin/pint` | Format PHP (Pint, no custom config) |

## Frontend

- **API client**: `src/lib/api.ts` — custom `fetch` wrapper, exports `api` object (`get`, `post`, `put`, `delete`, `upload`, `postForm`) and `ApiError` class (has `status` + `data`). `axios` in `package.json` but **unused**.
- **Auth**: `AuthProvider` in `main.tsx` wraps app with `BrowserRouter`. Token stored in `localStorage('token')`. Validated on mount via `GET /me` — if it fails, token removed. `useAuth()` hook provides `user`, `token`, `login`, `register`, `logout`, `updateUser`.
- **Real-time (Echo)**: `src/lib/echo.ts` initializes Echo with Reverb. `src/lib/AuthContext.tsx` destroys Echo on logout. Components subscribe with `getEcho().private(channel).listen(event, handler)` replacing all polling.
- **API base**: `VITE_API_URL` env, defaults to `http://127.0.0.1:8383/api`.
- **File uploads**: use `api.upload()` or `api.postForm()` with `FormData`. Do **not** set `Content-Type` header — browser adds `multipart/form-data` boundary automatically.
- **Tailwind 4**: `@import "tailwindcss"` in CSS, not `@tailwind` directives.
- **TS strict**: `tsc -b` with project references (`tsconfig.app.json` + `tsconfig.node.json`). `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`.
- **Dev server**: Vite on `127.0.0.1:3333`.
- **Deploy**: `vercel.json` with `buildCommand: "npm run build"`, rewrites all routes to `index.html`, output `dist/`.

### Commands (from `frontend/`)
| Command | Notes |
|---|---|
| `npm run dev` | Vite dev server on `127.0.0.1:3333` |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | ESLint flat config |
| `npm run preview` | Serve production build locally |

## Gotchas

- **New routes**: add to `routes/api.php` inside the correct middleware group (`auth:sanctum`, `check.status`, `admin`). If exposing to frontend, add a wrapper in `src/lib/api.ts`.
- **`super.admin` middleware**: route references it but **no alias registered** in `bootstrap/app.php` and the controller method (`createAdmin`) does not exist. This is dead/unreachable code.
- **Admin scoping methods** (actual names, for grep): `User::scopeForAdmin()`, `Raffle::scopeForAdmin()`, `Order::scopeForAdmin()` (model scopes); `AdminController::applyUserScope()`/`applyOrderScope()`; `RaffleController::scopeForUser()`.
- **`composer run test`** always runs `config:clear` first.
- **`composer run setup`** uses `npm install --ignore-scripts` (does not run Vite build's postinstall scripts).
- **No CI**: `.github/` directory does not exist — no workflows to follow.
