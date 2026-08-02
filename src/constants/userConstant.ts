export const USER_FULL_NAME_MIN_LENGTH = 2;
export const USER_FULL_NAME_MAX_LENGTH = 100;

export const USER_PASSWORD_MIN_LENGTH = 8;

export const USER_BIO_MAX_LENGTH = 500;

export const USER_HIGHEST_EDUCATION_MAX_LENGTH = 150;

export const USER_YEARS_OF_EXPERIENCE_MIN = 0;
export const USER_YEARS_OF_EXPERIENCE_MAX = 60;

export const USER_VERIFICATION_REJECTION_REASON_MAX_LENGTH = 500;

// Fields each role is allowed to change through the shared update-profile API.
export const PROFILE_UPDATABLE_FIELDS = {
  admin: ["fullName", "avatar"],
  instructor: [
    "avatar",
    "fullName",
    "highestEducation",
    "yearsOfExperience",
    "bio",
  ],
  student: ["avatar", "fullName", "highestEducation", "bio"],
} as const;
