
export type CDLVideo = {
  id: string;
  title: string;
  url: string;
  category: string;
};

export const cdlVideos: CDLVideo[] = [
  { id: "gk1", title: "General Knowledge – Basics", url: "https://www.youtube.com/watch?v=JcEw2JmL9n8", category: "General Knowledge" },
  { id: "ab1", title: "Air Brakes – Fundamentals", url: "https://www.youtube.com/watch?v=6nPq5nE2JzI", category: "Air Brakes" },
  { id: "cv1", title: "Combination Vehicles", url: "https://www.youtube.com/watch?v=0ZQZr5rG9pQ", category: "Combination Vehicles" },
  { id: "rs1", title: "Road Signs & Signals", url: "https://www.youtube.com/watch?v=3X0cP0m8tZQ", category: "Road Signs" }
];
