import orcaImg from "@/assets/orca.png";

type Props = {
  className?: string;
  size?: number | string;
  flip?: boolean;
  style?: React.CSSProperties;
};

export function Orca({ className, size, flip, style }: Props) {
  const src = typeof orcaImg === "string" ? orcaImg : (orcaImg as { src?: string })?.src ?? "";
  return (
    <img
      src={src}
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
