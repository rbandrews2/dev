import React from "react";
import AiAvatar from "./AiAvatar";

type Props = {
  onOpen: () => void;
};

export const AssistantBubble: React.FC<Props> = ({ onOpen }) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-40 rounded-full bg-orange-500 p-1 shadow-lg hover:scale-105 transition-transform"
      aria-label="Open AI assistant"
    >
      <AiAvatar size={52} />
    </button>
  );
};
export default AssistantBubble;