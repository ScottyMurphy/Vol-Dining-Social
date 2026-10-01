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

## Signing in on Frontend

Run the local host while the backend is running. Use @vols.utk.edu test emails or just use admin@test. 
Passwords need to be at least 8 characters.
