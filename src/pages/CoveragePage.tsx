import { useEffect, useState } from 'react';
import { MapPin, Radio, Server } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout';
import { StatusLabel } from '../components/StatusBadge';
import { BASELINE_CONTACT, BASELINE_VILLAGES } from '../data/publicBaseline';
import { api } from '../services/api';
import { Village } from '../types/domain';

export function CoveragePage() {
  const [villages, setVillages] = useState<Village[]>(BASELINE_VILLAGES);
  const [contact, setContact] = useState<any>(BASELINE_CONTACT);

  useEffect(() => {
    api.public
      .getOverview()
      .then((data) => {
        if (Array.isArray(data?.villages) && data.villages.length > 0) {
          setVillages(data.villages);
        }
        if (data?.contact) {
          setContact(data.contact);
        }
      })
      .catch(() => {});
  }, []);

  const nocLocations = villages.filter((v) => v.role === 'NOC');
  const coverageLocations = villages.filter((v) => v.role === 'Coverage');

  return (
    <PublicLayout contact={contact}>
      <section className="py-12 lg:py-16 bg-[#FFFFFF] border-b border-[#E2E0DA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-3">
          <p className="text-xs font-medium text-[#0B66A8]">Network Topology & Coverage</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#132238] text-balance">
            Mithi NOC Hub & Pabohar First Pilot Village
          </h1>
          <p className="text-base text-[#475569] max-w-2xl leading-relaxed">
            VilloThar distinguishes clearly between our regional operations hub in Mithi and active customer Wi-Fi coverage in villages.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          {/* Honest Schematic Topology Visual (No fabricated GPS coordinates, signal strength, or boundaries) */}
          <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="font-display text-lg font-bold text-[#132238]">
                  Conceptual Network Link Schematic
                </h2>
                <p className="text-xs text-[#64748B]">
                  Illustrative topology only — exact tower coordinates and RF boundaries are not published publicly.
                </p>
              </div>
              <span className="font-mono-data text-xs text-[#475569]">
                Approximate Backhaul Span: ~12 km
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] space-y-2">
                <div className="flex items-center justify-between">
                  <Server className="w-5 h-5 text-[#0B66A8]" aria-hidden="true" />
                  <StatusLabel status="NOC Hub" compact />
                </div>
                <h3 className="font-display font-bold text-[#132238]">Mithi NOC</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Central Network Operations Centre, core routing, authentication control, and upstream internet uplink. Not a customer Wi-Fi coverage zone.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-full flex items-center justify-center gap-2">
                  <div className="h-[2px] flex-1 bg-[#0B66A8]/40 hidden md:block" />
                  <span className="px-3 py-1.5 rounded-lg bg-[#FAF9F6] border border-[#E2E0DA] font-mono-data text-xs font-medium text-[#132238] whitespace-nowrap">
                    ~12 km Regional Backhaul
                  </span>
                  <div className="h-[2px] flex-1 bg-[#0B66A8]/40 hidden md:block" />
                </div>
                <p className="text-[11px] text-[#64748B] mt-2 text-center">
                  Managed point-to-point link to village distribution
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#0B66A8]/35 space-y-2">
                <div className="flex items-center justify-between">
                  <Radio className="w-5 h-5 text-[#15803D]" aria-hidden="true" />
                  <StatusLabel status="Pilot" compact />
                </div>
                <h3 className="font-display font-bold text-[#132238]">Pabohar Village</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  First pilot coverage village. Local Wi-Fi access points broadcast the VilloThar SSID and redirect devices to the captive portal.
                </p>
              </div>
            </div>
          </div>

          {/* Database-Driven Villages Directory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#132238]">
                Operations Infrastructure
              </h2>
              {nocLocations.map((loc) => (
                <div key={loc.id} className="pt-3 border-t border-[#E2E0DA] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#132238]">{loc.name}</span>
                    <StatusLabel status="NOC Hub" compact />
                  </div>
                  <p className="text-sm text-[#475569]">{loc.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#132238]">
                Confirmed Customer Coverage Villages
              </h2>
              {coverageLocations.length === 0 ? (
                <p className="text-sm text-[#64748B]">
                  No active customer coverage villages are currently published.
                </p>
              ) : (
                coverageLocations.map((vil) => (
                  <div key={vil.id} className="pt-3 border-t border-[#E2E0DA] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#132238] flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#0B66A8]" aria-hidden="true" />
                        {vil.name}
                      </span>
                      <StatusLabel status={vil.coverageStatus} compact />
                    </div>
                    <p className="text-xs font-mono-data text-[#64748B]">
                      Distance from Mithi NOC: ~{vil.distanceFromNocKm} km
                    </p>
                    <p className="text-sm text-[#475569]">{vil.description}</p>
                  </div>
                ))
              )}
              <p className="text-xs text-[#64748B] pt-2 border-t border-[#E2E0DA]">
                Additional Tharparkar villages appear here only after administrators confirm infrastructure and activate pilot or live status.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
