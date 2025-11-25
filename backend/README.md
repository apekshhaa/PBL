# Backend - Smart Campus Navigator

This backend stores location data and login records in MongoDB.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set MongoDB Connection (Choose One)

#### Option A: Local MongoDB (default)
If you have MongoDB running locally on `127.0.0.1:27017`, just start the server:
```bash
node server.js
```
It will connect to `mongodb://127.0.0.1:27017/mapDB` by default.

#### Option B: MongoDB Atlas or Remote
Set the `MONGO_URI` environment variable before starting:

**Windows PowerShell:**
```powershell
$env:MONGO_URI = 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority'
node server.js
```

**Windows Command Prompt:**
```cmd
set MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
node server.js
```

**macOS/Linux:**
```bash
export MONGO_URI='mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority'
node server.js
```

### 3. Create `.env` File (Optional)
For convenience, create a `.env` file in the `backend/` folder:
```
MONGO_URI=mongodb://127.0.0.1:27017/mapDB
PORT=5000
```
Then simply run:
```bash
node server.js
```

## API Endpoints

### Locations
- **GET** `/api/locations` — Get all campus locations
- **GET** `/api/location/:place` — Search for a location by name

### Login Records
- **POST** `/api/logins` — Log a user login (Student/Teacher or Visitor)
  - Body: `{ "mode": "student" | "visitor", "identifier": "USN/username/name" }`
- **GET** `/api/logins` — Fetch recent login records (last 200)

### Campus Signal Data
- **POST** `/api/campus` — Add a new signal strength record
  - Body: `{ "location": "...", "signalStrength": 80, "provider": "..." }`

## How Login Logging Works

1. User logs in via the React app frontend at `/login`.
2. Frontend stores user data in `localStorage`.
3. Frontend sends a POST request to `http://localhost:5000/api/logins` with:
   - `mode`: 'student' or 'visitor'
   - `identifier`: the username, USN, or visitor name
4. Backend saves the record to MongoDB in the `logins` collection.
5. You can retrieve login records anytime using `GET /api/logins`.

## Troubleshooting

- **"❌ MongoDB connection error"**: Ensure MongoDB is running or `MONGO_URI` is correctly set.
- **"Cannot POST /api/logins"**: Ensure backend is running on port 5000 and CORS is enabled.
- **Login not appearing in DB**: Check browser console for fetch errors; ensure frontend is POSTing to `http://localhost:5000/api/logins`.

## Example: Fetch Login Records

Once users have logged in, retrieve all login records:

```bash
curl http://localhost:5000/api/logins
```

Or in PowerShell:
```powershell
Invoke-RestMethod http://localhost:5000/api/logins
```

## Production Deployment

- Update `MONGO_URI` to use a production MongoDB database.
- Update frontend `Login.js` to POST to your production backend URL (not `localhost:5000`).
- Enable CORS for your production domain if needed.
