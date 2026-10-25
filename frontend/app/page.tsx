import FeatureCards from "@/components/layout/FeatureCards";
import FeatureStrip from "@/components/layout/FeatureStrip";
import Hero from "@/components/layout/Hero";
import Navbar from "@/components/layout/Navbar";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <FeatureStrip />
      <FeatureCards />
    </main>
  );
}
