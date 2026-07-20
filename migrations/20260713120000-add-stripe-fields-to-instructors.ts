import { Db } from "mongodb";

module.exports = {
  async up(db: Db) {
    await db.collection("users").updateMany(
      { role: "instructor", stripeAccountId: { $exists: false } },
      { $set: { stripeAccountId: null } },
    );

    await db.collection("users").updateMany(
      { role: "instructor", stripeOnboardingComplete: { $exists: false } },
      { $set: { stripeOnboardingComplete: false } },
    );
  },

  async down(db: Db) {
    await db
      .collection("users")
      .updateMany(
        { role: "instructor" },
        { $unset: { stripeAccountId: "", stripeOnboardingComplete: "" } },
      );
  },
};
