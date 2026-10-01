## Backend setup

1. Install packages:
   cd backend
   npm install
```

2. Create your `.env` file by copying the example:
   cp .env.example .env
```

3. Generate a secret key:
   Open the terminal and run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
   Copy the output and paste it into `.env` where it says YOUR_STRING, the line will look like this: JWT_SECRET="YOUR_STRING".

4. Start the server:
   node index.js
```

## Signing in on Frontend

Run the local host while the backend is running. Use @vols.utk.edu test emails or just use admin@test. 
Passwords need to be at least 8 characters.
