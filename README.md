## Project Summary

This backend project simulates a Customer Relationship Management (CRM) system tailored for a small family-run business. It was developed independently to demonstrate my understanding of backend development using Node.js, Express.js, and MongoDB. The system includes role-based access, secure authentication, and financial transaction tracking, modeled after real-world business workflows.

## Backend Overview

The **Family Business Management System** is a CRM-like tool designed to support the operations of a family business. Built using **Node.js**, **Express.js**, and **MongoDB**, this system enables **admins** and **employees** to manage various aspects of the business, including **customer information**, **transactions**, **financial data**, and **employee management**.

The system offers role-based access control (RBAC) where **admins** have full access to all features, while **employees** have limited access depending on their role.

### Features

#### **Admin Features:**

-   **Customer Management**: Admins can view, add, edit, and delete customer information.
-   **Transaction Management**: Admins can manage all customer transactions and order details.
-   **Financial Management**: Admins can track and manage financial transactions, revenue, and expenses.
-   **Report Management**: Admins can view and export detailed reports related to customers, transactions, and revenue.
-   **User Management**: Admins can manage internal employee accounts and assign roles/permissions.

#### **Employee Features:**

-   **View Customer Information**: Employees can view customer contact details.
-   **Manage Transactions**: Employees can log customer transactions and manage orders.

### Authentication & Authorization

-   The system uses **JWT (JSON Web Token)** for authentication and role-based authorization.
-   **Admins** have full access to all features, while **employees** are limited to specific tasks based on their role.
-   User roles are managed through a system of permissions assigned to each user.

### Technical Highlights

-   RESTful API architecture with Express.js\
-   Secure authentication with JWT
-   Middleware-based input validation and error handling
-   Git-based version control with modular commit history

### Future Plans / Learning Outcomes

This project helped me understand REST API development, role-based systems, and how to integrate backend logic with real-world business rules. I'm currently exploring backend testing and deployment practices.

### Database Schema

The backend uses **mongoDB** to manage the business data, including customers, transactions, financial records, and employee details. The database schema supports both admin and employee roles and defines the relationships between customers, orders, and financial transactions.

![Database Schema](mongoDB-crm.png)

# CRM-mongodb-backend
