import { Db } from "mongodb";

module.exports = {
  async up(db: Db) {
    await db
      .collection("users")
      .updateMany(
        { lastVerificationRejectedAt: { $exists: false } },
        { $set: { lastVerificationRejectedAt: null } },
      );
  },

  async down(db: Db) {
    await db
      .collection("users")
      .updateMany({}, { $unset: { lastVerificationRejectedAt: "" } });
  },
};
