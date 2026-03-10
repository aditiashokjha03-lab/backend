// 1. Initialize CORS before anything else
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3030',
    'https://habitforge-track.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(allowed => allowed === '*' || allowed === origin);
        if (isAllowed) {
            callback(null, true);
        } else {
            console.error(`Origin ${origin} not allowed by CORS`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight for all routes
app.options('*', cors());

// 2. Security Middleware
app.use(helmet());

// CORS moved to top

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Basic Logging & Parsing
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Import Routes
const habitRoutes = require('./routes/habitRoutes');
const logRoutes = require('./routes/logRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const focusRoutes = require('./routes/focusRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const profileRoutes = require('./routes/profileRoutes');
const habitaiRoutes = require('./routes/habitaiRoutes');

app.use('/api/v1/habits', habitRoutes);
app.use('/api/v1/logs', logRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/achievements', achievementRoutes);
app.use('/api/v1/focus', focusRoutes);
app.use('/api/v1/challenges', challengeRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/habitai', habitaiRoutes);
app.use('/api/v1/goals', require('./routes/goalRoutes'));

// Global Error Handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
