import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

type AnimatedNumberProps = {
  value: number | null;
  format: (value: number) => string;
  className?: string;
};

function Tween({ value, format, className }: { value: number; format: (value: number) => string; className?: string }) {
  return <span className={className}>{format(useAnimatedNumber(value))}</span>;
}

export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  if (value === null) return <span className={className}>—</span>;
  return <Tween value={value} format={format} className={className} />;
}
