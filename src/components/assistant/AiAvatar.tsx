import React from "react";

type Props = {
  size?: number;
};

const AiAvatar: React.FC<Props> = ({ size = 40 }) => {
  const [src, setSrc] = React.useState("/atlas-assistant.png");

  return (
    <img
      src={src}
      alt="AI Assistant"
      width={size}
      height={size}
      className="rounded-full border border-orange-500/60 shadow-md bg-black/70 object-cover"
      onError={() => setSrc("/Work_Zone_AI_Man.png")}
    />
  );
};

export default AiAvatar;
