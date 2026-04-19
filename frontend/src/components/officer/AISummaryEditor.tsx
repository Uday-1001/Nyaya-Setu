export const AISummaryEditor = ({ initial }: { initial: string }) => {
  const text = initial || "No summary available.";

  return (
    <div>
      <label className="block text-xs text-[#6B7280] mb-2">
        Auto summary (read only)
      </label>
      <textarea
        value={text}
        readOnly
        rows={8}
        className="w-full rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white placeholder:text-[#4B5563] focus:outline-none"
      />
      <div className="flex justify-between items-center mt-2">
        <p className="text-[11px] text-[#6B7280]">
          This text is auto-filled and cannot be edited here.
        </p>
        <span className="text-[11px] font-mono text-[#6B7280]">
          {text.length} chars
        </span>
      </div>
    </div>
  );
};
