import { HeroSection } from "@/components/HeroSection";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  const handleButtonClick = () => {
    setLocation("/auth");
  };

  return (
    <HeroSection
      title="PLANCHAIS"
      highlightText="Construire pour durer"
      description="Votre application professionnelle"
      buttonText="Se connecter"
      onButtonClick={handleButtonClick}
    />
  );
}
