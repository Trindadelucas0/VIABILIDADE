import bcrypt from "bcrypt";

let dummyHash: string | null = null;

async function placeholderHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = await bcrypt.hash(`placeholder-${process.pid}`, 12);
  }
  return dummyHash;
}

export async function verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
  const hash = passwordHash ?? (await placeholderHash());
  const ok = await bcrypt.compare(password, hash);
  return Boolean(passwordHash) && ok;
}
