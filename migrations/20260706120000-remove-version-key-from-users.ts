import { Db } from "mongodb";

module.exports = {
  async up(db: Db) {
    await db.collection("users").updateMany({}, { $unset: { __v: "" } });
  },

  async down(db: Db) {
    await db.collection("users").updateMany({}, { $set: { __v: 0 } });
  },
};
