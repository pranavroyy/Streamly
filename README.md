# Streamly Podcast Platform

Streamly is a production-grade, browser-based podcast recording platform inspired by Riverside.fm. It allows high-fidelity local recording of separate audio and video tracks directly on each guest's machine, combining real-time WebRTC communication with a robust backend service.

This repository contains the initial structure and connection setup for:
1. **Frontend**: Next.js App Router, React, Tailwind CSS, TypeScript, Axios, and TanStack React Query.
2. **Backend**: Spring Boot 3.3.x, Spring Security, Spring Data JPA, Hibernate, Actuator, Lombok, and validation starters.
3. **Database**: PostgreSQL (containerized).

---

## Workspace Structure

```
Streamly/
├── backend/
│   ├── src/main/java/com/streamly/backend/
│   │   ├── config/             # CORS and Security configurations
│   │   ├── controller/         # REST Controllers (Health status endpoint)
│   │   ├── dto/                # Request/Response DTOs (ErrorResponse)
│   │   ├── exception/          # Centralized global exception handler
│   │   └── BackendApplication  # Spring Boot Main Entry
│   ├── src/main/resources/
│   │   └── application.yml     # Database & Actuator settings
│   ├── Dockerfile              # Multi-stage JVM runtime container setup
│   └── pom.xml                 # Maven dependencies declaration
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router (layout, globals.css, and landing page)
│   │   ├── components/         # Reusable widgets and Query providers
│   │   └── lib/                # API utility configuration (Axios client instance)
│   ├── Dockerfile              # Multi-stage node.js distribution container setup
│   ├── package.json            # Node modules and scripts declaration
│   ├── tailwind.config.ts      # CSS colors customization variables
│   └── components.json         # Shadcn/ui workspaces layout setup
├── docker-compose.yml          # Container configuration for DB, Backend, and Frontend
└── .env.example                # Default configuration environment variables template
```

---

## Key Architectural Decisions

1. **Docker Compose & Environment Separation**: Database configuration is loaded dynamically via environment variables defined in `.env`.
2. **Permissive Initial Security Filter**: The Spring Security context permits all `/v1/**` and `/actuator/**` requests in development to allow unauthenticated setup verification, exposing CORS policies mapping to the Next.js frontend port (`3000`).
3. **Actuator Health & Unified DTOs**: Exposed standard health actuator points as well as standard custom API REST endpoints (`/api/v1/health`), and a centralized exception mapping handler returning uniform `ErrorResponse` payloads.
4. **React Query & Axios Client Integration**: Configured Axios response interceptors to parse API errors uniformly and provided the React Query Context wrapper around the Next.js App Router layout for real-time frontend states polling.

---

## Local Setup Instructions

### Prerequisites
- Node.js v20+
- Java JDK 17
- Maven 3.9+
- Docker & Docker Compose

### Step 1: Clone and Configure Environment
Create a `.env` file from the template:
```bash
cp .env.example .env
```

### Step 2: Spin Up the Database
Run PostgreSQL database using Docker Compose:
```bash
docker-compose up -d db
```
This launches a Postgres server on port `5432` with database `streamly_db`.

### Step 3: Run the Spring Boot Backend
Navigate to the `backend/` folder and run the Maven development command:
```bash
cd backend
mvn spring-boot:run
```
The server will boot up and bind to context path `/api` on port `8080`.
- Verify REST Health: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- Verify Actuator Info: [http://localhost:8080/api/actuator/health](http://localhost:8080/api/actuator/health)

### Step 4: Run the Next.js Frontend
Open a new terminal session, navigate to the `frontend/` folder, and install dependencies and start the development server:
```bash
cd frontend
npm install
npm run dev
```
The Next.js client will run on [http://localhost:3000](http://localhost:3000). The dashboard should automatically display backend and database health connection statuses.

---

## Deploying Using Docker Compose

To build and run the entire stack (Database, Backend, Frontend) in containerized mode:
```bash
docker-compose up --build -d
```
Docker will:
1. Pull and start PostgreSQL database.
2. Compile and run the backend image.
3. Bundle and run the frontend image.
All services will connect automatically.

---

## WebRTC / Known Limitations

This demo uses STUN-only NAT traversal to facilitate peer-to-peer connections (`stun:stun.l.google.com:19302` and `stun:stun1.l.google.com:19302` by default, configurable via the `NEXT_PUBLIC_STUN_URLS` environment variable). 

Because no TURN relay server is configured in the current setup, connections between peers located on separate restrictive or symmetric NAT networks (e.g., corporate firewalls, some mobile data networks) may fail to establish a direct peer-to-peer connection. 

For a production deployment, you must deploy a TURN server (such as [coturn](https://github.com/coturn/coturn)) to relay traffic when direct P2P connection fails, and list its credentials and endpoint inside the `ICE_SERVERS` configuration in [webrtc.ts](file:///d:/Streamly/frontend/src/lib/webrtc.ts).