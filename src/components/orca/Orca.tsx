import orcaImg from "@/assets/orca.png?url";

type Props = {
  className?: string;
  size?: number | string;
  flip?: boolean;
  style?: React.CSSProperties;
};

export function Orca({ className, size, flip, style }: Props) {
  return (
    <img
      src={orcaImg}
      alt="Orca"
      draggable={false}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        transform: flip ? "scaleX(-1)" : undefined,
        userSelect: "none",
        pointerEvents: "none",
        display: "inline-block",
        ...style,
      }}
    />
  );
}
