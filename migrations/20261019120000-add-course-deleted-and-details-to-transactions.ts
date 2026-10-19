import { Db } from "mongodb";

module.exports = {
  async up(db: Db) {
    await db.collection("transactions").updateMany(
      { isCourseDeleted: { $exists: false } },
      { $set: { isCourseDeleted: false } },
    );

    await db.collection("transactions").updateMany(
      { courseDetails: { $exists: false } },
      { $set: { courseDetails: null } },
    );
  },

  async down(db: Db) {
    await db.collection("transactions").updateMany(
      {},
      { $unset: { isCourseDeleted: "", courseDetails: "" } },
    );
  },
};
