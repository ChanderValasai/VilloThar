import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout';
import { SafeImage } from '../components/SafeImage';

export function AboutPage() {
  return (
    <PublicLayout>
      <section className="py-12 lg:py-16 border-b border-[#E2E0DA] bg-[#FFFFFF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
          <p className="text-xs font-medium text-[#0B66A8]">About VilloThar</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#132238] text-balance">
            A village-owned internet service built for rural Tharparkar
          </h1>
          <p className="text-base sm:text-lg text-[#475569] leading-relaxed">
            In many villages across Tharparkar, mobile data signals are weak, unreliable, or too expensive for daily education and family communication. VilloThar exists to bridge that gap with a shared, locally rooted Wi-Fi network.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="rounded-2xl overflow-hidden border border-[#E2E0DA] bg-[#F3F1EC] aspect-[16/9]">
            <SafeImage
              src="/src/assets/images/hero_thar_village_1794661496483.jpg"
              alt="Tharparkar village landscape with traditional chaunra dwellings"
              fallbackTitle="Tharparkar Community Initiative"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="font-display text-xl font-bold text-[#132238]">
                Why affordable rural access matters
              </h2>
              <p className="text-sm text-[#475569] leading-relaxed">
                Whether a student is downloading study material, a household is making a video call, or a micro-entrepreneur is checking market prices, internet access should be predictable and fair. Our 2 Mbps per-device packages start at Rs 50 per day so residents only pay for the validity they need.
              </p>
            </div>
            <div className="space-y-3">
              <h2 className="font-display text-xl font-bold text-[#132238]">
                The village-owned network model
              </h2>
              <p className="text-sm text-[#475569] leading-relaxed">
                Instead of treating rural areas as low-priority cellular fringes, VilloThar operates a central Network Operations Centre (NOC) in Mithi linked directly to local village access points, beginning with our first pilot village in Pabohar (~12 km away).
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[#FFFFFF] border border-[#E2E0DA] space-y-3">
            <h2 className="font-display text-xl font-bold text-[#132238]">
              Long-term community vision
            </h2>
            <p className="text-sm text-[#475569] leading-relaxed">
              Pabohar is the first step. Once pilot pricing, equipment durability, identity verification, and local support processes are validated in real village conditions, administrators can onboard additional neighbouring villages in Tharparkar one community at a time.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/coverage"
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] rounded-lg"
              >
                View Coverage & NOC
              </Link>
              <Link
                to="/packages"
                className="px-4 py-2 text-sm font-semibold text-[#132238] border border-[#E2E0DA] rounded-lg hover:bg-[#F3F1EC]"
              >
                Explore Packages
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
