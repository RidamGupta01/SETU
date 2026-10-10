# Bhopal Beats - MERN Backend

This is the Express + MongoDB backend for SahayogBhopal / Bhopal Beats.

## Setup

1. **Install Dependencies**

   ```bash
   npm install --prefix server --legacy-peer-deps
   ```

2. **Environment Variables**
   Copy `.env.example` to `server/.env` if needed. Set the MongoDB URI,
   JWT secret, and credentials for enabled integrations. The server loads
   `server/.env`, which is ignored by Git, and exits if MongoDB is unavailable.
   Set `CORS_ORIGIN` to the deployed frontend origin in production.

3. **Seed the Database**
   Populate the database with departments, admin users, and sample Bhopal issues:

   ```bash
   node seed.js
   ```

4. **Run the Server**
   ```bash
   npm run dev --prefix server
   ```
   The server will start on `http://localhost:5000` with WebSockets enabled.
