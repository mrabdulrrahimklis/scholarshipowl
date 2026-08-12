import { prisma } from "../db/client.ts";
import { ApiError } from "../middleware/errors.ts";
import type { CreateProfileBody, UpdateProfileBody } from "../validation/schemas.ts";

export async function createProfile(input: CreateProfileBody) {
  return prisma.studentProfile.create({
    data: {
      name: input.name,
      email: input.email,
      educationLevel: input.educationLevel,
      gpa: input.gpa ?? null,
      testScores: input.testScores ?? null,
      targetTerm: input.targetTerm,
    },
  });
}

export async function getProfile(id: string) {
  const row = await prisma.studentProfile.findUnique({ where: { id } });
  if (!row) throw ApiError.notFound(`Profile ${id} not found`);
  return row;
}

export async function updateProfile(id: string, input: UpdateProfileBody) {
  await getProfile(id); // 404 if missing

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email;
  if (input.educationLevel !== undefined) data.educationLevel = input.educationLevel;
  if (input.gpa !== undefined) data.gpa = input.gpa;
  if (input.testScores !== undefined) data.testScores = input.testScores;
  if (input.targetTerm !== undefined) data.targetTerm = input.targetTerm;

  if (Object.keys(data).length === 0) {
    throw ApiError.badRequest("No fields to update");
  }

  return prisma.studentProfile.update({ where: { id }, data });
}
