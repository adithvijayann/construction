import { Contractor } from "../models/Contractor.js";

export const ensureMutableContractorIndexes = async () => {
  let indexes = [];
  try {
    indexes = await Contractor.collection.indexes();
  } catch (error) {
    if (error.code === 26 || error.codeName === "NamespaceNotFound") return;
    throw error;
  }

  const uniqueUserIndex = indexes.find((index) => index.name === "user_1" && index.unique);

  if (uniqueUserIndex) {
    await Contractor.collection.dropIndex(uniqueUserIndex.name);
    console.log("Dropped obsolete unique contractor user index");
  }
};
