import type {
  ChangePasswordRequest,
  UpdateAvatarRequest,
  UpdateProfileRequest,
  User,
} from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

// busca os dados do perfil
export async function getProfile(options?: RequestOptions) {
  const { data } = await http.get<User>("/profile", options);
  return data;
}

// salva os dados do perfil
export async function updateProfile(body: UpdateProfileRequest) {
  const { data } = await http.patch<User>("/profile", body);
  return data;
}

// envia um novo avatar
export async function updateAvatar(body: UpdateAvatarRequest) {
  const { data } = await http.put<User>("/profile/avatar", body);
  return data;
}

// remove o avatar
export async function removeAvatar() {
  const { data } = await http.delete<User>("/profile/avatar");
  return data;
}

// troca a senha
export async function changePassword(body: ChangePasswordRequest) {
  await http.put("/profile/password", body);
}
