# Z-Academy 5.0 - Feature Categories & Page Mapping

Here is a restructuring of the project requirements into logical, functional feature categories, including the specific application pages (routes) associated with each feature category.

## 1. Authentication & User Management

_Identity, access, settings, and user lifecycle across the platform._

**Associated Pages:**

- `/signin` (Sign In)
- `/signup` (Sign Up)
- `/verify-otp` (Verify OTP)
- `/user-profile/[id]` (Public User/Instructor Profile)
- `/admin/instructors/all-instructors` (Admin: All Instructors List)
- `/admin/instructors/pending-verifications` (Admin: Instructor Approvals)
- `/admin/instructors/instructor-details/[id]` (Admin: Instructor Details)
- `/admin/students` (Admin: Manage Students)
- `/instructor/my-students` (Instructor: Manage Students)
- `/admin/settings` (Admin Account Settings)
- `/instructor/settings` (Instructor Account Settings)
- `/student/settings` (Student Account Settings)

**Key Features:**

- Google Signup/Login and OTP Verification.
- Public Student and Instructor profile management.
- Instructor onboarding, Admin verification, and approval processes.
- Admin user controls (search, filter, view details, ban).
- Dedicated Settings panels for all user roles.

---

_Everything related to identity, access, and user lifecycle._

- **Authentication**: Google Signup/Login, plus an OTP Verification flow (`/verify-otp`).
- **Profiles**: Student and Instructor profile management (Avatar, Bio, Education, Experience) accessible via public routes (`/user-profile/[id]`).
- **Instructor Onboarding**: Signup flow and Admin verification/approval process.
- **Admin Controls**: View all users (Students + Instructors), search, filter, view details (e.g., `/admin/instructors/instructor-details/[id]`), and ban/suspend users.
- **Account Settings**: Dedicated settings panels for all user roles (`/admin/settings`, `/instructor/settings`, `/student/settings`).

## 2. Course Management & Content Moderation

_Creation, moderation, and public discovery of courses._

**Associated Pages:**

- `/` (Home / Landing Page)
- `/about-us` (About Us)
- `/courses` (Courses Public Catalog)
- `/course-details/[id]` (Course Details)
- `/admin/courses/all-courses` (Admin: Manage All Courses)
- `/admin/courses/pending-verification-courses` (Admin: Course Approvals)
- `/admin/courses/verified-courses` (Admin: Live Courses)
- `/admin/categories` (Admin: Category Management)
- `/instructor/my-courses` (Instructor: My Courses Overview)
- `/instructor/my-courses/all-my-courses` (Instructor: My Courses List)
- `/instructor/my-courses/create-new-courses` (Instructor: Course Builder)
- `/instructor/my-courses/pending-verifications` (Instructor: Awaiting Approval)

**Key Features:**

- Instructor course creation (videos ≤20MB).
- Admin course moderation workflows (Approve, Reject, Remove).
- Instructor course maintenance.
- Admin Category Management.
- Public Course Catalog and robust search/filtering.

---

_Everything related to the creation, moderation, and discovery of courses._

- **Course Creation (Instructor)**: Create courses (Title, Description, Thumbnail, Price, Level) and upload videos (≤20MB limit).
- **Course Moderation (Admin)**: Workflow for approving, rejecting, or forcefully removing courses from the platform.
- **Course Maintenance (Instructor)**: Manage existing courses, edit limited details post-verification, and track course status.
- **Category Management (Admin)**: Create and delete course categories.
- **Course Catalog (Public/Student)**: Home page featuring hero section, trending courses, category-wise listings, and an **About Us** page (`/about-us`). Includes robust search and filtering (Category, Price, Level, Rating).
- **Course Detail Page**: Display full course info, instructor bio, ratings, and price (`/course-details/[id]`).

## 3. Student Learning & Enrollment

_The core learning/purchasing experience for the student._

**Associated Pages:**

- `/course-checkout/[id]` (Dummy Payment Gateway)
- `/course-enrollments/[id]` (Enrollment Confirmation/Tracking)
- `/student/browse-courses` (Student: Course Discovery)
- `/student/my-learning` (Student: My Learning Overview)
- `/student/my-learning/enrolled-courses` (Student: My Learning Portal)
- `/student/my-learning/continue-watching` (Student: Resume Videos)

**Key Features:**

- Course checkout & enrollment flow.
- Student Dashboard (My Learning, Enrolled, Continue Watching).
- Video Player with automatic progress tracking.
- Certification (100% completion).

