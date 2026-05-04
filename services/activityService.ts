import {
  DB_ID,
  ID,
  PROFILES_COL_ID,
  Query,
  account,
  databases,
} from "../lib/appwrite";

async function getMyProfile(userId: string) {
  const response = await databases.listDocuments(
    DB_ID,
    PROFILES_COL_ID,
    [Query.equal("userId", userId), Query.limit(1)]
  );

  return response.documents[0] || null;
}

export async function updateMyActivity(screenName: string) {
  try {
    const user = await account.get();

    const profile = await getMyProfile(user.$id);

    const now = new Date().toISOString();

    if (profile) {
      await databases.updateDocument(
        DB_ID,
        PROFILES_COL_ID,
        profile.$id,
        {
          name: user.name || profile.name || "",
          email: user.email || profile.email || "",
          role: user.labels?.includes("admin")
            ? "admin"
            : profile.role || "user",
          lastSeenAt: now,
          lastActivityAt: now,
          lastActivityScreen: screenName,
        }
      );

      return;
    }

    await databases.createDocument(
      DB_ID,
      PROFILES_COL_ID,
      ID.unique(),
      {
        userId: user.$id,
        name: user.name || "",
        email: user.email || "",
        role: user.labels?.includes("admin") ? "admin" : "user",
        isBlocked: false,
        lastSeenAt: now,
        lastActivityAt: now,
        lastActivityScreen: screenName,
      }
    );
  } catch (error) {
    console.log("Не удалось обновить активность пользователя", error);
  }
}