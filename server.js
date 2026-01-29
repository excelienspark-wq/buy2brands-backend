require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const connectDatabase = require('./config/database');
const setupSocketHandlers = require('./socket/socket.handler');
const { errorHandler, notFound } = require('./middleware/errorHandler.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');
const reviewRoutes = require('./routes/review.routes');
const catalogRoutes = require('./routes/catalog.routes');
const verificationRoutes = require('./routes/verification.routes');
const returnRequestRoutes = require('./routes/returnRequest.routes');
const stripeRoutes = require('./routes/stripe.routes');
const shippingStructureRoutes = require('./routes/shippingStructure.routes');
const consultationRoutes = require('./routes/consultation.routes');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Trust proxy (required for Hostinger/Cloudflare/Railway)
app.set('trust proxy', 1);

// Allowed origins
const allowedOrigins = [
    'http://localhost:3000',
    'https://buy2brands.com',
    'https://www.buy2brands.com'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

// Initialize Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true
    }
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// Make io accessible to routes
app.set('io', io);

// Connect to MongoDB
connectDatabase();

// CORS Configuration
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Stripe webhook route (requires raw body parsing)
// IMPORTANT: This must be before express.json() middleware
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), require('./routes/stripe.routes'));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api', reviewRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/return-requests', returnRequestRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/shipping-structures', shippingStructureRoutes);
app.use('/api/consultation', consultationRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to ExcelienSparks API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            products: '/api/products',
            cart: '/api/cart',
            orders: '/api/orders',
            users: '/api/users'
        }
    });
});

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║       🚀 ExcelienSparks Backend Server Running 🚀    ║
║                                                        ║
║       Server: http://localhost:${PORT}                   ║
║       Environment: ${process.env.NODE_ENV || 'development'}                        ║
║       Database: ${process.env.DB_NAME || 'buy2brands'}                           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`❌ Unhandled Promise Rejection: ${err.message}`);
    // Close server & exit process
    httpServer.close(() => process.exit(1));
});

module.exports = { app, io };
