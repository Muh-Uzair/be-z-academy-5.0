# Z-Academy 5.0 - Full App Navigation Structure

This document outlines the complete routing and navigation structure of the application, including public pages, authentication, and all role-based dashboards.

## 1. PUBLIC & GLOBAL PAGES

These pages are accessible without a specific dashboard role, or are shared across the application.

- **Home** (`/`)
- **About Us** (`/about-us`)
- **Courses Public Catalog** (`/courses`)
- **Course Details** (`/course-details/[id]`)
- **Course Checkout** (`/course-checkout/[id]`)
- **Course Enrollments** (`/course-enrollments/[id]`)
- **User Profile** (`/user-profile/[id]`)
- **Public Course Chat** (`/public-course-chat/[id]`)
- **Private Course Chat** (`/private-course-chat/[id]`)
- **View Course Reviews** (`/view-course-reviews/[id]`)

## 2. AUTHENTICATION

Pages handling user sign-up, sign-in, and verification.

- **Sign In** (`/signin`)
- **Sign Up** (`/signup`)
- **Verify OTP** (`/verify-otp`)

---

## 3. ADMIN DASHBOARD

- **Dashboard** (`/admin/dashboard`)
- **Courses**
  - All Courses (`/admin/courses/all-courses`)
  - Pending Verification (`/admin/courses/pending-verification-courses`)
  - Verified Courses (`/admin/courses/verified-courses`)
- **Instructors**
  - All Instructors (`/admin/instructors/all-instructors`)
  - Pending Verifications (`/admin/instructors/pending-verifications`)
  - Instructor Details (`/admin/instructors/instructor-details/[id]`)
- **Students** (`/admin/students`)
- **Enrollments** (`/admin/enrollments`)
- **Categories** (`/admin/categories`)
- **Chat** (`/admin/chat`)
- **Reviews** (`/admin/reviews`)
- **Settings** (`/admin/settings`)

---

## 4. INSTRUCTOR DASHBOARD

- **Dashboard** (`/instructor/dashboard`)
- **My Courses** (`/instructor/my-courses`)
  - All My Courses (`/instructor/my-courses/all-my-courses`)
  - Create New Course (`/instructor/my-courses/create-new-courses`)
  - Pending Verifications (`/instructor/my-courses/pending-verifications`)
- **My Students** (`/instructor/my-students`)
- **Enrollments** (`/instructor/enrollments`)
- **Chat** (`/instructor/chat`)
- **Reviews** (`/instructor/reviews`)
- **Settings** (`/instructor/settings`)

---

## 5. STUDENT DASHBOARD

- **Dashboard** (`/student/dashboard`)
- **Browse Courses** (`/student/browse-courses`)
- **My Learning** (`/student/my-learning`)
  - Enrolled Courses (`/student/my-learning/enrolled-courses`)
  - Continue Watching (`/student/my-learning/continue-watching`)
- **Chat** (`/student/chat`)
- **Settings** (`/student/settings`)
