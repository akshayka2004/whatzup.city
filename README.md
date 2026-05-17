# Enterprise SaaS Platform

A professional, multi-role business discovery and civic engagement platform built with Next.js 16, TypeScript, and Tailwind CSS.

## Overview

This is a production-grade SaaS platform designed to serve four distinct user roles:
- **Public Users**: Browse businesses, read reviews, discover offers
- **Business Owners**: Manage business profile, analytics, customers, and offerings
- **Admin Moderators**: Review approvals, handle reports, manage content
- **Super Admins**: System management, security, infrastructure monitoring

## Features

### Public Platform
- Business discovery with advanced search and filtering
- Location-based nearby business finder
- Real-time reviews and ratings system
- Exclusive offers and deals browsing
- Government announcements and civic notices
- User profiles and notification center
- Favorites/bookmarks system

### Business Dashboard
- Comprehensive analytics and reporting
- Customer insights and engagement metrics
- Offer and product management
- Review monitoring and responses
- Multi-branch location management
- Campaign management tools
- Bill verification queue

### Admin Panel
- Business approval workflow
- User moderation and conduct management
- Report handling and investigation
- Category management
- Government notice publishing
- Audit logging and compliance tracking
- Fraud monitoring tools

### Super Admin Portal
- Tenant management and oversight
- Security monitoring and controls
- System health dashboard
- Role-based permission management
- Feature flags and rollout controls
- Infrastructure status monitoring

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 with PostCSS
- **UI Components**: shadcn/ui (50+ components)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for data visualization
- **Theming**: next-themes (dark/light mode)
- **Notifications**: Sonner (ready to integrate)
- **Icons**: Lucide React

## Project Structure

