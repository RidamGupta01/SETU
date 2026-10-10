# SETU – Single Window E-Coordination for Town Utilities

A production-ready full-stack MERN (MongoDB, Express, React, Node) application designed for municipal coordinating departments and town citizens to manage road digging permits, run automated GIS spatio-temporal conflict alerts, submit citizen complaints, and track resolutions.

---

## Key Features

1. **Authentication & Authorization**: Role-based access controls for Citizens, Department Officers, and Nodal Admins (Super Admin). Features JWT security, forgot/reset password emails, and profile management.
2. **GIS Leaflet Coordinate Mapping**: Plot excavation points (with custom search radiuses), road closed path polylines, conflict boundaries (red/pulse circles), and unresolved citizen complaints (blue markers).
3. **Automated Conflict Detection**: The backend searches for nearby permit points, overlapping schedule timelines, and recently completed works. If a collision is detected, the permit is flagged as a "Conflict", a warning alerts departments, and Socket.io notifies officers suggesting a joint excavation.
4. **Complaint Lifecycle**: Citizens report issues with description, location (GPS pinning & map clicking), and photo attachments. The system assigns the department automatically. A detailed step timeline (Received -> Assigned -> In Progress -> Resolved) logs progress, followed by a citizen rating score (1-5 star feedback).
5. **Real-time Synchronization**: Socket.io drives live notification alerts, timeline updates, conflict warnings, and immediate dashboard refreshes.
6. **Analytics Panel**: Charts render permit status proportions, complaints by ward, and assigned vs resolved utility performance ratios.
7. **SLA Monitoring**: Flag tickets open for more than 7 days as SLA violations in the nodal control dashboard.
8. **PDF Export**: Generate official, downloadable PDF permit certificates on A4 sizes with signing slots.

---

## Tech Stack

### Backend
- **Node.js & Express.js**
- **MongoDB & Mongoose** (GeoJSON 2dsphere indexing for spatial queries)
- **JWT (jsonwebtoken) & bcryptjs**
- **Multer** (handles multipart photo uploads)
- **Nodemailer** (transmits password recovery and conflict emails)
- **PDFKit** (generates permit PDF templates)
- **Socket.io** (pushes real-time alerts)

### Frontend
- **React.js & Vite**
- **React Router DOM** (handles routing and permission guard redirections)
- **Tailwind CSS** (design tokens and glassmorphism styling)
- **Axios** (REST API queries mapped via proxy configurations)
- **Framer Motion** (micro-interactions and dashboard animations)
- **React Leaflet & OpenStreetMap** (visualizes layers and markers)
- **Recharts** (renders analytical graphs)

---

## Installation & Setup

### Prerequisites
- Node.js installed (v18+ recommended)
- Local MongoDB running, OR a MongoDB Atlas database link.

### 1. Backend Setup
1. Open a terminal in the `server` directory:
   ```bash
   cd server
   ```
2. Install server-side dependencies:
   ```bash
   npm install
   ```
3. Set environment settings in `server/.env` (pre-configured with local fallbacks):
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/setu
   JWT_SECRET=setu_super_secret_jwt_key_2026
   ```
4. **Seed Database** (Creates Admin, Officers, Citizens, roads, permits, conflicts, and complaints for immediate testing):
   ```bash
   npm run seed
   ```
5. Launch backend development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open a terminal in the `client` directory:
   ```bash
   cd client
   ```
2. Install client-side dependencies:
   ```bash
   npm install
   ```
3. Launch frontend development server (Vite):
   ```bash
   npm run dev
   ```
4. Access the portal at: `http://localhost:5173`

---

