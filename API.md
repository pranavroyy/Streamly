# Streamly Backend API Specification

This document details the REST API specifications for Room and Participant management, entity models, relationship rules, and authorization security tables in the Streamly Podcast Platform.

---

## 1. Domain Entities & Relationship Rules

### 1.1 `Room` Entity
- `id`: `Long` (Primary Key, Auto-increment)
- `name`: `String` (Required, 2-100 characters)
- `ownerId`: `Long` (Foreign Key referencing `users.id`)
- `createdAt`: `ISO 8601 Timestamp` (Auto-generated on creation)
- `status`: `String Enum` (`ACTIVE`, `ENDED`, `DELETED`)

### 1.2 `Participant` Entity
- `id`: `Long` (Primary Key, Auto-increment)
- `roomId`: `Long` (Foreign Key referencing `rooms.id`)
- `userId`: `Long` (Foreign Key referencing `users.id`)
- `role`: `String Enum` (`HOST`, `CO_HOST`, `SPEAKER`, `LISTENER`)
- `joinedAt`: `ISO 8601 Timestamp` (Auto-generated on join)

### 1.3 Relationship Rules
1. **Room 1 — N Participant**: A single `Room` contains multiple `Participant` entries. Deleting or removing a room cascade-manages its participants.
2. **User 1 — N Room (Owner)**: A single `User` can create and own multiple `Room` records.
3. **User 1 — N Participant**: A single `User` can participate in multiple active rooms over time. Unique constraint `uk_room_user` enforces that a user cannot occupy multiple simultaneous participant records in the same room.

---

## 2. Authorization Rule Table

| Action | Room Owner (HOST) | Room Participant | Non-Participant User | Unauthenticated Request |
| :--- | :--- | :--- | :--- | :--- |
| **Create Room** | Allowed | Allowed | Allowed | `401 Unauthorized` |
| **List My Rooms** | Allowed | Allowed | Allowed | `401 Unauthorized` |
| **View Room Details** | Allowed | Allowed | Allowed (if active) | `401 Unauthorized` |
| **Join Room** | Auto-joined on create | `409 Conflict` (if double-join) | Allowed (if active) | `401 Unauthorized` |
| **Leave Room** | Allowed | Allowed | `400 Bad Request` | `401 Unauthorized` |
| **Delete Room** | **Allowed** | **403 Forbidden** | **403 Forbidden** | `401 Unauthorized` |

---

## 3. REST API Endpoints

Base URL: `http://localhost:8080/api`

### 3.1 Create Room
- **Endpoint**: `POST /v1/rooms`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Live Podcast Episode #1"
}
```
- **Response** (`201 Created`):
```json
{
  "id": 100,
  "name": "Live Podcast Episode #1",
  "ownerId": 1,
  "ownerName": "Jane Doe",
  "status": "ACTIVE",
  "createdAt": "2026-07-27T00:50:00",
  "participants": [
    {
      "id": 50,
      "roomId": 100,
      "userId": 1,
      "userEmail": "jane@example.com",
      "userFullName": "Jane Doe",
      "role": "HOST",
      "joinedAt": "2026-07-27T00:50:00"
    }
  ]
}
```

### 3.2 List My Rooms
- **Endpoint**: `GET /v1/rooms/my`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
```json
[
  {
    "id": 100,
    "name": "Live Podcast Episode #1",
    "ownerId": 1,
    "ownerName": "Jane Doe",
    "status": "ACTIVE",
    "createdAt": "2026-07-27T00:50:00",
    "participants": [ ... ]
  }
]
```

### 3.3 Get Room Details
- **Endpoint**: `GET /v1/rooms/{id}`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
```json
{
  "id": 100,
  "name": "Live Podcast Episode #1",
  "ownerId": 1,
  "ownerName": "Jane Doe",
  "status": "ACTIVE",
  "createdAt": "2026-07-27T00:50:00",
  "participants": [ ... ]
}
```
- **Errors**: `404 Not Found` if room does not exist or is marked `DELETED`.

### 3.4 Join Room
- **Endpoint**: `POST /v1/rooms/{id}/join`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
```json
{
  "id": 51,
  "roomId": 100,
  "userId": 2,
  "userEmail": "john@example.com",
  "userFullName": "John Smith",
  "role": "LISTENER",
  "joinedAt": "2026-07-27T00:51:30"
}
```
- **Errors**:
  - `400 Bad Request`: "Cannot join a deleted room" or "Cannot join an ended room"
  - `409 Conflict`: "User is already a participant in this room"
  - `404 Not Found`: "Room not found with ID: {id}"

### 3.5 Leave Room
- **Endpoint**: `POST /v1/rooms/{id}/leave`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`204 No Content`)
- **Errors**:
  - `400 Bad Request`: "User is not a participant in this room"
  - `404 Not Found`: "Room not found with ID: {id}"

### 3.6 Delete Room
- **Endpoint**: `DELETE /v1/rooms/{id}`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`204 No Content`)
- **Errors**:
  - `403 Forbidden`: "Access denied" / "Only the room owner can delete this room"
  - `404 Not Found`: "Room not found with ID: {id}"
