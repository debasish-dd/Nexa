import FeatureCards from "@/components/layout/FeatureCards";
import FeatureStrip from "@/components/layout/FeatureStrip";
import Hero from "@/components/layout/Hero";
import Navbar from "@/components/layout/Navbar";
import Image from "next/image";

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
