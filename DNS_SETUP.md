# DNS Configuration for sagene.tech

## Domain Added Successfully! ✓

Your custom domain has been added to Heroku. Now you need to configure DNS at your domain registrar.

## DNS Records to Add

Go to your domain registrar (where you registered sagene.tech) and add these DNS records:

### Option 1: ALIAS/ANAME Record (Recommended)

If your registrar supports ALIAS or ANAME records:

| Type  | Name | Value/Target |
|-------|------|--------------|
| ALIAS | @    | limitless-locust-x3q1nn0j0597bn915y6z7g5j.herokudns.com |
| CNAME | www  | graceful-ladybug-u01wg5mstq2ie729epi49c8c.herokudns.com |

### Option 2: A Record (If ALIAS not supported)

If your registrar doesn't support ALIAS/ANAME, you'll need to use A records pointing to Heroku's IP addresses.

**Get Heroku IPs:**
```bash
dig limitless-locust-x3q1nn0j0597bn915y6z7g5j.herokudns.com
```

Then add A records for the root domain and CNAME for www.

## Common Registrars Setup

### GoDaddy
1. Go to DNS Management
2. Add Record:
   - Type: CNAME
   - Name: @
   - Value: limitless-locust-x3q1nn0j0597bn915y6z7g5j.herokudns.com
3. Add Record:
   - Type: CNAME
   - Name: www
   - Value: graceful-ladybug-u01wg5mstq2ie729epi49c8c.herokudns.com

### Cloudflare
1. Go to DNS settings
2. Add Record:
   - Type: CNAME
   - Name: @
   - Target: limitless-locust-x3q1nn0j0597bn915y6z7g5j.herokudns.com
   - Proxy status: DNS only (grey cloud)
3. Add Record:
   - Type: CNAME
   - Name: www
   - Target: graceful-ladybug-u01wg5mstq2ie729epi49c8c.herokudns.com
   - Proxy status: DNS only (grey cloud)

### Namecheap
1. Go to Advanced DNS
2. Add New Record:
   - Type: ALIAS Record
   - Host: @
   - Value: limitless-locust-x3q1nn0j0597bn915y6z7g5j.herokudns.com
3. Add New Record:
   - Type: CNAME Record
   - Host: www
   - Value: graceful-ladybug-u01wg5mstq2ie729epi49c8c.herokudns.com

## Verification Commands

### Check DNS Status
```bash
# View configured domains
heroku domains

# Wait for DNS to propagate
heroku domains:wait sagene.tech

# Check certificate status
heroku certs:auto
```

### Test DNS Propagation
```bash
# Check from command line
nslookup sagene.tech
nslookup www.sagene.tech

# Or use online tool
# https://dnschecker.org
```

## SSL/HTTPS

Heroku Automatic Certificate Management (ACM) is now enabled. Once DNS propagates:

1. Heroku will automatically provision SSL certificates
2. Your site will be accessible via HTTPS
3. This usually takes 30-60 minutes after DNS propagation

Check certificate status:
```bash
heroku certs:auto
```

## Timeline

- **DNS Propagation**: 5 minutes - 48 hours (usually 15-30 minutes)
- **SSL Certificate**: 30-60 minutes after DNS propagates
- **Full Setup**: Usually complete within 1-2 hours

## After DNS Propagates

Your app will be accessible at:
- ✓ https://sagene.tech (recommended primary URL)
- ✓ https://www.sagene.tech
- ✓ https://sagene-087b0a9096b2.herokuapp.com (original Heroku URL)

## Troubleshooting

### "DNS Target Not Found"
- Wait longer for DNS propagation (can take up to 48 hours)
- Verify DNS records are correct at your registrar
- Use https://dnschecker.org to check propagation

### "SSL Certificate Pending"
- Wait for DNS to fully propagate first
- Check: `heroku certs:auto`
- Certificates can take 30-60 minutes to provision

### "Too Many Redirects"
- If using Cloudflare, set SSL mode to "Full" (not "Flexible")
- Make sure proxy is disabled (grey cloud) during initial setup

## Need Help?

- [Heroku Custom Domains](https://devcenter.heroku.com/articles/custom-domains)
- [Heroku ACM SSL](https://devcenter.heroku.com/articles/automated-certificate-management)
- [DNS Checker Tool](https://dnschecker.org)
