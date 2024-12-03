const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbOperations = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = 'fc95c2da1a6d2020981939743cecf25bbb3d5b07174f8c5ac24cdb00f82871691e38092084627a6fa89fa5276883015dbc118e8fb442e6cce054412b02b28b7b'; 

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

// Routes

// Admin Routes
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    // For the default admin credentials
    if (username === 'admin' && password === 'admin') {
        const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    
    res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Branch Routes
app.post('/api/admin/branch', authenticateToken, async (req, res) => {
    try {
        const result = await dbOperations.addBranch(req.body);
        res.json(result);
    } catch (error) {
        console.error('Error adding branch:', error);
        res.status(500).json({ message: 'Error adding branch' });
    }
});

app.get('/api/admin/branches', async (req, res) => {
    try {
        const branches = await dbOperations.getBranches();
        res.json(branches);
    } catch (error) {
        console.error('Error getting branches:', error);
        res.status(500).json({ message: 'Error fetching branches' });
    }
});

// Staff Routes
app.post('/api/admin/staff', authenticateToken, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const staffData = {
            ...req.body,
            password: hashedPassword
        };
        const result = await dbOperations.addStaff(staffData);
        res.json(result);
    } catch (error) {
        console.error('Error adding staff:', error);
        res.status(500).json({ message: 'Error adding staff' });
    }
});

app.get('/api/admin/staff', authenticateToken, async (req, res) => {
    try {
        const staff = await dbOperations.getStaff();
        res.json(staff);
    } catch (error) {
        console.error('Error getting staff:', error);
        res.status(500).json({ message: 'Error fetching staff' });
    }
});

// Staff Login
app.post('/api/staff/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const staff = await dbOperations.getStaffByEmail(email);
        
        if (!staff) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, staff.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: staff.id, email: staff.email, role: 'staff' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            staff: {
                id: staff.id,
                name: `${staff.first_name} ${staff.last_name}`,
                email: staff.email,
                branch_id: staff.branch_id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Parcel Routes
app.post('/api/staff/parcels', authenticateToken, async (req, res) => {
    try {
        const result = await dbOperations.addParcel(req.body);
        res.json(result);
    } catch (error) {
        console.error('Error adding parcel:', error);
        res.status(500).json({ message: 'Error adding parcel' });
    }
});

app.put('/api/staff/parcels/:tracking/status', authenticateToken, async (req, res) => {
    try {
        const result = await dbOperations.updateParcelStatus(req.params.tracking, req.body);
        res.json(result);
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
});

app.get('/api/staff/parcels', authenticateToken, async (req, res) => {
    try {
        const { status, branch_id } = req.query;
        const parcels = await dbOperations.getParcels(status, branch_id);
        res.json(parcels);
    } catch (error) {
        console.error('Error fetching parcels:', error);
        res.status(500).json({ message: 'Error fetching parcels' });
    }
});

// Customer Tracking Route
app.get('/api/track/:tracking', async (req, res) => {
    try {
        const parcel = await dbOperations.getParcelByTracking(req.params.tracking);
        if (!parcel) {
            return res.status(404).json({ message: 'Parcel not found' });
        }
        res.json(parcel);
    } catch (error) {
        console.error('Error tracking parcel:', error);
        res.status(500).json({ message: 'Error tracking parcel' });
    }
});

// Dashboard Stats Route
app.get('/api/admin/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const stats = await dbOperations.getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
});


// Branch Routes
app.get('/api/admin/branches/:id', authenticateToken, async (req, res) => {
    try {
        const branch = await dbOperations.getBranchById(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }
        res.json(branch);
    } catch (error) {
        console.error('Error fetching branch:', error);
        res.status(500).json({ message: 'Error fetching branch' });
    }
});

app.put('/api/admin/branches/:id', authenticateToken, async (req, res) => {
    try {
        const result = await dbOperations.updateBranch(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({ message: 'Error updating branch' });
    }
});

app.delete('/api/admin/branches/:id', authenticateToken, async (req, res) => {
    try {
        const result = await dbOperations.deleteBranch(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({ message: 'Error deleting branch' });
    }
});

// Staff Routes
app.get('/api/admin/staff/:id', authenticateToken, async (req, res) => {
    try {
        const staff = await dbOperations.getStaffById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found' });
        }
        res.json(staff);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ message: 'Error fetching staff' });
    }
});

app.put('/api/admin/staff/:id', authenticateToken, async (req, res) => {
    try {
        const result = await dbOperations.updateStaff(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ message: 'Error updating staff' });
    }
});

app.delete('/api/admin/staff/:id', authenticateToken, async (req, res) => {
    try {
        const result = await dbOperations.deleteStaff(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ message: 'Error deleting staff' });
    }
});

// Parcel Routes
app.get('/api/admin/parcels', authenticateToken, async (req, res) => {
    try {
        const { page = 1, status, search } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        const parcels = await dbOperations.getAdminParcels(status, search, limit, offset);
        res.json(parcels);
    } catch (error) {
        console.error('Error fetching parcels:', error);
        res.status(500).json({ message: 'Error fetching parcels' });
    }
});

// Reports Routes
app.post('/api/admin/reports/:type', authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        const { startDate, endDate, ...filters } = req.body;
        
        // Validate dates
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        // Log the request parameters
        console.log('Report request:', {
            type,
            startDate,
            endDate,
            filters
        });
        
        const report = await dbOperations.generateReport(type, startDate, endDate, filters);
        res.json(report);
    } catch (error) {
        // Enhanced error logging
        console.error('Error generating report:', {
            error: error.message,
            stack: error.stack,
            type: req.params.type,
            filters: req.body
        });
        res.status(500).json({ 
            message: 'Error generating report',
            details: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});