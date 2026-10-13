import type {
  ChangePasswordRequest,
  UpdateAvatarRequest,
  UpdateProfileRequest,
  User,
} from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

export async function getProfile(options?: RequestOptions) {
  const { data } = await http.get<User>("/profile", options);
  return data;
}

export async function updateProfile(body: UpdateProfileRequest) {
  const { data } = await http.patch<User>("/profile", body);
  return data;
}

export async function updateAvatar(body: UpdateAvatarRequest) {
  const { data } = await http.put<User>("/profile/avatar", body);
  return data;
}

export async function removeAvatar() {
  const { data } = await http.delete<User>("/profile/avatar");
  return data;
}

export async function changePassword(body: ChangePasswordRequest) {
  await http.put("/profile/password", body);
}
