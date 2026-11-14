import React from "react";
import {
  Scale,
  Landmark,
  BookOpen,
  Sigma,
  Cpu,
  Shield,
  FileText,
  ScrollText,
  Wallet,
  PenTool,
  Compass,
  Globe,
  BarChart3,
  Layers,
  Bookmark,
} from "lucide-react";
import type { SubjectIconKey, SubjectVisual } from "../utils/visuals";

interface SubjectIconProps {
  visual: SubjectVisual;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({
  visual,
  size = "md",
  active = false,
}) => {
  const dimensions = {
    sm: { box: 38, icon: 17, radius: 11 },
    md: { box: 48, icon: 21, radius: 14 },
    lg: { box: 56, icon: 24, radius: 16 },
  }[size];

  const renderVector = (key: SubjectIconKey, iconSize: number) => {
    const props = { size: iconSize, strokeWidth: 1.85 };
    switch (key) {
      case "scale":
        return <Scale {...props} />;
      case "landmark":
        return <Landmark {...props} />;
      case "book-open":
        return <BookOpen {...props} />;
      case "sigma":
        return <Sigma {...props} />;
      case "cpu":
        return <Cpu {...props} />;
      case "shield":
        return <Shield {...props} />;
      case "file-text":
        return <FileText {...props} />;
      case "scroll":
        return <ScrollText {...props} />;
      case "Wallet":
        return <Wallet {...props} />;
      case "pen-tool":
        return <PenTool {...props} />;
      case "compass":
        return <Compass {...props} />;
      case "globe":
        return <Globe {...props} />;
      case "bar-chart":
        return <BarChart3 {...props} />;
      case "layers":
        return <Layers {...props} />;
      case "bookmark":
      default:
        return <Bookmark {...props} />;
    }
  };

  return (
    <div
      className="subject-tile"
      style={{
        width: dimensions.box,
        height: dimensions.box,
        borderRadius: dimensions.radius,
        backgroundColor: active ? "var(--brand-petrol)" : visual.pastelBg,
        color: active ? "#ffffff" : visual.pastelText,
        border: `1px solid ${active ? "var(--brand-petrol)" : visual.borderTint}`,
      }}
    >
      {renderVector(visual.iconKey, dimensions.icon)}
    </div>
  );
};

