# Deep Components Aggregator - Admin Guide

This document provides information on the admin panel setup, configuration, and usage.

## Setup and Configuration

### Environment Variables

The admin panel requires the following environment variables:

```bash
# Admin Panel Security
ADMIN_COOKIE_SECRET=your-secure-cookie-secret
ADMIN_SESSION_SECRET=your-secure-session-secret
```

For production environments, these secrets should be at least 32 characters long and randomly generated.

### Initial Admin User

To create an initial admin user, run the following script:

```bash
node scripts/create-admin-user.mjs --email admin@example.com --name "Admin User" --password "secure-password"
```

Options:
- `--email` (`-e`): Email address (required)
- `--name` (`-n`): Full name (required)
- `--password` (`-p`): Password (required)
- `--role` (`-r`): Role (default: admin)

### Nginx Protection

For additional security, configure Nginx to protect the `/api/admin/*` routes with Basic Authentication:

```nginx
# Admin API protection
location ~ ^/api/admin(/|$) {
    auth_basic "Admin API";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://127.0.0.1:9201;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
}
```

Generate the `.htpasswd` file:

```bash
sudo apt-get install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd admin
```

## Admin Panel Features

### Orders Management

- **View Orders**: List all orders with filtering by status, search, and date range
- **Order Details**: View complete order information including customer details, product info, and pricing
- **Update Status**: Change order status and add comments
- **Status Flow**: 
  1. `pending` (New order)
  2. `processing` (In progress)
  3. `completed` (Fulfilled)
  4. `cancelled` (Cancelled)

### Static Pages

- **Create/Edit Pages**: Manage static content pages
- **Page Positions**: Set page visibility in header, footer, or both
- **Sort Order**: Control the display order of pages
- **Publication**: Toggle page visibility with the `is_published` field

### Notifications

- **View Notifications**: See system notifications in the admin panel
- **Mark as Read**: Mark notifications as read
- **Notification Types**: Order updates, system alerts, etc.

### System Settings

- **API Health**: Monitor the status of external API integrations
- **API Keys**: Manage API keys for external services
- **Manual Products**: Add products that aren't available through API integrations

## API Endpoints

### Orders API

- `GET /api/admin/orders`: List orders with filtering
- `GET /api/admin/orders/:id`: Get order details
- `PATCH /api/admin/orders/:id`: Update order status

### Static Pages API

- `GET /api/static-pages`: List all published static pages
- `GET /api/pages/:slug`: Get a specific static page by slug

### Notifications API

- `GET /api/admin/notifications`: List notifications
- `PATCH /api/admin/notifications/:id/read`: Mark notification as read

## Security Considerations

1. **Strong Passwords**: Use strong passwords for admin accounts
2. **Secret Management**: Keep session secrets secure and rotate them periodically
3. **Access Control**: Limit admin access to trusted individuals
4. **Nginx Protection**: Use Nginx Basic Auth as an additional security layer
5. **HTTPS**: Ensure all admin traffic is encrypted with HTTPS