---

_The core learning experience for the student._

- **Enrollment Flow**: Dummy payment integration for purchasing courses.
- **Student Dashboard**: "My Learning" portal, enrolled courses list, and "Continue Watching" shortcuts.
- **Video Player**: Course consumption with automatic progress tracking (saving watch percentage).
- **Certification**: Automated certificate generation upon 100% course completion (optional/future phase).

## 4. Analytics & Dashboards

_Data visualization, metrics, and reporting._

**Associated Pages:**

- `/admin/dashboard` (Admin Analytics & Overview)
- `/instructor/dashboard` (Instructor Analytics & Overview)
- `/student/dashboard` (Student Progress & Overview)

**Key Features:**

- Admin Analytics (Platform revenue, 5% commission, users, live/pending courses, growth charts).
- Instructor Analytics (Total earnings, enrollments, course performance, monthly charts).
- Student Analytics (Enrolled count, progress tracking, watch time).
- Public Marketing Stats (Home page showcases).

---

_Data visualization and reporting for all user types._

- **Admin Analytics**: Platform-wide metrics including total revenue, commission earned, user counts (students/instructors), course counts (live/pending), monthly user growth charts, revenue trend charts, and category performance.
- **Instructor Analytics**: Dashboard showing total earnings, enrollments, individual course performance (completion rates, ratings, revenue), and monthly earning charts.
- **Student Analytics**: Personal learning stats including total enrolled courses, overall progress, watch time statistics, and recent activity.
- **Public Analytics**: Marketing-driven stats for non-logged-in users (e.g., Top Courses, Most Enrolled, Highest Rated).

## 5. Communication & Community

_Interaction features and peer-to-peer connection._

**Associated Pages:**

- `/public-course-chat/[id]` (Global Course Chat Room)
- `/private-course-chat/[id]` (1-to-1 Direct Messaging)
- `/admin/chat` (Admin Communications Hub)
- `/instructor/chat` (Instructor Communications Hub)
- `/student/chat` (Student Communications Hub)

**Key Features:**

- Public Course Chat with file attachments up to 2MB (Images, PDFs, Docs, Voice).
- Private Messaging (Student-to-Instructor, Student-to-Student).
- In-dashboard Chat portals.
- Course ratings and feedback mechanisms.

---

_Interaction features between users._

- **Public Course Chat**: Dedicated chat rooms for each course supporting text and file attachments (images, PDFs, DOCX, voice notes - max 2MB). Moderated by instructors.
- **Private Messaging**: 1-to-1 chat system allowing students to message instructors or peers within the same course.
- **Feedback System**: Course rating and review system accessible to students after enrollment.

## 6. Reviews & Feedback

_Course ratings, student feedback, and review moderation._

**Associated Pages:**

- `/view-course-reviews/[id]` (Public: View Course Reviews)
- `/admin/reviews` (Admin: Moderate All Reviews)
- `/instructor/reviews` (Instructor: View Course Feedback)

**Key Features:**

- Public viewing of course reviews with pagination.
- Admin dashboard to moderate and search through all platform reviews.
- Instructor dashboard to monitor course feedback and student satisfaction.

---

_Course ratings, student feedback, and review moderation._

- **Public Reviews**: Dedicated page to view paginated reviews for a specific course, including rating breakdowns and student feedback.
- **Admin Review Moderation**: Centralized hub for admins to monitor, filter, and moderate all course reviews across the platform.
- **Instructor Feedback Dashboard**: Hub for instructors to view feedback specifically left on their own courses.

## 7. Financials & Notifications

_Money movement tracking and system alerts._

**Associated Pages:**

- `/admin/enrollments` (Admin: Revenue & Enrollment Tracking)
- `/instructor/enrollments` (Instructor: Payouts & Enrollment Tracking)
  _(Note: Notifications will be handled globally via UI overlays and Firebase Push, rather than a dedicated page)._

**Key Features:**

- Commission Engine (enforcing the 5% Admin cut).
- Instructor payout tracking via dashboard widgets.
- Notification System (In-app + Firebase push) and Admin notification management.

_Money movement tracking and user alerts._

- **Commission Engine**: Revenue splitting logic enforcing a 5% platform commission to the Admin.
- **Payout Tracking**: Dashboard view for instructor payouts (dummy tracking).
- **Notification System**: Robust alert system supporting both In-App notifications and Firebase Push Notifications. Includes Admin management panel for sending/managing alerts.
