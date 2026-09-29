interface Props {
  symbol: string;
  /** Accessible label. Omit only when the emoji is purely decorative. */
  label?: string;
}

export function Emoji({ symbol, label }: Props) {
  return label ? (
    <span role="img" aria-label={label}>
      {symbol}
    </span>
  ) : (
    <span aria-hidden="true">{symbol}</span>
  );
}
