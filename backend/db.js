const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const config = require('./config');
const emailService = require('./email-service');

// Create database connection
const db = new sqlite3.Database(config.database.path, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Admin table
        db.run(`CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);

        // Branch table
        db.run(`CREATE TABLE IF NOT EXISTS branch (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_code TEXT UNIQUE NOT NULL,
            country TEXT NOT NULL,
            county TEXT NOT NULL,
            location TEXT NOT NULL,
            street_building TEXT NOT NULL,
            postal_code TEXT,
            contact TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Staff table
        db.run(`CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            branch_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (branch_id) REFERENCES branch(id)
        )`);

        // Parcel table
        db.run(`CREATE TABLE IF NOT EXISTS parcel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tracking_number TEXT UNIQUE NOT NULL,
            sender_name TEXT NOT NULL,
            sender_address TEXT NOT NULL,
            sender_email TEXT,
            sender_phone TEXT,
            recipient_name TEXT NOT NULL,
            recipient_address TEXT NOT NULL,
            recipient_email TEXT,
            recipient_phone TEXT,
            weight REAL,
            delicacy TEXT,
            size TEXT,
            price REAL,
            status TEXT NOT NULL DEFAULT 'Item Accepted by Courier',
            pickup_branch_id INTEGER,
            delivery_branch_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pickup_branch_id) REFERENCES branch(id),
            FOREIGN KEY (delivery_branch_id) REFERENCES branch(id)
        )`);

         // Add parcel status history table
         db.run(`CREATE TABLE IF NOT EXISTS parcel_status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parcel_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            location TEXT,
            comments TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parcel_id) REFERENCES parcel(id)
        )`);

        // Create default admin if not exists
        createDefaultAdmin();
    });
}

// Create default admin account
async function createDefaultAdmin() {
    const defaultAdmin = {
        username: 'admin',
        password: 'admin'
    };

    db.get("SELECT id FROM admin WHERE username = ?", [defaultAdmin.username], async (err, row) => {
        if (err) {
            console.error('Error checking admin:', err);
        } else if (!row) {
            const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);
            db.run(
                "INSERT INTO admin (username, password) VALUES (?, ?)",
                [defaultAdmin.username, hashedPassword],
                (err) => {
                    if (err) {
                        console.error('Error creating default admin:', err);
                    } else {
                        console.log('Default admin account created');
                    }
                }
            );
        }
    });
}

