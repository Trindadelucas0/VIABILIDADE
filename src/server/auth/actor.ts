export type Role = "ADMIN" | "OPERATOR";

export type Actor = {
  id: string;
  email: string;
  role: Role;
};

export function displayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  if (!local) return email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function publicUser(actor: Actor) {
  return {
    id: actor.id,
    email: actor.email,
    role: actor.role,
    display_name: displayName(actor.email),
  };
}
