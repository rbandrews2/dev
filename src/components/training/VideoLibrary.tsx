import React, { useMemo, useState } from "react";
import { trainingVideos, TrainingVideo } from "@/data/trainingVideos";
import { getVideosForTopics } from "@/data/courseMaterials";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type VideoLibraryProps = {
  topics?: string[];
};

const VideoLibrary: React.FC<VideoLibraryProps> = ({ topics }) => {
  const fallbackVideos: TrainingVideo[] = [
    {
      id: "sample-flagger",
      title: "Flagger Safety Overview",
      description: "Sample video placeholder. Add real entries in src/data/trainingVideos.ts.",
      youtubeId: "AZwl4L8JMlE",
      topics: ["flagging", "work zone safety"],
      source: "YouTube",
      level: "intro",
    },
  ];

  const topicVideos = topics?.length ? getVideosForTopics(topics) as TrainingVideo[] : [];
  const library =
    topicVideos.length > 0
      ? topicVideos
      : (trainingVideos && trainingVideos.length > 0)
      ? trainingVideos
      : fallbackVideos;

  const [selectedId, setSelectedId] = useState<string>(
    library[0]?.id ?? ""
  );

  const selected = useMemo<TrainingVideo | undefined>(() => {
    return library.find((v) => v.id === selectedId) ?? library[0];
  }, [selectedId, library]);

  if (!selected) {
    return (
      <Card className="bg-black/40 border border-orange-500/30 backdrop-blur-md shadow-[0_0_35px_rgba(249,115,22,0.18)] text-white mt-6 p-4">
        No training videos configured. Add entries in <code>src/data/trainingVideos.ts</code>.
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border border-orange-500/30 backdrop-blur-md shadow-[0_0_35px_rgba(249,115,22,0.18)] text-white mt-6">
      <div className="p-4 sm:p-6 border-b border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold text-orange-300">
            Video Training Library
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">
            Curated work zone safety, flagger, and paving videos from DOTs and national safety organizations. Use these as refreshers or toolbox talks alongside your formal training modules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
          <Badge
            variant="outline"
            className="border-orange-500/60 text-orange-300 text-[10px] sm:text-[11px] bg-black/40"
          >
            {library.length} videos
          </Badge>
          <Badge
            variant="outline"
            className="border-green-500/40 text-green-300 text-[10px] sm:text-[11px] bg-black/40"
          >
            Links can be updated anytime
          </Badge>
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player */}
        <div className="lg:col-span-2 space-y-3">
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-orange-500/40">
            <iframe
              key={selected.youtubeId}
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${selected.youtubeId}`}
              title={selected.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-orange-300">
              {selected.title}
            </h4>
            <p className="text-xs sm:text-sm text-gray-300">
              {selected.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] text-gray-400">
                Source: {selected.source}
              </span>
              <span className="text-gray-600 text-[11px]">&bull;</span>
              <span className="text-[11px] text-gray-400 capitalize">
                Level: {selected.level}
              </span>
              {selected.topics.map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className="border-orange-500/40 text-orange-300 text-[10px] bg-black/40"
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Playlist */}
        <div className="lg:col-span-1">
          <ScrollArea className="h-[260px] sm:h-[320px] lg:h-[360px] pr-2">
            <div className="space-y-2">
              {library.map((video) => {
                const active = video.id === selected.id;
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setSelectedId(video.id)}
                    className={[
                      "w-full text-left rounded-lg px-3 py-2 transition-all border",
                      active
                        ? "bg-orange-500/15 border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.6)]"
                        : "bg-black/40 border-transparent hover:border-orange-500/40 hover:bg-black/60",
                    ].join(" ")}
                  >
                    <p className="text-xs font-semibold text-orange-200 line-clamp-2">
                      {video.title}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                      {video.description}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {video.source}
                    </p>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
};

export default VideoLibrary;