// Database operations object
const dbOperations = {
    // Admin operations
    adminLogin: async (username, password) => {
        return new Promise((resolve, reject) => {
            db.get(
                "SELECT * FROM admin WHERE username = ?",
                [username],
                async (err, row) => {
                    if (err) reject(err);
                    else if (!row) resolve(null);
                    else {
                        const match = await bcrypt.compare(password, row.password);
                        resolve(match ? row : null);
                    }
                }
            );
        });
    },

    // Branch operations
    getBranchById: (id) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM branch WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    updateBranch: (id, branchData) => {
        return new Promise((resolve, reject) => {
            const { country, county, location, street_building, postal_code, contact } = branchData;
            
            db.run(
                `UPDATE branch 
                 SET country = ?, county = ?, location = ?, street_building = ?, 
                     postal_code = ?, contact = ?
                 WHERE id = ?`,
                [country, county, location, street_building, postal_code, contact, id],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, changes: this.changes });
                }
            );
        });
    },

    deleteBranch: (id) => {
        return new Promise((resolve, reject) => {
            // First check if branch has associated staff or parcels
            db.get(`
                SELECT 
                    (SELECT COUNT(*) FROM staff WHERE branch_id = ?) as staff_count,
                    (SELECT COUNT(*) FROM parcel WHERE pickup_branch_id = ? OR delivery_branch_id = ?) as parcel_count
            `, [id, id, id], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (result.staff_count > 0 || result.parcel_count > 0) {
                    reject(new Error('Cannot delete branch with associated staff or parcels'));
                    return;
                }
                
                db.run('DELETE FROM branch WHERE id = ?', [id], function(err) {
                    if (err) reject(err);
                    else resolve({ id, changes: this.changes });
                });
            });
        });
    },

    // Admin Parcel operations
    getAdminParcels: (status = null, search = null, limit = 10, offset = 0) => {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT 
                    p.*,
                    pb.street_building as pickup_branch_name,
                    db.street_building as delivery_branch_name
                FROM parcel p
                LEFT JOIN branch pb ON p.pickup_branch_id = pb.id
                LEFT JOIN branch db ON p.delivery_branch_id = db.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (status) {
                query += ` AND p.status = ?`;
                params.push(status);
            }
            
            if (search) {
                query += ` AND (p.tracking_number LIKE ? OR p.sender_name LIKE ? OR p.recipient_name LIKE ?)`;
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            
            // Get total count
            db.get(`SELECT COUNT(*) as total FROM (${query})`, params, (err, countRow) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Add pagination
                query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
                params.push(limit, offset);
                
                db.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve({
                        parcels: rows,
                        total: countRow.total,
                        page: Math.floor(offset / limit) + 1,
                        totalPages: Math.ceil(countRow.total / limit)
                    });
                });
            });
        });
    },

    // Report generation
    // Replace the generateReport function in dbOperations with this updated version

    generateReport: (type, startDate, endDate, filters) => {
        return new Promise((resolve, reject) => {
            try {
                // Format dates to ISO string
                const formattedStartDate = new Date(startDate).toISOString();
                const formattedEndDate = new Date(endDate).toISOString();
                
                let query, params;
                
                switch(type) {
                    case 'parcels':
                        query = `
                            WITH parcel_metrics AS (
                                SELECT 
                                    p.status,
                                    COUNT(*) as count,
                                    AVG(CASE 
                                        WHEN p.status = 'Arrived At Destination' 
                                        THEN julianday(psh.created_at) - julianday(p.created_at)
                                        ELSE NULL 
                                    END) as avg_delivery_time,
                                    p.created_at,
                                    p.tracking_number,
                                    p.sender_name,
                                    p.recipient_name,
                                    pb.street_building as pickup_location,
                                    db.street_building as delivery_location
                                FROM parcel p
                                LEFT JOIN branch pb ON p.pickup_branch_id = pb.id
                                LEFT JOIN branch db ON p.delivery_branch_id = db.id
                                LEFT JOIN parcel_status_history psh ON p.id = psh.parcel_id
                                WHERE p.created_at BETWEEN ? AND ?
                                ${filters.status ? 'AND p.status = ?' : ''}
                                ${filters.branchId ? 'AND (p.pickup_branch_id = ? OR p.delivery_branch_id = ?)' : ''}
                                GROUP BY p.status, p.id
                            )
                            SELECT * FROM parcel_metrics
                        `;
                        params = [formattedStartDate, formattedEndDate];
                        if (filters.status) params.push(filters.status);
                        if (filters.branchId) params.push(filters.branchId, filters.branchId);
                        break;

                        case 'staff':
                            query = `
                                WITH staff_metrics AS (
                                    SELECT 
                                        s.id,
                                        s.employee_id,
                                        s.first_name || ' ' || s.last_name as staff_name,
                                        s.email,
                                        b.street_building as branch_name,
                                        COUNT(DISTINCT p.id) as parcels_handled,
                                        datetime(s.created_at, 'localtime') as join_date,
                                        CASE 
                                            WHEN COUNT(DISTINCT p.id) > 0 THEN 
                                                (COUNT(DISTINCT CASE WHEN p.status = 'Arrived At Destination' THEN p.id END) * 100.0 / COUNT(DISTINCT p.id))
                                            ELSE 0 
                                        END as success_rate
                                    FROM staff s
                                    LEFT JOIN branch b ON s.branch_id = b.id
                                    LEFT JOIN parcel p ON (
                                        (p.pickup_branch_id = s.branch_id OR p.delivery_branch_id = s.branch_id)
                                        AND p.created_at BETWEEN ? AND ?
                                    )
                                    GROUP BY s.id, s.employee_id, s.first_name, s.last_name, s.email, b.street_building, datetime(s.created_at, 'localtime')
                                )
                                SELECT * FROM staff_metrics
                            `;
                            params = [formattedStartDate, formattedEndDate];
                            break;
                            
                    case 'branches':
                        query = `
                            WITH branch_metrics AS (
                                SELECT 
                                    b.id,
                                    b.branch_code,
                                    b.street_building || ', ' || b.location as location,
                                    COUNT(DISTINCT s.id) as staff_count,
                                    COUNT(DISTINCT p.id) as parcel_count,
                                    'Active' as status
                                FROM branch b
                                LEFT JOIN staff s ON b.id = s.branch_id
                                LEFT JOIN parcel p ON (
                                    p.pickup_branch_id = b.id 
                                    OR p.delivery_branch_id = b.id
                                )
                                WHERE b.created_at BETWEEN ? AND ?
                                ${filters.region ? 'AND (b.county LIKE ? OR b.location LIKE ?)' : ''}
                                GROUP BY b.id
                            )
                            SELECT * FROM branch_metrics
                        `;
                        params = [formattedStartDate, formattedEndDate];
                        if (filters.region) {
                            const regionSearch = `%${filters.region}%`;
                            params.push(regionSearch, regionSearch);
                        }
                        break;

                    default:
                        reject(new Error('Invalid report type'));
                        return;
                }

                db.all(query, params, (err, rows) => {
                    if (err) {
                        console.error('Report generation error:', {
                            error: err.message,
                            type,
                            startDate: formattedStartDate,
                            endDate: formattedEndDate,
                            filters
                        });
                        reject(err);
                        return;
                    }

                    const summary = calculateReportSummary(rows);
                    const chartData = generateChartData(rows);

                    resolve({
                        summary,
                        details: rows,
                        chartData
                    });
                });
            } catch (error) {
                console.error('Error in generateReport:', error);
                reject(error);
            }
        });
    },

    // Branch operations
    addBranch: (branchData) => {
        return new Promise((resolve, reject) => {
            const { country, county, location, street_building, postal_code, contact } = branchData;
            const branchCode = generateBranchCode();
            
            db.run(
                `INSERT INTO branch (
                    branch_code, country, county, location, street_building, postal_code, contact
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [branchCode, country, county, location, street_building, postal_code, contact],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, branch_code: branchCode });
                }
            );
        });
    },

    getBranches: () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM branch ORDER BY id DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Staff operations
    addStaff: (staffData) => {
        return new Promise((resolve, reject) => {
            const { first_name, last_name, email, password, branch_id } = staffData;
            const employee_id = generateEmployeeId();
            
            db.run(
                `INSERT INTO staff (
                    first_name, last_name, email, password, branch_id, employee_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [first_name, last_name, email, password, branch_id, employee_id],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, employee_id });
                }
            );
        });
    },

    getStaff: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT s.*, b.street_building as branch_name 
                FROM staff s 
                LEFT JOIN branch b ON s.branch_id = b.id 
                ORDER BY s.id DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getStaffByEmail: (email) => {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    staff.*, 
                    branch.street_building as branch_name,
                    branch.country,
                    branch.county,
                    branch.location
                FROM staff 
                LEFT JOIN branch ON staff.branch_id = branch.id 
                WHERE staff.email = ?`,
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

     // Get staff by ID
     getStaffById: (id) => {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    staff.*, 
                    branch.street_building as branch_name,
                    branch.country,
                    branch.county,
                    branch.location
                FROM staff 
                LEFT JOIN branch ON staff.branch_id = branch.id 
                WHERE staff.id = ?`,
                [id],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    },

    // Update staff
    updateStaff: (id, staffData) => {
        return new Promise((resolve, reject) => {
            const { first_name, last_name, email, password, branch_id } = staffData;
            
            let query = `UPDATE staff SET 
                first_name = ?, 
                last_name = ?, 
                email = ?, 
                branch_id = ?`;
            let params = [first_name, last_name, email, branch_id];

            // Add password to update if provided
            if (password) {
                query += `, password = ?`;
                params.push(password);
            }

            query += ` WHERE id = ?`;
            params.push(id);

            db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, changes: this.changes });
                }
            });
        });
    },

    // Delete staff
    deleteStaff: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM staff WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, changes: this.changes });
                }
            });
        });
    },

    // Parcel operations
    addParcel: (parcelData) => {
        return new Promise((resolve, reject) => {
            const tracking_number = generateTrackingNumber();
            const {
                sender_name, sender_address, sender_email, sender_phone,
                recipient_name, recipient_address, recipient_email, recipient_phone,
                weight, delicacy, size, price,
                pickup_branch_id, delivery_branch_id
            } = parcelData;
    
            const defaultStatus = 'Item Accepted by Courier';
    
            db.run(`
                INSERT INTO parcel (
                    tracking_number, sender_name, sender_address, sender_email, sender_phone,
                    recipient_name, recipient_address, recipient_email, recipient_phone,
                    weight, delicacy, size, price, status,
                    pickup_branch_id, delivery_branch_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tracking_number, 
                sender_name, sender_address, sender_email, sender_phone,
                recipient_name, recipient_address, recipient_email, recipient_phone,
                weight, delicacy, size, price,
                defaultStatus,
                pickup_branch_id, delivery_branch_id
            ], async function(err) {
                if (err) {
                    reject(err);
                    return;
                }
    
                try {
                    // Add initial status to history
                    await new Promise((resolve, reject) => {
                        db.run(
                            `INSERT INTO parcel_status_history (
                                parcel_id, status, location
                            ) VALUES (?, ?, ?)`,
                            [this.lastID, defaultStatus, 'Initial Location'],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
    
                    // Get pickup and delivery branch information
                    const [pickupBranch, deliveryBranch] = await Promise.all([
                        new Promise((resolve, reject) => {
                            db.get('SELECT * FROM branch WHERE id = ?', [pickup_branch_id], (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            });
                        }),
                        new Promise((resolve, reject) => {
                            db.get('SELECT * FROM branch WHERE id = ?', [delivery_branch_id], (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            });
                        })
                    ]);

                    // Send email notifications
                    try {
                        await emailService.sendNewParcelNotification({
                            tracking_number,
                            sender_name,
                            sender_email,
                            recipient_name,
                            recipient_email,
                            weight,
                            delicacy,
                            size,
                            pickup_branch: pickupBranch
                        });
                    } catch (emailError) {
                        console.error('Email notification error:', emailError);
                        // Don't reject here as the parcel was still created successfully
                    }
    
                    resolve({ 
                        id: this.lastID, 
                        tracking_number,
                        status: defaultStatus
                    });
                } catch (error) {
                    reject(error);
                }
            });
        });
    },

    getParcels: (status = null, branch_id = null) => {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT 
                    p.*,
                    pb.street_building as pickup_branch_name,
                    db.street_building as delivery_branch_name
                FROM parcel p
                LEFT JOIN branch pb ON p.pickup_branch_id = pb.id
                LEFT JOIN branch db ON p.delivery_branch_id = db.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (status) {
                query += ` AND p.status = ?`;
                params.push(status);
            }
            
            if (branch_id) {
                query += ` AND (p.pickup_branch_id = ? OR p.delivery_branch_id = ?)`;
                params.push(branch_id, branch_id);
            }
            
            query += ` ORDER BY p.created_at DESC`;

            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getParcelByTracking: (tracking_number) => {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    p.*,
                    pb.street_building as pickup_branch_name,
                    db.street_building as delivery_branch_name
                FROM parcel p
                LEFT JOIN branch pb ON p.pickup_branch_id = pb.id
                LEFT JOIN branch db ON p.delivery_branch_id = db.id
                WHERE p.tracking_number = ?
            `, [tracking_number], async (err, parcel) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!parcel) {
                    resolve(null);
                    return;
                }

                try {
                    const history = await new Promise((resolve, reject) => {
                        db.all(
                            `SELECT 
                                status,
                                location,
                                comments,
                                created_at as timestamp
                            FROM parcel_status_history 
                            WHERE parcel_id = ? 
                            ORDER BY created_at DESC`,
                            [parcel.id],
                            (err, rows) => {
                                if (err) reject(err);
                                else resolve(rows);
                            }
                        );
                    });

                    const response = {
                        tracking_number: parcel.tracking_number,
                        status: parcel.status,
                        sender_name: parcel.sender_name,
                        sender_address: parcel.sender_address,
                        sender_phone: parcel.sender_phone,
                        recipient_name: parcel.recipient_name,
                        recipient_address: parcel.recipient_address,
                        recipient_phone: parcel.recipient_phone,
                        weight: parcel.weight,
                        delicacy: parcel.delicacy,
                        pickup_branch_name: parcel.pickup_branch_name,
                        delivery_branch_name: parcel.delivery_branch_name,
                        tracking_history: history.map(item => ({
                            status: item.status,
                            location: item.location || 'N/A',
                            description: item.comments || `Parcel ${item.status}`,
                            timestamp: item.timestamp
                        }))
                    };
                    
                    resolve(response);
                } catch (historyErr) {
                    reject(historyErr);
                }
            });
        });
    },

    updateParcelStatus: (tracking_number, statusData) => {
        return new Promise((resolve, reject) => {
            const { status, location, comments } = statusData;
            
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
    
                db.get(
                    'SELECT * FROM parcel WHERE tracking_number = ?',
                    [tracking_number],
                    async (err, parcel) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
    
                        if (!parcel) {
                            db.run('ROLLBACK');
                            reject(new Error('Parcel not found'));
                            return;
                        }
    
                        try {
                            await new Promise((resolve, reject) => {
                                db.run(
                                    `UPDATE parcel SET status = ? WHERE tracking_number = ?`,
                                    [status, tracking_number],
                                    (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    }
                                );
                            });
    
                            await new Promise((resolve, reject) => {
                                db.run(
                                    `INSERT INTO parcel_status_history (
                                        parcel_id, status, location, comments
                                    ) VALUES (?, ?, ?, ?)`,
                                    [parcel.id, status, location, comments],
                                    (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    }
                                );
                            });
    
                            // Send email notification
                            try {
                                await emailService.sendStatusUpdateNotification({
                                    tracking_number,
                                    status,
                                    location,
                                    comments,
                                    recipient_email: parcel.recipient_email,
                                    sender_email: parcel.sender_email
                                });
                            } catch (emailError) {
                                console.error('Email notification error:', emailError);
                                // Don't reject here as the status was still updated successfully
                            }
    
                            db.run('COMMIT');
                            resolve({ 
                                success: true, 
                                tracking_number,
                                status
                            });
                        } catch (error) {
                            db.run('ROLLBACK');
                            reject(error);
                        }
                    }
                );
            });
        });
    },

    // Dashboard stats
    getDashboardStats: () => {
        return new Promise((resolve, reject) => {
            const stats = {};
            
            db.serialize(() => {
                // Get total branches
                db.get("SELECT COUNT(*) as total FROM branch", [], (err, row) => {
                    if (err) reject(err);
                    stats.totalBranches = row.total;
                });

                // Get total parcels
                db.get("SELECT COUNT(*) as total FROM parcel", [], (err, row) => {
                    if (err) reject(err);
                    stats.totalParcels = row.total;
                });

                // Get total staff
                db.get("SELECT COUNT(*) as total FROM staff", [], (err, row) => {
                    if (err) reject(err);
                    stats.totalStaff = row.total;

                    // Get parcel status counts
                    db.all(`
                        SELECT status, COUNT(*) as count 
                        FROM parcel 
                        GROUP BY status
                    `, [], (err, rows) => {
                        if (err) reject(err);
                        stats.parcelStatus = rows;
                        resolve(stats);
                    });
                });
            });
        });
    }
};

