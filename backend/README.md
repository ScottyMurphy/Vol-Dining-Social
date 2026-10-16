## Backend setup

1. Install packages:
   cd backend
   npm install


2. Start the server:
   node index.js


## Signing in on Frontend

Run the local host while the backend is running. Use @vols.utk.edu test emails or just use admin@test. 
Passwords need to be at least 8 characters.

## Crowd reports

Signed-in users can submit a crowd level for `rocky-top`, `stokely`, or
`southern-kitchen`. Send the level as `low`, `medium`, `high`, or `very-high`
to `POST /api/crowd/:locationId` with the login token in a `Bearer` authorization
header. `GET /api/crowd/:locationId` returns the average crowd level and report
count from the last two hours, plus the signed-in user's current report.
