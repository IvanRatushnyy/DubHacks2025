# Heroku Deployment Guide for SaGene

## Prerequisites

1. [Heroku Account](https://signup.heroku.com/)
2. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
3. Git installed

## Step 0: Install Heroku CLI

### Quick Installation (Windows)

Run the installation script from the `llm` directory:

```powershell
.\install-heroku.ps1
```

**After installation completes:**
1. Close and reopen your terminal/PowerShell
2. Verify installation: `heroku --version`

### Manual Installation

1. Download the Heroku CLI installer from: https://devcenter.heroku.com/articles/heroku-cli
2. Run the 64-bit installer (or 32-bit if needed)
3. **Close and reopen your terminal/PowerShell** after installation
4. Verify installation:
```bash
heroku --version
```

If the command is not recognized after installation:
- Make sure you've closed and reopened your terminal
- Check if Heroku is in your PATH: `C:\Program Files\heroku\bin`
- You may need to restart your computer

### Alternative: Using NPM
```bash
npm install -g heroku
```

## Deployment Steps

### 1. Login to Heroku

```bash
heroku login
```

This will open a browser window for authentication.

### 2. Create a New Heroku App

```bash
cd llm
heroku create your-app-name
```

Or let Heroku generate a random name:
```bash
heroku create
```

### 3. Set Dyno Type to Basic Tier

After creating the app, upgrade to the Basic tier:

```bash
heroku ps:type basic
```

Or specify it for the web dyno:
```bash
heroku ps:type web=basic
```

**Note:** Basic dynos cost $7/month and don't sleep. Free dynos sleep after 30 minutes of inactivity.

### 4. Add Python Buildpack (for STRING MCP server)

```bash
heroku buildpacks:add --index 1 heroku/python
heroku buildpacks:add --index 2 heroku/nodejs
```

### 5. Configure Environment Variables (Optional)

If you want to provide a default API key on the server (users won't need to enter their own):

```bash
heroku config:set GEMINI_API_KEY=your_gemini_api_key_here
```

**Note:** If you don't set this, users will be required to enter their own API key in the web interface.

### 6. Deploy to Heroku

```bash
git push heroku main:master
```

Or if you're on a different branch:
```bash
git push heroku your-branch:master
```

### 7. Open Your App

```bash
heroku open
```

### 8. Configure Custom Domain (sagene.tech)

Add your custom domain to Heroku:

```bash
# Add root domain
heroku domains:add sagene.tech

# Add www subdomain
heroku domains:add www.sagene.tech
```

Heroku will provide DNS targets. You'll see output like:
```
Configure your app's DNS provider to point to the DNS Target:
sagene.tech => warm-warrior-123.herokudns.com
```

**Configure DNS at your domain registrar:**

1. Go to your domain registrar's DNS settings (where you registered sagene.tech)

2. **For the root domain (sagene.tech):**
   - Add an **ALIAS** or **ANAME** record pointing to the Heroku DNS target
   - If your registrar doesn't support ALIAS/ANAME, use **A** record with Heroku's IP
   - Target: `warm-warrior-123.herokudns.com` (use the actual target from Heroku output)

3. **For www subdomain:**
   - Add a **CNAME** record
   - Name: `www`
   - Target: The DNS target provided by Heroku for `www.sagene.tech`

4. **Recommended: Redirect www to root (or vice versa)**
   - Most registrars allow URL forwarding/redirect
   - Set `www.sagene.tech` to redirect to `sagene.tech` (or opposite)

**DNS Configuration Example:**

| Type | Name | Value |
|------|------|-------|
| ALIAS | @ | warm-warrior-123.herokudns.com |
| CNAME | www | warm-warrior-123.herokudns.com |

**Verify DNS configuration:**

```bash
# Check domain status
heroku domains

# Wait for DNS to propagate (can take up to 48 hours, usually 5-30 minutes)
heroku domains:wait sagene.tech
```

**Enable Automated Certificate Management (ACM) for HTTPS:**

Heroku automatically provisions SSL certificates for custom domains.

```bash
# Check certificate status
heroku certs:auto

# Enable ACM if not already enabled
heroku certs:auto:enable
```

Your app will be accessible at:
- https://sagene.tech
- https://www.sagene.tech
- https://sagene-087b0a9096b2.herokuapp.com (original Heroku URL)

**DNS Propagation:**
- DNS changes can take 5 minutes to 48 hours to propagate
- Use https://dnschecker.org to check propagation status
- Test with: `nslookup sagene.tech` or `dig sagene.tech`

## How It Works

### Without Server API Key
- Users must enter their own Gemini API key in the "API Key" field
- The send button will be disabled until they enter a valid key
- Chat input placeholder says "Enter API key above to start chatting..."

### With Server API Key (Optional)
- If you set `GEMINI_API_KEY` in Heroku config vars, users can chat immediately
- Users can still override with their own API key if desired

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Default Gemini API key (if not set, users must provide their own) |
| `PORT` | No | Port number (Heroku sets this automatically) |

## Troubleshooting

### View Logs
```bash
heroku logs --tail
```

### Restart App
```bash
heroku restart
```

### Check Running Dynos
```bash
heroku ps
```

### Scale Dynos
```bash
heroku ps:scale web=1
```

## MCP Server Note

The STRING MCP server will attempt to start but may not work on Heroku's free tier due to the need for Python runtime alongside Node.js. The app will still work for chat functionality without MCP tools.

If MCP tools are critical, consider:
- Using Heroku's hobby or professional dynos
- Deploying the MCP server separately as a microservice
- Using a platform with better multi-language support

## Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Your commit message"
git push heroku main:master
```

## Custom Domain (Optional)

```bash
heroku domains:add www.yourdomain.com
```

Follow Heroku's DNS configuration instructions.

## Costs

- **Free Tier**: Limited to 550-1000 dyno hours/month (app sleeps after 30 min of inactivity)
- **Hobby Tier**: $7/month, no sleep, better performance
- **Professional Tier**: Starting at $25/month for production apps

## Support

For issues, check:
- [Heroku Dev Center](https://devcenter.heroku.com/)
- [GitHub Issues](https://github.com/IvanRatushnyy/DubHacks2025/issues)
