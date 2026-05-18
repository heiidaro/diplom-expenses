import { account } from "../lib/appwrite";

export const PASSWORD_RECOVERY_URL =
  "https://heiidaro.github.io/fynux-reset/reset-password.html";

export async function sendPasswordRecoveryEmail(email: string) {
  return account.createRecovery({
    email: email.trim(),
    url: PASSWORD_RECOVERY_URL,
  });
}

export async function confirmPasswordRecovery(data: {
  userId: string;
  secret: string;
  password: string;
}) {
  return account.updateRecovery({
    userId: data.userId,
    secret: data.secret,
    password: data.password,
  });
}