// Helper function to generate unique branch code
function generateBranchCode() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}
function generateBranchCode() {
    return 'BR' + Date.now().toString(36).toUpperCase();
}

function generateEmployeeId() {
    return 'EMP' + Date.now().toString(36).toUpperCase();
}

function generateTrackingNumber() {
    return 'DX' + Date.now().toString(36).toUpperCase();
}

function calculateReportSummary(rows) {
    if (!rows || rows.length === 0) {
        return {
            totalCount: 0,
            avgDeliveryTime: 0,
            successRate: 0
        };
    }

    const summary = {
        totalParcels: 0,
        avgDeliveryTime: 0,
        successRate: 0,
        totalStaff: 0,
        avgParcelsPerStaff: 0,
        mostActiveBranch: '',
        totalBranches: 0,
        totalRevenue: 0,
        avgStaffPerBranch: 0
    };

    // Calculate metrics based on the first row's structure to determine report type
    if ('tracking_number' in rows[0]) {
        // Parcel report
        summary.totalParcels = rows.length;
        const deliveredParcels = rows.filter(r => r.status === 'Arrived At Destination');
        summary.successRate = (deliveredParcels.length / rows.length) * 100;
        summary.avgDeliveryTime = rows.reduce((acc, curr) => acc + (curr.avg_delivery_time || 0), 0) / rows.length;
    } else if ('employee_id' in rows[0]) {
        // Staff report
        summary.totalStaff = rows.length;
        summary.avgParcelsPerStaff = rows.reduce((acc, curr) => acc + curr.parcels_handled, 0) / rows.length;
        
        // Find most active branch
        const branchActivity = {};
        rows.forEach(row => {
            if (row.branch_name) {
                branchActivity[row.branch_name] = (branchActivity[row.branch_name] || 0) + row.parcels_handled;
            }
        });
        summary.mostActiveBranch = Object.entries(branchActivity)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    } else if ('branch_code' in rows[0]) {
        // Branch report
        summary.totalBranches = rows.length;
        summary.totalRevenue = rows.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        summary.avgStaffPerBranch = rows.reduce((acc, curr) => acc + curr.staff_count, 0) / rows.length;
    }

    return summary;
}

function generateChartData(rows) {
    if (!rows || rows.length === 0) return {};

    // Determine report type based on data structure
    if ('tracking_number' in rows[0]) {
        // Parcel report - Status distribution
        const statusCounts = {};
        rows.forEach(row => {
            statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
        });

        return {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ]
            }]
        };
    } else if ('employee_id' in rows[0]) {
        // Staff report - Parcels handled per staff
        return {
            labels: rows.map(row => row.staff_name),
            datasets: [{
                label: 'Parcels Handled',
                data: rows.map(row => row.parcels_handled),
                backgroundColor: '#36A2EB'
            }]
        };
    } else if ('branch_code' in rows[0]) {
        // Branch report - Parcel distribution across branches
        return {
            labels: rows.map(row => row.location),
            datasets: [{
                label: 'Parcels Handled',
                data: rows.map(row => row.parcel_count),
                backgroundColor: '#4BC0C0'
            }]
        };
    }

    return {};
}

module.exports = dbOperations;