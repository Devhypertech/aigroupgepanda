# JWT_SECRET Setup Guide

## What is JWT_SECRET?

`JWT_SECRET` is a secret key used to sign and verify JWT (JSON Web Token) tokens for email/password authentication. It's **not something you find** - you need to **generate it yourself**.

## Generated Secret (Use This One)

I've generated a secure random secret for you:

```
[GENERATE_YOUR_OWN_SECRET]
```

## Where to Put It

Add this line to `apps/api/.env`:

```bash
JWT_SECRET=[GENERATE_YOUR_OWN_SECRET]
```

## How to Generate Your Own (Optional)

If you want to generate a new one, you can use any of these methods:

### Method 1: Node.js (Recommended)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Method 2: OpenSSL
```bash
openssl rand -hex 32
```

### Method 3: Online Generator
Visit: https://generate-secret.vercel.app/32 (or any secure random string generator)

## Security Notes

⚠️ **Important:**
- **Never commit** `JWT_SECRET` to git (it should be in `.env` which is gitignored)
- Use a **different secret** for production vs development
- The secret should be **at least 32 characters** long
- Keep it **secret** - if someone gets it, they can forge authentication tokens

## File Location

Create or edit: `apps/api/.env`

Example file:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gepanda?schema=public

# JWT Secret (for email/password authentication)
JWT_SECRET=[GENERATE_YOUR_OWN_SECRET]

# Other environment variables...
```

## After Adding JWT_SECRET

1. Restart your API server for the change to take effect
2. The server will use this secret to sign JWT tokens when users sign up or log in
3. The same secret is used to verify tokens when checking authentication

