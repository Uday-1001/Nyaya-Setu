import type { MockFIR, VoiceRec } from "../../data/officerMock";
import { AISummaryEditor } from "./AISummaryEditor";
import { BNSSectionPanel } from "./BNSSectionPanel";
import { VoiceRecordingList } from "./VoiceRecordingList";
import { CaseTimeline } from "./CaseTimeline";

/** Two-column FIR workspace: victim/AI left; BNS, voice, timeline right */
export const FIRDetailView = ({
  fir,
  voices,
}: {
  fir: MockFIR;
  voices: VoiceRec[];
}) => {
  const mappedStatements =
    fir.statementHistory && fir.statementHistory.length > 0
      ? fir.statementHistory
      : [
          {
            id: `${fir.id}-primary`,
            text: fir.statement,
            language: "N/A",
            createdAt: fir.received,
            incidentDate: fir.incidentDate,
            incidentTime: "As reported",
            incidentLocation: fir.location,
            witnessDetails: "N/A",
          },
        ];

  const possibleSections =
    fir.sectionMappings.length > 1 ? fir.sectionMappings.slice(1) : [];

  return (
    <div className="grid lg:grid-cols-[55fr_45fr] gap-10">
      <div className="space-y-8">
        <section className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase mb-4">
            — अधिकारी विवरण · OFFICER DETAILS
          </p>
          <dl className="grid sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
            <div className="flex gap-2">
              <dt className="text-[#6B7280] w-24">Badge:</dt>
              <dd className="text-white font-semibold">
                {fir.officerDetails?.badgeNumber ?? "Unassigned"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[#6B7280] w-24">Rank:</dt>
              <dd className="text-white font-semibold">
                {fir.officerDetails?.rank ?? "Pending"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[#6B7280] w-24">Station:</dt>
              <dd className="text-white font-semibold">
                {fir.officerDetails?.stationName ?? "N/A"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[#6B7280] w-24">District:</dt>
              <dd className="text-white font-semibold">
                {fir.officerDetails?.district ?? "N/A"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase mb-4">
            — पीड़ित विवरण · VICTIM DETAILS
          </p>
          <dl className="space-y-2 text-sm">
            {(
              [
                ["Name", fir.victimName],
                ["Phone", fir.victimPhone],
                ["Incident Date", fir.incidentDate],
                ["Location", fir.location],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex flex-wrap gap-2">
                <dt className="text-[#6B7280] w-32 shrink-0">{k}:</dt>
                <dd className="text-white font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase mb-4">
            — सभी बयान · ALL VICTIM STATEMENTS
          </p>
          <p className="mb-3 inline-flex items-center rounded-md border border-[#f59e0b]/35 bg-[#f59e0b]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#fcd34d]">
            Read-only: victim-submitted online statements cannot be edited
          </p>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {mappedStatements.map((statement, idx) => (
              <article
                key={statement.id}
                className="rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-bold tracking-wide text-[#9CA3AF] uppercase">
                    Statement {idx + 1} · {statement.language}
                  </p>
                  <p className="text-[11px] text-[#6B7280] font-mono">
                    {statement.createdAt}
                  </p>
                </div>
                <p className="text-sm text-[#D1D5DB] italic leading-relaxed">
                  {statement.text}
                </p>
                <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[12px] text-[#9CA3AF]">
                  <p>
                    <span className="text-[#6B7280]">Incident Date:</span>{" "}
                    {statement.incidentDate}
                  </p>
                  <p>
                    <span className="text-[#6B7280]">Incident Time:</span>{" "}
                    {statement.incidentTime}
                  </p>
                  <p>
                    <span className="text-[#6B7280]">Location:</span>{" "}
                    {statement.incidentLocation}
                  </p>
                  <p>
                    <span className="text-[#6B7280]">Witnesses:</span>{" "}
                    {statement.witnessDetails}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {fir.statementTags.map((t) => (
              <span
                key={t}
                className="rounded-sm border border-white/[0.1] px-2 py-0.5 text-[10px] font-bold text-[#6B7280] uppercase"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase mb-4">
            — Summary
          </p>
          <AISummaryEditor initial={fir.aiSummaryDefault} />
        </section>
      </div>

      <div className="space-y-8">
        <section className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase mb-4">
            — Main law match
          </p>
          <BNSSectionPanel fir={fir} />
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase mb-4">
            — Other possible sections
          </p>
          {possibleSections.length > 0 ? (
            <div className="space-y-3">
              {possibleSections.map((section) => (
                <div
                  key={`${section.sectionNumber}-${section.ipcEquivalent ?? "na"}-alt`}
                  className="rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)] p-4"
                >
                  <p className="text-white font-semibold">
                    {section.sectionTitle}
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    Older code:{" "}
                    {section.ipcEquivalent
                      ? `${section.ipcEquivalent}${section.ipcTitle ? ` - ${section.ipcTitle}` : ""}`
                      : "N/A"}
                  </p>
                  <p className="text-sm text-[#9CA3AF] mt-2">
                    {section.cognizable
                      ? "Police can act immediately"
                      : "Police action needs process"}{" "}
                    · {section.bailable ? "Bail allowed" : "Bail not allowed"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">
              No other matching sections were found.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase mb-4">
            — आवाज़ रिकॉर्डिंग · VOICE RECORDINGS
          </p>
          <VoiceRecordingList items={voices} />
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase mb-4">
            — केस टाइमलाइन · CASE TIMELINE
          </p>
          <CaseTimeline entries={fir.timeline} />
        </section>
      </div>
    </div>
  );
};
