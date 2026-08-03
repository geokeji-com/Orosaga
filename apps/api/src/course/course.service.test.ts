import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { CourseService } from "./course.service.js";

describe("CourseService exercise operation idempotency", () => {
  it("rejects reusing an operation id with a different answer", async () => {
    const prisma = {
      courseEnrollment: {
        findFirst: vi.fn().mockResolvedValue({
          id: "enrollment-1",
          courseSlug: "geo-foundations",
          courseVersion: "pilot-1.0.0",
          steps: [
            { stepKey: "lesson-01-story" },
            { stepKey: "lesson-01-model" },
          ],
          feedback: null,
        }),
      },
      courseExerciseAttempt: {
        findUnique: vi.fn().mockResolvedValue({
          enrollmentId: "enrollment-1",
          exerciseKey: "lesson-01-practice",
          selectedOptionId: "a",
          operationId: "00000000-0000-4000-8000-000000000001",
          correct: false,
        }),
      },
    } as unknown as PrismaService;
    const service = new CourseService(prisma);

    const error = await service
      .submitExercise("user-1", "enrollment-1", "lesson-01-practice", {
        selectedOptionId: "c",
        operationId: "00000000-0000-4000-8000-000000000001",
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: "COURSE_OPERATION_CONFLICT",
    });
  });

  it("returns the recorded attempt when concurrent retries share the same payload", async () => {
    const enrollment = {
      id: "enrollment-1",
      courseSlug: "geo-foundations",
      courseVersion: "pilot-1.0.0",
      status: "IN_PROGRESS",
      startedAt: new Date("2026-08-03T00:00:00.000Z"),
      completedAt: null,
      steps: [{ stepKey: "lesson-01-story" }, { stepKey: "lesson-01-model" }],
      feedback: null,
    };
    const recordedAttempt = {
      enrollmentId: "enrollment-1",
      exerciseKey: "lesson-01-practice",
      selectedOptionId: "a",
      operationId: "00000000-0000-4000-8000-000000000001",
      correct: false,
    };
    const prisma = {
      courseEnrollment: {
        findFirst: vi.fn().mockResolvedValue(enrollment),
      },
      courseExerciseAttempt: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(recordedAttempt),
        create: vi.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "7.9.1",
          }),
        ),
      },
      courseStepProgress: {
        count: vi.fn().mockResolvedValue(2),
      },
    } as unknown as PrismaService;
    const service = new CourseService(prisma);

    await expect(
      service.submitExercise("user-1", "enrollment-1", "lesson-01-practice", {
        selectedOptionId: "a",
        operationId: "00000000-0000-4000-8000-000000000001",
      }),
    ).resolves.toMatchObject({
      correct: false,
      selectedOptionId: "a",
    });
  });

  it("reuses the recorded answer instead of storing duplicate attempts", async () => {
    const enrollment = {
      id: "enrollment-1",
      courseSlug: "geo-foundations",
      courseVersion: "pilot-1.0.0",
      status: "IN_PROGRESS",
      startedAt: new Date("2026-08-03T00:00:00.000Z"),
      completedAt: null,
      steps: [{ stepKey: "lesson-01-story" }, { stepKey: "lesson-01-model" }],
      feedback: null,
    };
    const recordedAttempt = {
      enrollmentId: "enrollment-1",
      exerciseKey: "lesson-01-practice",
      selectedOptionId: "a",
      operationId: "00000000-0000-4000-8000-000000000001",
      correct: false,
    };
    const create = vi.fn();
    const prisma = {
      courseEnrollment: {
        findFirst: vi.fn().mockResolvedValue(enrollment),
      },
      courseExerciseAttempt: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(recordedAttempt),
        create,
      },
      courseStepProgress: {
        count: vi.fn().mockResolvedValue(2),
      },
    } as unknown as PrismaService;
    const service = new CourseService(prisma);

    await expect(
      service.submitExercise("user-1", "enrollment-1", "lesson-01-practice", {
        selectedOptionId: "a",
        operationId: "00000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toMatchObject({
      correct: false,
      selectedOptionId: "a",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an enrollment whose immutable course package is unavailable", async () => {
    const prisma = {
      courseEnrollment: {
        findFirst: vi.fn().mockResolvedValue({
          id: "enrollment-1",
          courseSlug: "geo-foundations",
          courseVersion: "pilot-0.9.0",
          steps: [],
          feedback: null,
        }),
      },
    } as unknown as PrismaService;
    const service = new CourseService(prisma);

    const error = await service
      .enrollment("user-1", "enrollment-1")
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: "COURSE_VERSION_UNAVAILABLE",
    });
  });
});

describe("CourseService step operation idempotency", () => {
  it("rejects a new operation id for an already completed step", async () => {
    const create = vi.fn();
    const prisma = {
      courseEnrollment: {
        findFirst: vi.fn().mockResolvedValue({
          id: "enrollment-1",
          courseSlug: "geo-foundations",
          courseVersion: "pilot-1.0.0",
          steps: [],
          feedback: null,
        }),
      },
      courseStepProgress: {
        findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
          enrollmentId: "enrollment-1",
          stepKey: "lesson-01-story",
          operationId: "00000000-0000-4000-8000-000000000001",
        }),
        create,
      },
    } as unknown as PrismaService;
    const service = new CourseService(prisma);

    const error = await service
      .completeStep("user-1", "enrollment-1", "lesson-01-story", {
        operationId: "00000000-0000-4000-8000-000000000002",
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: "COURSE_OPERATION_CONFLICT",
    });
    expect(create).not.toHaveBeenCalled();
  });
});
