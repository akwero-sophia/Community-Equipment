const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

// Temporary local user storage.
// We will replace this with MongoDB later.
const users = [];

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Please fill in all fields."
            });
        }

        const existingUser = users.find(
            user => user.email === email
        );

        if (existingUser) {
            return res.status(400).json({
                message: "A user with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            id: Date.now(),
            name,
            email,
            password: hashedPassword
        };

        users.push(user);

        console.log("Registered user:", email);

        res.status(201).json({
            message: "Registration successful!"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Registration failed."
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = users.find(
            user => user.email === email
        );

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        req.session.userId = user.id;

        res.json({
            message: "Login successful!",
            user: {
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Login failed."
        });
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            message: "Logged out successfully."
        });
    });
});

module.exports = router;