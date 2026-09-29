import { useAvatarUrl } from './avatarStorage';

interface Props {
  path: string | null | undefined;
  emoji: string;
  size?: number;
}

/** Uploaded photo if there is one, otherwise the emoji avatar. */
export function Avatar({ path, emoji, size = 40 }: Props) {
  const { data: url } = useAvatarUrl(path);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span aria-hidden="true" style={{ fontSize: size * 0.7 }} className="leading-none">
      {emoji}
    </span>
  );
}
