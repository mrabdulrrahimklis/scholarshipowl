import { prisma } from "../db/client.ts";
import { ApiError } from "../middleware/errors.ts";
import type { ListProgramsQuery } from "../validation/schemas.ts";

export async function listPrograms(q: ListProgramsQuery) {
  const where = {
    ...(q.search
      ? {
          OR: [{ name: { contains: q.search } }, { institution: { contains: q.search } }],
        }
      : {}),
    ...(q.degreeType ? { degreeType: q.degreeType } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.program.findMany({
      where,
      orderBy: { applicationDeadline: "asc" },
      take: q.pageSize,
      skip: (q.page - 1) * q.pageSize,
    }),
    prisma.program.count({ where }),
  ]);

  return { data, page: q.page, pageSize: q.pageSize, total };
}

export async function getProgram(id: string) {
  const program = await prisma.program.findUnique({
    where: { id },
    include: { requirements: { orderBy: { dueOffsetDays: "asc" } } },
  });
  if (!program) throw ApiError.notFound(`Program ${id} not found`);
  return program;
}

export async function getRequirementsForProgram(programId: string) {
  return prisma.requirement.findMany({
    where: { programId },
    orderBy: { dueOffsetDays: "asc" },
  });
}
