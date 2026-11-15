import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout';
import { api } from '../services/api';
import { PackagePlan } from '../types/domain';

export function PackagesPage() {
  const [packages, setPackages] = useState<PackagePlan[]>([]);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.public
      .getOverview()
      .then((data) => {
        setPackages(data.packages || []);
        setContact(data.contact || null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout contact={contact}>
      <section className="py-12 lg:py-16 bg-[#FFFFFF] border-b border-[#E2E0DA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-3">
          <p className="text-xs font-medium text-[#0B66A8]">Internet Packages & Pricing</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#132238] text-balance">
            Simple 2 Mbps per-device packages
          </h1>
          <p className="text-base text-[#475569] max-w-2xl leading-relaxed">
            Every VilloThar package provides the same 2 Mbps speed. Choose the validity period that matches your household or study schedule.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-64 rounded-xl border border-[#E2E0DA] bg-[#FFFFFF] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#132238]">{pkg.name}</h2>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="font-mono-data text-3xl font-bold text-[#132238]">
                        Rs {pkg.pricePkr}
                      </span>
                      <span className="text-xs text-[#64748B]">indicative</span>
                    </div>
                    <p className="mt-1 font-mono-data text-xs text-[#0B66A8] font-medium">
                      {pkg.speedMbps} Mbps · {pkg.validityDays} {pkg.validityDays === 1 ? 'day' : 'days'}
                    </p>
                    <p className="mt-3 text-sm text-[#475569]">{pkg.description}</p>
                    <ul className="mt-4 pt-4 border-t border-[#E2E0DA] space-y-2 text-xs text-[#475569]">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#15803D]" />
                        <span>Bound to 1 registered device</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#15803D]" />
                        <span>Works across village APs</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to={`/portal/login?package=${pkg.id}`}
                    className="mt-6 w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] rounded-lg min-h-[44px]"
                  >
                    Buy Package
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Mandatory Pricing & Device Rules */}
          <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#132238]">
              <Info className="w-4 h-4 text-[#0B66A8]" aria-hidden="true" />
              <span>Important Package & Device Rules</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#475569]">
              <div className="space-y-2">
                <p>
                  <strong className="text-[#132238]">One package per device:</strong> Each phone, tablet, or laptop must be registered separately and have its own active package. Family or shared multi-device packages are not offered at launch.
                </p>
                <p>
                  <strong className="text-[#132238]">Uniform 2 Mbps speed:</strong> All four plans deliver 2 Mbps per device; plans differ only in validity duration and price.
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <strong className="text-[#132238]">Activation & validity:</strong> Validity begins only after backend payment verification and network authorization confirmation.
                </p>
                <p>
                  <strong className="text-[#132238]">Indicative pricing & taxes:</strong> Listed prices are indicative and will be finalized after the Pabohar pilot. Applicable taxes may be added at checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
