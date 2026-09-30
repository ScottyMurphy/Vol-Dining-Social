## Backend setup

1. Install packages:
   cd backend
   npm install
```

2. Create your `.env` file by copying the example:
   cp .env.example .env
```

3. Generate a secret key:
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
   Copy the output and paste it into `.env` after `JWT_SECRET=`.

4. Start the server:
   node index.js
```

## Testing the backend

Make sure the server is running (`node index.js`), then open a second terminal.

Create a test account:
```powershell
for email use either a utk email or for test purposes use admin@test
passwords must be 8 characters
Invoke-RestMethod -Uri http://localhost:4000/api/signup -Method Post -ContentType "application/json" -Body '{"email":"test@vols.utk.edu","password":"password123"}'
```

Log in with the correct password (should return a token):
```powershell
Invoke-RestMethod -Uri http://localhost:4000/api/login -Method Post -ContentType "application/json" -Body '{"email":"test@example.com","password":"password123"}'
```

Log in with a wrong password (should show an "Invalid email or password" error in red):
```powershell
Invoke-RestMethod -Uri http://localhost:4000/api/login -Method Post -ContentType "application/json" -Body '{"email":"test@example.com","password":"wrongpass"}'
```