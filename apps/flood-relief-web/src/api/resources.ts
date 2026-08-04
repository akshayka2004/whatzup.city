import { createResourceApi } from "./resource";
import type {
  Alert,
  AlertInput,
  CollectionCentre,
  CollectionCentreInput,
  ReliefCamp,
  ReliefCampInput,
  VolunteerGroup,
  VolunteerGroupInput,
  EmergencyContact,
  EmergencyContactInput,
  AdminUser,
  UserInput,
} from "@/types";

export const alertsApi = createResourceApi<Alert, AlertInput>("/alerts");
export const collectionCentresApi = createResourceApi<CollectionCentre, CollectionCentreInput>("/collection-centres");
export const reliefCampsApi = createResourceApi<ReliefCamp, ReliefCampInput>("/relief-camps");
export const volunteerGroupsApi = createResourceApi<VolunteerGroup, VolunteerGroupInput>("/volunteer-groups");
export const emergencyContactsApi = createResourceApi<EmergencyContact, EmergencyContactInput>("/emergency-contacts");
export const usersApi = createResourceApi<AdminUser, UserInput>("/users");
