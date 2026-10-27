const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Session
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);


// Static files
app.use(express.static(path.join(__dirname, "public")));


// MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    next();
}


// ==============================
// REGISTER ROUTE
// ==============================

app.post("/api/register", async (req, res) => {

    try {

        console.log("Register request received");

        const {
            name,
            email,
            password,
            role,
            department,
            phone
        } = req.body;

        const normalizedEmail =
            email ? email.trim().toLowerCase() : "";
        const normalizedPhone =
            phone ? String(phone).trim() : null;
        const normalizedDepartment =
            department ? department.trim() : null;
        const approvalStatus =
            role === "employee" ? "pending" : "approved";


        if (!name || !normalizedEmail || !password || !role) {

            return res.status(400).json({
                message: "Please fill all required fields"
            });

        }


        if (
            role !== "admin" &&
            role !== "employee"
        ) {

            return res.status(400).json({
                message: "Invalid role"
            });

        }


        // Check existing email

        const [existingUser] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail]
        );


        if (existingUser.length > 0) {

            return res.status(409).json({
                message: "Email already registered"
            });

        }


        // Encrypt password

        const hashedPassword =
            await bcrypt.hash(password, 10);


        await db.query(
            `INSERT INTO users
            (name, email, password, role, phone, department, approval_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                normalizedEmail,
                hashedPassword,
                role,
                normalizedPhone,
                normalizedDepartment,
                approvalStatus
            ]
        );

        if (role === "employee") {

            return res.status(201).json({
                message: "Registration successful. Please wait for admin approval before login."
            });

        }

        res.status(201).json({
            message: "Registration successful"
        });
    } catch (error) {

        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            message: "Registration failed"
        });

    }

});

// ==============================
// LOGIN ROUTE
// ==============================

app.post("/api/login", async (req, res) => {

    try {

        const { email, password } = req.body;
        const normalizedEmail =
            email ? email.trim().toLowerCase() : "";

        if (!normalizedEmail || !password) {

            return res.status(400).json({
                message: "Email and password are required"
            });

        }

        const [users] = await db.query(
            `SELECT id, name, email, password, role, phone, department,
                    approval_status
             FROM users
             WHERE email = ?`,
            [normalizedEmail]
        );

        if (users.length === 0) {

            return res.status(401).json({
                message: "Invalid email or password"
            });

        }

        const user = users[0];

        if (
            user.role === "employee" &&
            user.approval_status !== "approved"
        ) {

            return res.status(403).json({
                message: `Your account is ${user.approval_status}. Please contact admin.`
            });

        }

        const passwordMatches =
            await bcrypt.compare(password, user.password);

        if (!passwordMatches) {

            return res.status(401).json({
                message: "Invalid email or password"
            });

        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            department: user.department,
            approval_status: user.approval_status
        };

        res.json({
            message: "Login successful",
            user: req.session.user
        });

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            message: "Login failed"
        });

    }

});

// ==============================
// CURRENT USER ROUTE
// ==============================

app.get("/api/me", requireLogin, (req, res) => {

    res.json({
        user: req.session.user
    });

});

// ==============================
// ROLE-BASED USER LIST ROUTES
// ==============================

app.get("/api/admins", requireLogin, async (req, res) => {

    try {

        if (req.session.user.role !== "employee") {

            return res.status(403).json({
                message: "Only employees can view admin details"
            });

        }

        const [admins] = await db.query(
            `SELECT id, name, email, department, phone, approval_status
             FROM users
             WHERE role = 'admin'
             ORDER BY name`
        );

        res.json(admins);

    } catch (error) {

        console.error("ADMINS ERROR:", error);

        res.status(500).json({
            message: "Unable to load admin details"
        });

    }

});

app.get("/api/employees", requireLogin, async (req, res) => {

    try {

        if (req.session.user.role !== "admin") {

            return res.status(403).json({
                message: "Only admins can view employee details"
            });

        }

        const [employees] = await db.query(
            `SELECT id, name, email, department, phone, approval_status
             FROM users
             WHERE role = 'employee'
             ORDER BY
                CASE approval_status
                    WHEN 'pending' THEN 1
                    WHEN 'approved' THEN 2
                    WHEN 'rejected' THEN 3
                    ELSE 4
                END,
                name`
        );

        res.json(employees);

    } catch (error) {

        console.error("EMPLOYEES ERROR:", error);

        res.status(500).json({
            message: "Unable to load employee details"
        });

    }

});

// ==============================
// EMPLOYEE APPROVAL ROUTE
// ==============================

app.post("/api/employees/:id/approval", requireLogin, async (req, res) => {

    try {

        if (req.session.user.role !== "admin") {

            return res.status(403).json({
                message: "Only admins can approve or reject employees"
            });

        }

        const { action } = req.body;

        if (
            action !== "approve" &&
            action !== "reject"
        ) {

            return res.status(400).json({
                message: "Invalid approval action"
            });

        }

        const approvalStatus =
            action === "approve" ? "approved" : "rejected";

        const [result] = await db.query(
            `UPDATE users
             SET approval_status = ?
             WHERE id = ? AND role = 'employee'`,
            [approvalStatus, req.params.id]
        );

        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "Employee not found"
            });

        }

        res.json({
            message: `Employee ${approvalStatus} successfully`
        });

    } catch (error) {

        console.error("APPROVAL ERROR:", error);

        res.status(500).json({
            message: "Unable to update employee approval"
        });

    }

});

// ==============================
// LOGOUT ROUTE
// ==============================

app.post("/api/logout", requireLogin, (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            return res.status(500).json({
                message: "Logout failed"
            });

        }

        res.clearCookie("connect.sid");
        res.json({
            message: "Logout successful"
        });

    });

});

app.get("/api/test", async (req, res) => {

    try {

        const [rows] =
            await db.query("SELECT 1 AS result");

        res.json({
            message: "Server and database connected",
            database: rows[0].result
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Database connection failed"
        });

    }

});
app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});
