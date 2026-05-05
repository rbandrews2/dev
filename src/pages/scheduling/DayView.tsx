import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "react-router-dom";

type ScheduleJob = {
  id: string;
  job_name: string;
  job_description: string | null;
  address: string | null;
  start_time: string | null;
  end_time: string | null;
  primary_contact: string | null;
  assigned_employees: string[] | null;
};

export default function DaySchedule() {
  const { date } = useParams();
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);

  useEffect(() => {
    supabase
      .from("schedules")
      .select("*")
      .eq("date", date)
      .order("start_time", { ascending: true })
      .then(({ data }) => setJobs((data ?? []) as ScheduleJob[]));
  }, [date]);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-semibold mb-4">{date}</h1>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="p-4 rounded-xl bg-black/40 border border-gray-700"
          >
            <h2 className="text-xl font-semibold">{job.job_name}</h2>
            <p className="text-gray-300">{job.job_description}</p>

            <p className="mt-2 text-emerald-400">Location: {job.address}</p>
            <p>Time: {job.start_time} – {job.end_time}</p>
            <p>Contact: {job.primary_contact}</p>

            <p className="mt-2 text-sm text-gray-400">
              Assigned: {(job.assigned_employees ?? []).join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
