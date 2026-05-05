import { useState } from "react";
import ActivationScreen from "@/components/activation/ActivationScreen";
import App from "@/App";

export default function InstallGate() {
  const [activated, setActivated] = useState(false);

  if (!activated) {
    return <ActivationScreen onActivated={() => setActivated(true)} />;
  }

  return <App />;
}
