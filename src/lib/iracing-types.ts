// Minimal shapes for the subset of the iRacing Data API we consume.
// See https://members-ng.iracing.com/data/doc for the full schema.

export interface SeriesSeasonScheduleTrack {
  track_id: number;
  track_name: string;
  config_name: string | null;
}

export interface SeriesSeasonSchedule {
  race_week_num: number;
  start_date: string;
  track: SeriesSeasonScheduleTrack;
}

export interface SeriesSeason {
  season_id: number;
  season_name: string;
  series_id: number;
  series_name: string;
  season_year: number;
  season_quarter: number;
  active: boolean;
  official: boolean;
  fixed_setup: boolean;
  license_group: number;
  category: "road" | "oval" | "dirt_road" | "dirt_oval";
  schedules: SeriesSeasonSchedule[];
}

export interface SeriesSeasonsResponse {
  seasons: SeriesSeason[];
}

export interface SearchSeriesResultSummary {
  subsession_id: number;
  season_id: number;
  race_week_num: number;
  start_time: string;
}

export interface SearchSeriesResponse {
  data?: {
    chunk_info?: {
      chunk_file_names: string[];
      base_download_url: string;
    };
  };
  results?: SearchSeriesResultSummary[];
}

export interface SimsessionResult {
  simsession_number: number;
  simsession_type: number; // 0=practice 2=qualify 4=heat 5=race... see doc
  simsession_name: string; // "PRACTICE" | "QUALIFY" | "RACE" | ...
  results: DriverResult[];
}

export interface DriverResult {
  cust_id: number;
  display_name: string;
  car_id: number;
  oldi_rating: number | null;
  newi_rating: number | null;
  best_lap_time: number; // hundredths of a second * 100 (i.e. 1/10000s), -1 if none
  average_lap: number; // same units, -1 if none
  laps_complete: number;
  incidents: number;
}

export interface SubsessionResult {
  subsession_id: number;
  season_id: number;
  race_week_num: number;
  track: { track_id: number; track_name: string; config_name: string | null };
  session_results: SimsessionResult[];
}
