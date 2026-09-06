import { nameParts } from "../lib/format";

interface UserNameProps {
  user?: {
    pseudo?: string | null;
    firstName?: string | null;
    villeOrigine?: string | null;
  } | null;
  className?: string;
}

export default function UserName({ user, className }: UserNameProps) {
  const { prenom, ville } = nameParts(user);
  if (!ville) return <span className={className}>{prenom}</span>;
  return (
    <span className={className}>
      <strong>{prenom}</strong> de {ville}
    </span>
  );
}