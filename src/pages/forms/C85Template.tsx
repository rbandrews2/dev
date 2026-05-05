import { useState } from "react";
import SignInGate from "@/components/auth/SignInGate";
import { useAuth } from "@/contexts/AuthContext";

function Field({
  label,
  value,
  onChange,
  flex = "flex-1",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  flex?: string;
  type?: string;
}) {
  return (
    <div className={`flex items-stretch ${flex} border border-gray-400 text-[11px]`}>
      <div className="w-28 px-2 py-2 font-semibold uppercase border-r border-gray-400 bg-gray-100">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 outline-none text-[11px]"
      />
    </div>
  );
}

function Cell({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-gray-400 px-2 py-2 text-[11px] ${className}`}>
      {children || <>&nbsp;</>}
    </div>
  );
}

function TextCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Cell>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-[11px]"
      />
    </Cell>
  );
}

export default function C85Template() {
  const { user } = useAuth() as any;
  const [header, setHeader] = useState({
    contractor: "",
    date: "",
    startTime: "",
    finishTime: "",
    jobNumber: "",
    sheet: "",
    sheetOf: "",
    weather: "",
    airStart: "",
    airFinish: "",
    surfaceStart: "",
  });

  const [materials, setMaterials] = useState(
    Array.from({ length: 5 }, () => ({
      type: "",
      quantity: "",
      units: "",
      cert: "",
      msNumber: "",
      expDate: "",
    }))
  );

  const [work, setWork] = useState(
    Array.from({ length: 10 }, () => ({
      type: "",
      contractItem: "",
      quantity: "",
      units: "",
      location: "",
      width: "",
      color: "",
    }))
  );

  const [qc, setQc] = useState(
    Array.from({ length: 6 }, () => ({
      materialType: "",
      measurement: "",
      location: "",
      time: "",
      inspector: "",
    }))
  );

  const [signatures, setSignatures] = useState({
    contractorTech: "",
    contractorDate: "",
    vdotRep: "",
    vdotDate: "",
  });

  const handleDownload = () => {
    const payload = { header, materials, work, qc, signatures };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const name = header.date ? `c85-${header.date}.json` : "c85-form.json";
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!user) {
    return (
      <SignInGate
        label="C85 Daily Work Log"
        title="Pavement Marking - Contractor’s Daily Log and Quality Control Report"
        description="Sign in to review and complete the C85 legal form."
        icon="📝"
      />
    );
  }

  return (
    <div className="min-h-screen pb-16 flex justify-center px-4">
      <div className="w-full max-w-5xl bg-white text-black shadow-lg border border-gray-300 p-6 space-y-4">
        <div className="flex justify-between items-start text-[10px] font-semibold">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1 rounded bg-gray-200 border border-gray-400 text-[10px] hover:bg-gray-300"
            >
              Save JSON
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1 rounded bg-gray-200 border border-gray-400 text-[10px] hover:bg-gray-300"
            >
              Download / Print PDF
            </button>
          </div>
          <div className="text-right leading-tight">
            <div>Form C-85</div>
            <div>Rev. 3/07/07</div>
          </div>
        </div>

        <header className="text-center space-y-1">
          <h1 className="text-sm font-bold tracking-wide">PAVEMENT MARKING</h1>
          <h2 className="text-base font-bold tracking-wide">CONTRACTOR&apos;S DAILY LOG AND QUALITY CONTROL REPORT</h2>
        </header>

        <section className="space-y-1 text-[11px] font-medium">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr]">
            <Field label="Contractor:" value={header.contractor} onChange={(v) => setHeader({ ...header, contractor: v })} />
            <Field label="Date:" value={header.date} onChange={(v) => setHeader({ ...header, date: v })} />
            <Field label="Start Time:" value={header.startTime} onChange={(v) => setHeader({ ...header, startTime: v })} />
            <Field label="Finish Time:" value={header.finishTime} onChange={(v) => setHeader({ ...header, finishTime: v })} />
          </div>
          <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr]">
            <Field label="Job/Project No:" value={header.jobNumber} onChange={(v) => setHeader({ ...header, jobNumber: v })} />
            <Field label="Sheet" value={header.sheet} onChange={(v) => setHeader({ ...header, sheet: v })} />
            <Field label="of" value={header.sheetOf} onChange={(v) => setHeader({ ...header, sheetOf: v })} />
            <div />
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr]">
            <Field label="Weather:" value={header.weather} onChange={(v) => setHeader({ ...header, weather: v })} flex="flex-1" />
            <Field label="Air Temp. (Start)" value={header.airStart} onChange={(v) => setHeader({ ...header, airStart: v })} flex="flex-1" />
            <Field label="Air Temp. (Finish)" value={header.airFinish} onChange={(v) => setHeader({ ...header, airFinish: v })} flex="flex-1" />
          </div>
          <div className="grid grid-cols-[1fr_1fr]">
            <Field label="Surface Temp. (Start):" value={header.surfaceStart} onChange={(v) => setHeader({ ...header, surfaceStart: v })} flex="flex-1" />
            <div />
          </div>
        </section>

        <section className="border border-gray-400">
          <div className="border-b border-gray-400 bg-gray-100 text-center text-[12px] font-bold py-1">
            * MATERIALS DOCUMENTATION:
          </div>
          <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr_1fr_1fr] bg-gray-50 font-semibold text-[11px] border-b border-gray-400">
            <Cell>Type of Material</Cell>
            <Cell>Quantity</Cell>
            <Cell>Units</Cell>
            <Cell>Certification Letter (Type/Date)</Cell>
            <Cell>MS Number</Cell>
            <Cell>Exp. Date</Cell>
          </div>
          {materials.map((row, i) => (
            <div key={i} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr_1fr_1fr]">
              <TextCell value={row.type} onChange={(v) => {
                const next = [...materials]; next[i] = { ...row, type: v }; setMaterials(next);
              }} />
              <TextCell value={row.quantity} onChange={(v) => {
                const next = [...materials]; next[i] = { ...row, quantity: v }; setMaterials(next);
              }} />
              <TextCell value={row.units} onChange={(v) => {
                const next = [...materials]; next[i] = { ...row, units: v }; setMaterials(next);
              }} />
              <TextCell value={row.cert} onChange={(v) => {
                const next = [...materials]; next[i] = { ...row, cert: v }; setMaterials(next);
              }} />
              <TextCell value={row.msNumber} onChange={(v) => {
                const next = [...materials]; next[i] = { ...row, msNumber: v }; setMaterials(next);
              }} />
              <TextCell value={row.expDate} onChange={(v) => {
                const next = [...materials]; next[i] = { ...row, expDate: v }; setMaterials(next);
              }} />
            </div>
          ))}
        </section>

        <section className="border border-gray-400">
          <div className="border-b border-gray-400 bg-gray-100 text-center text-[12px] font-bold py-1">
            WORK COMPLETED:
          </div>
          <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1.6fr_0.8fr_0.8fr] bg-gray-50 font-semibold text-[11px] border-b border-gray-400">
            <Cell>Type of Marking</Cell>
            <Cell>Contract Item No.</Cell>
            <Cell>Quantity</Cell>
            <Cell>Units</Cell>
            <Cell>Location/Description</Cell>
            <Cell>Width</Cell>
            <Cell>Color</Cell>
          </div>
          {work.map((row, i) => (
            <div key={i} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1.6fr_0.8fr_0.8fr]">
              <TextCell value={row.type} onChange={(v) => { const next = [...work]; next[i] = { ...row, type: v }; setWork(next); }} />
              <TextCell value={row.contractItem} onChange={(v) => { const next = [...work]; next[i] = { ...row, contractItem: v }; setWork(next); }} />
              <TextCell value={row.quantity} onChange={(v) => { const next = [...work]; next[i] = { ...row, quantity: v }; setWork(next); }} />
              <TextCell value={row.units} onChange={(v) => { const next = [...work]; next[i] = { ...row, units: v }; setWork(next); }} />
              <TextCell value={row.location} onChange={(v) => { const next = [...work]; next[i] = { ...row, location: v }; setWork(next); }} />
              <TextCell value={row.width} onChange={(v) => { const next = [...work]; next[i] = { ...row, width: v }; setWork(next); }} />
              <TextCell value={row.color} onChange={(v) => { const next = [...work]; next[i] = { ...row, color: v }; setWork(next); }} />
            </div>
          ))}
        </section>

        <section className="border border-gray-400">
          <div className="border-b border-gray-400 bg-gray-100 text-center text-[12px] font-bold py-1">
            Quality Control Measurements:
          </div>
          <div className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_1fr] bg-gray-50 font-semibold text-[11px] border-b border-gray-400">
            <Cell>Material Type</Cell>
            <Cell>Q.C. Measurement (Units)</Cell>
            <Cell>Location</Cell>
            <Cell>Time</Cell>
            <Cell>Inspector (Initial)</Cell>
          </div>
          {qc.map((row, i) => (
            <div key={i} className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_1fr]">
              <TextCell value={row.materialType} onChange={(v) => { const next = [...qc]; next[i] = { ...row, materialType: v }; setQc(next); }} />
              <TextCell value={row.measurement} onChange={(v) => { const next = [...qc]; next[i] = { ...row, measurement: v }; setQc(next); }} />
              <TextCell value={row.location} onChange={(v) => { const next = [...qc]; next[i] = { ...row, location: v }; setQc(next); }} />
              <TextCell value={row.time} onChange={(v) => { const next = [...qc]; next[i] = { ...row, time: v }; setQc(next); }} />
              <TextCell value={row.inspector} onChange={(v) => { const next = [...qc]; next[i] = { ...row, inspector: v }; setQc(next); }} />
            </div>
          ))}
        </section>

        <section className="border border-gray-400 text-[11px]">
          <div className="px-3 py-2">
            * Material shipped under this certification has been tested and approved by VDOT as indicated by laboratory
            test numbers listed hereon.
          </div>
          <div className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr] border-t border-gray-400">
            <Cell className="font-semibold">Contractor Q.C. Technician</Cell>
            <TextCell value={signatures.contractorTech} onChange={(v) => setSignatures({ ...signatures, contractorTech: v })} />
            <Cell className="font-semibold">Date</Cell>
            <TextCell value={signatures.contractorDate} onChange={(v) => setSignatures({ ...signatures, contractorDate: v })} />
          </div>
          <div className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr]">
            <Cell className="font-semibold">VDOT Representative</Cell>
            <TextCell value={signatures.vdotRep} onChange={(v) => setSignatures({ ...signatures, vdotRep: v })} />
            <Cell className="font-semibold">Date</Cell>
            <TextCell value={signatures.vdotDate} onChange={(v) => setSignatures({ ...signatures, vdotDate: v })} />
          </div>
        </section>

        <footer className="text-[10px] text-gray-700 flex justify-between">
          <span>Copy &nbsp;&nbsp; District Traffic Engineer &nbsp;&nbsp; District Materials Engineer</span>
          <span>Pay Quantity to be based on actual field measurement verified by the Engineer.</span>
        </footer>
      </div>
    </div>
  );
}
