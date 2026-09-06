import { Avatar, AvatarFallback, AvatarImage } from "./ui";
import { initial } from "../lib/format";

type AvatarUser = {
  pseudo?: string | null;
  photoProfil?: string | null;
  enLigne?: boolean;
} | null | undefined;

export default function UserAvatar({
  user,
  name,
  photo,
  size = "md",
  online,
  className = "",
}: {
  user?: AvatarUser;
  name?: string | null;
  photo?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}) {
  const src = (photo || user?.photoProfil || "").trim();
  const label = name || user?.pseudo || "?";
  const onlineState = online ?? user?.enLigne;

  return (
    <Avatar size={size} online={onlineState} className={className}>
      {src ? (
        <AvatarImage src={src} alt={label} />
      ) : (
        <AvatarFallback>{initial(label)}</AvatarFallback>
      )}
    </Avatar>
  );
}
