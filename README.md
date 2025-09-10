# RetailVerse - B2B Matchmaking Platform

RetailVerse is a comprehensive B2B matchmaking platform that connects brands with retailers using AI-powered compatibility scoring and intelligent discovery features.

## 🚀 Features

- **User Authentication & Authorization**: Secure JWT-based authentication with role-based access control
- **Brand Management**: Complete brand profile creation and management
- **Retailer Discovery**: Advanced search and filtering for retailers
- **Smart Matching**: AI-powered compatibility scoring between brands and retailers
- **Dashboard Analytics**: Real-time insights and performance metrics
- **Admin Panel**: Comprehensive platform management and analytics
- **Responsive Design**: Modern, mobile-friendly UI built with React and Tailwind CSS

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with raw SQL queries
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Express Validator** for input validation
- **Helmet** for security headers
- **CORS** for cross-origin requests

### Frontend
- **React 18** with functional components and hooks
- **React Router** for navigation
- **React Query** for server state management
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hook Form** for form handling
- **React Hot Toast** for notifications

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd retailverse
```

### 2. Database Setup
1. Create a PostgreSQL database named `retailverse`
2. Run the SQL script from `Plan/retailverse_database.sql` to create all tables and sample data

### 3. Backend Setup
```bash
cd backend
npm install
cp env.example .env
# Edit .env with your database credentials
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 5. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📁 Project Structure

```
retailverse/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── connection.js
│   │   │   └── queries.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   └── validation.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── brands.js
│   │   │   ├── retailers.js
│   │   │   ├── products.js
│   │   │   ├── fitScores.js
│   │   │   ├── discovery.js
│   │   │   ├── dashboard.js
│   │   │   └── admin.js
│   │   ├── utils/
│   │   │   └── jwt.js
│   │   └── app.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── BrandProfile.jsx
│   │   │   ├── RetailerProfile.jsx
│   │   │   ├── Discovery.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## 👥 User Types

### Brands
- Create and manage brand profiles
- Upload product catalogs
- View retailer recommendations
- Track match scores and analytics

### Retailers
- Create and manage retailer profiles
- Discover compatible brands
- View brand recommendations
- Track match scores and analytics

### Admins
- Platform management and analytics
- User management
- System monitoring
- Content moderation

## 🔐 Authentication

The platform uses JWT tokens for authentication:
- Access tokens (24h expiry)
- Refresh tokens (7 days expiry)
- Role-based authorization (brand, retailer, admin)

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Brands
- `GET /api/brands` - Get all brands
- `GET /api/brands/:id` - Get brand by ID
- `POST /api/brands` - Create brand profile
- `PUT /api/brands/:id` - Update brand profile
- `DELETE /api/brands/:id` - Delete brand profile

### Retailers
- `GET /api/retailers` - Get all retailers
- `GET /api/retailers/:id` - Get retailer by ID
- `POST /api/retailers` - Create retailer profile
- `PUT /api/retailers/:id` - Update retailer profile
- `DELETE /api/retailers/:id` - Delete retailer profile

### Discovery
- `GET /api/discovery/brands` - Search brands
- `GET /api/discovery/retailers` - Search retailers
- `GET /api/discovery/trending` - Get trending categories
- `GET /api/discovery/stats` - Get platform statistics

### Fit Scores
- `POST /api/fit-scores/calculate` - Calculate fit score
- `GET /api/fit-scores/brand/:brandId` - Get brand fit scores
- `GET /api/fit-scores/retailer/:retailerId` - Get retailer fit scores

### Dashboard
- `GET /api/dashboard/user` - Get user dashboard
- `GET /api/dashboard/brand/:brandId` - Get brand dashboard
- `GET /api/dashboard/retailer/:retailerId` - Get retailer dashboard
- `GET /api/dashboard/admin` - Get admin dashboard

## 🚀 Deployment

### Development
```bash
# Install dependencies
npm run install:all

# Start development servers
npm run dev
```

### Production
```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd backend && npm start
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=retailverse
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

## 📈 Features Roadmap

- [ ] Advanced search and filtering
- [ ] Real-time messaging
- [ ] Document sharing
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] API rate limiting
- [ ] Email notifications
- [ ] Payment integration
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@retailverse.com or create an issue in the repository.

---

**RetailVerse** - Connecting brands and retailers for mutual success. 