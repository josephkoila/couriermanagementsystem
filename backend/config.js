const config = {
    // Database configuration
    database: {
        path: './courier.db'
    },
    
    // Server configuration
    server: {
        port: process.env.PORT || 3000
    },
    
    // JWT configuration
    jwt: {
        secret: 'fc95c2da1a6d2020981939743cecf25bbb3d5b07174f8c5ac24cdb00f82871691e38092084627a6fa89fa5276883015dbc118e8fb442e6cce054412b02b28b7b',
        expiresIn: '24h'
    },
    
    // Email configuration
    email: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: 'josephkurit@kabarak.ac.ke',  // Replace with your email
        password: 'jose23#@',  // Replace with your app password
        from: 'Courier Service josephkurit@kabarak.ac.ke'  // Replace with your email
    }
};

module.exports = config;