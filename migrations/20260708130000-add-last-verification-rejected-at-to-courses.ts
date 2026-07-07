import { Db } from "mongodb";

module.exports = {
  async up(db: Db) {
    await db
      .collection("courses")
      .updateMany(
        { lastVerificationRejectedAt: { $exists: false } },
        { $set: { lastVerificationRejectedAt: null } },
      );
  },

  async down(db: Db) {
    await db
      .collection("courses")
      .updateMany({}, { $unset: { lastVerificationRejectedAt: "" } });
  },
};
