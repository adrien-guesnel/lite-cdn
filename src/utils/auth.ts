export function verifyKey(key: string) {
  const API_SECRET = process.env.API_SECRET || "defaultSecret";

  if (key !== API_SECRET) {
    console.error("You are unauthorized");
    throw new Error("You are unauthorized");
  }
}
