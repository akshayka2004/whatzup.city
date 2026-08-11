export const DISTRICTS = [
  "THIRUVANANTHAPURAM",
  "KOLLAM",
  "PATHANAMTHITTA",
  "ALAPPUZHA",
  "KOTTAYAM",
  "IDUKKI",
  "ERNAKULAM",
  "THRISSUR",
  "PALAKKAD",
  "MALAPPURAM",
  "KOZHIKODE",
  "WAYANAD",
  "KANNUR",
  "KASARAGOD",
] as const;
export type District = (typeof DISTRICTS)[number];

export const DISTRICT_LABELS: Record<District, string> = {
  THIRUVANANTHAPURAM: "Thiruvananthapuram",
  KOLLAM: "Kollam",
  PATHANAMTHITTA: "Pathanamthitta",
  ALAPPUZHA: "Alappuzha",
  KOTTAYAM: "Kottayam",
  IDUKKI: "Idukki",
  ERNAKULAM: "Ernakulam",
  THRISSUR: "Thrissur",
  PALAKKAD: "Palakkad",
  MALAPPURAM: "Malappuram",
  KOZHIKODE: "Kozhikode",
  WAYANAD: "Wayanad",
  KANNUR: "Kannur",
  KASARAGOD: "Kasaragod",
};

export const ALERT_CATEGORIES = [
  "WEATHER_WARNING",
  "EVACUATION",
  "ROAD_CLOSURE",
  "RESCUE_OPERATION",
  "RELIEF_CAMP_UPDATE",
  "HEALTH_ADVISORY",
  "GENERAL",
] as const;
export type AlertCategory = (typeof ALERT_CATEGORIES)[number];

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  WEATHER_WARNING: "Weather Warning",
  EVACUATION: "Evacuation",
  ROAD_CLOSURE: "Road Closure",
  RESCUE_OPERATION: "Rescue Operation",
  RELIEF_CAMP_UPDATE: "Relief Camp Update",
  HEALTH_ADVISORY: "Health Advisory",
  GENERAL: "General",
};

export const ALERT_STATUSES = ["ACTIVE", "RESOLVED", "INACTIVE"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CENTRE_STATUSES = ["OPEN", "PAUSED", "CLOSED"] as const;
export type CentreStatus = (typeof CENTRE_STATUSES)[number];

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  category: AlertCategory;
  district: District;
  publishedDate: string;
  status: AlertStatus;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Official {
  id: string;
  name: string;
  designation: string;
  contactNumber: string;
}

export interface DepartmentOfficial extends Official {
  department: string;
}

export interface CollectionCentre {
  id: string;
  name: string;
  district: District;
  region: string;
  address: string;
  mapLink?: string | null;
  contactName: string;
  contactDesignation: string;
  contactPhone: string;
  contactAltPhone?: string | null;
  workingHours?: string | null;
  remarks?: string | null;
  status: CentreStatus;
  officials: Official[];
  requirements: CampRequirement[];
  createdAt: string;
  updatedAt: string;
}

export interface CampRequirement {
  id: string;
  itemName: string;
  quantity: string;
  priority: Priority;
}

export interface ReliefCamp {
  id: string;
  name: string;
  district: District;
  region: string;
  address: string;
  mapLink?: string | null;
  contactName: string;
  contactDesignation: string;
  contactPhone: string;
  remarks?: string | null;
  officials: DepartmentOfficial[];
  requirements: CampRequirement[];
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerGroup {
  id: string;
  name: string;
  district: District;
  region: string;
  coordinatorName: string;
  coordinatorPhone: string;
  whatsappLink?: string | null;
  telegramLink?: string | null;
  website?: string | null;
  remarks?: string | null;
  officials: DepartmentOfficial[];
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  department: string;
  officialName: string;
  designation: string;
  district: District;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN";
  createdAt: string;
  updatedAt: string;
}

export interface OfficialInput {
  name: string;
  designation: string;
  contactNumber: string;
}

export interface DepartmentOfficialInput {
  name: string;
  designation: string;
  department: string;
  contactNumber: string;
}

export interface RequirementInput {
  itemName: string;
  quantity: string;
  priority: Priority;
}

export interface AlertInput {
  title: string;
  description: string;
  category: AlertCategory;
  district: District;
  publishedDate: string;
  status: AlertStatus;
  isPinned: boolean;
}

export interface CollectionCentreInput {
  name: string;
  district: District;
  region: string;
  address: string;
  mapLink: string;
  contactName: string;
  contactDesignation: string;
  contactPhone: string;
  contactAltPhone: string;
  workingHours: string;
  remarks: string;
  status: CentreStatus;
  officials: OfficialInput[];
  requirements: RequirementInput[];
}

export interface ReliefCampInput {
  name: string;
  district: District;
  region: string;
  address: string;
  mapLink: string;
  contactName: string;
  contactDesignation: string;
  contactPhone: string;
  remarks: string;
  officials: DepartmentOfficialInput[];
  requirements: RequirementInput[];
}

export interface VolunteerGroupInput {
  name: string;
  district: District;
  region: string;
  coordinatorName: string;
  coordinatorPhone: string;
  whatsappLink: string;
  telegramLink: string;
  website: string;
  remarks: string;
  officials: DepartmentOfficialInput[];
}

export interface EmergencyContactInput {
  department: string;
  officialName: string;
  designation: string;
  district: District;
  phoneNumber: string;
}

export interface UserInput {
  name: string;
  email: string;
  password?: string;
}

export interface DashboardSummary {
  totals: {
    alerts: number;
    collectionCentres: number;
    reliefCamps: number;
    volunteerGroups: number;
  };
  recentActivity: {
    type: string;
    title: string;
    action: "created" | "updated";
    timestamp: string;
  }[];
}
