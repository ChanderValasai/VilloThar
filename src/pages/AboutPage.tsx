import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ExternalLink, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout';
import { SafeImage } from '../components/SafeImage';
import { BASELINE_CONTACT } from '../data/publicBaseline';
import heroTharVillageImg from '../assets/images/hero_thar_village_1794661496483.jpg';
import { api } from '../services/api';

export function AboutPage() {
  const [contact, setContact] = useState<any>(BASELINE_CONTACT);

  useEffect(() => {
    api.public
      .getOverview()
      .then((d) => {
        if (d?.contact) setContact(d.contact);
      })
      .catch(() => {});
  }, []);

  return (
    <PublicLayout contact={contact}>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="rounded-2xl overflow-hidden border border-[#E2E0DA] bg-[#F3F1EC] aspect-[16/9]">
            <SafeImage
              src={heroTharVillageImg}
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
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] rounded-lg min-h-[40px] inline-flex items-center"
              >
                View Coverage & NOC
              </Link>
              <Link
                to="/packages"
                className="px-4 py-2 text-sm font-semibold text-[#132238] border border-[#E2E0DA] rounded-lg hover:bg-[#F3F1EC] min-h-[40px] inline-flex items-center"
              >
                Explore Packages
              </Link>
            </div>
          </div>

          {/* Team Section */}
          <div className="pt-4 border-t border-[#E2E0DA] space-y-6">
            <div>
              <p className="text-xs font-medium text-[#0B66A8]">Team</p>
              <h2 className="font-display text-2xl font-bold text-[#132238] mt-1">
                The people behind VilloThar
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 flex items-start gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-[#F3F1EC] border border-[#E2E0DA] shrink-0">
                  <SafeImage
                    src="/assets/aistudio/ganpatProfile_a980c522.jpg"
                    alt="Ganpat Meghwar (Rai), Founder of VilloThar"
                    fallbackTitle="Ganpat Meghwar (Rai)"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display text-lg font-bold text-[#132238]">
                    Ganpat Meghwar (Rai)
                  </h3>
                  <p className="text-xs font-medium text-[#0B66A8]">Founder</p>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Founder of VilloThar (SMC-Private) Limited in Mithi, Tharparkar, leading community outreach, pilot planning, and partnerships.
                  </p>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 flex items-start gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-[#F3F1EC] border border-[#E2E0DA] shrink-0">
                  <SafeImage
                    src="/assets/aistudio/Chander_6c4c767c.jpg"
                    alt="Chander Valasai, Computer Science graduate supporting VilloThar technical work"
                    fallbackTitle="Chander Valasai"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display text-lg font-bold text-[#132238]">
                    Chander Valasai
                  </h3>
                  <p className="text-xs font-medium text-[#0B66A8]">
                    Technical Support & Incoming Employee
                  </p>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    A Computer Science graduate who supports VilloThar&apos;s technical work and will join as an employee.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How You Can Help Section */}
          <div className="pt-4 border-t border-[#E2E0DA] space-y-6">
            <div>
              <p className="text-xs font-medium text-[#0B66A8]">Collaboration & Feedback</p>
              <h2 className="font-display text-2xl font-bold text-[#132238] mt-1">
                How you can help
              </h2>
              <p className="text-sm text-[#475569] mt-1">
                As we prepare the Pabohar pilot and refine the community model, we welcome practical input in three areas:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5 space-y-2">
                <span className="font-mono-data text-xs font-semibold text-[#0B66A8]">01</span>
                <h3 className="font-display text-base font-semibold text-[#132238]">
                  Feedback on this design
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Share suggestions on the portal usability, pricing structure, and captive onboarding flow for rural smartphone users.
                </p>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5 space-y-2">
                <span className="font-mono-data text-xs font-semibold text-[#0B66A8]">02</span>
                <h3 className="font-display text-base font-semibold text-[#132238]">
                  Cooperative law, licensing & tax
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Introductions to advisors experienced in cooperative governance, telecom licensing, and rural ISP tax compliance.
                </p>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5 space-y-2">
                <span className="font-mono-data text-xs font-semibold text-[#0B66A8]">03</span>
                <h3 className="font-display text-base font-semibold text-[#132238]">
                  Village leader perspectives
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Candid views from village leaders across Tharparkar on whether this community-owned model would work in their village.
                </p>
              </div>
            </div>
          </div>

          {/* Direct Founder & Company Contact */}
          <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E0DA] pb-4">
              <div>
                <p className="text-xs font-medium text-[#0B66A8]">Direct Contact</p>
                <h2 className="font-display text-xl font-bold text-[#132238] mt-0.5">
                  Ganpat Meghwar (Rai)
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://wa.me/923212472380"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg min-h-[40px]"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>Message on WhatsApp</span>
                </a>
                <a
                  href="mailto:raiganpat401@gmail.com"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#132238] border border-[#E2E0DA] hover:bg-[#FAF9F6] rounded-lg min-h-[40px]"
                >
                  <Mail className="w-4 h-4 text-[#0B66A8]" aria-hidden="true" />
                  <span>Send Email</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#475569]">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-[#0B66A8] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium text-[#132238]">Organization</p>
                  <p>VilloThar (SMC-Private) Limited</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#0B66A8] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium text-[#132238]">Location</p>
                  <p>Mithi, Tharparkar</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#0B66A8] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium text-[#132238]">Phone / WhatsApp</p>
                  <a
                    href="https://wa.me/923212472380"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono-data text-[#0B66A8] hover:underline"
                  >
                    <span>0321 2472380</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#0B66A8] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium text-[#132238]">Email</p>
                  <a
                    href="mailto:raiganpat401@gmail.com"
                    className="text-[#0B66A8] hover:underline break-all"
                  >
                    raiganpat401@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
