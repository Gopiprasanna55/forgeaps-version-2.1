import { submitRevitWorkItem } from "../ForgeManager";

export async function handleWorkItemSubmission(callbackURL: string) {
  if (!callbackURL) {
    throw new Error("callbackURL is required");
  }

  const result = await submitRevitWorkItem(callbackURL);

  return {
    workItemId: result.id,
    status: result.status,
  };
}
