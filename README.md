# HMS Implementation Project Structure

This directory contains the implementation of the Hospital Management System (HMS) for Shlokam Healthcare.

## Project Structure

```
hms_implementation/
├── public/                  # Static assets
│   ├── logo.png             # Shlokam logo
│   └── user-avatar.svg      # Default user avatar
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── api/             # API routes
│   │   │   ├── auth/        # Authentication endpoints
│   │   │   ├── cloudflare-fix/ # Cloudflare module import fixes
│   │   │   ├── ipd/         # IPD management endpoints
│   │   │   └── patients/    # Patient management endpoints
│   │   ├── dashboard/       # Dashboard pages
│   │   ├── login/           # Login page
│   │   └── opd/             # OPD management pages
│   ├── components/          # Reusable components
│   │   └── opd/             # OPD-specific components
│   └── lib/                 # Utility functions
│       ├── db.ts            # Database access layer
│       └── session.ts       # Session management
└── middleware.ts            # Next.js middleware for auth
```

## First Iteration Implementation

The first iteration focuses on:

1. Fixing Cloudflare module import issues in API routes
2. Implementing authentication and session management
3. Creating core UI components (login, dashboard, layout)
4. Implementing the OPD Management module

## Next Steps

1. Complete the IPD Management module
2. Implement Pharmacy and Billing modules
3. Add Laboratory and Radiology Management
4. Implement remaining modules based on priority

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Reset database (if needed)
wrangler d1 execute DB --local --file=migrations/0001_initial.sql
```

## Deployment

The application can be deployed to Cloudflare Pages with Cloudflare D1 database.
