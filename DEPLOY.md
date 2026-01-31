# Deployment Guide for The Lodge Connect

Since you are deploying to a VPS that already hosts another system, we will run this application on a specific port (e.g., `3001`) and use Nginx as a reverse proxy to serve it under `https://connect.thelodgegroup.id`.

## 1. Preparation

Ensure your VPS has **Node.js** (v18 or v20 recommended), **Nginx**, and **Git** installed.

## 2. Clone Repository

SSH into your VPS and clone the repository:

```bash
cd /var/www  # or your preferred directory
git clone https://github.com/herdirudian/Connect.git thelodge-connect
cd thelodge-connect
```

## 3. Environment Variables

Create a `.env` file in the root directory of your project on the VPS. You can copy your local `.env` but **MUST** update the following values:

```env
# Database Configuration
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/familythelodge"

# App URL (Important for Email Links)
NEXT_PUBLIC_APP_URL="https://connect.thelodgegroup.id"

# Payment Gateway (Xendit)
XENDIT_SECRET_KEY="your_live_secret_key_here"
XENDIT_PUBLIC_KEY="your_live_public_key_here"
XENDIT_CALLBACK_TOKEN="your_callback_token"

# Email Configuration (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
FROM_EMAIL="The Lodge Connect <no-reply@thelodgegroup.id>"

# Auth
JWT_SECRET="generate_a_strong_random_secret_here"
```

## 4. Installation & Build

Run the following commands in your project folder on the VPS:

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push Database Schema (Create Tables)
npx prisma db push

# Build the application
npm run build
```

## 5. Running the Application (PM2)

Use **PM2** to keep the application running in the background.

```bash
# Install PM2 globally if not installed
npm install -g pm2

# Start the application on Port 3001
pm2 start npm --name "thelodge-connect" -- start -- -p 3001

# Save PM2 list to survive reboots
pm2 save
pm2 startup
```

## 5. Nginx Configuration (Reverse Proxy)

Create a new Nginx configuration file for your domain.

File: `/etc/nginx/sites-available/connect.thelodgegroup.id`

```nginx
server {
    listen 80;
    server_name connect.thelodgegroup.id;

    location / {
        proxy_pass http://localhost:3001; # Forward to Next.js app on port 3001
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Forward real IP to the app
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and restart Nginx:

```bash
# Link the configuration
sudo ln -s /etc/nginx/sites-available/connect.thelodgegroup.id /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 6. SSL (HTTPS)

Use Certbot to secure your domain with HTTPS:

```bash
sudo certbot --nginx -d connect.thelodgegroup.id
```

## 8. Webhook Configuration (Xendit)

Don't forget to update your Xendit Dashboard Webhook URL to:
`https://connect.thelodgegroup.id/api/webhooks/xendit`
