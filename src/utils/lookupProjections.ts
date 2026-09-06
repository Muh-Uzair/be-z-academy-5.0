// Aggregation `$lookup` joins bypass Mongoose's schema-level `select: false`
// (that option only applies to the normal query builder), so any lookup that
// joins "users", "courses", or "categories" must explicitly exclude
// sensitive/internal fields itself or they leak into the joined *Details
// sub-document. These helpers build the dot-path exclusion entries for a
// given details field name, to be spread into a pipeline's final $project.

export const excludeUserFields = (detailsField: string): Record<string, 0> => ({
  [`${detailsField}.password`]: 0,
  [`${detailsField}.otp`]: 0,
  [`${detailsField}.otpExpires`]: 0,
  [`${detailsField}.stripeAccountId`]: 0,
  [`${detailsField}.stripeOnboardingComplete`]: 0,
  [`${detailsField}.verificationRejectionReason`]: 0,
  [`${detailsField}.lastVerificationRejectedAt`]: 0,
});

export const excludeCourseInternalFields = (
  detailsField: string,
): Record<string, 0> => ({
  [`${detailsField}.thumbnailKey`]: 0,
  [`${detailsField}.videoKey`]: 0,
});

export const excludeCategoryInternalFields = (
  detailsField: string,
): Record<string, 0> => ({
  [`${detailsField}.imageKey`]: 0,
});
