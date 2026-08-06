import { httpRequest } from "@/core/api/http-client";

export type WeeklyHoursEntry = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type WeeklyHoursRead = WeeklyHoursEntry & { id: string };

export type DoctorAbsence = {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
};

export async function getWeeklyHours(doctorId: string): Promise<WeeklyHoursRead[]> {
  return httpRequest<WeeklyHoursRead[]>(`/api/v1/doctors/${doctorId}/weekly-hours`);
}

export async function setWeeklyHours(doctorId: string, entries: WeeklyHoursEntry[]): Promise<WeeklyHoursRead[]> {
  return httpRequest<WeeklyHoursRead[]>(`/api/v1/doctors/${doctorId}/weekly-hours`, {
    method: "PUT",
    body: { entries }
  });
}

export async function listAbsences(doctorId: string): Promise<DoctorAbsence[]> {
  return httpRequest<DoctorAbsence[]>(`/api/v1/doctors/${doctorId}/absences`);
}

export async function createAbsence(doctorId: string, payload: { start_date: string; end_date: string; reason?: string }): Promise<DoctorAbsence> {
  return httpRequest<DoctorAbsence>(`/api/v1/doctors/${doctorId}/absences`, {
    method: "POST",
    body: payload
  });
}

export async function deleteAbsence(doctorId: string, absenceId: string): Promise<void> {
  await httpRequest(`/api/v1/doctors/${doctorId}/absences/${absenceId}`, {
    method: "DELETE"
  });
}
