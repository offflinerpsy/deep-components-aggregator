# Protecting Admin API with Nginx Basic Auth

This guide explains how to set up Nginx to protect the `/api/admin/*` routes with Basic Authentication.

## Why Basic Auth?

While the admin panel (`/admin`) is protected by AdminJS's built-in authentication, the admin API endpoints (`/api/admin/*`) are only protected by the `requireAdmin` middleware. Adding Basic Authentication at the Nginx level provides an additional layer of security.

## Prerequisites

- Nginx installed and configured
- Access to the server with sudo privileges

## Step 1: Create a Password File

First, create a password file for Nginx Basic Authentication:

```bash
sudo apt-get install apache2-utils
sudo mkdir -p /etc/nginx/auth
sudo htpasswd -c /etc/nginx/auth/.htpasswd admin
```

When prompted, enter a strong password. This will create a new password file with a user named "admin".

To add more users later:

```bash
sudo htpasswd /etc/nginx/auth/.htpasswd another_user
```

## Step 2: Configure Nginx

Edit your Nginx configuration file for the site (e.g., `/etc/nginx/sites-available/prosnab.tech`):

```bash
sudo nano /etc/nginx/sites-available/prosnab.tech
```

Add the following location block inside the `server` block:

```nginx
# Admin API protection with Basic Auth
location ~ ^/api/admin(/|$) {
    auth_basic "Admin API";
    auth_basic_user_file /etc/nginx/auth/.htpasswd;
    
    proxy_pass http://127.0.0.1:9201;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

## Step 3: Test and Reload Nginx

Test the configuration:

```bash
sudo nginx -t
```

If the test is successful, reload Nginx:

```bash
sudo systemctl reload nginx
```

## Step 4: Verify Protection

Try accessing an admin API endpoint:

```bash
curl -I https://prosnab.tech/api/admin/orders
```

You should receive a `401 Unauthorized` response.

Now try with Basic Auth:

```bash
curl -I -u admin:your_password https://prosnab.tech/api/admin/orders
```

You should receive a `200 OK` response (assuming you have the correct credentials and authorization).

## Security Considerations

1. **Use HTTPS**: Always use HTTPS when implementing Basic Auth to prevent credentials from being sent in plain text.

2. **Strong Passwords**: Use strong, unique passwords for Basic Auth.

3. **IP Restrictions**: Consider adding IP restrictions to further limit access:

   ```nginx
   # Allow only specific IPs
   location ~ ^/api/admin(/|$) {
       allow 192.168.1.100;  # Your trusted IP
       allow 10.0.0.0/8;     # Internal network
       deny all;             # Deny everyone else
       
       auth_basic "Admin API";
       auth_basic_user_file /etc/nginx/auth/.htpasswd;
       
       # proxy_pass and other directives...
   }
   ```

4. **Regular Rotation**: Regularly rotate the Basic Auth credentials.

## Troubleshooting

- **403 Forbidden**: Check file permissions on the `.htpasswd` file. Nginx needs read access.
- **Authentication Not Working**: Ensure the path to the `.htpasswd` file is correct and the file exists.
- **Nginx Not Loading Configuration**: Check for syntax errors with `nginx -t`.
