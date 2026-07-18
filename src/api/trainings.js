import { useQuery } from "@tanstack/react-query";
import { base44 } from "./base44Client";

export const TRAINING_FORMATS = ["In-person", "Virtual", "Webinar", "Event / Roadshow"];

export function useTrainings() {
  return useQuery({
    queryKey: ["training-sessions"],
    queryFn: () => base44.entities.TrainingSession.list("-date", 1000),
    staleTime: 60 * 1000,
  });
}

export function createTraining(data) {
  return base44.entities.TrainingSession.create(data);
}

export function updateTraining(id, data) {
  return base44.entities.TrainingSession.update(id, data);
}

export function deleteTraining(id) {
  return base44.entities.TrainingSession.delete(id);
}
