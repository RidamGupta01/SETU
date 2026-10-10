# Bhopal Beats - MERN Backend

This is the Express + MongoDB backend for SahayogBhopal / Bhopal Beats.

## Setup

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the `server` directory with the following variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/sahayog-bhopal
   JWT_SECRET=your_jwt_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   GEMINI_API_KEY=your_gemini_api_key
   ```
   *Note: If you don't provide a Gemini API Key, the AI classification will fall back to a rule-based engine.*

3. **Seed the Database**
   Populate the database with departments, admin users, and sample Bhopal issues:
   ```bash
   node seed.js
   ```

4. **Run the Server**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:5000` with WebSockets enabled.
