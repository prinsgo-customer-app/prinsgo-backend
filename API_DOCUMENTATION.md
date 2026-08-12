# PrinsGo Backend - API Documentation

This is the API documentation for the real, production-ready PrinsGo Backend. All routes require proper headers, input structures, and return standard, secured JSON responses.

---

## Base Configuration & Global Behaviors

- **Host (Render):** `https://prinsgo-backend.onrender.com`
- **Prefix:** `/api`
- **Format:** All requests and responses are in JSON format.
- **Proxy Trust:** Securely configured behind Render's reverse proxy.
- **Rate Limiting:**
  - Standard routes: Max 200 requests per 15 minutes per IP.
  - OTP routes: Max 5 requests per 10 minutes per IP.

---

## Table of Contents

1. [Customer Authentication & Profile](#1-customer-authentication--profile)
2. [Saved Addresses CRUD](#2-saved-addresses-crud)
3. [Coupons & Promos](#3-coupons--promo-system)
4. [Rides System](#4-rides-system)
5. [Parcels System](#5-parcel-system)
6. [Unified Bookings](#6-unified-bookings--history)
7. [Customer Notifications](#7-customer-notifications)
8. [Support Tickets](#8-support-ticket-system)
9. [Wallet System](#9-wallet-system)
10. [Admin APIs](#10-admin-apis)

---

## 1. Customer Authentication & Profile

### Send OTP
- **Method:** `POST`
- **Endpoint:** `/api/auth/send-otp`
- **Authentication:** None (Public)
- **Request:**
  ```json
  {
    "phone": "9876543210"
  }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully"
  }
  ```

### Verify OTP & Register/Login
- **Method:** `POST`
- **Endpoint:** `/api/auth/verify-otp`
- **Authentication:** None (Public)
- **Request:**
  ```json
  {
    "phone": "9876543210",
    "code": "123456",
    "name": "John Doe" // Required only for new registration
  }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "JWT_BEARER_TOKEN",
    "isNewUser": false,
    "user": {
      "id": "USER_ID",
      "name": "John Doe",
      "phone": "9876543210",
      "email": "john@example.com",
      "profileImage": "",
      "walletBalance": 0,
      "referralCode": "PG54321010"
    }
  }
  ```

### Get My Profile
- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Authentication:** Bearer JWT Token
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "user": {
      "_id": "USER_ID",
      "name": "John Doe",
      "phone": "9876543210",
      "email": "john@example.com",
      "savedAddresses": [],
      "walletBalance": 0,
      "isActive": true,
      "isBlocked": false
    }
  }
  ```

### Update My Profile
- **Method:** `PUT`
- **Endpoint:** `/api/auth/profile`
- **Authentication:** Bearer JWT Token
- **Request:**
  ```json
  {
    "name": "John Doe Updated",
    "email": "john.updated@example.com",
    "fcmToken": "FCM_DEVICE_TOKEN"
  }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Profile updated",
    "user": { ... }
  }
  ```

---

## 2. Saved Addresses CRUD

### List Saved Addresses
- **Method:** `GET`
- **Endpoint:** `/api/auth/addresses`
- **Authentication:** Bearer JWT Token
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "savedAddresses": [
      {
        "_id": "ADDRESS_ID",
        "label": "home",
        "address": "123 Main Street, Bangalore",
        "lat": 12.9716,
        "lng": 77.5946
      }
    ]
  }
  ```

### Add Saved Address
- **Method:** `POST`
- **Endpoint:** `/api/auth/address`
- **Authentication:** Bearer JWT Token
- **Request:**
  ```json
  {
    "label": "home", // home, work, or other
    "address": "123 Main Street, Bangalore",
    "lat": 12.9716,
    "lng": 77.5946
  }
  ```
- **Response (Success - 201):**
  ```json
  {
    "success": true,
    "message": "Address added",
    "savedAddresses": [ ... ]
  }
  ```

### Update Saved Address
- **Method:** `PUT`
- **Endpoint:** `/api/auth/address/:addressId`
- **Authentication:** Bearer JWT Token
- **Request:**
  ```json
  {
    "label": "work",
    "address": "456 Tech Park, Bangalore",
    "lat": 12.9780,
    "lng": 77.5980
  }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Address updated successfully",
    "savedAddresses": [ ... ]
  }
  ```

### Delete Saved Address
- **Method:** `DELETE`
- **Endpoint:** `/api/auth/address/:addressId`
- **Authentication:** Bearer JWT Token
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Address removed",
    "savedAddresses": [ ... ]
  }
  ```

---

## 3. Coupons & Promo System

The backend enforces strict server-side calculation and coupon usage checks.

### List Eligible Coupons
- **Method:** `GET`
- **Endpoint:** `/api/coupons`
- **Authentication:** Bearer JWT Token
- **Query Params:**
  - `serviceType` (optional): `ride` or `parcel`
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "coupons": [
      {
        "_id": "COUPON_ID",
        "code": "DISCOUNT10",
        "description": "Get 10% off on your bookings",
        "discountType": "percentage",
        "discountValue": 10,
        "minOrderAmount": 100,
        "maxDiscountAmount": 50,
        "expiryDate": "2027-08-11T21:11:43.000Z",
        "isActive": true,
        "eligibleService": "all"
      }
    ]
  }
  ```

### Validate Coupon Code
- **Method:** `POST`
- **Endpoint:** `/api/coupons/validate`
- **Authentication:** Bearer JWT Token
- **Request:**
  ```json
  {
    "code": "DISCOUNT10",
    "amount": 250,
    "serviceType": "ride" // ride or parcel
  }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Coupon validated successfully",
    "coupon": {
      "code": "DISCOUNT10",
      "description": "Get 10% off on your bookings",
      "discountType": "percentage",
      "discountValue": 10
    },
    "discount": 25,
    "finalAmount": 225
  }
  ```

---

## 4. Rides System

### Estimate Fare
- **Method:** `POST`
- **Endpoint:** `/api/rides/estimate`
- **Authentication:** Bearer JWT Token
- **Request:**
  ```json
  {
    "pickupLat": 12.9716,
    "pickupLng": 77.5946,
    "dropLat": 12.9352,
    "dropLng": 77.6245
  }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "distanceKm": 5.2,
    "durationMin": 15,
    "estimates": [
      {
        "vehicleType": "bike",
        "baseFare": 25,
        "distanceFare": 45,
        "timeFare": 15,
        "surgeMultiplier": 1,
        "platformFee": 5,
        "totalFare": 90
      },
      ...
    ]
  }
  ```

### Book a Ride
- **Method:** `POST`
- **Endpoint:** `/api/rides/book`
- **Authentication:** Bearer JWT Token
- **Request:**
  ```json
  {
    "pickup": { "address": "Indiranagar, Bangalore", "lat": 12.9716, "lng": 77.6412 },
    "drop": { "address": "Koramangala, Bangalore", "lat": 12.9352, "lng": 77.6245 },
    "vehicleType": "car_mini",
    "paymentMethod": "cash",
    "couponCode": "DISCOUNT10" // Optional coupon code
  }
  ```
- **Response (Success - 201):**
  ```json
  {
    "success": true,
    "message": "Ride requested successfully",
    "ride": {
      "_id": "RIDE_ID",
      "customer": "USER_ID",
      "pickup": { ... },
      "drop": { ... },
      "vehicleType": "car_mini",
      "fare": { ... },
      "couponCode": "DISCOUNT10",
      "discount": 20,
      "finalAmount": 180,
      "status": "requested",
      "startOtp": "1234"
    }
  }
  ```

---

## 5. Parcel System

### Book a Parcel Delivery
- **Method:** `POST`
- **Endpoint:** `/api/parcels/book`
- **Authentication:** Bearer JWT Token
- **Request:**
  ```json
  {
    "pickup": {
      "address": "Pickup Shop, Bangalore",
      "lat": 12.9716,
      "lng": 77.6412,
      "contactName": "Alice Sender",
      "contactPhone": "9876543210"
    },
    "drop": {
      "address": "Drop House, Bangalore",
      "lat": 12.9352,
      "lng": 77.6245,
      "contactName": "Bob Receiver",
      "contactPhone": "9000000002"
    },
    "parcelType": "electronics",
    "weightCategory": "upto_1kg",
    "paymentMethod": "cash",
    "couponCode": "FIXED50" // Optional
  }
  ```
- **Response (Success - 201):**
  ```json
  {
    "success": true,
    "message": "Parcel booked successfully",
    "parcel": { ... }
  }
  ```

---

## 6. Unified Bookings & History

Provides unified list of both Rides and Parcels for the logged-in customer.

### Get Unified Bookings
- **Method:** `GET`
- **Endpoint:** `/api/bookings`
- **Authentication:** Bearer JWT Token
- **Query Params:**
  - `status` (optional): `all`, `ongoing`, `completed`, `cancelled` (default is `all`)
  - `page` (optional): page index (default 1)
  - `limit` (optional): page limit (default 10)
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "bookings": [
      {
        "id": "RIDE_ID",
        "bookingType": "ride",
        "pickup": { "address": "...", "lat": 12.9716, "lng": 77.6412 },
        "drop": { "address": "...", "lat": 12.9352, "lng": 77.6245 },
        "status": "ongoing",
        "subStatus": "requested",
        "amount": 180,
        "originalFare": 200,
        "discount": 20,
        "paymentMethod": "cash",
        "paymentStatus": "pending",
        "createdAt": "2026-08-11T20:11:43.000Z",
        "driver": null,
        "details": {
          "vehicleType": "car_mini",
          "distanceKm": 5.2,
          "durationMin": 15
        }
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "limit": 10
  }
  ```

---

## 7. Customer Notifications

### Get Notifications
- **Method:** `GET`
- **Endpoint:** `/api/notifications`
- **Authentication:** Bearer JWT Token
- **Query Params:**
  - `page` / `limit` (optional)
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "notifications": [
      {
        "_id": "NOTIF_ID",
        "user": "USER_ID",
        "title": "Welcome Alice!",
        "message": "Thank you for registering with PrinsGo.",
        "type": "general",
        "isRead": false,
        "createdAt": "2026-08-11T20:11:43.000Z"
      }
    ],
    "page": 1,
    "totalPages": 1,
    "total": 1
  }
  ```

### Get Unread Count
- **Method:** `GET`
- **Endpoint:** `/api/notifications/unread-count`
- **Authentication:** Bearer JWT Token
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "count": 1
  }
  ```

### Mark Notification as Read
- **Method:** `PUT`
- **Endpoint:** `/api/notifications/:id/read`
- **Authentication:** Bearer JWT Token
- **URL Params:** Pass `all` as `:id` to mark all notifications as read.
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Notification marked as read"
  }
  ```

---

## 8. Support Ticket System

### Create Ticket
- **Method:** `POST`
- **Endpoint:** `/api/support/tickets`
- **Authentication:** Bearer JWT Token
- **Request:**
  ```json
  {
    "subject": "Wallet issue",
    "description": "Loaded ₹500 but wallet balance is not updated",
    "category": "wallet" // ride, parcel, payment, wallet, or other
  }
  ```
- **Response (Success - 201):**
  ```json
  {
    "success": true,
    "message": "Support ticket created successfully",
    "ticket": { ... }
  }
  ```

### List My Tickets
- **Method:** `GET`
- **Endpoint:** `/api/support/tickets`
- **Authentication:** Bearer JWT Token
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "tickets": [ ... ]
  }
  ```

### Get Ticket Details
- **Method:** `GET`
- **Endpoint:** `/api/support/tickets/:id`
- **Authentication:** Bearer JWT Token
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "ticket": { ... }
  }
  ```

### Customer Add Reply
- **Method:** `POST`
- **Endpoint:** `/api/support/tickets/:id/replies`
- **Authentication:** Bearer JWT Token
- **Request:**
  ```json
  {
    "message": "Could you please check this as soon as possible?"
  }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Reply added successfully",
    "ticket": { ... }
  }
  ```

---

## 9. Wallet System

- **Get Transactions:** `GET /api/wallet/transactions` (Retrieves wallet balance and transactions with pagination).

---

## 10. Admin APIs

### Admin Support Tickets Management
- **List All Tickets:** `GET /api/admin/support/tickets`
- **Get Ticket Details:** `GET /api/admin/support/tickets/:id`
- **Update Ticket Status:** `PUT /api/admin/support/tickets/:id/status` (Accepts `status` in body: `open`, `in_progress`, `resolved`, `closed`).
- **Admin Reply to Ticket:** `POST /api/admin/support/tickets/:id/replies` (Accepts `message` in body).

### Admin Coupons CRUD
- **Create Coupon:** `POST /api/admin/coupons`
- **List Coupons:** `GET /api/admin/coupons`
- **Get Coupon Details:** `GET /api/admin/coupons/:id`
- **Update Coupon:** `PUT /api/admin/coupons/:id`
- **Delete Coupon:** `DELETE /api/admin/coupons/:id`
