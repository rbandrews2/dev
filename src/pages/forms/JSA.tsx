import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import SignInGate from "@/components/auth/SignInGate";
import { ShieldAlert } from "lucide-react";

type CheckboxGroup = {
  label: string;
  options: string[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-orange-500/30 bg-black/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 rounded-full bg-orange-400/70" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InputRow({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-orange-100/80">
      <span className="font-semibold text-white/90">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-orange-500/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-orange-100/50 focus:outline-none focus:border-orange-400"
      />
    </label>
  );
}

function TextAreaRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-orange-100/80">
      <span className="font-semibold text-white/90">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="rounded-lg border border-orange-500/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-orange-100/50 focus:outline-none focus:border-orange-400"
      />
    </label>
  );
}

function CheckboxList({
  title,
  options,
  values,
  toggle,
  columns = 2,
}: {
  title: string;
  options: string[];
  values: string[];
  toggle: (v: string) => void;
  columns?: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-white/90">{title}</p>
      <div className={`grid gap-2 grid-cols-1 sm:grid-cols-${columns}`}>
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-orange-100/80">
            <input
              type="checkbox"
              checked={values.includes(opt)}
              onChange={() => toggle(opt)}
              className="h-4 w-4 rounded border border-orange-500/40 bg-black text-orange-400 focus:ring-orange-400"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function JSAForm() {
  const { user } = useAuth() as any;

  const [jobInfo, setJobInfo] = useState({
    date: "",
    startTime: "",
    endTime: "",
    client: "",
    clientContact: "",
    clientNumber: "",
    competentPerson: "",
    jobName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    landmarks: "",
    speedLimit: "",
    roadwayTypeOther: "",
    trafficVolume: "",
    obstructions: "",
    weatherOther: "",
    shoulderOther: "",
  });

  const roadwayOptions = [
    "One Way Road",
    "Two Way Road",
    "Three way Intersection",
    "Four Way Intersection",
    "Multilane Highway",
    "Limited Access Highway",
    "Paved Unpainted Road",
    "Gravel Road",
    "Dirt Road",
    "Private Road",
  ];
  const weatherOptions = [
    "Light Rain",
    "Heavy Rain",
    "Foggy",
    "Windy",
    "Clear Sky",
    "Partly Cloudy",
    "Overcast",
    "Thunder/Lightning",
    "Snow",
    "Ice",
    "Smog",
  ];
  const shoulderOptions = ["No Shoulder", "Narrow Shoulder", "Adequate Shoulder", "Guardrail", "Debris on Shoulder", "Sharp Drop Off"];

  const [roadwayTypes, setRoadwayTypes] = useState<string[]>([]);
  const [weatherTypes, setWeatherTypes] = useState<string[]>([]);
  const [shoulderTypes, setShoulderTypes] = useState<string[]>([]);

  const [emergency, setEmergency] = useState({
    designatedPerson: "",
    cell911: "",
    clinic: "",
    clinicNumber: "",
    firstAid: "",
    extinguisher: "",
  });

  const workOptions = [
    "Flagging",
    "Flagging With Rumble Strips",
    "Flagging With TMA",
    "Shoulder Closure",
    "Lane Closure",
    "Slow Roll",
    "Shop Work",
  ];

  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [workOther, setWorkOther] = useState("");
  const [stationary, setStationary] = useState("");
  const [stationaryOther, setStationaryOther] = useState("");
  const [sidewalk, setSidewalk] = useState("");

  const [hazardPhysical, setHazardPhysical] = useState<string[]>([]);
  const [hazardHealth, setHazardHealth] = useState<string[]>([]);
  const [hazardEnvironmental, setHazardEnvironmental] = useState<string[]>([]);
  const [hazardPhysicalOther, setHazardPhysicalOther] = useState("");
  const [hazardHealthOther, setHazardHealthOther] = useState("");
  const [hazardEnvironmentalOther, setHazardEnvironmentalOther] = useState("");

  const [hazardNotes, setHazardNotes] = useState("");

  const inspections = [
    "Arrow board(s)",
    "Equipment",
    "Housekeeping",
    "Load Securement",
    "Cones/Barrels",
    "Message Board(s)",
    "Rumble strips",
    "Radios (Charged)",
    "Signs (Legible, Reflectivity)",
    "Stands",
    "Tools (Grounded/Guards)",
    "Truck(s)",
    "TMA(s)",
  ];
  const [inspectionChecks, setInspectionChecks] = useState<string[]>([]);
  const [inspectionOther, setInspectionOther] = useState("");

  const ppeOptions = [
    "Class 3 Vest",
    "Class E Pants",
    "Gators",
    "Whistle",
    "Gloves",
    "Hard Hat",
    "Halo Hard Hat Light",
    "Safety Glasses",
    "Ear Muffs (> 110 dB)",
    "Ear Plugs (> 85 dB)",
    "Respiratory",
    "Safety Goggles",
    "Shade (Flagger Joe)",
    "Face Shield",
    "Fall Protection",
    "Safety Toe Boots",
  ];
  const [ppeChecks, setPpeChecks] = useState<string[]>([]);
  const [ppeOther, setPpeOther] = useState("");

  const [toolboxSubject, setToolboxSubject] = useState("");
  const [comments, setComments] = useState("");
  const [signature, setSignature] = useState({ name: "", date: "" });

  const toggle = (list: string[], setter: (v: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleDownload = () => {
    const payload = {
      jobInfo,
      roadwayTypes,
      weatherTypes,
      shoulderTypes,
      emergency,
      workTypes,
      workOther,
      stationary,
      stationaryOther,
      sidewalk,
      hazards: {
        physical: hazardPhysical,
        physicalOther: hazardPhysicalOther,
        health: hazardHealth,
        healthOther: hazardHealthOther,
        environmental: hazardEnvironmental,
        environmentalOther: hazardEnvironmentalOther,
        notes: hazardNotes,
      },
      inspections: { checks: inspectionChecks, other: inspectionOther },
      ppe: { checks: ppeChecks, other: ppeOther },
      toolboxSubject,
      comments,
      signature,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const name = jobInfo.date ? `jsa-${jobInfo.date}.json` : "jsa-form.json";
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
        label="JSA"
        title="Job Safety Analysis"
        description="Sign in to document hazards, mitigations, and supervisor sign-off."
        icon={<ShieldAlert className="w-5 h-5" />}
      />
    );
  }

  return (
    <div className="min-h-screen pb-16 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-200/80">Forms Hub</p>
          <h1 className="text-3xl font-semibold text-white">Job Safety Analysis (JSA)</h1>
          <p className="text-sm text-orange-100/75">
            Fill every required field. Use Save JSON to keep a record or print to PDF for signing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black shadow-[0_0_20px_rgba(249,115,22,0.25)] hover:bg-orange-400"
          >
            Save JSON
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-orange-500/40 px-3 py-2 text-sm font-semibold text-orange-100 hover:bg-white/5"
          >
            Download / Print PDF
          </button>
        </div>
      </div>

      <Section title="Job Information">
        <div className="grid gap-3 md:grid-cols-2">
          <InputRow label="Date (MM/DD/YYYY)" value={jobInfo.date} onChange={(v) => setJobInfo({ ...jobInfo, date: v })} />
          <div className="grid grid-cols-2 gap-3">
            <InputRow label="Start Time" value={jobInfo.startTime} onChange={(v) => setJobInfo({ ...jobInfo, startTime: v })} />
            <InputRow label="End Time" value={jobInfo.endTime} onChange={(v) => setJobInfo({ ...jobInfo, endTime: v })} />
          </div>
          <InputRow label="Client" value={jobInfo.client} onChange={(v) => setJobInfo({ ...jobInfo, client: v })} />
          <InputRow label="Client Contact" value={jobInfo.clientContact} onChange={(v) => setJobInfo({ ...jobInfo, clientContact: v })} />
          <InputRow label="Client Contact Number" value={jobInfo.clientNumber} onChange={(v) => setJobInfo({ ...jobInfo, clientNumber: v })} />
          <InputRow label="Co. Competent Person" value={jobInfo.competentPerson} onChange={(v) => setJobInfo({ ...jobInfo, competentPerson: v })} />
          <InputRow label="Job Name" value={jobInfo.jobName} onChange={(v) => setJobInfo({ ...jobInfo, jobName: v })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputRow label="Street line 1" value={jobInfo.address1} onChange={(v) => setJobInfo({ ...jobInfo, address1: v })} />
          <InputRow label="Street line 2" value={jobInfo.address2} onChange={(v) => setJobInfo({ ...jobInfo, address2: v })} />
          <InputRow label="City" value={jobInfo.city} onChange={(v) => setJobInfo({ ...jobInfo, city: v })} />
          <InputRow label="State/Province" value={jobInfo.state} onChange={(v) => setJobInfo({ ...jobInfo, state: v })} />
          <InputRow label="Zipcode" value={jobInfo.zip} onChange={(v) => setJobInfo({ ...jobInfo, zip: v })} />
          <InputRow label="Landmarks or Intersections" value={jobInfo.landmarks} onChange={(v) => setJobInfo({ ...jobInfo, landmarks: v })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputRow label="Speed Limit" value={jobInfo.speedLimit} onChange={(v) => setJobInfo({ ...jobInfo, speedLimit: v })} />
          <InputRow label="Obstructions" value={jobInfo.obstructions} onChange={(v) => setJobInfo({ ...jobInfo, obstructions: v })} />
        </div>
        <CheckboxList
          title="Type of Roadway"
          options={roadwayOptions}
          values={roadwayTypes}
          toggle={(v) => toggle(roadwayTypes, setRoadwayTypes, v)}
          columns={2}
        />
        <InputRow label="Roadway - Other" value={jobInfo.roadwayTypeOther} onChange={(v) => setJobInfo({ ...jobInfo, roadwayTypeOther: v })} />
        <CheckboxList
          title="Traffic Volume"
          options={["Light", "Medium", "Heavy"]}
          values={[jobInfo.trafficVolume].filter(Boolean)}
          toggle={(v) => setJobInfo({ ...jobInfo, trafficVolume: jobInfo.trafficVolume === v ? "" : v })}
          columns={3}
        />
        <CheckboxList
          title="Weather Conditions"
          options={weatherOptions}
          values={weatherTypes}
          toggle={(v) => toggle(weatherTypes, setWeatherTypes, v)}
          columns={3}
        />
        <InputRow label="Weather - Other" value={jobInfo.weatherOther} onChange={(v) => setJobInfo({ ...jobInfo, weatherOther: v })} />
        <CheckboxList
          title="Shoulder Conditions"
          options={shoulderOptions}
          values={shoulderTypes}
          toggle={(v) => toggle(shoulderTypes, setShoulderTypes, v)}
          columns={2}
        />
        <InputRow label="Shoulder - Other" value={jobInfo.shoulderOther} onChange={(v) => setJobInfo({ ...jobInfo, shoulderOther: v })} />
      </Section>

      <Section title="Emergency Procedures">
        <div className="grid gap-3 md:grid-cols-2">
          <InputRow label="Designated Co. Competent Person" value={emergency.designatedPerson} onChange={(v) => setEmergency({ ...emergency, designatedPerson: v })} />
          <InputRow label="Are 911 systems functional with cell phone use?" value={emergency.cell911} onChange={(v) => setEmergency({ ...emergency, cell911: v })} />
          <InputRow label="Local Medical Clinic" value={emergency.clinic} onChange={(v) => setEmergency({ ...emergency, clinic: v })} />
          <InputRow label="Medical Clinic Contact Number" value={emergency.clinicNumber} onChange={(v) => setEmergency({ ...emergency, clinicNumber: v })} />
          <InputRow label="Is First Aid Kit on site and fully stocked?" value={emergency.firstAid} onChange={(v) => setEmergency({ ...emergency, firstAid: v })} />
          <InputRow label="Is Fire extinguisher on site and fully charged?" value={emergency.extinguisher} onChange={(v) => setEmergency({ ...emergency, extinguisher: v })} />
        </div>
      </Section>

      <Section title="Job / Task for the Day">
        <CheckboxList
          title="Type Of Work Being Performed"
          options={workOptions}
          values={workTypes}
          toggle={(v) => toggle(workTypes, setWorkTypes, v)}
          columns={2}
        />
        <InputRow label="Work - Other" value={workOther} onChange={setWorkOther} />
        <CheckboxList
          title="Stationary or Mobile"
          options={["Stationary", "Mobile"]}
          values={[stationary].filter(Boolean)}
          toggle={(v) => setStationary(stationary === v ? "" : v)}
          columns={2}
        />
        <InputRow label="Stationary / Mobile - Other" value={stationaryOther} onChange={setStationaryOther} />
        <CheckboxList
          title="Sidewalk Redirection"
          options={["Yes", "No"]}
          values={[sidewalk].filter(Boolean)}
          toggle={(v) => setSidewalk(sidewalk === v ? "" : v)}
          columns={2}
        />
      </Section>

      <Section title="Jobsite Exposures">
        <p className="text-sm text-orange-100/80">
          Hazard Identification: Number each hazard. Describe the mitigation in the Hazard Control Measures section below.
        </p>
        <CheckboxList
          title="Physical Hazards"
          options={["Backing Equipment", "Electrical", "Falls from Elevation (Truck Bed)", "Moving Equipment", "Traffic Volume"]}
          values={hazardPhysical}
          toggle={(v) => toggle(hazardPhysical, setHazardPhysical, v)}
          columns={2}
        />
        <InputRow label="Physical - Other" value={hazardPhysicalOther} onChange={setHazardPhysicalOther} />

        <CheckboxList
          title="Health Hazards"
          options={[
            "Biological (Animal, Avian, Insect)",
            "Chemical Exposure",
            "Cold Stress",
            "Heat Stress (CA > 80°F / > 95°F)",
            "High Noise (> 85 dB)",
            "Lifting Over 50 lbs.",
          ]}
          values={hazardHealth}
          toggle={(v) => toggle(hazardHealth, setHazardHealth, v)}
          columns={2}
        />
        <InputRow label="Health - Other" value={hazardHealthOther} onChange={setHazardHealthOther} />

        <CheckboxList
          title="Environmental Hazards"
          options={[
            "Elevation / Site Terrain",
            "Fire Hazards / Hot work",
            "Nighttime Work / Visibility",
            "Road Surface / Grade / Visibility",
            "Silica / Dust",
            "Weather",
          ]}
          values={hazardEnvironmental}
          toggle={(v) => toggle(hazardEnvironmental, setHazardEnvironmental, v)}
          columns={2}
        />
        <InputRow label="Environmental - Other" value={hazardEnvironmentalOther} onChange={setHazardEnvironmentalOther} />
        <TextAreaRow
          label="Hazard Notes / Numbered Items"
          value={hazardNotes}
          onChange={setHazardNotes}
          placeholder="Number each hazard and describe mitigation to be captured below."
        />
      </Section>

      <Section title="Hazard Control Measures">
        <InputRow label="Daily Toolbox Talk Subject" value={toolboxSubject} onChange={setToolboxSubject} />
        <CheckboxList
          title="Inspections Performed"
          options={inspections}
          values={inspectionChecks}
          toggle={(v) => toggle(inspectionChecks, setInspectionChecks, v)}
          columns={2}
        />
        <InputRow label="Inspections - Other" value={inspectionOther} onChange={setInspectionOther} />
        <CheckboxList
          title="PPE Required"
          options={ppeOptions}
          values={ppeChecks}
          toggle={(v) => toggle(ppeChecks, setPpeChecks, v)}
          columns={2}
        />
        <InputRow label="PPE - Other" value={ppeOther} onChange={setPpeOther} />
      </Section>

      <Section title="Additional Comments / Acknowledgement">
        <TextAreaRow
          label="Additional Comments"
          value={comments}
          onChange={setComments}
          placeholder="Any notes, clarifications, or site-specific concerns."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <InputRow
            label="Signature (type name to acknowledge)"
            value={signature.name}
            onChange={(v) => setSignature({ ...signature, name: v })}
            placeholder="Type full name"
          />
          <InputRow
            label="Date"
            value={signature.date}
            onChange={(v) => setSignature({ ...signature, date: v })}
            placeholder="MM/DD/YYYY"
          />
        </div>
      </Section>
    </div>
  );
}
