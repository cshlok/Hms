-- Define Roles
CREATE TABLE Roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE
);

-- Insert predefined roles
INSERT INTO Roles (role_name) VALUES
("Admin"),
("Doctor"),
("Nurse"),
("Receptionist"),
("Lab Technician"),
("Pharmacist"),
("Patient");

-- Define Users table
CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    role_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES Roles(role_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_username ON Users (username);
CREATE INDEX idx_users_email ON Users (email);
CREATE INDEX idx_users_role_id ON Users (role_id);

-- Add more tables and constraints as needed for other modules later