```
/app
  /(public)/              # Public user routes
    page.tsx
    (routes)/             # Business discovery pages
  /dashboard/             # Business owner dashboard
  /admin/                 # Admin panel routes
  /super-admin/           # Super admin routes
  /business/[id]/         # Dynamic business detail pages

/components
  /layouts/               # Role-based layout wrappers
  /sidebar/               # Navigation sidebars
  /navigation/            # Mobile and command navigation
  /common/                # Shared UI components
  /ui/                    # shadcn/ui components

/lib
  /services/              # API, auth, notifications, analytics
  /hooks/                 # Custom React hooks
  /utils/                 # Formatting, validation, constants

/styles
  /globals.css            # Global styles and design tokens
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Key Pages

### Public Routes
- `/` - Homepage with feature showcase
- `/search` - Advanced business search
- `/category` - Browse by category
- `/nearby` - Location-based discovery
- `/offers` - Active deals and promotions
- `/government` - Government announcements
- `/favorites` - Saved businesses
- `/notifications` - User notification center
- `/profile` - User profile and settings
- `/business/[id]` - Detailed business view

### Dashboard Routes
- `/dashboard` - Business overview and metrics
- `/dashboard/analytics` - Detailed analytics
- `/dashboard/customers` - Customer management
- `/dashboard/products` - Product catalog
- `/dashboard/reviews` - Review management
- `/dashboard/branches` - Location management
- `/dashboard/offers` - Offer management
- `/dashboard/analytics` - Performance tracking

### Admin Routes
- `/admin/approvals` - Business approval queue
- `/admin/reports` - User/content reports
- `/admin/moderation` - User conduct management

### Super Admin Routes
- `/super-admin/tenants` - Tenant management

## Design System

### Color Palette
- **Primary**: Purple (#7C3AED - violet-600)
- **Secondary**: Gray scale (light/dark mode)
- **Accent**: Purple variants
- **Destructive**: Red for warnings/errors
- **Chart Colors**: 5-color palette for data visualization

### Typography
- **Font Family**: Geist (sans) + Geist Mono
- **Heading Styles**: Balanced, professional hierarchy
- **Body Text**: 14px minimum, 1.5 line height
- **Letter Spacing**: Default system defaults

### Spacing
- **Grid**: 4px base unit
- **Border Radius**: 1rem (rounded-2xl) for cards
- **Shadows**: Soft, professional elevation
- **Gaps**: Consistent spacing utilities

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Hidden sidebars on mobile
- Bottom navigation on small screens
- Flexible grid layouts

## Service Layer

### Authentication
- Placeholder auth service (ready for Supabase, Auth.js, etc.)
- Role-based access control
- User session management

### API Service
- Generic HTTP client with error handling
- Request/response interceptors ready
- Pagination and filtering support
- Type-safe responses

### Notifications
- Toast notification system
- Multiple notification types (success, error, info, warning)
- Integrated with Sonner (ready for implementation)

### Analytics
- Event tracking system
- User identification
- Page view tracking
- Conversion monitoring

### File Service
- File upload handling (ready for Vercel Blob, S3, etc.)
- File validation and sizing
- Thumbnail generation support
- URL management

## Custom Hooks

- **useAuth**: Authentication state management
- **useFetch**: Data fetching with loading/error states
- **useForm**: Form state and submission handling
- **useMobile**: Mobile responsiveness detection

## Utilities

### Formatting
- Currency formatting
- Date/time formatting (short, long, relative)
- Phone number formatting
- String manipulation (slugify, capitalize, truncate)
- Number formatting with separators
- File size formatting

### Validation
- Email validation
- Password strength checking
- Username validation
- Phone number validation
- Credit card validation (Luhn algorithm)
- URL validation
- Date and age validation
- Range and required field validation

## Constants

- User roles and permissions
- Business categories
- API configuration
- File upload restrictions
- Validation rules
- HTTP status codes
- Pagination settings

## Integration Points

All services include TODO comments for integration with:
- **Authentication**: Supabase Auth, Auth.js, NextAuth
- **Database**: Supabase, Neon, AWS Aurora
- **File Storage**: Vercel Blob, AWS S3, Cloudinary
- **Analytics**: Google Analytics, Mixpanel, Segment
- **Notifications**: Sonner, Toast libraries
- **Email**: SendGrid, Mailgun, AWS SES

## Security Features

- TypeScript strict mode
- Type-safe API responses
- Input validation throughout
- CSRF protection ready
- Environment variable management
- Secure session handling (ready for implementation)

## Performance Optimizations

- Next.js code splitting
- Lazy component loading
- Image optimization
- Dynamic imports for heavy modules
- Efficient state management
- Memoization ready hooks

## Accessibility

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Color contrast compliance
- Focus management
- Screen reader friendly

## Development Workflow

### Adding New Pages
1. Create page in appropriate route directory
2. Import layout component (PublicLayout, BusinessLayout, AdminLayout)
3. Add navigation link to sidebar
4. Update constants if adding new routes

### Adding New Components
1. Create component in `/components`
2. Add TypeScript interfaces for props
3. Use shadcn/ui components as base
4. Export from component barrel files

### Adding New Services
1. Create service in `/lib/services`
2. Add TypeScript types/interfaces
3. Implement placeholder methods with TODO comments
4. Export service instance

## Deployment

Ready to deploy to Vercel with zero configuration:

```bash
# Push to GitHub
git push origin main

# Vercel auto-detects and deploys
# Set environment variables in Vercel dashboard
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
# Add your service provider keys as needed
```

## Future Enhancements

- [ ] Real authentication system
- [ ] Database integration
- [ ] Real-time updates (WebSockets)
- [ ] Payment integration (Stripe)
- [ ] Email notifications
- [ ] SMS capabilities
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Rate limiting and caching
- [ ] Multi-language support
- [ ] Advanced search (Elasticsearch)

## License

MIT License - feel free to use this as a template for your projects.

## Support

For questions or issues, please create a GitHub issue or contact the development team.

---

**Built with ❤️ using v0**
