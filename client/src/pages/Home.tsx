import { HeroSection } from "@/components/HeroSection";
import { useLocation } from "wouter";
import { useBranding } from "@/hooks/useBranding";

export default function Home() {
  const [, setLocation] = useLocation();
  const { brandName, brandTagline } = useBranding();

  const handleButtonClick = () => {
    setLocation("/login");
  };

  return (
    <HeroSection
      title={brandName}
      highlightText={brandTagline}
      description="Votre application professionnelle"
      buttonText="Se connecter"
      onButtonClick={handleButtonClick}
    />
  );
}
